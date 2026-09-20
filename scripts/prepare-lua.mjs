import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, root, run, sha256 } from './lib.mjs';

const lock = JSON.parse(await readFile(path.join(root, 'tools.lock.json'), 'utf8'));
const archive = path.join(root, lock.lua.archive);
const vendor = path.join(root, 'vendor');
const source = path.join(vendor, `lua-${lock.lua.version}`);
const patchDirectory = path.join(root, 'patches', 'lua');

const actual = await sha256(archive);
if (actual !== lock.lua.sha256) {
  throw new Error(`Lua archive checksum mismatch: expected ${lock.lua.sha256}, got ${actual}`);
}

const patches = (await readdir(patchDirectory))
  .filter(name => name.endsWith('.patch'))
  .sort();
await ensureDir(vendor);
await rm(source, { recursive: true, force: true });
await run('tar', ['-xzf', archive, '-C', vendor]);
for (const name of patches) {
  const patch = path.join(patchDirectory, name);
  await run('git', ['apply', '--check', '--whitespace=error-all', patch], {
    cwd: source
  });
  await run('git', ['apply', '--whitespace=error-all', patch], { cwd: source });
}

await writeFile(path.join(source, '.wlua-source.json'), JSON.stringify({
  version: lock.lua.version,
  archiveSha256: actual,
  patches: Object.fromEntries(await Promise.all(patches.map(async name =>
    [name, await sha256(path.join(patchDirectory, name))])))
}, null, 2) + '\n');

console.log(`Lua ${lock.lua.version} unpacked and ${patches.length} patch(es) applied (${actual}).`);
