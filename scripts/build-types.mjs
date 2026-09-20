import { rm } from 'node:fs/promises';
import path from 'node:path';
import { root, run } from './lib.mjs';

await rm(path.join(root, 'build', 'package', 'runtime', 'types'), {
  recursive: true, force: true
});
await run(process.execPath, [
  path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
  '-p', path.join(root, 'jsconfig.types.json')
]);
