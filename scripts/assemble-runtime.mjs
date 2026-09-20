import { cp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, root } from './lib.mjs';

const target = path.join(root, 'build', 'package', 'runtime', 'wasm');
const manifest = JSON.parse(await readFile(
  path.join(root, 'public', 'wasm', 'manifest.json'), 'utf8'));
await ensureDir(target);
await cp(path.join(root, 'public', 'wasm'), target, { recursive: true });
console.log(`Runtime package assembled with ${Object.keys(manifest.artifacts).length} ` +
  'WASM/glue artifacts and one manifest.');
