import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { WASI } from 'node:wasi';
import { decodeWire, encodeWire } from '../src/sdk/wire.js';
import { root } from './lib.mjs';

const encoder = new TextEncoder();

function normalize(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (typeof item === 'bigint') return { bigint: item.toString() };
    if (item instanceof Error) return { error: item.message };
    if (item instanceof Uint8Array) return { bytes: [...item] };
    return item;
  }));
}

function executeSource(exports, heap, source, options = {}) {
  const handle = exports.wlua_create(options.profile ?? 0,
    BigInt(options.heapLimit ?? 64 * 1024 * 1024),
    BigInt(options.instructionLimit ?? 10_000_000));
  const sourceBytes = encoder.encode(source);
  const nameBytes = encoder.encode(options.name ?? '@differential.lua');
  const sourcePointer = Number(exports.wlua_alloc(sourceBytes.length));
  const namePointer = Number(exports.wlua_alloc(nameBytes.length));
  heap().set(sourceBytes, sourcePointer);
  heap().set(nameBytes, namePointer);
  let state = exports.wlua_run(handle, sourcePointer, sourceBytes.length,
    namePointer, nameBytes.length);
  exports.wlua_free(sourcePointer);
  exports.wlua_free(namePointer);
  let slices = 0;
  while (state === 3 && slices++ < 10_000)
    state = exports.wlua_resume(handle, 0);
  const resultPointer = Number(exports.wlua_result_ptr(handle));
  const resultLength = Number(exports.wlua_result_len(handle));
  const result = decodeWire(heap().slice(resultPointer,
    resultPointer + resultLength));
  const outputPointer = Number(exports.wlua_output_ptr(handle));
  const outputLength = Number(exports.wlua_output_len(handle));
  const output = new TextDecoder().decode(heap().slice(outputPointer,
    outputPointer + outputLength));
  exports.wlua_destroy(handle);
  return { state, result: normalize(result), output };
}

function exercise(exports, heap) {
  const handle = exports.wlua_create(0, 64n * 1024n * 1024n, 10_000_000n);
  const copy = value => {
    const bytes = value instanceof Uint8Array ? value : encoder.encode(value);
    const pointer = Number(exports.wlua_alloc(bytes.length));
    heap().set(bytes, pointer);
    return { bytes, pointer };
  };
  const source = copy('global 中文变量\n中文变量 = 21 * 2\nreturn 中文变量');
  const name = copy('@中文冒烟.lua');
  const state = exports.wlua_run(handle, source.pointer, source.bytes.length,
    name.pointer, name.bytes.length);
  if (state !== 0) throw new Error('中文源码执行失败，状态：' + state);
  const resultPointer = Number(exports.wlua_result_ptr(handle));
  const resultLength = Number(exports.wlua_result_len(handle));
  const values = decodeWire(heap().slice(resultPointer,
    resultPointer + resultLength));
  if (values[0] !== 42n) throw new Error('整数精度或中文标识符回归。');
  const invalidResumeState = exports.wlua_resume(handle, 0);
  const invalidResume = decodeWire(heap().slice(
    Number(exports.wlua_result_ptr(handle)),
    Number(exports.wlua_result_ptr(handle)) + Number(exports.wlua_result_len(handle))));
  if (invalidResumeState !== -1 ||
      !invalidResume.message?.includes('not suspended'))
    throw new Error('C ABI 允许恢复已经完成的协程。');
  exports.wlua_free(source.pointer);

  const invalid = copy(Uint8Array.from([
    ...encoder.encode('local '), 0xed, 0xa0, 0x80,
    ...encoder.encode(' = 1')
  ]));
  const invalidState = exports.wlua_check(handle, invalid.pointer,
    invalid.bytes.length, name.pointer, name.bytes.length);
  exports.wlua_free(invalid.pointer);
  exports.wlua_free(name.pointer);
  if (invalidState !== -1) throw new Error('非法 UTF-8 标识符未被拒绝。');

  const forgedKey = encodeWire('_VERSION');
  const forgedKeyPointer = Number(exports.wlua_alloc(forgedKey.length));
  heap().set(forgedKey, forgedKeyPointer);
  if (exports.wlua_get(handle, 2, forgedKeyPointer, forgedKey.length) !== 0)
    throw new Error('伪造的 Lua registry 引用越权访问了全局表。');
  exports.wlua_free(forgedKeyPointer);
  exports.wlua_destroy(handle);
}

// Keep the generated loader outside the checked JavaScript API surface.
const emLoader = new URL('../public/wasm/emscripten-lua-runtime.mjs', import.meta.url);
const emFactory = (await import(emLoader.href)).default;
const emWasm = new URL('../public/wasm/emscripten-lua-runtime.wasm', import.meta.url).href;
const em = await emFactory({ locateFile: () => emWasm });
const emExports = {
  wlua_create: em._wlua_create,
  wlua_alloc: em._wlua_alloc,
  wlua_free: em._wlua_free,
  wlua_run: em._wlua_run,
  wlua_check: em._wlua_check,
  wlua_result_ptr: em._wlua_result_ptr,
  wlua_result_len: em._wlua_result_len,
  wlua_output_ptr: em._wlua_output_ptr,
  wlua_output_len: em._wlua_output_len,
  wlua_resume: em._wlua_resume,
  wlua_get: em._wlua_get,
  wlua_destroy: em._wlua_destroy
};
exercise(emExports, () => em.HEAPU8);

const wasi = new WASI({ version: 'preview1' });
const module = await WebAssembly.compile(await readFile(
  path.join(root, 'public', 'wasm', 'wasi-lua-runtime.wasm')));
const instance = await WebAssembly.instantiate(module, {
  wasi_snapshot_preview1: wasi.wasiImport
});
wasi.initialize(instance);
const wasiExports = /** @type {Record<string, Function> & {memory: WebAssembly.Memory}} */ (
  /** @type {unknown} */ (instance.exports));
const wasiHeap = () => new Uint8Array(wasiExports.memory.buffer);
exercise(wasiExports, wasiHeap);

const corpus = [
  'global 中文变量\n中文变量 = 42\nprint("中文", 中文变量)\nreturn 中文变量',
  'return math.maxinteger, math.mininteger, 7 // 3, -7 // 3',
  'local co = coroutine.create(function() return 20 + 22 end)\nlocal ok, value = coroutine.resume(co)\nreturn ok, value, coroutine.status(co)',
  'local function deep(n) if n == 0 then error("差分错误") end return deep(n - 1) end\ndeep(3)'
];
for (const source of corpus) {
  const emResult = executeSource(emExports, () => em.HEAPU8, source);
  const wasiResult = executeSource(wasiExports, wasiHeap, source);
  if (JSON.stringify(emResult) !== JSON.stringify(wasiResult))
    throw new Error('Emscripten/WASI differential mismatch:\n' +
      JSON.stringify({ emResult, wasiResult }, null, 2));
}

for (const [name, host, hostHeap] of [
  ['Emscripten', emExports, () => em.HEAPU8],
  ['WASI', wasiExports, wasiHeap]
]) {
  const libraries = executeSource(host, hostHeap,
    `return debug == nil, type(io) == 'table', type(io.open) == 'function',
      type(os) == 'table',
      type(os.clock) == 'function', type(loadfile) == 'function',
      type(dofile) == 'function'`);
  if (libraries.state !== 0 || libraries.result.some(item => item !== true))
    throw new Error(`${name} safe profile exposed a forbidden library.`);
  const binary = executeSource(host, hostHeap,
    'local f, e = load(string.char(27) .. "Lua")\nreturn f == nil, type(e)');
  if (binary.state !== 0 || binary.result[0] !== true || binary.result[1] !== 'string')
    throw new Error(`${name} accepted a binary chunk.`);
  const budget = executeSource(host, hostHeap, 'while true do end', {
    instructionLimit: 100_000
  });
  if (budget.state !== -1 || !budget.result.error?.includes('instruction budget'))
    throw new Error(`${name} instruction budget did not stop an infinite loop.`);
  const memory = executeSource(host, hostHeap,
    'return string.rep("x", 4 * 1024 * 1024)', { heapLimit: 2 * 1024 * 1024 });
  if (memory.state !== -1)
    throw new Error(`${name} heap quota did not reject an oversized allocation.`);
  const compositeHook = executeSource(host, hostHeap, `
    local hits = 0
    debug.sethook(function(event) if event == 'line' then hits = hits + 1 end end, 'l')
    local value = 20
    value = value + 22
    debug.sethook()
    return value, hits > 0, debug.gethook() == nil
  `, { profile: 1 });
  if (compositeHook.state !== 0 || compositeHook.result[0]?.bigint !== '42' ||
      compositeHook.result[1] !== true || compositeHook.result[2] !== true)
    throw new Error(`${name} composite debug hook did not preserve user hooks: ${JSON.stringify(compositeHook)}`);
  const nestedBudget = executeSource(host, hostHeap, `
    debug.sethook()
    local co = coroutine.create(function() while true do end end)
    coroutine.resume(co)
  `, { profile: 1, instructionLimit: 100_000 });
  if (nestedBudget.state !== -1 ||
      !nestedBudget.result.error?.includes('instruction budget'))
    throw new Error(`${name} debug.sethook bypassed nested-coroutine limits: ${JSON.stringify(nestedBudget)}`);
  const fullAccess = executeSource(host, hostHeap, `
    local count = 0
    for i = 1, 5000000 do count = count + 1 end
    local binary = assert(load(string.dump(function() return 42 end, true)))
    return count, binary(), type(debug)
  `, { profile: 2, heapLimit: 0, instructionLimit: 0 });
  if (fullAccess.state !== 0 || fullAccess.result[0]?.bigint !== '5000000' ||
      fullAccess.result[1]?.bigint !== '42' || fullAccess.result[2] !== 'table')
    throw new Error(`${name} full-access did not remove VM quotas or expose trusted libraries: ${JSON.stringify(fullAccess)}`);
  const unlimitedOutput = executeSource(host, hostHeap,
    'print(string.rep("x", 16 * 1024 * 1024 + 1)); return true',
    { profile: 2, heapLimit: 0, instructionLimit: 0 });
  if (unlimitedOutput.state !== 0 || unlimitedOutput.result[0] !== true ||
      unlimitedOutput.output.length <= 16 * 1024 * 1024)
    throw new Error(`${name} full-access retained the trusted output quota.`);
}

const wasmtime = path.join(root, '.tools', 'wasmtime-48.0.2',
  process.platform === 'win32' ? 'wasmtime.exe' : 'wasmtime');
const output = execFileSync(wasmtime, [
  'run', '-W', 'exceptions=y', '--invoke', 'wlua_abi_version',
  path.join(root, 'public', 'wasm', 'wasi-lua-runtime.wasm')
], { encoding: 'utf8' });
if (!output.includes('65536')) throw new Error('Wasmtime ABI handshake failed.');

console.log('Emscripten/WASI differential, security and Wasmtime smoke tests passed.');
