import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, run } from './lib.mjs';

const types = path.join(root, 'build', 'package', 'editor', 'types');
await rm(types, { recursive: true, force: true });
await run(process.execPath, [
  path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
  '-p', path.join(root, 'jsconfig.ui-types.json')
]);
await writeFile(path.join(types, 'ui', 'styles.css.d.ts'),
  'declare const css: string;\nexport default css;\n');

// Keep one declaration graph: editor types point at the sibling runtime.
for (const relative of ['ui/controller.d.ts', 'ui/workbench.d.ts']) {
  const file = path.join(types, relative);
  let source = await readFile(file, 'utf8');
  source = source
    .replaceAll("'../sdk/index.js'", "'../../../runtime/types/index.js'")
    .replaceAll("'../sdk/runtime.js'", "'../../../runtime/types/runtime.js'")
    .replaceAll("'../sdk/capability-registry.js'",
      "'../../../runtime/types/capability-registry.js'")
    .replaceAll('"../sdk/index.js"', '"../../../runtime/types/index.js"')
    .replaceAll('"../sdk/runtime.js"', '"../../../runtime/types/runtime.js"')
    .replaceAll('"../sdk/dap.js"', '"../../../runtime/types/dap.js"')
    .replaceAll('"../sdk/capability-registry.js"',
      '"../../../runtime/types/capability-registry.js"');
  await writeFile(file, source);
}
await rm(path.join(types, 'sdk'), { recursive: true, force: true });
await rm(path.join(types, 'runtime'), { recursive: true, force: true });
