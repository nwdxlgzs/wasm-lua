import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';

const dist = path.join(root, 'dist');
const release = path.join(root, 'release');
for (const name of [
  'index.html', 'playground.html', 'debugger.html', 'embedded.html',
  'licenses.html', 'release/release.json', 'release/integrity.json',
  'release/runtime/wasm-lua.js', 'release/editor/wasm-lua-editor.js'
]) if (!existsSync(path.join(dist, name)))
  throw new Error(`Production site is missing dist/${name}`);

if (existsSync(path.join(dist, 'wasm')) || existsSync(path.join(dist, 'sdk')) ||
    existsSync(path.join(dist, 'ui')))
  throw new Error('dist must consume dist/release; legacy independent SDK/UI/WASM found.');

async function filesBelow(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(absolute, relative));
    else files.push({ relative, absolute });
  }
  return files;
}

const sourceFiles = await filesBelow(release);
const siteFiles = await filesBelow(path.join(dist, 'release'));
if (JSON.stringify(sourceFiles.map(file => file.relative).sort()) !==
    JSON.stringify(siteFiles.map(file => file.relative).sort()))
  throw new Error('dist/release is not an exact file-for-file release copy.');
for (const file of sourceFiles) {
  const copy = path.join(dist, 'release', ...file.relative.split('/'));
  for (const target of [file.absolute, copy]) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(target)) hash.update(chunk);
    if (target === file.absolute) file.hash = hash.digest('hex');
    else if (hash.digest('hex') !== file.hash)
      throw new Error(`dist/release hash differs: ${file.relative}`);
  }
}

for (const page of ['index.html', 'playground.html', 'debugger.html']) {
  const html = await readFile(path.join(dist, page), 'utf8');
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)];
  if (!scripts.length) throw new Error(`${page} has no site release adapter.`);
}
const scripts = (await filesBelow(path.join(dist, 'assets')))
  .filter(file => file.relative.endsWith('.js'));
if (!scripts.length) throw new Error('dist has no thin site adapter.');
const combined = (await Promise.all(scripts.map(file => readFile(file.absolute, 'utf8'))))
  .join('\n');
if (!combined.includes('release/') || !combined.includes('wasm-lua-editor'))
  throw new Error('dist site adapter does not import the shipped release editor.');
if (combined.includes('createLuaRuntime') || combined.includes('monaco-editor'))
  throw new Error('dist site adapter appears to embed source runtime/editor code.');

for (const file of await filesBelow(dist))
  if (file.relative.endsWith('.map') || /lua-5\.5\.1-tests|lua-official/i.test(file.absolute))
    throw new Error(`Forbidden production file: ${file.absolute}`);

const sbom = JSON.parse(await readFile(
  path.join(dist, 'release', 'SBOM.spdx.json'), 'utf8'));
if (sbom.spdxVersion !== 'SPDX-2.3' || !sbom.packages?.some(item =>
  item.name === 'Lua' && item.versionInfo === '5.5.1'))
  throw new Error('Production release SPDX SBOM is incomplete.');

console.log(`Production site verified: ${sourceFiles.length} release files copied ` +
  'byte-for-byte; pages consume release/editor, with no independent SDK/UI/WASM.');
