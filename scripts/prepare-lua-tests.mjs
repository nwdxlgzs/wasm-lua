import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, root, run, sha256 } from './lib.mjs';

const lock = JSON.parse(await readFile(path.join(root, 'tools.lock.json'), 'utf8'));
const archive = path.join(root, '.tools', 'cache', lock.luaTests.archive);
const vendor = path.join(root, 'vendor');
const suite = path.join(vendor, `lua-${lock.luaTests.version}-tests`);
const patchDirectory = path.join(root, 'patches', 'lua-tests');
const actual = await sha256(archive);
if (actual !== lock.luaTests.sha256)
  throw new Error(`Lua test archive checksum mismatch: expected ${lock.luaTests.sha256}, got ${actual}`);
const patches = (await readdir(patchDirectory))
  .filter(name => name.endsWith('.patch')).sort();
await ensureDir(vendor);
await rm(suite, { recursive: true, force: true });
await run('tar', ['-xzf', archive, '-C', vendor]);
for (const name of patches) {
  const file = path.join(patchDirectory, name);
  await run('git', ['apply', '--check', '--whitespace=error-all', file], { cwd: suite });
  await run('git', ['apply', '--whitespace=error-all', file], { cwd: suite });
}
await writeFile(path.join(suite, '.wlua-tests.json'), JSON.stringify({
  version: lock.luaTests.version,
  archiveSha256: actual,
  explicitWasmSkips: patches
}, null, 2) + '\n');
console.log(`Official Lua tests prepared with ${patches.length} explicit WASM skip(s).`);
