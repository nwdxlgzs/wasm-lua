import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { root, run } from './lib.mjs';

function option(name) {
  const exact = process.argv.slice(2).find(value => value.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const release = path.resolve(root, option('output') ?? 'release');
const relativeRelease = path.relative(root, release);
if (!relativeRelease || relativeRelease.startsWith('..') || path.isAbsolute(relativeRelease))
  throw new Error('--output 必须是工作区内且不能等于工作区根目录。');

const required = [
  'package.json', 'README.md', 'CAPABILITIES.md', 'release.json',
  'integrity.json', 'SBOM.spdx.json', 'THIRD_PARTY_NOTICES.txt',
  'runtime/wasm-lua.js', 'runtime/wasm/manifest.json',
  'runtime/types/index.d.ts', 'editor/wasm-lua-editor.js',
  'editor/wasm-lua-editor.css', 'editor/types/ui/index.d.ts',
  'editor/grammar/tree-sitter.wasm', 'editor/grammar/tree-sitter-lua.wasm'
];
for (const file of required)
  if (!existsSync(path.join(release, file))) throw new Error(`Release missing ${file}`);
for (const legacy of ['sdk', 'ui', 'types'])
  if (existsSync(path.join(release, legacy)))
    throw new Error(`Release contains obsolete duplicate package: ${legacy}`);
if (existsSync(path.join(release, 'editor', 'wasm')))
  throw new Error('Editor must not own or duplicate the runtime WASM directory.');
if (existsSync(path.join(release, 'editor', 'types', 'sdk')))
  throw new Error('Editor must not duplicate runtime declarations.');
if (existsSync(path.join(release, 'runtime', 'grammar')))
  throw new Error('Runtime-only package must not contain editor grammar assets.');

const integrity = JSON.parse(await readFile(path.join(release, 'integrity.json'), 'utf8'));
const profile = JSON.parse(await readFile(path.join(release, 'release.json'), 'utf8'));
const knownVariants = new Set([
  'emscripten-runtime', 'emscripten-debug', 'wasi-runtime', 'wasi-debug'
]);
if (profile.architecture !== 'runtime-editor-site' ||
    profile.runtime !== 'runtime/wasm-lua.js' ||
    profile.editor !== 'editor/wasm-lua-editor.js' ||
    !profile.variants?.length || profile.variants.some(value => !knownVariants.has(value)) ||
    JSON.stringify(profile.variants) !== JSON.stringify(integrity.variants))
  throw new Error('Release architecture or variant profile is invalid/inconsistent.');

const wasmDirectory = path.join(release, 'runtime', 'wasm');
const manifest = JSON.parse(await readFile(path.join(wasmDirectory, 'manifest.json'), 'utf8'));
const expectedArtifacts = new Set(profile.variants.flatMap(
  variant => profile.artifacts[variant]));
if ([...expectedArtifacts].some(name => !manifest.artifacts[name]) ||
    Object.keys(manifest.artifacts).some(name => !expectedArtifacts.has(name)) ||
    JSON.stringify(manifest.releaseVariants) !== JSON.stringify(profile.variants))
  throw new Error('runtime/wasm manifest does not match the release variants.');
for (const name of expectedArtifacts)
  if (!existsSync(path.join(wasmDirectory, name)))
    throw new Error(`runtime/wasm is missing selected artifact ${name}.`);

const editorEntry = await readFile(path.join(release, 'editor',
  'wasm-lua-editor.js'), 'utf8');
if (!editorEntry.includes('../runtime/wasm-lua.js'))
  throw new Error('Editor is not externally linked to the sibling runtime entry.');

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

const actualFiles = await filesBelow(release);
const hashedFiles = actualFiles.filter(file => file.relative !== 'integrity.json');
if (JSON.stringify(hashedFiles.map(file => file.relative).sort()) !==
    JSON.stringify(Object.keys(integrity.files).sort()))
  throw new Error('integrity.json does not enumerate the complete release.');
for (const file of hashedFiles) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file.absolute)) hash.update(chunk);
  if (hash.digest('hex') !== integrity.files[file.relative])
    throw new Error(`Release hash mismatch: ${file.relative}`);
}

for (const { relative, absolute } of actualFiles) {
  if (relative.endsWith('.map') ||
      (relative.endsWith('.html') && !relative.split('/').includes('licenses')) ||
      /lua-5\.5\.1-tests|lua-official/i.test(absolute))
    throw new Error(`Forbidden release artifact: ${absolute}`);
}

await run(process.execPath, [
  path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
  '--noEmit', '--strict', '--skipLibCheck', 'false', '--target', 'ES2024',
  '--module', 'ESNext', '--moduleResolution', 'Bundler',
  '--lib', 'ES2024,DOM,DOM.Iterable,ESNext.Disposable',
  path.join(release, 'runtime', 'types', 'index.d.ts'),
  path.join(release, 'editor', 'types', 'ui', 'index.d.ts')
]);
console.log(`Release package verified: ${profile.variants.join(', ')}, ` +
  `${hashedFiles.length} files; one runtime, externally linked editor, complete ` +
  'integrity, no duplicate WASM/types, demo pages, source maps or test sources.');
