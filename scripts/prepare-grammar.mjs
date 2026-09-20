import { existsSync } from 'node:fs';
import { cp, lstat, mkdir, readFile, readdir, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { root, run, sha256 } from './lib.mjs';

const lock = JSON.parse(await readFile(path.join(root, 'tools.lock.json'), 'utf8'));
const source = path.join(root, '.tools', 'cache',
  `tree-sitter-lua-${lock.treeSitterLua.version}-package`, 'package');
const target = path.join(root, 'generated', 'tree-sitter-lua');
const output = path.join(root, 'public', 'grammar');
const patchDirectory = path.join(root, 'patches', 'tree-sitter-lua');
const treeSitter = process.platform === 'win32'
  ? path.join(root, 'node_modules', 'tree-sitter-cli', 'tree-sitter.exe')
  : path.join(root, 'node_modules', '.bin', 'tree-sitter');
if (!existsSync(source) ||
    await sha256(path.join(source, 'grammar.js')) !== lock.treeSitterLua.grammarSha256)
  throw new Error('Pinned tree-sitter Lua package is missing or invalid. Run pnpm bootstrap.');
const packageInfo = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
if (packageInfo.version !== lock.treeSitterLua.version)
  throw new Error('Installed tree-sitter Lua version does not match tools.lock.json.');

if (existsSync(target)) {
  const info = await lstat(target);
  if (info.isSymbolicLink()) {
    // Old builds accidentally copied pnpm's directory symlink. Delete only
    // this exact link, never recursively traverse into the installed package.
    const installed = path.join(root, 'node_modules', '@tree-sitter-grammars', 'tree-sitter-lua');
    if (await realpath(target) !== await realpath(installed))
      throw new Error('Unexpected generated grammar symlink target.');
    await rm(target);
  } else {
    await rm(target, { recursive: true, force: true });
  }
}
await cp(source, target, { recursive: true, dereference: true });
if ((await lstat(target)).isSymbolicLink())
  throw new Error('Generated grammar must not alias node_modules.');
const patches = (await readdir(patchDirectory))
  .filter(name => name.endsWith('.patch')).sort();
if (!patches.length) throw new Error('Lua 5.5.1 tree-sitter patch is missing.');
for (const name of patches) {
  const patch = path.join(patchDirectory, name);
  await run('git', ['apply', '--check', '--whitespace=error-all', patch], { cwd: target });
  await run('git', ['apply', '--whitespace=error-all', patch], { cwd: target });
}
await mkdir(output, { recursive: true });
await cp(
  path.join(root, 'node_modules', 'web-tree-sitter', 'web-tree-sitter.wasm'),
  path.join(output, 'tree-sitter.wasm')
);
await run(treeSitter, ['generate'], { cwd: target });
try {
  await run(treeSitter, ['build', '--wasm', '-o', path.join(output, 'tree-sitter-lua.wasm')], { cwd: target });
} catch (error) {
  throw new Error(`Tree-sitter WASM build failed: ${error.message}`, { cause: error });
}
console.log(`Lua 5.5.1 grammar prepared with ${patches.length} patch(es).`);
