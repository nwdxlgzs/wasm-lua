import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'official.spec.js',
  timeout: 70_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    headless: true,
    launchOptions: process.platform === 'win32' ? {
      executablePath: process.env.WLUA_CHROMIUM_PATH ??
        'C:/Program Files/Google/Chrome/Application/chrome.exe'
    } : {}
  },
  webServer: {
    command: 'vite --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/tests/e2e/official-browser.html',
    reuseExistingServer: false,
    timeout: 60_000
  }
});
