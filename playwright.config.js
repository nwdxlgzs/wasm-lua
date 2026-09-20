import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: 'official.spec.js',
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    launchOptions: process.platform === 'win32' ? {
      executablePath: process.env.WLUA_CHROMIUM_PATH ??
        'C:/Program Files/Google/Chrome/Application/chrome.exe'
    } : {}
  },
  webServer: {
    command: 'pnpm preview',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: true,
    timeout: 60_000
  }
});
