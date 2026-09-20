import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';

const emRoot = path.join(root, 'build', 'official', 'emscripten');
const wasiWasm = path.join(root, 'build', 'official', 'wasi', 'lua-official.wasm');
if (!existsSync(path.join(emRoot, 'lua-official.mjs')) || !existsSync(wasiWasm))
  throw new Error('Official runners are missing. Run pnpm build:official.');

const output = [];
const factory = (await import(new URL(
  '../build/official/emscripten/lua-official.mjs', import.meta.url).href)).default;
const emOptions = {
  arguments: ['-e', '_U=true;_WASM=true', 'all.lua'],
  locateFile: name => path.join(emRoot, name),
  print: line => output.push(line),
  printErr: line => output.push(line)
};
// The generated preload package appends its filesystem initializer before
// preInit. Append chdir there so it runs after /tests has been materialized.
emOptions.preInit = [() => emOptions.preRun.push(
  module => module.FS.chdir('/tests'))];
try {
  await factory(emOptions);
} catch (error) {
  if (error?.status !== 0) throw error;
}
const emText = output.join('\n');
if (!emText.includes('final OK !!!'))
  throw new Error('Emscripten official suite did not reach final OK.\n' + emText.slice(-4000));

const lock = JSON.parse(await readFile(path.join(root, 'tools.lock.json'), 'utf8'));
const wasmtime = path.join(root, '.tools', `wasmtime-${lock.wasmtime.version}`,
  process.platform === 'win32' ? 'wasmtime.exe' : 'wasmtime');
const suite = path.join(root, 'vendor', `lua-${lock.luaTests.version}-tests`);
const wasmtimeOutput = await new Promise((resolve, reject) => {
  let text = '';
  const child = spawn(wasmtime, [
    'run', '-W', 'exceptions=y', '--env', 'PATH=/',
    '--dir', `${suite}::.`, wasiWasm,
    '-e', '_U=true;_WASM=true', 'all.lua'
  ], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { text += chunk; });
  child.stderr.on('data', chunk => { text += chunk; });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve(text) :
    reject(new Error(`Wasmtime official suite exited ${code}.\n${text.slice(-4000)}`)));
});
if (!wasmtimeOutput.includes('final OK !!!'))
  throw new Error('Wasmtime official suite did not reach final OK.');

const reportDir = path.join(root, 'test-results');
await mkdir(reportDir, { recursive: true });
await writeFile(path.join(reportDir, 'official-lua-5.5.1.json'), JSON.stringify({
  suiteVersion: lock.luaTests.version,
  suiteSha256: lock.luaTests.sha256,
  result: 'passed',
  hosts: ['Emscripten 6.0.9 (Node host)', `Wasmtime ${lock.wasmtime.version} / WASI Preview 1`],
  explicitAdaptations: [
    'WASM 原生 C 栈溢出压力测试跳过：宿主调用栈不可恢复。',
    '宿主文件系统、/dev/null 和进程 I/O 测试跳过：生产运行时不授予此能力。',
    '非法高位字节错误信息按 UTF-8 中文标识符补丁调整。',
    'WASI Preview 1 测试 CLI 将不可用 locale、空路径和临时文件行为正规化；不进入生产产物。'
  ]
}, null, 2) + '\n');

console.log('Official Lua 5.5.1 _U suite passed on Emscripten and Wasmtime/WASI.');
