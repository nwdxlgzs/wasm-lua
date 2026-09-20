import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, sha256 } from './lib.mjs';

const toolLock = JSON.parse(await readFile(path.join(root, 'tools.lock.json'), 'utf8'));

const allowed = new Set([
  'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0',
  'Apache-2.0 WITH LLVM-exception', 'NCSA', 'Zlib', 'CC0-1.0',
  'Python-2.0', 'PSF-2.0'
]);
const choices = new Map([
  ['(MPL-2.0 OR Apache-2.0)', 'Apache-2.0'],
  ['MIT OR Apache-2.0', 'MIT']
]);
const raw = execFileSync(process.env.ComSpec ?? 'cmd.exe', [
  '/d', '/s', '/c', 'pnpm licenses list --json --long'
], {
  cwd: root,
  encoding: 'utf8'
});
const grouped = JSON.parse(raw);
const packages = [];
const violations = [];
for (const [expression, entries] of Object.entries(grouped)) {
  const selected = choices.get(expression) ?? expression;
  if (!allowed.has(selected)) violations.push(expression);
  for (const entry of entries) {
    for (const version of entry.versions)
      packages.push({ ...entry, version, expression, selectedLicense: selected });
  }
}
if (violations.length)
  throw new Error('Non-permissive or unknown licenses: ' +
    [...new Set(violations)].join(', '));

packages.sort((a, b) =>
  (a.name + a.version).localeCompare(b.name + b.version));
const luaLicense = [
  'Lua 5.5.1',
  'Copyright (c) 1994-2026 Lua.org, PUC-Rio.',
  'License: MIT',
  'Source archive SHA-256: 1c4b4068d67061f2a2231ad2b5422e77acea1487ea9890f6320af614f4373dce'
].join('\n');
const nativeTools = [
  {
    name: 'Emscripten', version: toolLock.emscripten.version,
    license: 'MIT AND NCSA', download: toolLock.emscripten.repository
  },
  {
    name: 'WASI SDK', version: toolLock.wasiSdk.version,
    license: 'Apache-2.0 WITH LLVM-exception',
    download: toolLock.wasiSdk.windowsX64, sha256: toolLock.wasiSdk.sha256
  },
  {
    name: 'Wasmtime', version: toolLock.wasmtime.version,
    license: 'Apache-2.0 WITH LLVM-exception',
    download: toolLock.wasmtime.windowsX64, sha256: toolLock.wasmtime.sha256
  },
  {
    name: 'Ninja', version: toolLock.ninja.version,
    license: 'Apache-2.0', download: toolLock.ninja.windowsX64,
    sha256: toolLock.ninja.sha256
  }
];
const notices = [
  'THIRD-PARTY SOFTWARE NOTICES',
  'Generated from pnpm-lock.yaml. The containing product remains proprietary.',
  '',
  luaLicense,
  '',
  'NATIVE BUILD AND TEST TOOLCHAIN',
  ...nativeTools.map(item => [
    `${item.name}@${item.version}`,
    `License: ${item.license}`,
    `Source: ${item.download}`,
    item.sha256 ? `Archive SHA-256: ${item.sha256}` : ''
  ].filter(Boolean).join('\n')),
  '',
  ...packages.map(item => [
    item.name + '@' + item.version,
    'License: ' + item.selectedLicense +
      (item.selectedLicense !== item.expression
        ? ' (selected from ' + item.expression + ')' : ''),
    item.homepage ? 'Homepage: ' + item.homepage : '',
    ''
  ].filter(Boolean).join('\n'))
].join('\n');

const licenseDir = path.join(root, 'public', 'licenses');
await rm(licenseDir, { recursive: true, force: true });
await mkdir(licenseDir, { recursive: true });
await cp(path.join(root, 'vendor', 'lua-5.5.1', 'doc', 'readme.html'),
  path.join(licenseDir, 'Lua-5.5.1-LICENSE.html'));
await cp(path.join(root, '.tools', 'emsdk', 'upstream', 'emscripten', 'LICENSE'),
  path.join(licenseDir, 'Emscripten-6.0.9-LICENSE.txt'));
const wasiLicense = path.join(root, '.tools', 'cache',
  `wasi-sdk-${toolLock.wasiSdk.version}-LICENSE`);
const wasmtimeLicense = path.join(root, '.tools', 'cache',
  `wasmtime-${toolLock.wasmtime.version}-LICENSE`);
if (await sha256(wasiLicense) !== toolLock.wasiSdk.licenseSha256 ||
    await sha256(wasmtimeLicense) !== toolLock.wasmtime.licenseSha256)
  throw new Error('Pinned WASI SDK/Wasmtime license hash mismatch. Run pnpm bootstrap.');
await cp(wasiLicense, path.join(licenseDir,
  `WASI-SDK-${toolLock.wasiSdk.version}-LICENSE.txt`));
await cp(wasmtimeLicense, path.join(licenseDir,
  `Wasmtime-${toolLock.wasmtime.version}-LICENSE.txt`));
const ninjaLicense = path.join(root, '.tools', 'cache',
  `ninja-${toolLock.ninja.version}-COPYING`);
if (await sha256(ninjaLicense) !== toolLock.ninja.licenseSha256)
  throw new Error('Pinned Ninja license hash does not match. Run pnpm bootstrap.');
await cp(ninjaLicense, path.join(licenseDir,
  `Ninja-${toolLock.ninja.version}-LICENSE.txt`));

const copiedLicenses = new Set();
for (const item of packages) {
  const key = item.name + '@' + item.version;
  if (copiedLicenses.has(key)) continue;
  for (const packagePath of item.paths ?? []) {
    try {
      const manifest = JSON.parse(await readFile(
        path.join(packagePath, 'package.json'), 'utf8'));
      if (manifest.version !== item.version) continue;
      const names = await readdir(packagePath);
      const licenseName = names.find(name =>
        /^(licen[cs]e|copying|notice)([._-]|$)/i.test(name));
      if (!licenseName) continue;
      const safeName = key.replace(/[^A-Za-z0-9@._+-]/g, '_');
      await cp(path.join(packagePath, licenseName),
        path.join(licenseDir, safeName + '-' + licenseName));
      copiedLicenses.add(key);
      break;
    } catch { /* try the next installed path */ }
  }
}

function packageEntry(name, version) {
  return packages.find(item => item.name === name &&
    (version === undefined || item.version === version));
}

async function copyInheritedLicense(target, sourceName, sourceVersion) {
  const source = packageEntry(sourceName, sourceVersion);
  if (!source) throw new Error(`License source package is missing: ${sourceName}`);
  for (const packagePath of source.paths ?? []) {
    try {
      const names = await readdir(packagePath);
      const licenseName = names.find(name =>
        /^(licen[cs]e|copying|notice)([._-]|$)/i.test(name));
      if (!licenseName) continue;
      const safeName = target.replace(/[^A-Za-z0-9@._+-]/g, '_');
      await cp(path.join(packagePath, licenseName),
        path.join(licenseDir, safeName + '-' + licenseName));
      copiedLicenses.add(target);
      return;
    } catch { /* try another installed path */ }
  }
  throw new Error(`Cannot locate inherited license for ${target} from ${sourceName}.`);
}

for (const item of packages) {
  const key = item.name + '@' + item.version;
  if (copiedLicenses.has(key)) continue;
  if (item.name.startsWith('@esbuild/'))
    await copyInheritedLicense(key, 'esbuild', item.version);
  else if (item.name.startsWith('@rollup/'))
    await copyInheritedLicense(key, 'rollup', item.version);
  else if (item.name === '@lit-labs/ssr-dom-shim')
    await copyInheritedLicense(key, 'lit');
  else if (item.name === 'stackback' && item.selectedLicense === 'MIT') {
    const canonicalMit = `Copyright (c) Roman Shtylman

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    await writeFile(path.join(licenseDir, 'stackback@0.0.2-LICENSE-MIT.txt'),
      canonicalMit);
    copiedLicenses.add(key);
  }
}
const missingLicenseCopies = [...new Set(packages.map(item =>
  item.name + '@' + item.version))].filter(key => !copiedLicenses.has(key));
if (missingLicenseCopies.length)
  throw new Error('Missing third-party license copies: ' +
    missingLicenseCopies.join(', '));

const spdx = {
  spdxVersion: 'SPDX-2.3',
  dataLicense: 'CC0-1.0',
  SPDXID: 'SPDXRef-DOCUMENT',
  name: 'wasm-lua-workbench',
  documentNamespace: 'https://local.invalid/spdx/wasm-lua/' + Date.now(),
  creationInfo: {
    created: new Date().toISOString(),
    creators: ['Tool: scripts/compliance.mjs']
  },
  packages: [
    {
      name: 'Lua',
      SPDXID: 'SPDXRef-Package-Lua',
      versionInfo: '5.5.1',
      downloadLocation: 'https://www.lua.org/ftp/lua-5.5.1.tar.gz',
      licenseConcluded: 'MIT',
      licenseDeclared: 'MIT',
      checksums: [{
        algorithm: 'SHA256',
        checksumValue: '1c4b4068d67061f2a2231ad2b5422e77acea1487ea9890f6320af614f4373dce'
      }]
    },
    ...nativeTools.map((item, index) => ({
      name: item.name,
      SPDXID: 'SPDXRef-NativeTool-' + index,
      versionInfo: item.version,
      downloadLocation: item.download,
      licenseConcluded: item.license,
      licenseDeclared: item.license,
      checksums: item.sha256 ? [{
        algorithm: 'SHA256', checksumValue: item.sha256
      }] : undefined,
      primaryPackagePurpose: 'BUILD_TOOL'
    })),
    ...packages.map((item, index) => ({
      name: item.name,
      SPDXID: 'SPDXRef-Package-' + index,
      versionInfo: item.version,
      downloadLocation: item.homepage || 'NOASSERTION',
      licenseConcluded: item.selectedLicense,
      licenseDeclared: item.expression
    }))
  ]
};

await mkdir(path.join(root, 'public'), { recursive: true });
await writeFile(
  path.join(root, 'public', 'THIRD_PARTY_NOTICES.txt'), notices + '\n');
await writeFile(path.join(root, 'public', 'SBOM.spdx.json'),
  JSON.stringify(spdx, null, 2) + '\n');
if (existsSync(path.join(root, 'dist'))) {
  await writeFile(
    path.join(root, 'dist', 'THIRD_PARTY_NOTICES.txt'), notices + '\n');
  await writeFile(
    path.join(root, 'dist', 'SBOM.spdx.json'),
    JSON.stringify(spdx, null, 2) + '\n');
  await rm(path.join(root, 'dist', 'licenses'), { recursive: true, force: true });
  await cp(licenseDir, path.join(root, 'dist', 'licenses'), { recursive: true });
}
console.log('License policy passed for ' + packages.length +
  ` package/version entries; ${copiedLicenses.size + 5} license copies emitted.`);
