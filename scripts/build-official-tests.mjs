import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { root, run } from './lib.mjs';

const lock = JSON.parse(await readFile(path.join(root, 'tools.lock.json'), 'utf8'));
await run(process.execPath, [path.join(root, 'scripts', 'prepare-lua-tests.mjs')]);
const suite = path.join(root, 'vendor', `lua-${lock.luaTests.version}-tests`, 'all.lua');
if (!existsSync(suite)) throw new Error('Official Lua suite is missing. Run pnpm bootstrap.');

const emsdk = path.join(root, '.tools', 'emsdk');
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
const ninja = path.join(root, '.tools', `ninja-${lock.ninja.version}`,
  process.platform === 'win32' ? 'ninja.exe' : 'ninja');
const wasiRoot = path.join(root, '.tools',
  `wasi-sdk-${lock.wasiSdk.version}-x86_64-windows`);
const output = path.join(root, 'build', 'official');
await mkdir(output, { recursive: true });

for (const target of ['emscripten', 'wasi']) {
  const build = path.join(output, target);
  await rm(build, { recursive: true, force: true });
  const args = ['-S', root, '-B', build, '-G', 'Ninja',
    `-DCMAKE_MAKE_PROGRAM=${ninja}`, `-DWLUA_TARGET=${target}`,
    '-DWLUA_BUILD_OFFICIAL_TEST_RUNNER=ON', '-DCMAKE_BUILD_TYPE=Release'];
  if (target === 'emscripten')
    args.push(`-DCMAKE_TOOLCHAIN_FILE=${path.join(emsdk, 'upstream', 'emscripten', 'cmake', 'Modules', 'Platform', 'Emscripten.cmake')}`);
  else {
    args.push(`-DCMAKE_TOOLCHAIN_FILE=${path.join(root, 'cmake', 'wasi-sdk.cmake')}`);
    args.push(`-DWASI_SDK_ROOT=${wasiRoot}`);
  }
  await run('cmake', args, target === 'emscripten' ? { env: emEnv } : {});
  await run('cmake', ['--build', build, '--target', 'lua-official', '--config', 'Release'],
    target === 'emscripten' ? { env: emEnv } : {});
}

console.log('Official Lua 5.5.1 test runners built for Emscripten and WASI.');
