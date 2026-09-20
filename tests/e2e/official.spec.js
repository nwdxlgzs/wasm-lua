import { expect, test } from '@playwright/test';

test('官方 Lua 5.5.1 套件通过浏览器 Emscripten 与 WASI shim', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tests/e2e/official-browser.html');
  await expect.poll(() => page.evaluate(() => globalThis.officialResults), {
    timeout: 60_000,
    intervals: [250, 500, 1000]
  }).toMatchObject({
    emscripten: { state: 'passed' },
    wasi: { state: 'passed' }
  });
  expect(errors).toEqual([]);
});
