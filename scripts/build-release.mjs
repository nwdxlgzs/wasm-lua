import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, root } from './lib.mjs';

const VARIANTS = {
  'emscripten-runtime': [
    'emscripten-lua-runtime.mjs', 'emscripten-lua-runtime.wasm'
  ],
  'emscripten-debug': [
    'emscripten-lua-debug.mjs', 'emscripten-lua-debug.wasm'
  ],
  'wasi-runtime': ['wasi-lua-runtime.wasm'],
  'wasi-debug': ['wasi-lua-debug.wasm']
};

function usage() {
  return `用法：pnpm release -- [选项]

选项：
  --variants <列表>  逗号分隔的 emscripten-runtime、emscripten-debug、
                     wasi-runtime、wasi-debug；默认 all
  --backend <列表>   emscripten、wasi 或 all
  --flavor <列表>    runtime、debug 或 all
  --output <目录>    工作区内的输出目录；默认 release
  --help             显示此帮助`;
}

function option(name) {
  const exact = process.argv.slice(2).find(value => value.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv.includes('--help')) {
  console.log(usage());
  process.exit(0);
}

const split = value => String(value ?? '').split(',').map(item => item.trim())
  .filter(Boolean);
let selected;
const variantsOption = option('variants');
if (variantsOption && variantsOption !== 'all') {
  selected = split(variantsOption);
} else {
  const backends = split(option('backend') ?? 'all');
  const flavors = split(option('flavor') ?? 'all');
  const selectedBackends = backends.includes('all') ? ['emscripten', 'wasi'] : backends;
  const selectedFlavors = flavors.includes('all') ? ['runtime', 'debug'] : flavors;
  if (selectedBackends.some(value => !['emscripten', 'wasi'].includes(value)) ||
      selectedFlavors.some(value => !['runtime', 'debug'].includes(value)))
    throw new Error(`无效的 backend/flavor。\n${usage()}`);
  selected = selectedBackends.flatMap(backend =>
    selectedFlavors.map(flavor => `${backend}-${flavor}`));
}
selected = [...new Set(selected)];
if (!selected.length || selected.some(value => !VARIANTS[value]))
  throw new Error(`无效的 WASM 变体：${selected.join(', ') || '(空)'}。\n${usage()}`);

const output = option('output') ?? 'release';
const release = path.resolve(root, output);
const relativeRelease = path.relative(root, release);
if (!relativeRelease || relativeRelease.startsWith('..') || path.isAbsolute(relativeRelease))
  throw new Error('--output 必须是工作区内且不能等于工作区根目录。');
await rm(release, { recursive: true, force: true });
await ensureDir(release);

for (const directory of ['runtime', 'editor'])
  await cp(path.join(root, 'build', 'package', directory),
    path.join(release, directory), { recursive: true });
await cp(path.join(root, 'public', 'licenses'), path.join(release, 'licenses'), {
  recursive: true
});
for (const file of ['SBOM.spdx.json', 'THIRD_PARTY_NOTICES.txt'])
  await cp(path.join(root, 'public', file), path.join(release, file));
await cp(path.join(root, 'docs', 'INTEGRATION.md'), path.join(release, 'README.md'));
await cp(path.join(root, 'docs', 'CAPABILITIES.md'),
  path.join(release, 'CAPABILITIES.md'));
await cp(path.join(root, 'release.package.json'), path.join(release, 'package.json'));

const selectedFiles = new Set(selected.flatMap(variant => VARIANTS[variant]));
const wasmDirectory = path.join(release, 'runtime', 'wasm');
const manifestFile = path.join(wasmDirectory, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
for (const artifact of Object.keys(manifest.artifacts)) {
  if (!selectedFiles.has(artifact)) {
    await rm(path.join(wasmDirectory, artifact), { force: true });
    delete manifest.artifacts[artifact];
  }
}
manifest.backends = [...new Set(selected.map(value =>
  value.startsWith('emscripten-') ? 'emscripten' : 'wasi-preview1'))];
manifest.flavors = [...new Set(selected.map(value => value.split('-').at(-1)))];
manifest.releaseVariants = selected;
await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

await writeFile(path.join(release, 'release.json'), JSON.stringify({
  schemaVersion: 1,
  luaVersion: '5.5.1',
  architecture: 'runtime-editor-site',
  runtime: 'runtime/wasm-lua.js',
  editor: 'editor/wasm-lua-editor.js',
  variants: selected,
  artifacts: Object.fromEntries(selected.map(variant => [variant, VARIANTS[variant]]))
}, null, 2) + '\n');

const packageFile = path.join(release, 'package.json');
const packageJson = JSON.parse(await readFile(packageFile, 'utf8'));
packageJson.wasmLuaRelease = { variants: selected };
await writeFile(packageFile, JSON.stringify(packageJson, null, 2) + '\n');

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

const hashes = {};
for (const file of (await filesBelow(release)).sort((a, b) =>
  a.relative.localeCompare(b.relative))) {
  if (file.relative === 'integrity.json') continue;
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file.absolute)) hash.update(chunk);
  hashes[file.relative] = hash.digest('hex');
}
await writeFile(path.join(release, 'integrity.json'), JSON.stringify({
  schemaVersion: 1,
  luaVersion: '5.5.1',
  variants: selected,
  generatedAt: new Date().toISOString(),
  files: hashes
}, null, 2) + '\n');

if (!packageJson.private) throw new Error('Release package must remain private.');
console.log(`Release library emitted at ${relativeRelease} with ` +
  `${selected.join(', ')} and ${Object.keys(hashes).length} hashed files.`);
