import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { root, run } from './lib.mjs';

const matrixRoot = path.resolve(root, 'build', 'release-matrix');
if (path.dirname(matrixRoot) !== path.resolve(root, 'build'))
  throw new Error('Release matrix temporary directory escaped build/.');

const cases = [
  { name: 'all', args: [], expected: [
    'emscripten-runtime', 'emscripten-debug', 'wasi-runtime', 'wasi-debug'
  ] },
  { name: 'emscripten-runtime', args: ['--variants=emscripten-runtime'],
    expected: ['emscripten-runtime'] },
  { name: 'mixed', args: ['--variants=emscripten-debug,wasi-runtime'],
    expected: ['emscripten-debug', 'wasi-runtime'] },
  { name: 'wasi-runtime-filter', args: ['--backend=wasi', '--flavor=runtime'],
    expected: ['wasi-runtime'] }
];

try {
  for (const item of cases) {
    const output = path.join(matrixRoot, item.name);
    const relative = path.relative(root, output);
    await run(process.execPath, [path.join(root, 'scripts', 'release.mjs'),
      ...item.args, `--output=${relative}`]);
    const profile = JSON.parse(await readFile(path.join(output, 'release.json'), 'utf8'));
    if (JSON.stringify(profile.variants) !== JSON.stringify(item.expected))
      throw new Error(`${item.name}: unexpected variants ${profile.variants.join(', ')}`);
    const manifest = JSON.parse(await readFile(path.join(output, 'runtime',
      'wasm', 'manifest.json'), 'utf8'));
    const expectedFiles = new Set(item.expected.flatMap(variant =>
      profile.artifacts[variant]));
    if (Object.keys(manifest.artifacts).some(file => !expectedFiles.has(file)) ||
        existsSync(path.join(output, 'editor', 'wasm')))
      throw new Error(`${item.name}: release is not single-owner/correctly pruned.`);
  }
  console.log(`Selective release matrix passed (${cases.length} profiles).`);
} finally {
  await rm(matrixRoot, { recursive: true, force: true });
}
