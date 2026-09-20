import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, run } from './lib.mjs';

const site = path.join(root, 'build', 'site');
const dist = path.join(root, 'dist');
await rm(site, { recursive: true, force: true });
await run(process.execPath, [
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  'build', '--config', path.join(root, 'vite.config.js')
]);
// Keep the dist directory itself stable. Windows preview servers and file
// watchers can hold a directory handle even after they stop serving, while
// still allowing every child to be replaced safely.
await mkdir(dist, { recursive: true });
for (const entry of await readdir(dist)) {
  const target = path.resolve(dist, entry);
  if (path.dirname(target) !== path.resolve(dist))
    throw new Error(`dist 清理目标逃逸：${target}`);
  await rm(target, { recursive: true, force: true });
}
await cp(site, dist, { recursive: true });
await cp(path.join(root, 'release'), path.join(dist, 'release'), {
  recursive: true
});
// Disable Jekyll processing so GitHub Pages serves the release byte-for-byte.
await writeFile(path.join(dist, '.nojekyll'), '');
console.log('Distribution site emitted from the verified release package.');
