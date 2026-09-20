import { WASI } from '@bjorn3/browser_wasi_shim';

function normalizeExports(exports, memory, heapView = null) {
  const get = name => exports[name] ?? exports['_' + name];
  return {
    memory,
    heapView,
    abiVersion: get('wlua_abi_version'),
    create: get('wlua_create'),
    destroy: get('wlua_destroy'),
    alloc: get('wlua_alloc'),
    free: get('wlua_free'),
    run: get('wlua_run'),
    call: get('wlua_call'),
    get: get('wlua_get'),
    set: get('wlua_set'),
    check: get('wlua_check'),
    resume: get('wlua_resume'),
    resumeFiltered: get('wlua_debug_resume_filtered'),
    resumeValue: get('wlua_resume_value'),
    outputPtr: get('wlua_output_ptr'),
    outputLen: get('wlua_output_len'),
    outputClear: get('wlua_output_clear'),
    resultPtr: get('wlua_result_ptr'),
    resultLen: get('wlua_result_len'),
    currentLine: get('wlua_current_line'),
    pauseReason: get('wlua_debug_pause_reason'),
    capabilityToken: get('wlua_capability_token'),
    setBreakpoints: get('wlua_debug_set_breakpoints'),
    setBreakpointRanges: get('wlua_debug_set_breakpoint_ranges'),
    stack: get('wlua_debug_stack'),
    variables: get('wlua_debug_variables'),
    evaluate: get('wlua_debug_evaluate'),
    setVariable: get('wlua_debug_set_variable'),
    jsonLen: get('wlua_debug_json_len'),
    releaseRef: get('wlua_ref_release')
  };
}

export async function loadBackend(kind, debug, assetBaseUrl = '/wasm/') {
  const flavor = debug ? 'debug' : 'runtime';
  const base = new URL(assetBaseUrl.endsWith('/')
    ? assetBaseUrl : assetBaseUrl + '/', self.location.origin);
  const required = kind === 'emscripten'
    ? [`emscripten-lua-${flavor}.mjs`, `emscripten-lua-${flavor}.wasm`]
    : [`wasi-lua-${flavor}.wasm`];
  try {
    const response = await fetch(new URL('manifest.json', base));
    if (response.ok) {
      const manifest = await response.json();
      const missing = required.filter(name => !manifest.artifacts?.[name]);
      if (missing.length)
        throw new Error(`当前 release 未包含 ${kind}-${flavor} 变体（缺少 ` +
          `${missing.join('、')}）。请重新生成 release 或选择已包含的变体。`);
    }
  } catch (error) {
    if (String(error?.message ?? error).includes('当前 release 未包含')) throw error;
  }
  if (kind === 'emscripten') {
    const url = new URL('emscripten-lua-' + flavor + '.mjs', base);
    const factory = (await import(/* @vite-ignore */ url.href)).default;
    const module = await factory({
      locateFile: file => new URL('emscripten-lua-' + flavor +
        (file.endsWith('.wasm') ? '.wasm' : '-' + file), base).href
    });
    return normalizeExports(module, null, () => module.HEAPU8);
  }
  const wasi = new WASI(['wasm-lua'], [], []);
  const response = await fetch(new URL('wasi-lua-' + flavor + '.wasm', base));
  const compiled = await WebAssembly.compileStreaming(response);
  const instance = await WebAssembly.instantiate(compiled, {
    wasi_snapshot_preview1: wasi.wasiImport
  });
  wasi.initialize(/** @type {any} */ (instance));
  const exports = /** @type {Record<string, WebAssembly.ExportValue> & {memory: WebAssembly.Memory}} */ (
    /** @type {unknown} */ (instance.exports));
  return normalizeExports(exports, exports.memory);
}

export function heap(backend) {
  if (backend.heapView) return backend.heapView();
  const memory = backend.memory instanceof WebAssembly.Memory
    ? backend.memory.buffer : backend.memory;
  return new Uint8Array(memory);
}
