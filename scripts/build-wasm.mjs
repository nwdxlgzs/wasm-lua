import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { root, run } from './lib.mjs';

const lock = JSON.parse(await readFile(path.join(root, 'tools.lock.json'), 'utf8'));
const luaHeader = path.join(root, 'vendor', `lua-${lock.lua.version}`, 'src', 'lua.h');
if (!existsSync(luaHeader)) await run(process.execPath, [path.join(root, 'scripts', 'prepare-lua.mjs')]);

const emsdk = path.join(root, '.tools', 'emsdk');
const emToolchain = path.join(emsdk, 'upstream', 'emscripten', 'cmake', 'Modules', 'Platform', 'Emscripten.cmake');
const wasiRoot = path.join(root, '.tools', `wasi-sdk-${lock.wasiSdk.version}-x86_64-windows`);
const ninja = path.join(root, '.tools', `ninja-${lock.ninja.version}`, process.platform === 'win32' ? 'ninja.exe' : 'ninja');
if (!existsSync(emToolchain) || !existsSync(path.join(wasiRoot, 'bin', 'clang.exe'))) {
  throw new Error('Toolchains are missing. Run pnpm bootstrap first.');
}
if (!existsSync(ninja)) throw new Error('Pinned Ninja is missing. Run pnpm bootstrap first.');

const emConfig = path.join(emsdk, '.emscripten');
const emConfigText = await readFile(emConfig, 'utf8');
const emsdkValue = name => {
  const match = emConfigText.match(new RegExp(`^${name} = '([^']+)'`, 'm'));
  if (!match) throw new Error(`Missing ${name} in ${emConfig}`);
  return path.normalize(match[1].replace('$CFGDIR', emsdk));
};
const emEnv = {
  EMSDK: emsdk,
  EM_CONFIG: emConfig,
  EMSDK_NODE: emsdkValue('NODE_JS'),
  EMSDK_PYTHON: emsdkValue('PYTHON'),
  PATH: [emsdk, path.join(emsdk, 'upstream', 'emscripten'), process.env.PATH].join(path.delimiter)
};

const publicDir = path.join(root, 'public', 'wasm');
await mkdir(publicDir, { recursive: true });

const emBuild = path.join(root, 'build', 'emscripten');
await rm(emBuild, { recursive: true, force: true });
await run('cmake', ['-S', root, '-B', emBuild, '-G', 'Ninja',
  `-DCMAKE_MAKE_PROGRAM=${ninja}`, `-DCMAKE_TOOLCHAIN_FILE=${emToolchain}`,
  '-DWLUA_TARGET=emscripten', '-DCMAKE_BUILD_TYPE=Release'], { env: emEnv });
await run('cmake', ['--build', emBuild, '--config', 'Release'], { env: emEnv });

const wasiBuild = path.join(root, 'build', 'wasi');
await rm(wasiBuild, { recursive: true, force: true });
await run('cmake', ['-S', root, '-B', wasiBuild, '-G', 'Ninja',
  `-DCMAKE_MAKE_PROGRAM=${ninja}`,
  `-DCMAKE_TOOLCHAIN_FILE=${path.join(root, 'cmake', 'wasi-sdk.cmake')}`,
  `-DWASI_SDK_ROOT=${wasiRoot}`, '-DWLUA_TARGET=wasi', '-DCMAKE_BUILD_TYPE=Release']);
await run('cmake', ['--build', wasiBuild, '--config', 'Release']);

for (const name of ['lua-runtime.mjs', 'lua-runtime.wasm', 'lua-debug.mjs', 'lua-debug.wasm']) {
  await cp(path.join(emBuild, name), path.join(publicDir, `emscripten-${name}`));
}
for (const name of ['lua-runtime.wasm', 'lua-debug.wasm']) {
  await cp(path.join(wasiBuild, name), path.join(publicDir, `wasi-${name}`));
}

const artifactNames = [
  'emscripten-lua-runtime.mjs', 'emscripten-lua-runtime.wasm',
  'emscripten-lua-debug.mjs', 'emscripten-lua-debug.wasm',
  'wasi-lua-runtime.wasm', 'wasi-lua-debug.wasm'
];
const artifacts = {};
for (const name of artifactNames) {
  const file = path.join(publicDir, name);
  const bytes = await readFile(file);
  artifacts[name] = {
    bytes: (await stat(file)).size,
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
}
await writeFile(path.join(publicDir, 'manifest.json'), JSON.stringify({
  schemaVersion: 1,
  luaVersion: lock.lua.version,
  luaSourceSha256: lock.lua.sha256,
  abiVersion: '1.0',
  abiValue: 65536,
  debugProtocol: 'DAP 1.68',
  backends: ['emscripten', 'wasi-preview1'],
  flavors: ['runtime', 'debug'],
  artifacts
}, null, 2) + '\n');
console.log('Four WebAssembly artifacts and hashed manifest copied to public/wasm/.');
