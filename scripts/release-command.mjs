import path from 'node:path';
import { root, run } from './lib.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  await run(process.execPath, [path.join(root, 'scripts', 'release.mjs'), '--help']);
  process.exit(0);
}

// A user-facing release command is self-contained: it rebuilds every source
// artifact and compliance file, then selects only the requested WASM variants
// for the final package. build:release remains the non-recursive assembly step
// used by the full `pnpm build` pipeline after dist/ is already complete.
const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) throw new Error('请通过 corepack pnpm release 运行发布命令。');
for (const script of [
  'prepare:lua', 'prepare:grammar', 'build:wasm', 'build:runtime',
  'build:editor', 'compliance'
]) await run(process.execPath, [pnpmCli, script]);

await run(process.execPath, [path.join(root, 'scripts', 'release.mjs'), ...args]);
