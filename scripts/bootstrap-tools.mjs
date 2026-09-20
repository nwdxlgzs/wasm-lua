import { existsSync } from 'node:fs';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, fileHash, root, run, runOutput, sha256 } from './lib.mjs';

const lock = JSON.parse(await readFile(path.join(root, 'tools.lock.json'), 'utf8'));
const tools = path.join(root, '.tools');
const cache = path.join(tools, 'cache');
await ensureDir(cache);

const emsdk = path.join(tools, 'emsdk');
if (!existsSync(path.join(emsdk, 'emsdk.bat'))) {
  await run('git', ['clone', '--depth', '1', '--branch', lock.emscripten.version, lock.emscripten.repository, emsdk]);
}
const emsdkCommit = await runOutput('git', ['rev-parse', 'HEAD'], { cwd: emsdk });
if (emsdkCommit !== lock.emscripten.repositoryCommit) {
  throw new Error(`emsdk commit mismatch: expected ${lock.emscripten.repositoryCommit}, got ${emsdkCommit}`);
}
const emcc = path.join(emsdk, 'upstream', 'emscripten',
  process.platform === 'win32' ? 'emcc.exe' : 'emcc');
const emConfig = path.join(emsdk, '.emscripten');
if (!existsSync(emcc)) {
  await run('cmd.exe', ['/d', '/s', '/c', 'emsdk.bat', 'install', lock.emscripten.version], { cwd: emsdk });
}
// Activation is local to this checkout and keeps the install relocatable via
// $CFGDIR. Run it on every bootstrap so a moved/copied .tools remains healthy.
await run('cmd.exe', ['/d', '/s', '/c', 'emsdk.bat', 'activate', lock.emscripten.version], { cwd: emsdk });
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
  PATH: [emsdk, path.join(emsdk, 'upstream', 'emscripten'),
    process.env.PATH].join(path.delimiter)
};
const emccVersion = await runOutput(emcc, ['--version'], { env: emEnv });
if (!emccVersion.startsWith(`emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) ${lock.emscripten.version} `)) {
  throw new Error(`Unexpected local emcc version:\n${emccVersion}`);
}
console.log(emccVersion.split(/\r?\n/, 1)[0]);

const ninjaArchive = path.join(cache, `ninja-win-${lock.ninja.version}.zip`);
if (!existsSync(ninjaArchive)) {
  const response = await fetch(lock.ninja.windowsX64);
  if (!response.ok) throw new Error(`Cannot download Ninja: ${response.status}`);
  await writeFile(ninjaArchive, new Uint8Array(await response.arrayBuffer()));
}
const ninjaHash = await sha256(ninjaArchive);
if (ninjaHash !== lock.ninja.sha256) {
  throw new Error(`Ninja checksum mismatch: expected ${lock.ninja.sha256}, got ${ninjaHash}`);
}
const ninjaLicense = path.join(cache, `ninja-${lock.ninja.version}-COPYING`);
if (!existsSync(ninjaLicense)) {
  const response = await fetch(lock.ninja.licenseUrl);
  if (!response.ok) throw new Error(`Cannot download Ninja license: ${response.status}`);
  await writeFile(ninjaLicense, new Uint8Array(await response.arrayBuffer()));
}
const ninjaLicenseHash = await sha256(ninjaLicense);
if (ninjaLicenseHash !== lock.ninja.licenseSha256) {
  throw new Error(`Ninja license checksum mismatch: expected ${lock.ninja.licenseSha256}, got ${ninjaLicenseHash}`);
}
const ninjaRoot = path.join(tools, `ninja-${lock.ninja.version}`);
await ensureDir(ninjaRoot);
if (!existsSync(path.join(ninjaRoot, 'ninja.exe'))) {
  await run('tar', ['-xf', ninjaArchive, '-C', ninjaRoot]);
}

const wasmtimeArchive = path.join(cache,
  `wasmtime-v${lock.wasmtime.version}-x86_64-windows.zip`);
if (!existsSync(wasmtimeArchive)) {
  const response = await fetch(lock.wasmtime.windowsX64);
  if (!response.ok) throw new Error(`Cannot download Wasmtime: ${response.status}`);
  await writeFile(wasmtimeArchive, new Uint8Array(await response.arrayBuffer()));
}
const wasmtimeHash = await sha256(wasmtimeArchive);
if (wasmtimeHash !== lock.wasmtime.sha256) {
  throw new Error(`Wasmtime checksum mismatch: expected ${lock.wasmtime.sha256}, got ${wasmtimeHash}`);
}
const wasmtimeLicense = path.join(cache, `wasmtime-${lock.wasmtime.version}-LICENSE`);
if (!existsSync(wasmtimeLicense)) {
  const response = await fetch(lock.wasmtime.licenseUrl);
  if (!response.ok) throw new Error(`Cannot download Wasmtime license: ${response.status}`);
  await writeFile(wasmtimeLicense, new Uint8Array(await response.arrayBuffer()));
}
const wasmtimeLicenseHash = await sha256(wasmtimeLicense);
if (wasmtimeLicenseHash !== lock.wasmtime.licenseSha256)
  throw new Error('Wasmtime license checksum mismatch.');
const wasmtimeRoot = path.join(tools, `wasmtime-${lock.wasmtime.version}`);
if (!existsSync(path.join(wasmtimeRoot, 'wasmtime.exe'))) {
  const staging = path.join(tools, '.wasmtime-staging');
  await ensureDir(staging);
  await run('tar', ['-xf', wasmtimeArchive, '-C', staging]);
  const extracted = path.join(staging,
    `wasmtime-v${lock.wasmtime.version}-x86_64-windows`);
  await ensureDir(wasmtimeRoot);
  await cp(
    path.join(extracted, process.platform === 'win32' ? 'wasmtime.exe' : 'wasmtime'),
    path.join(wasmtimeRoot, process.platform === 'win32' ? 'wasmtime.exe' : 'wasmtime')
  );
  await rm(staging, { recursive: true, force: true });
}

const wasiArchive = path.join(cache, path.basename(new URL(lock.wasiSdk.windowsX64).pathname));
if (!existsSync(wasiArchive)) {
  const response = await fetch(lock.wasiSdk.windowsX64);
  if (!response.ok) throw new Error(`Cannot download WASI SDK: ${response.status}`);
  await writeFile(wasiArchive, new Uint8Array(await response.arrayBuffer()));
}
const wasiHash = await sha256(wasiArchive);
if (wasiHash !== lock.wasiSdk.sha256) {
  throw new Error(`WASI SDK checksum mismatch: expected ${lock.wasiSdk.sha256}, got ${wasiHash}`);
}
const wasiLicense = path.join(cache, `wasi-sdk-${lock.wasiSdk.version}-LICENSE`);
if (!existsSync(wasiLicense)) {
  const response = await fetch(lock.wasiSdk.licenseUrl);
  if (!response.ok) throw new Error(`Cannot download WASI SDK license: ${response.status}`);
  await writeFile(wasiLicense, new Uint8Array(await response.arrayBuffer()));
}
const wasiLicenseHash = await sha256(wasiLicense);
if (wasiLicenseHash !== lock.wasiSdk.licenseSha256)
  throw new Error('WASI SDK license checksum mismatch.');
const wasiRoot = path.join(tools, `wasi-sdk-${lock.wasiSdk.version}-x86_64-windows`);
if (!existsSync(path.join(wasiRoot, 'bin', 'clang.exe'))) {
  await run('tar', ['-xzf', wasiArchive, '-C', tools]);
}

const luaTestsArchive = path.join(cache, lock.luaTests.archive);
if (!existsSync(luaTestsArchive)) {
  const response = await fetch(lock.luaTests.url);
  if (!response.ok) throw new Error(`Cannot download Lua tests: ${response.status}`);
  await writeFile(luaTestsArchive, new Uint8Array(await response.arrayBuffer()));
}
const luaTestsHash = await sha256(luaTestsArchive);
if (luaTestsHash !== lock.luaTests.sha256) {
  throw new Error(`Lua tests checksum mismatch: expected ${lock.luaTests.sha256}, got ${luaTestsHash}`);
}
const grammarArchive = path.join(cache,
  `tree-sitter-lua-${lock.treeSitterLua.version}.tgz`);
if (!existsSync(grammarArchive)) {
  const response = await fetch(lock.treeSitterLua.packageUrl);
  if (!response.ok) throw new Error(`Cannot download tree-sitter Lua: ${response.status}`);
  await writeFile(grammarArchive, new Uint8Array(await response.arrayBuffer()));
}
const grammarArchiveHash = await fileHash(grammarArchive, 'sha512');
if (grammarArchiveHash !== lock.treeSitterLua.packageSha512) {
  throw new Error(`Tree-sitter Lua archive checksum mismatch: expected ${lock.treeSitterLua.packageSha512}, got ${grammarArchiveHash}`);
}
const grammarPackage = path.join(cache,
  `tree-sitter-lua-${lock.treeSitterLua.version}-package`);
if (!existsSync(path.join(grammarPackage, 'package', 'grammar.js'))) {
  await ensureDir(grammarPackage);
  await run('tar', ['-xzf', grammarArchive, '-C', grammarPackage]);
}
const grammarHash = await sha256(path.join(grammarPackage, 'package', 'grammar.js'));
if (grammarHash !== lock.treeSitterLua.grammarSha256) {
  throw new Error(`Tree-sitter Lua grammar checksum mismatch: expected ${lock.treeSitterLua.grammarSha256}, got ${grammarHash}`);
}
const luaTestsRoot = path.join(root, 'vendor', `lua-${lock.luaTests.version}-tests`);
if (!existsSync(path.join(luaTestsRoot, 'all.lua'))) {
  await rm(luaTestsRoot, { recursive: true, force: true });
  await ensureDir(path.join(root, 'vendor'));
  await run('tar', ['-xzf', luaTestsArchive, '-C', path.join(root, 'vendor')]);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  emscripten: lock.emscripten.version,
  emscriptenRepositoryCommit: emsdkCommit,
  emccVersion: emccVersion.split(/\r?\n/, 1)[0],
  wasiSdk: lock.wasiSdk.version,
  wasiArchiveSha256: wasiHash,
  wasiLicenseSha256: wasiLicenseHash,
  ninja: lock.ninja.version,
  ninjaArchiveSha256: ninjaHash,
  ninjaLicenseSha256: ninjaLicenseHash,
  wasmtime: lock.wasmtime.version,
  wasmtimeArchiveSha256: wasmtimeHash,
  wasmtimeLicenseSha256: wasmtimeLicenseHash,
  luaTests: lock.luaTests.version,
  luaTestsArchiveSha256: luaTestsHash,
  treeSitterLuaArchiveSha512: grammarArchiveHash,
  treeSitterLuaGrammarSha256: grammarHash
};
await writeFile(path.join(tools, 'manifest.local.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Local Emscripten and WASI SDK are ready in .tools/.');
