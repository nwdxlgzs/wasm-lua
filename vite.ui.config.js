import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const sdkEntry = fileURLToPath(new URL('./src/sdk/index.js', import.meta.url))
  .replaceAll('\\', '/');

function isRuntimeEntry(id) {
  return id.replaceAll('\\', '/') === sdkEntry ||
    id.replaceAll('\\', '/').endsWith('/src/sdk/index.js') ||
    id === '../sdk/index.js';
}

export default defineConfig({
  // Keep workers and chunks relative to the library entry so the distributable
  // can be mounted below any host path (for example `/vendor/wasm-lua/`).
  base: './',
  publicDir: false,
  build: {
    outDir: 'build/package/editor',
    emptyOutDir: true,
    sourcemap: false,
    target: 'chrome152',
    lib: {
      entry: fileURLToPath(new URL('./src/ui/index.js', import.meta.url)),
      formats: ['es'],
      fileName: () => 'wasm-lua-editor.js',
      cssFileName: 'wasm-lua-editor'
    },
    rollupOptions: {
      external: isRuntimeEntry,
      output: {
        paths: id => isRuntimeEntry(id) ? '../runtime/wasm-lua.js' : id,
        entryFileNames: 'wasm-lua-editor.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: asset => asset.name?.endsWith('.css')
          ? 'wasm-lua-editor.css'
          : 'assets/[name]-[hash][extname]'
      }
    }
  },
  worker: { format: 'es' }
});
