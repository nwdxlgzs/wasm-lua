import path from 'node:path';
import { root, run } from './lib.mjs';

const args = process.argv.slice(2);

function option(name) {
  const exact = args.find(value => value.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

await run(process.execPath, [path.join(root, 'scripts', 'build-release.mjs'), ...args]);
if (!args.includes('--help')) {
  await run(process.execPath, [path.join(root, 'scripts', 'verify-release.mjs'),
    `--output=${option('output') ?? 'release'}`]);
}
