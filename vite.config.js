import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  publicDir: false,
  build: {
    outDir: 'build/site',
    emptyOutDir: true,
    sourcemap: false,
    target: 'chrome152',
    rollupOptions: {
      input: {
        index: new URL('./index.html', import.meta.url).pathname,
        playground: new URL('./playground.html', import.meta.url).pathname,
        debugger: new URL('./debugger.html', import.meta.url).pathname,
        embedded: new URL('./embedded.html', import.meta.url).pathname,
        blank: new URL('./blank.html', import.meta.url).pathname,
        licenses: new URL('./licenses.html', import.meta.url).pathname
      }
    }
  },
  worker: {
    format: 'es'
  },
  test: {
    include: ['tests/unit/**/*.test.js'],
    exclude: ['.tools/**', 'generated/**', 'build/**', 'dist/**']
  }
});
