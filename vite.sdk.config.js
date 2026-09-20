import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  publicDir: false,
  base: './',
  build: {
    outDir: 'build/package/runtime',
    emptyOutDir: true,
    sourcemap: false,
    target: 'chrome152',
    lib: {
      entry: fileURLToPath(new URL('./src/sdk/index.js', import.meta.url)),
      formats: ['es'],
      fileName: () => 'wasm-lua.js'
    },
    rollupOptions: {
      output: {
        entryFileNames: 'wasm-lua.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  worker: { format: 'es' }
});
