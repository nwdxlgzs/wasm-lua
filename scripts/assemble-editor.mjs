import { cp } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, root } from './lib.mjs';

const target = path.join(root, 'build', 'package', 'editor', 'grammar');
await ensureDir(target);
for (const file of ['tree-sitter.wasm', 'tree-sitter-lua.wasm'])
  await cp(path.join(root, 'public', 'grammar', file), path.join(target, file));
console.log('Editor package assembled with language grammar assets only.');
