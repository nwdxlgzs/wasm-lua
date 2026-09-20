import { expect, test } from '@playwright/test';

const source = 'print("后端执行：", 21 * 2)\nreturn 9223372036854775807';

async function loadWorkbench(page, name) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/' + name, { waitUntil: 'domcontentloaded' });
  await page.locator('.monaco-editor').waitFor();
  await expect(page.locator('.statusbar')).toContainText('Lua 5.5.1');
  return errors;
}

test('普通运行页与独立调试页使用各自的工作台模式', async ({ page }) => {
  let errors = await loadWorkbench(page, 'playground.html');
  expect(await page.locator('lua-workbench').getAttribute('mode')).toBe('playground');
  await expect(page.getByRole('button', { name: '步过', exact: false })).toHaveCount(0);
  expect(errors).toEqual([]);

  errors = await loadWorkbench(page, 'debugger.html');
  expect(await page.locator('lua-workbench').getAttribute('mode')).toBe('debugger');
  await expect(page.getByRole('button', { name: '步过', exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const backend of ['emscripten', 'wasi']) {
  test(`普通页可在 ${backend} 执行`, async ({ page }) => {
    const errors = await loadWorkbench(page, 'index.html');
    await page.evaluate(({ backend, source }) => {
      const workbench = document.querySelector('lua-workbench');
      workbench.model.setValue(source);
      const select = workbench.querySelector('select[name="backend"]');
      select.value = backend;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, { backend, source });
    await expect(page.locator('.statusbar')).toContainText(backend.toUpperCase());
    await page.getByRole('button', { name: '▶ 运行', exact: true }).click();
    await expect(page.locator('.statusbar')).toContainText('执行完成');
    await expect(page.locator('.console')).toContainText('后端执行：\t42');
    await expect(page.locator('.console')).toContainText('9223372036854775807n');
    expect(errors).toEqual([]);
  });
}

for (const backend of ['emscripten', 'wasi']) {
  test(`${backend} 调试 VM 可重复顶层运行且拒绝恢复终态协程`, async ({ page }) => {
    const errors = await loadWorkbench(page, 'index.html');
    const result = await page.evaluate(async backend => {
      const workbench = document.querySelector('lua-workbench');
      await workbench.controller.switchOption('backend', backend);
      const runtime = workbench.runtime;
      const messages = {};
      const declared = [
        'global 问候语 <const> = "你好，Lua 5.5！"',
        'return 问候语'
      ].join('\n');
      messages.first = (await runtime.run(declared)).values[0];
      messages.second = (await runtime.run(declared)).values[0];
      try { await runtime.continue(); }
      catch (error) { messages.afterComplete = error.message; }

      try { await runtime.run('local ='); }
      catch (error) { messages.compile = error.message; }
      messages.afterCompile = (await runtime.run('return 40 + 2')).values[0];

      try { await runtime.run('local function boom() error("测试异常") end\nboom()'); }
      catch (error) { messages.runtime = error.message; }
      try { await runtime.continue(); }
      catch (error) { messages.afterFailure = error.message; }
      messages.afterFailureRun = (await runtime.run('return 6 * 7')).values[0];

      await runtime.setBreakpoints([{ line: 2, file: 'main.lua' }]);
      const paused = await runtime.run('local n = 40\nn = n + 2\nreturn n', {
        chunkName: '@main.lua'
      });
      messages.paused = paused.state;
      messages.completed = (await runtime.continue()).values[0];
      try { await runtime.stepIn(); }
      catch (error) { messages.afterBreakpointComplete = error.message; }
      await runtime.setBreakpoints([]);
      messages.finalRun = (await runtime.run(declared)).values[0];
      return messages;
    }, backend);
    expect(result.first).toBe('你好，Lua 5.5！');
    expect(result.second).toBe('你好，Lua 5.5！');
    expect(result.afterComplete).toContain('不能继续执行');
    expect(result.compile).toBeTruthy();
    expect(result.afterCompile).toBe(42n);
    expect(result.runtime).toContain('测试异常');
    expect(result.afterFailure).toContain('不能继续执行');
    expect(result.afterFailureRun).toBe(42n);
    expect(result.paused).toBe('paused');
    expect(result.completed).toBe(42n);
    expect(result.afterBreakpointComplete).toContain('不能继续执行');
    expect(result.finalRun).toBe('你好，Lua 5.5！');
    expect(errors).toEqual([]);
  });
}

test('工作台快速重复运行不会重入或恢复终态协程', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const result = await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue('global 中文常量 <const> = 42\nreturn 中文常量');
    const first = workbench.controller.execute();
    const duplicate = workbench.controller.execute();
    const invalidResume = workbench.controller.resume('continue');
    await Promise.all([first, duplicate, invalidResume]);
    const again = await workbench.controller.execute();
    return {
      value: again.values[0],
      output: workbench.controller.output,
      status: workbench.controller.status
    };
  });
  expect(result.value).toBe(42n);
  expect(result.output).not.toContain('already defined');
  expect(result.output).not.toContain('dead coroutine');
  expect(result.status).toBe('执行完成');
  expect(errors).toEqual([]);
});

for (const backend of ['emscripten', 'wasi']) {
  test(`${backend} 编辑器边栏新断点在第一次运行立即生效`, async ({ page }) => {
    const errors = await loadWorkbench(page, 'index.html');
    await page.evaluate(async backend => {
      const workbench = document.querySelector('lua-workbench');
      await workbench.controller.switchOption('backend', backend);
      workbench.model.setValue('local n = 40\nn = n + 2\nprint(n)\nreturn n');
      workbench.editor.setScrollTop(0);
    }, backend);
    const editor = page.locator('.monaco-editor');
    const box = await editor.boundingBox();
    const line = await page.evaluate(() => {
      const workbench = document.querySelector('lua-workbench');
      const layout = workbench.editor.getLayoutInfo();
      return {
        top: workbench.editor.getTopForLineNumber(2),
        height: workbench.editor.getTopForLineNumber(3) -
          workbench.editor.getTopForLineNumber(2),
        left: layout.glyphMarginLeft + layout.glyphMarginWidth / 2
      };
    });
    await page.mouse.click(box.x + line.left, box.y + line.top + line.height / 2);
    await expect.poll(() => page.evaluate(() =>
      document.querySelector('lua-workbench').controller.breakpoints.has(2))).toBe(true);
    await page.getByRole('button', { name: '▶ 运行', exact: true }).click();
    await expect(page.locator('.statusbar')).toContainText('断点 · 第 2 行');
    const stack = await page.evaluate(async () =>
      document.querySelector('lua-workbench').runtime.stackTrace());
    expect(stack[0]).toMatchObject({ line: 2, source: '@main.lua' });
    expect(errors).toEqual([]);
  });
}

for (const backend of ['emscripten', 'wasi']) {
  test(`${backend} 不可执行行断点只在当前函数域向下落点`, async ({ page }) => {
    const errors = await loadWorkbench(page, 'index.html');
    const result = await page.evaluate(async backend => {
      const workbench = document.querySelector('lua-workbench');
      await workbench.controller.switchOption('backend', backend);
      const source = [
        'local function calculate()',
        '  -- 这里没有指令',
        '',
        '  local value = 42',
        '  return value',
        'end',
        'return calculate()'
      ].join('\n');
      workbench.model.setValue(source);
      await workbench.controller.toggleBreakpoint(2);
      const before = [...workbench.breakpoints.values()][0];
      await workbench.controller.execute();
      const frame = (await workbench.runtime.stackTrace())[0];
      const after = [...workbench.breakpoints.values()][0];
      const glyph = workbench.querySelector('.glyph-breakpoint');
      const instruction = workbench.querySelector('.current-instruction');
      const visual = {
        separate: Boolean(glyph && instruction && glyph !== instruction),
        glyphClass: glyph?.className,
        instructionClass: instruction?.className,
        glyphBackground: glyph ? getComputedStyle(glyph).backgroundImage : '',
        glyphZ: glyph ? getComputedStyle(glyph).zIndex : ''
      };
      return { before, after, frame, visual };
    }, backend);
    expect(result.before).toMatchObject({
      requestedLine: 2, line: 4, verified: true
    });
    expect(result.after).toMatchObject({
      requestedLine: 2, line: 4, verified: true
    });
    expect(result.frame).toMatchObject({ line: 4, source: '@main.lua' });
    expect(result.visual.separate).toBe(true);
    expect(result.visual.glyphClass).toContain('glyph-breakpoint');
    expect(result.visual.instructionClass).toContain('current-instruction');
    expect(result.visual.glyphBackground).toContain('radial-gradient');
    expect(result.visual.glyphZ).toBe('3');
    expect(errors).toEqual([]);
  });
}

test('断点下移不会穿过 else 或函数 end', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const result = await page.evaluate(() => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue([
      'local function choose(ready)',
      '  if ready then',
      '    -- then 分支到此结束',
      '  else',
      '    print("fallback")',
      '  end',
      '  -- 函数尾部没有语句',
      'end',
      'print(choose(false))'
    ].join('\n'));
    workbench.controller.toggleBreakpoint(3);
    workbench.controller.toggleBreakpoint(7);
    return [...workbench.breakpoints.values()];
  });
  expect(result).toEqual(expect.arrayContaining([
    expect.objectContaining({ requestedLine: 3, line: 3, verified: false, endLine: 3 }),
    expect.objectContaining({ requestedLine: 7, line: 7, verified: false, endLine: 7 })
  ]));
  expect(errors).toEqual([]);
});

for (const backend of ['emscripten', 'wasi']) {
  test(`${backend} 步过 os.time 与异步 JS 能力后停在下一条语句`, async ({ page }) => {
    const errors = await loadWorkbench(page, 'index.html');
    const result = await page.evaluate(async backend => {
      const workbench = document.querySelector('lua-workbench');
      await workbench.controller.switchOption('backend', backend);
      workbench.model.setValue([
        'global os, js, print',
        'local marker = 1',
        'print(os.time())',
        'js.call("timer.sleep", 10)',
        'local after = marker + 1',
        'print("after", after)',
        'return after'
      ].join('\n'));
      await workbench.controller.updateBreakpoint(3, {});
      await workbench.controller.execute();
      const initial = (await workbench.runtime.stackTrace())[0]?.line;
      await workbench.controller.resume('stepOver');
      const afterOsTime = (await workbench.runtime.stackTrace())[0]?.line;
      await workbench.controller.resume('stepOver');
      const afterPromise = (await workbench.runtime.stackTrace())[0]?.line;
      const completed = await workbench.controller.resume('continue');
      return {
        initial, afterOsTime, afterPromise,
        value: completed.values[0], output: workbench.output
      };
    }, backend);
    expect(result).toMatchObject({
      initial: 3, afterOsTime: 4, afterPromise: 5, value: 2n
    });
    expect(result.output).toContain('after\t2');
    expect(errors).toEqual([]);
  });
}

for (const backend of ['emscripten', 'wasi']) {
  test(`${backend} 步过深层异步函数不会误停在被调函数`, async ({ page }) => {
    const errors = await loadWorkbench(page, 'index.html');
    const result = await page.evaluate(async backend => {
      const workbench = document.querySelector('lua-workbench');
      await workbench.controller.switchOption('backend', backend);
      workbench.model.setValue([
        'global os',
        'local function inner()',
        '  local value = os.time()',
        '  return value',
        'end',
        'local result = inner()',
        'local after = result ~= nil',
        'return after'
      ].join('\n'));
      await workbench.controller.updateBreakpoint(6, {});
      await workbench.controller.execute();
      await workbench.controller.resume('stepOver');
      const stopped = (await workbench.runtime.stackTrace())[0]?.line;
      const completed = await workbench.controller.resume('continue');
      return { stopped, value: completed.values[0] };
    }, backend);
    expect(result).toEqual({ stopped: 7, value: true });
    expect(errors).toEqual([]);
  });
}

test('WASI 从断点运行到光标会忽略途中普通断点并稳定停在目标', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const result = await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    await workbench.controller.switchOption('backend', 'wasi');
    workbench.model.setValue([
      'local n = 0',
      'n = n + 1',
      'n = n + 1',
      'n = n + 1',
      'n = n + 1',
      'return n'
    ].join('\n'));
    await workbench.controller.updateBreakpoint(2, {});
    await workbench.controller.updateBreakpoint(3, {});
    await workbench.controller.execute();
    const first = (await workbench.runtime.stackTrace())[0];
    workbench.editor.setPosition({ lineNumber: 5, column: 1 });
    await workbench.controller.runToCursor();
    const target = (await workbench.runtime.stackTrace())[0];
    const completed = await workbench.controller.resume('continue');
    return { first: first.line, target: target.line, value: completed.values[0] };
  });
  expect(result).toEqual({ first: 2, target: 5, value: 4n });
  expect(errors).toEqual([]);
});

for (const backend of ['emscripten', 'wasi']) {
  test(`${backend} 不会把被 goto 跳过的有效断点漂移到后续语句`, async ({ page }) => {
    const errors = await loadWorkbench(page, 'index.html');
    const result = await page.evaluate(async backend => {
      const workbench = document.querySelector('lua-workbench');
      await workbench.controller.switchOption('backend', backend);
      workbench.model.setValue([
        'local value = 0',
        'goto after_skipped_line',
        'value = value + 100',
        '::after_skipped_line::',
        'value = value + 1',
        'return value'
      ].join('\n'));
      await workbench.controller.updateBreakpoint(3, {});
      const completed = await workbench.controller.execute();
      return {
        state: completed.state,
        value: completed.values[0],
        breakpoint: [...workbench.breakpoints.values()][0]
      };
    }, backend);
    expect(result).toMatchObject({
      state: 'complete', value: 1n,
      breakpoint: { requestedLine: 3, line: 3 }
    });
    expect(errors).toEqual([]);
  });
}

for (const backend of ['emscripten', 'wasi']) {
  test(`${backend} local function 声明断点命中闭包创建而非误入函数体`, async ({ page }) => {
    await loadWorkbench(page, 'index.html');
    const result = await page.evaluate(async backend => {
      const runtime = document.querySelector('lua-workbench').runtime;
      const source = [
        'local function fibonacci(n)',
        '  if n < 2 then return n end',
        '  return fibonacci(n - 1) + fibonacci(n - 2)',
        'end',
        'return fibonacci(3)'
      ].join('\n');
      const points = await runtime.setBreakpoints(
        [{ line: 1, file: 'main.lua' }], { source });
      const first = await runtime.run(source);
      const frame = first.state === 'paused' ? (await runtime.stackTrace())[0] : null;
      const completed = first.state === 'paused' ? await runtime.continue() : first;
      return { points, state: first.state, frame, value: completed.values?.[0] };
    }, backend);
    expect(result.points[0]).toMatchObject({
      requestedLine: 1, line: 4, verified: true
    });
    expect(result.state).toBe('paused');
    expect(result.frame).toMatchObject({ line: 4, name: 'main' });
    expect(result.value).toBe(2n);
  });
}

for (const backend of ['emscripten', 'wasi']) {
  test(`调试页在 ${backend} 支持高级断点、改值和运行到光标`, async ({ page }) => {
    const errors = await loadWorkbench(page, 'index.html');
    await page.evaluate(backend => {
      const workbench = document.querySelector('lua-workbench');
      workbench.model.setValue([
        'local value = 0',
        'for i = 1, 3 do',
        '  value = value + 1',
        '  print("循环", i, value)',
        'end',
        'return value'
      ].join('\n'));
      workbench.breakpoints.set(3, {
        line: 3, condition: 'i == 2', hitCondition: '2'
      });
      workbench.breakpoints.set(4, { line: 4, logMessage: '日志 i={i}' });
      workbench.renderBreakpoints();
      const select = workbench.querySelector('select[name="backend"]');
      select.value = backend;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, backend);
    await expect(page.locator('.statusbar')).toContainText(backend.toUpperCase());
    await page.getByRole('button', { name: '▶ 运行', exact: true }).click();
    await expect(page.locator('.statusbar')).toContainText('断点 · 第 3 行');
    await expect(page.locator('.sidebar')).toContainText('value');
    const changed = await page.evaluate(async () => {
      const workbench = document.querySelector('lua-workbench');
      const result = await workbench.runtime.setVariable(0, 0, 'value', '40');
      workbench.editor.setPosition({ lineNumber: 4, column: 1 });
      return result[0].value;
    });
    expect(changed).toBe('40');
    await page.getByRole('button', { name: /运行到光标/ }).click();
    await expect(page.locator('.statusbar')).toContainText('运行到光标 · 第 4 行');
    await page.getByRole('button', { name: /继续/ }).click();
    await expect(page.locator('.statusbar')).toContainText('执行完成');
    await expect(page.locator('.console')).toContainText('日志 i=3');
    expect(errors).toEqual([]);
  });
}

test('调试器可主动暂停无限循环并保持主线程响应', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  await page.evaluate(() => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue('local n = 0\nwhile true do\n  n = n + 1\nend');
    const select = workbench.querySelector('select[name="profile"]');
    select.value = 'trusted';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('.statusbar')).toContainText('可信档');
  await page.getByRole('button', { name: '▶ 运行', exact: true }).click();
  await page.getByRole('button', { name: /暂停/ }).click();
  await expect(page.locator('.statusbar')).toContainText('主动暂停');
  await expect(page.locator('.sidebar')).toContainText('n');
  await page.getByRole('button', { name: /停止/ }).click();
  await expect(page.locator('.statusbar')).toContainText('已停止并重建 VM');
  expect(errors).toEqual([]);
});

test('变量树折叠父节点会移除所有已展开后代', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const result = await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue([
      'local 根 = { 子 = { 叶 = 42 } }',
      'local 暂停点 = true',
      'return 根'
    ].join('\n'));
    workbench.breakpoints.set(2, { line: 2 });
    workbench.renderBreakpoints();
    await workbench.controller.execute();
    await workbench.controller.refreshDebug();
    const root = workbench.controller.variables.find(item => item.name === '根');
    await workbench.controller.expandVariable(root);
    const child = workbench.controller.variables.find(item => item.name === '子');
    await workbench.controller.expandVariable(child);
    const before = workbench.controller.variables.map(item => ({
      name: item.name, depth: item.depth
    }));
    await workbench.controller.expandVariable(root);
    const after = workbench.controller.variables.map(item => ({
      name: item.name, depth: item.depth
    }));
    await workbench.controller.stop();
    return { before, after };
  });
  expect(result.before).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: '根', depth: 0 }),
    expect.objectContaining({ name: '子', depth: 1 }),
    expect.objectContaining({ name: '叶', depth: 2 })
  ]));
  expect(result.after).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: '根', depth: 0 })
  ]));
  expect(result.after.some(item => item.name === '子' || item.name === '叶')).toBe(false);
  expect(errors).toEqual([]);
});

test('调试变量树使用独立展开与修改控件，并由侧栏统一滚动', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue([
      'local 根 = { 子 = { 叶 = 42 } }',
      'local 计数 = 1',
      'local 暂停点 = true',
      'return 根, 计数'
    ].join('\n'));
    await workbench.controller.updateBreakpoint(3, {});
    await workbench.controller.execute();
  });
  await page.getByRole('button', { name: '展开变量 根' }).click();
  await page.getByRole('button', { name: '展开变量 子' }).click();
  await expect(page.locator('.variable-row').filter({ hasText: '叶' })).toContainText('42');
  await expect(page.getByRole('button', { name: /全局变量/ }))
    .toHaveAttribute('aria-expanded', 'false');
  const layout = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.variable-row')];
    const padding = name => parseFloat(getComputedStyle(
      rows.find(row => row.querySelector('.variable-name')?.textContent === name)).paddingLeft);
    return {
      root: padding('根'), child: padding('子'), leaf: padding('叶'),
      nestedOverflow: [...document.querySelectorAll('.debug-list')]
        .map(node => getComputedStyle(node).overflowY),
      sidebarOverflow: getComputedStyle(document.querySelector('.side-content')).overflowY
    };
  });
  expect(layout.child - layout.root).toBe(14);
  expect(layout.leaf - layout.child).toBe(14);
  expect(layout.nestedOverflow.every(value => value === 'visible')).toBe(true);
  expect(layout.sidebarOverflow).toBe('auto');

  await page.getByRole('button', { name: '修改变量 计数' }).click();
  const dialog = page.getByRole('dialog', { name: '修改 计数' });
  await dialog.getByLabel('Lua 表达式').fill('7');
  await dialog.getByRole('button', { name: '应用' }).click();
  await expect(page.locator('.variable-row').filter({ hasText: '计数' })
    .locator('.variable-value')).toHaveText('7');
  await page.getByRole('button', { name: /停止/ }).click();
  expect(errors).toEqual([]);
});

test('调试求值死循环触发硬超时、重建 Worker 且主线程保持响应', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const result = await page.evaluate(async () => {
    const runtime = document.querySelector('lua-workbench').runtime;
    await runtime.setBreakpoints([2]);
    await runtime.run('local value = 1\nvalue = value + 1\nreturn value');
    runtime.options.timeout = 50;
    let ticks = 0;
    const timer = setInterval(() => { ticks++; }, 0);
    let message = '';
    try {
      await runtime.evaluate('(function() while true do end end)()', 0);
    } catch (error) {
      message = error.message;
    }
    const afterReset = (await runtime.run('return 42')).values[0];
    clearInterval(timer);
    return { message, ticks, afterReset };
  });
  expect(result.message).toContain('活动时间限制');
  expect(result.ticks).toBeGreaterThan(0);
  expect(result.afterReset).toBe(42n);
  expect(errors).toEqual([]);
});

test('Lua 5.5.1 编译器诊断与中文语言服务已接入 Monaco', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const diagnostics = await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue('global 中文变量\n中文变量 = ');
    await new Promise(resolve => setTimeout(resolve, 600));
    return workbench.getDiagnostics();
  });
  expect(diagnostics.some(item => item.source === 'Lua 5.5.1 编译器')).toBe(true);
  expect(errors).toEqual([]);
});

test('SDK 引用、模块、VFS 与中文标识符可协同工作', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const result = await page.evaluate(async () => {
    const runtime = document.querySelector('lua-workbench').runtime;
    runtime.registerModule('商业.数学',
      'local M = {}\nfunction M.加(a, b) return a + b end\nreturn M');
    runtime.registerFile('/配置/问候.txt', '你好，商业 SDK');
    const first = await runtime.run(`
      global require, vfs
      local 模块 = require('商业.数学')
      local 表 = {值 = 模块.加(20, 22)}
      local function 相加(a, b) return a + b end
      return 相加, 表, vfs.read('/配置/问候.txt')
    `);
    const [fn, table, greeting] = first.values;
    const called = await runtime.call(fn, 19n, 23n);
    const before = await runtime.get(table, '值');
    await runtime.set(table, '值', 84n);
    const after = await runtime.get(table, '值');
    fn.release();
    table.release();
    return { called, before, after, greeting };
  });
  expect(result).toEqual({
    called: [42n],
    before: 42n,
    after: 84n,
    greeting: '你好，商业 SDK'
  });
  expect(errors).toEqual([]);
});

for (const backend of ['emscripten', 'wasi']) {
  test(`${backend} 通过 JS 补齐安全 os 时间与内存 VFS 子集`, async ({ page }) => {
    const errors = await loadWorkbench(page, 'index.html');
    const result = await page.evaluate(async backend => {
      const workbench = document.querySelector('lua-workbench');
      await workbench.controller.switchOption('backend', backend);
      workbench.runtime.registerFile('/tmp/旧.txt', '内容');
      const run = await workbench.runtime.run(`
        global os, vfs, type, pcall
        local clock1 = os.clock()
        local now = os.time()
        local fields = {year=2024, month=2, day=30, hour=1, min=2, sec=3}
        local normalized = os.time(fields)
        local utc = os.date('!*t', 0)
        local formatted = os.date('!%Y-%m-%d %H:%M:%S', 0)
        local renamed = os.rename('/tmp/旧.txt', '/tmp/新.txt')
        local content = vfs.read('/tmp/新.txt')
        local removed = os.remove('/tmp/新.txt')
        local executeOk, executeError = pcall(os.execute, 'echo forbidden')
        return type(clock1), clock1 >= 0, type(now), now > 0,
          normalized, fields.year, fields.month, fields.day,
          utc.year, utc.month, utc.day, formatted,
          renamed, content, removed, executeOk, executeError,
          os.getenv('NOT_REGISTERED'), os.setlocale(nil),
          os.difftime(42, 19), os.tmpname()
      `);
      const clock = await workbench.runtime.run(`
        global os, js
        local before = os.clock()
        js.call('timer.sleep', 200)
        return os.clock() - before
      `);
      const Runtime = workbench.runtime.constructor;
      const environmentRuntime = new Runtime({
        backend, debug: false, assetBaseUrl: '/release/runtime/wasm/',
        environment: { APP_ENV: '测试环境' }
      });
      const environment = (await environmentRuntime.run(
        'global os; return os.getenv("APP_ENV")')).values[0];
      environmentRuntime.dispose();
      return { values: run.values, clock: clock.values[0], environment };
    }, backend);
    expect(result.values.slice(0, 16)).toEqual([
      'number', true, 'number', true,
      result.values[4], 2024n, 3n, 1n,
      1970n, 1n, 1n, '1970-01-01 00:00:00',
      true, '内容', true, false
    ]);
    expect(typeof result.values[4]).toBe('bigint');
    expect(result.values[16]).toContain('os.execute');
    expect(result.values[17]).toBeNull();
    expect(result.values[18]).toBe('C');
    expect(result.values[19]).toBe(23n);
    expect(result.values[20]).toMatch(/^\/tmp\/lua-[0-9a-f]{24}$/u);
    expect(result.clock).toBeGreaterThanOrEqual(0);
    expect(result.clock).toBeLessThan(0.15);
    expect(result.environment).toBe('测试环境');
    expect(errors).toEqual([]);
  });
}

for (const backend of ['emscripten', 'wasi']) {
  test(`${backend} Lua io.open 写入二进制 VFS 且仅由当前实例访问`, async ({ page }) => {
    const errors = await loadWorkbench(page, 'index.html');
    const result = await page.evaluate(async backend => {
      const workbench = document.querySelector('lua-workbench');
      await workbench.controller.switchOption('backend', backend);
      const runtime = workbench.runtime;
      const first = await runtime.run(`
        global io, vfs, require, string, os, type
        io.open('z.lua', 'wb'):write(string.dump(require, true)):close()
        local writer = io.open('/tmp/hello.txt', 'w+b')
        writer:write('你好', '\\n', 'second')
        local size = writer:seek('end')
        writer:seek('set', 0)
        local line = writer:read('*l')
        local rest = writer:read('*a')
        writer:close()
        local next = io.open('/tmp/hello.txt', 'ab')
        next:write('!'):close()
        return size, line, rest, vfs.exists('/z.lua'), io.type(writer)
      `);
      const binary = runtime.readFile('/z.lua');
      const text = runtime.readFile('/tmp/hello.txt', { encoding: 'utf8' });
      const other = new runtime.constructor({
        backend, assetBaseUrl: '/release/runtime/wasm/'
      });
      const isolated = other.listFiles();
      other.dispose();
      const limited = new runtime.constructor({
        backend, assetBaseUrl: '/release/runtime/wasm/', vfsLimit: 8
      });
      const quota = await limited.run(`
        global io, type
        local file = io.open('tiny.bin', 'wb')
        local ok, why = file:write('123456789')
        file:close()
        return ok == nil, type(why)
      `);
      const untouched = limited.readFile('/tiny.bin').length;
      limited.dispose();
      const denied = await runtime.run(
        `global io; return io.open('../outside', 'wb')`);
      const invalidPath = runtime.listFiles().includes('/outside');
      return {
        values: first.values, binary: [...binary.slice(0, 4)],
        bytes: binary.length, text, isolated, invalidPath,
        denied: denied.values, quota: quota.values, untouched
      };
    }, backend);
    expect(result.values).toEqual([13n, '你好', 'second', true, 'closed file']);
    expect(result.binary).toEqual([27, 76, 117, 97]);
    expect(result.bytes).toBeGreaterThan(20);
    expect(result.text).toBe('你好\nsecond!');
    expect(result.isolated).toEqual([]);
    expect(result.invalidPath).toBe(false);
    expect(result.denied[0]).toBeNull();
    expect(result.denied[1]).toContain('VFS 路径不允许');
    expect(result.quota).toEqual([true, 'string']);
    expect(result.untouched).toBe(0);
    expect(errors).toEqual([]);
  });
}

test('调试断点按源码与行号匹配而不会停在模块同名行', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const result = await page.evaluate(async () => {
    const runtime = document.querySelector('lua-workbench').runtime;
    const unregister = runtime.registerModule('碰撞模块', [
      'local value = 40',
      'value = value + 1',
      'return value'
    ].join('\n'));
    await runtime.setBreakpoints([{ line: 2, file: 'main.lua' }]);
    const paused = await runtime.run([
      'local value = require("碰撞模块")',
      'value = value + 1',
      'return value'
    ].join('\n'), { chunkName: '@main.lua' });
    const stack = await runtime.stackTrace();
    const completed = await runtime.continue();
    unregister();
    return {
      state: paused.state,
      source: stack[0].source,
      line: stack[0].line,
      value: completed.values[0]
    };
  });
  expect(result).toEqual({
    state: 'paused', source: '@main.lua', line: 2, value: 42n
  });
  expect(errors).toEqual([]);
});

test('安全档拒绝越权能力、路径逃逸、二进制块和失效引用', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const result = await page.evaluate(async () => {
    const runtime = document.querySelector('lua-workbench').runtime;
    const messages = {};
    const safe = await runtime.run(`
      local binary, why = load(string.char(27) .. "Lua")
      local executeOk = pcall(os.execute, "echo forbidden")
      return debug == nil, type(io) == "table", type(os) == "table",
        executeOk == false, type(loadfile) == 'function',
        type(dofile) == 'function',
        binary == nil, type(why)
    `);
    messages.safe = safe.values;
    for (const candidate of ['../secret', '/safe/../secret', 'safe\\secret', '']) {
      try { runtime.registerFile(candidate, 'x'); }
      catch (error) { messages['path:' + candidate] = error.message; }
    }
    try { await runtime.run('return js.call("not.registered")'); }
    catch (error) { messages.capability = error.message; }
    try { await runtime.run('print(string.rep("x", 1024 * 1024))'); }
    catch (error) { messages.output = error.message; }
    const reference = (await runtime.run('return {secret = 42}')).values[0];
    await runtime.interrupt();
    try { await runtime.get(reference, 'secret'); }
    catch (error) { messages.reference = error.message; }
    runtime.options.timeout = 50;
    try { await runtime.run('while true do end'); }
    catch (error) { messages.timeout = error.message; }
    runtime.options.timeout = 5000;
    messages.afterReset = (await runtime.run('return 42')).values[0];
    return messages;
  });
  expect(result.safe).toEqual([true, true, true, true, true, true, true, 'string']);
  expect(Object.keys(result).filter(key => key.startsWith('path:'))).toHaveLength(4);
  expect(result.capability).toContain('未注册');
  expect(result.output).toContain('output budget');
  expect(result.reference).toContain('当前 Lua VM');
  expect(result.timeout).toContain('活动时间限制');
  expect(result.afterReset).toBe(42n);
  expect(errors).toEqual([]);
});

test('浏览器公开 DAP 1.68 MessagePort 完成握手和调试流程', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const result = await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    const adapter = workbench.createDapAdapter();
    const port = adapter.port;
    port.start();
    let sequence = 0;
    const pending = new Map();
    const queued = [];
    const waiters = [];
    let output = '';
    port.onmessage = event => {
      const message = event.data;
      if (message.type === 'response') {
        const waiter = pending.get(message.request_seq);
        pending.delete(message.request_seq);
        if (message.success) waiter.resolve(message);
        else waiter.reject(new Error(message.message));
      } else if (message.type === 'event') {
        if (message.event === 'output') output += message.body.output;
        const index = waiters.findIndex(waiter => waiter.event === message.event);
        if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
        else queued.push(message);
      }
    };
    const request = (command, args = {}) => {
      const seq = ++sequence;
      const promise = new Promise((resolve, reject) =>
        pending.set(seq, { resolve, reject }));
      port.postMessage({ seq, type: 'request', command, arguments: args });
      return promise;
    };
    const waitForEvent = event => {
      const index = queued.findIndex(message => message.event === event);
      if (index >= 0) return Promise.resolve(queued.splice(index, 1)[0]);
      return new Promise(resolve => waiters.push({ event, resolve }));
    };
    const initialized = await request('initialize', {
      adapterID: 'wasm-lua', pathFormat: 'path'
    });
    await request('launch', {
      source: 'local value = 40\n-- 下移断点\nvalue = value + 2\nprint(value)\nreturn value',
      chunkName: '@port.lua'
    });
    const configured = await request('setBreakpoints', {
      source: { name: 'port.lua', path: 'port.lua' },
      breakpoints: [{ line: 2 }]
    });
    await request('configurationDone');
    const stopped = await waitForEvent('stopped');
    const stack = await request('stackTrace', { threadId: 1 });
    const frameId = stack.body.stackFrames[0].id;
    const scopes = await request('scopes', { frameId });
    const localsReference = scopes.body.scopes[0].variablesReference;
    let rejectedUnknownReference = false;
    try { await request('variables', { variablesReference: 999999 }); }
    catch (error) { rejectedUnknownReference = /未知|失效/.test(error.message); }
    await request('setVariable', {
      variablesReference: localsReference, name: 'value', value: '100'
    });
    const evaluated = await request('evaluate', {
      expression: 'value', frameId, context: 'watch'
    });
    await request('continue', { threadId: 1 });
    await waitForEvent('terminated');
    adapter.dispose();
    return {
      protocol: initialized.body.wasmLuaProtocolVersion,
      reason: stopped.body.reason,
      breakpoint: configured.body.breakpoints[0],
      source: stack.body.stackFrames[0].source.path,
      value: evaluated.body.result,
      rejectedUnknownReference,
      output
    };
  });
  expect(result).toEqual({
    protocol: 'DAP 1.68 / ABI 1.0',
    reason: 'breakpoint',
    breakpoint: expect.objectContaining({ verified: true, line: 3 }),
    source: 'port.lua',
    value: '100',
    rejectedUnknownReference: true,
    output: '102\n'
  });
  expect(errors).toEqual([]);
});

test('Monaco 编辑生态提供上下文补全、查找替换和命令入口', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue([
      'local 工具 = {}',
      '--- 计算输入值',
      'function 工具.计算(value) return value * 2 end',
      '工具.'
    ].join('\n'));
    workbench.editor.setPosition({ lineNumber: 4, column: 4 });
    await new Promise(resolve => setTimeout(resolve, 500));
  });
  await page.getByRole('button', { name: /补全/ }).click();
  const suggest = page.locator('.suggest-widget.visible');
  await expect(suggest).toContainText('计算');

  await page.getByRole('button', { name: /查找/ }).click();
  const find = page.getByRole('textbox', { name: '查找' });
  await find.fill('工具');
  await expect(page.locator('.find-widget')).toContainText(/共 3 项/);

  await page.getByRole('button', { name: '替换 ⌃H', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '替换' })).toBeVisible();
  await page.getByRole('button', { name: /命令面板/ }).click();
  await expect(page.locator('.quick-input-widget')).toBeVisible();
  expect(errors).toEqual([]);
});

test('跳转行按钮和可持久化按键设置真实生效', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const workbench = page.locator('lua-workbench');
  await page.getByRole('button', { name: /跳转行/ }).click();
  const quickInput = page.locator('.quick-input-widget input');
  await quickInput.waitFor({ state: 'visible' });
  // Monaco's standalone goto-line provider uses the ':' quick-access prefix.
  await quickInput.fill(':4');
  await quickInput.press('Enter');
  await expect(page.locator('.statusbar')).toContainText('4:');

  await page.getByRole('button', { name: '按键设置' }).click();
  const dialog = page.getByRole('dialog', { name: '按键设置' });
  const runRecorder = dialog.getByRole('button', { name: /录制.*运行 \/ 继续/ });
  await runRecorder.click();
  await expect(dialog).toContainText('正在录制“运行 / 继续”');
  await page.keyboard.press('Control+Enter');
  await expect(runRecorder).toContainText('⌃Enter');
  const gotoRecorder = dialog.getByRole('button', { name: /录制.*跳转到行/ });
  await gotoRecorder.click();
  await page.keyboard.press('Control+L');
  await expect(gotoRecorder).toContainText('⌃L');
  await dialog.getByRole('button', { name: '保存按键' }).click();
  await expect(page.getByRole('button', { name: /▶ 运行/ })).toContainText('⌃Enter');

  await page.evaluate(() => {
    document.querySelector('lua-workbench').model.setValue('print("自定义按键", 42)');
  });
  await page.locator('.monaco-editor').click();
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.console')).toContainText('自定义按键\t42');

  await page.reload();
  await page.locator('.monaco-editor').waitFor();
  await expect(page.getByRole('button', { name: /▶ 运行/ })).toContainText('⌃Enter');

  await page.getByRole('button', { name: '按键设置' }).click();
  const reopenedGoto = dialog.getByRole('button', { name: /录制.*跳转到行/ });
  await reopenedGoto.click();
  await page.keyboard.press('Escape');
  await expect(reopenedGoto).toContainText('⌃L');
  const findRecorder = dialog.getByRole('button', { name: '录制“查找”快捷键' });
  await findRecorder.click();
  await page.keyboard.press('Control+Enter');
  await dialog.getByRole('button', { name: '保存按键' }).click();
  await expect(dialog.getByRole('alert')).toContainText('快捷键冲突');

  await dialog.getByRole('button', { name: '恢复“查找”默认快捷键' }).click();
  await dialog.getByRole('button', { name: '恢复“运行 / 继续”默认快捷键' }).click();
  await expect(runRecorder).toContainText('F5');
  await dialog.getByRole('button', { name: '保存按键' }).click();
  await expect(page.getByRole('button', { name: /▶ 运行/ })).toContainText('F5');
  expect(errors).toEqual([]);
  expect(await workbench.count()).toBe(1);
});

test('Monaco 折叠覆盖局部、全局、赋值式与嵌套匿名函数', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const ranges = await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue([
      'local function 外层()',
      '  local function 内层()',
      '    return 42',
      '  end',
      '  return 内层()',
      'end',
      'global function 公开函数()',
      '  return true',
      'end',
      'a = function ()',
      '  return function()',
      '    return 1',
      '  end',
      'end',
      'local 配置 = {',
      '  回调 = function(value)',
      '    return value',
      '  end,',
      '}',
      'local 假 = "function() end"'
    ].join('\n'));
    await new Promise(resolve => setTimeout(resolve, 500));
    const folding = workbench.editor.getContribution('editor.contrib.folding');
    const model = await folding.getFoldingModel();
    const result = [];
    for (let index = 0; index < model.regions.length; index++) {
      result.push([
        model.regions.getStartLineNumber(index),
        model.regions.getEndLineNumber(index)
      ]);
    }
    workbench.editor.setPosition({ lineNumber: 10, column: 1 });
    await workbench.editor.getAction('editor.fold').run();
    const assignment = result.findIndex(([start]) => start === 10);
    return { result, assignmentCollapsed: model.regions.isCollapsed(assignment) };
  });
  expect(ranges.result).toEqual(expect.arrayContaining([
    [1, 6], [2, 4], [7, 9], [10, 14], [11, 13], [15, 19], [16, 18]
  ]));
  expect(ranges.result.some(([start]) => start === 20)).toBe(false);
  expect(ranges.assignmentCollapsed).toBe(true);
  expect(errors).toEqual([]);
});

test('Lua 专用主题区分注释、关键字、函数、字符串和字段', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  await page.evaluate(() => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue([
      '--- 计算显示值',
      '---@param 数量 integer 商品数',
      'local function 计算(数量)',
      '  if 数量 > 0 and true then',
      '    local 用户 = { 名称 = "Ada" } -- 中文注释',
      '    print(用户.名称, 数量, 0x2A)',
      '  end',
      'end'
    ].join('\n'));
  });
  await expect(page.locator('.view-lines')).toContainText('中文注释');
  await page.waitForTimeout(250);
  const colors = await page.locator('.view-lines').evaluate(element => {
    const leaves = [...element.querySelectorAll('span')]
      .filter(node => node.children.length === 0 && node.textContent.trim());
    return leaves.map(node => ({
      text: node.textContent,
      color: getComputedStyle(node).color,
      style: getComputedStyle(node).fontStyle
    }));
  });
  const meaningful = new Set(colors.map(item => item.color));
  expect(meaningful.size).toBeGreaterThanOrEqual(7);
  expect(colors.some(item => item.text.includes('中文注释') &&
    item.color === 'rgb(106, 153, 85)')).toBe(true);
  expect(colors.some(item => item.text.includes('Ada') &&
    item.color === 'rgb(206, 145, 120)')).toBe(true);
  expect(colors.some(item => /0x2A/u.test(item.text) &&
    item.color === 'rgb(181, 206, 168)')).toBe(true);
  await expect(page.locator('.monaco-editor')).toHaveCSS('background-color', 'rgb(30, 30, 30)');
  expect(errors).toEqual([]);
});

test('能力组生成 Lua 模块、补全文档并在切换后端后保持注册', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const registration = await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    const handle = workbench.registerCapabilityGroup('事务', {
      users: {
        get: {
          description: '按编号读取外部用户',
          parameters: [{ name: 'id', type: 'integer', description: '用户编号' }],
          returns: { type: 'table', description: '用户数据' },
          maxConcurrency: 2,
          queueLimit: 8,
          timeoutMs: 1000,
          handler: id => ({ id, name: `用户${id}` })
        }
      }
    }, { moduleName: 'host.事务' });
    await new Promise(resolve => setTimeout(resolve, 250));
    return {
      names: handle.names,
      moduleName: handle.module.moduleName,
      listed: workbench.listCapabilities().map(item => item.name),
      definition: handle.module.definition
    };
  });
  expect(registration).toMatchObject({
    names: ['事务.users.get'],
    moduleName: 'host.事务',
  });
  expect(registration.listed).toContain('事务.users.get');
  expect(registration.definition).toContain('---@param id integer 用户编号');

  await page.evaluate(() => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue([
      'local 事务 = require("host.事务")',
      '事务.users.'
    ].join('\n'));
    workbench.editor.setPosition({ lineNumber: 2, column: 10 });
    workbench.editor.focus();
  });
  await page.getByRole('button', { name: /补全/ }).click();
  const suggest = page.locator('.suggest-widget.visible');
  await expect(suggest).toContainText('get');
  await expect(suggest).toContainText('function M.users.get(id: integer): table');
  await page.keyboard.press('Escape');

  const runOnCurrentBackend = async backend => {
    await page.evaluate(() => {
      const workbench = document.querySelector('lua-workbench');
      workbench.model.setValue([
        'local 事务 = require("host.事务")',
        'local 用户 = 事务.users.get(7)',
        'print(用户.name)',
        'return 用户.id'
      ].join('\n'));
    });
    await page.getByRole('button', { name: /▶ 运行/ }).click();
    await expect(page.locator('.console')).toContainText('用户7');
    await expect(page.locator('.console')).toContainText('7n');
    await expect(page.locator('.statusbar')).toContainText(backend.toUpperCase());
  };
  await runOnCurrentBackend('emscripten');
  await page.getByLabel('运行后端').selectOption('wasi');
  await runOnCurrentBackend('wasi');
  expect(errors).toEqual([]);
});

test('快速输入成员访问时默认补符号，显式候选才插入完整调用', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  await page.evaluate(() => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue('string.');
    workbench.editor.setPosition({ lineNumber: 1, column: 8 });
    workbench.editor.focus();
  });
  await page.getByRole('button', { name: /补全/ }).click();
  const suggest = page.locator('.suggest-widget.visible');
  await expect(suggest).toContainText('format');
  await expect(suggest).not.toContainText('coroutine');
  await page.keyboard.type('for');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() =>
    document.querySelector('lua-workbench').model.getValue())).toBe('string.format');
  await page.keyboard.type('(');
  await expect(page.locator('.parameter-hints-widget')).toContainText(
    'string.format(formatstring, ...)');
  const signature = await page.evaluate(() => {
    const workbench = document.querySelector('lua-workbench');
    return {
      source: workbench.model.getValue(),
      column: workbench.editor.getPosition().column
    };
  });
  expect(signature).toEqual({ source: 'string.format()', column: 15 });
  expect(errors).toEqual([]);
});

test('断点管理器可编辑、禁用和删除条件断点与日志点', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  await page.evaluate(() => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue('local i = 1\nprint(i)\nreturn i');
    workbench.controller.toggleBreakpoint(2);
    workbench.controller.requestBreakpointEditor(2);
  });
  const dialog = page.getByRole('dialog', { name: '第 2 行断点' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('条件表达式').fill('i > 0');
  await dialog.getByLabel('命中条件').fill('>=2');
  await dialog.getByLabel('日志消息（填写后成为日志点）').fill('i={i}');
  await dialog.getByRole('button', { name: '保存断点' }).click();
  await expect(page.locator('.sidebar')).toContainText('日志点');
  const point = await page.evaluate(() =>
    document.querySelector('lua-workbench').controller.breakpoints.get(2));
  expect(point).toMatchObject({
    line: 2, condition: 'i > 0', hitCondition: '>=2', logMessage: 'i={i}', enabled: true
  });
  await page.getByLabel('启用第 2 行断点').uncheck();
  expect(await page.evaluate(() =>
    document.querySelector('lua-workbench').controller.breakpoints.get(2).enabled)).toBe(false);
  await page.getByLabel('删除第 2 行断点').click();
  await expect(page.locator('.sidebar')).toContainText('单击装订线添加');
  expect(errors).toEqual([]);
});

test('断点会随编辑行移动且保持条件配置', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  const point = await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue('local n = 1\nprint(n)\nreturn n');
    workbench.controller.toggleBreakpoint(2);
    await workbench.controller.updateBreakpoint(2, { condition: 'n == 1' });
    workbench.model.applyEdits([{
      range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
      text: '-- 新增一行\n'
    }]);
    await new Promise(resolve => setTimeout(resolve, 50));
    return [...workbench.controller.breakpoints.values()][0];
  });
  expect(point).toMatchObject({ line: 3, condition: 'n == 1' });
  await expect(page.locator('.sidebar')).toContainText('main.lua:3');
  expect(errors).toEqual([]);
});

test('多文件工作区支持文件、大纲与跨文件搜索替换', async ({ page }) => {
  const errors = await loadWorkbench(page, 'index.html');
  await page.evaluate(async () => {
    const workbench = document.querySelector('lua-workbench');
    workbench.model.setValue('local 单价 = 10\nreturn 单价');
    if (!workbench.controller.files.has('modules/prices.lua'))
      await workbench.controller.addFile('modules/prices.lua',
        'local 单价 = 21\nreturn 单价 * 2', { activate: false });
  });
  await page.getByRole('button', { name: '全局搜索' }).click();
  await page.getByLabel('工作区搜索').fill('单价');
  await expect(page.locator('.search-results')).toContainText('modules/prices.lua');
  await page.getByLabel('工作区替换').fill('价格');
  await page.getByRole('button', { name: '全部替换' }).click();
  const sources = await page.evaluate(() => Object.fromEntries(
    [...document.querySelector('lua-workbench').controller.files]
      .map(([name, file]) => [name, file.model.getValue()])));
  expect(sources['main.lua']).toContain('价格');
  expect(sources['modules/prices.lua']).toContain('价格');
  expect(errors).toEqual([]);
});

test('绑定式嵌入不依赖内置 lua-workbench 布局', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/embedded.html');
  await page.locator('.monaco-editor').waitFor();
  await expect.poll(() => page.evaluate(() => Boolean(window.luaBinding))).toBe(true);
  expect(await page.locator('lua-workbench').count()).toBe(0);
  await expect(page.getByRole('button', { name: '宿主插件命令' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /宿主调试面板/ })).toBeVisible();
  expect(await page.locator('#host-app').getAttribute('data-lua-artifact')).toBe('debug');
  await page.evaluate(() => {
    window.luaBinding.controller.model.setValue('print("绑定运行", 6 * 7)\nreturn 42');
  });
  await page.getByRole('button', { name: '运行', exact: true }).click();
  await expect(page.locator('[data-lua-bind="status"]')).toContainText('执行完成');
  await expect(page.locator('[data-lua-bind="output"]')).toContainText('绑定运行\t42');
  await page.getByRole('button', { name: '宿主插件命令' }).click();
  await expect(page.locator('[data-lua-bind="output"]')).toContainText('命令已执行');
  await page.evaluate(() => {
    const controller = window.luaBinding.controller;
    controller.model.setValue('local value = { nested = 41 }\nvalue.nested = value.nested + 1\nreturn value');
    controller.editor.setPosition({ lineNumber: 2, column: 1 });
  });
  await page.getByRole('button', { name: /当前行断点/ }).click();
  const glyph = page.locator('[data-lua-editor] .glyph-breakpoint');
  await expect(glyph).toBeVisible();
  expect(await glyph.evaluate(node => getComputedStyle(node).backgroundImage)).toContain('radial-gradient');
  await page.getByRole('button', { name: '运行', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续', exact: true })).toBeVisible();
  await expect(page.locator('[data-lua-component="debugPanel"]')).toContainText('value');
  await expect(page.locator('[data-lua-component="debugPanel"]')).toContainText('main');
  await page.getByRole('button', { name: /全局变量/ }).click();
  const watch = page.getByPlaceholder('添加监视并按 Enter');
  await watch.fill('value.nested');
  const preserved = await page.evaluate(() => {
    const host = document.querySelector('[data-lua-component="debugPanel"]');
    const field = host.querySelector('.watch-box');
    host.scrollTop = 32;
    window.luaBinding.controller.changed('cursor');
    return {
      draft: host.querySelector('.watch-box').value,
      focused: document.activeElement === host.querySelector('.watch-box'),
      scroll: host.scrollTop
    };
  });
  expect(preserved).toEqual({ draft: 'value.nested', focused: true, scroll: 32 });
  await watch.press('Enter');
  await expect(page.locator('[data-lua-component="debugPanel"]'))
    .toContainText('value.nested');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect(page.locator('[data-lua-bind="status"]')).toContainText('执行完成');
  await page.getByRole('button', { name: '查找', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '查找' })).toBeVisible();
  await page.getByRole('button', { name: '关闭 (Escape)' }).click();
  await page.evaluate(async () => {
    const controller = window.luaBinding.controller;
    controller.model.setValue('global print\npri');
    controller.editor.setPosition({ lineNumber: 2, column: 4 });
    controller.editor.focus();
  });
  await page.keyboard.press('Control+Space');
  await expect(page.locator('[data-lua-editor] .suggest-widget.visible')).toBeVisible();
  // Host controls must not leak into Monaco's internally positioned widgets.
  expect(await page.locator('[data-lua-editor] .suggest-widget.visible button')
    .evaluateAll(nodes => nodes.every(node => getComputedStyle(node).minHeight !== '30px')))
    .toBe(true);
  await page.getByRole('button', { name: '按键设置' }).click();
  await expect(page.getByRole('heading', { name: '宿主按键设置组件' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('WASI 嵌入调试器首次命中条件断点并显示变量', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/embedded.html');
  await page.locator('[data-lua-editor] .monaco-editor').waitFor();
  await expect.poll(() => page.evaluate(() => Boolean(window.luaBinding))).toBe(true);
  await page.getByLabel('后端', { exact: true }).selectOption('wasi');
  await expect(page.locator('#host-events')).toContainText('wasi');
  await page.evaluate(() => {
    const controller = window.luaBinding.controller;
    controller.model.setValue('local value = 41\nvalue = value + 1\nreturn value');
    controller.editor.setPosition({ lineNumber: 2, column: 1 });
  });
  await page.getByRole('button', { name: /当前行断点/ }).click();
  await page.getByRole('button', { name: 'main.lua:2 断点' }).click();
  const dialog = page.locator('#breakpoint-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[name="condition"]').fill('value == 41');
  await dialog.getByRole('button', { name: '保存' }).click();
  await page.getByRole('button', { name: '运行', exact: true }).click();
  await expect(page.locator('#host-events')).toContainText('wasi · safe · 暂停');
  await expect(page.locator('[data-lua-component="debugPanel"]')).toContainText('value');
  await expect(page.locator('[data-lua-editor] .glyph-breakpoint-conditional'))
    .toBeVisible();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect(page.locator('[data-lua-bind="status"]')).toContainText('执行完成');
  expect(errors).toEqual([]);
});

test('绑定式插件插槽挂载外部组件并在 dispose 时恢复宿主内容', async ({ page }) => {
  await page.goto('/blank.html');
  const result = await page.evaluate(async () => {
    const ui = await import('/release/editor/wasm-lua-editor.js');
    const root = document.createElement('section');
    root.innerHTML = [
      '<div data-lua-zone="toolbar"><i>原工具栏</i></div>',
      '<div data-lua-editor style="height:200px"></div>',
      '<div data-lua-component="debugConsole"><i>原控制台</i></div>'
    ].join('');
    document.body.append(root);
    const lifecycle = [];
    const plugin = ui.defineLuaWorkbenchPlugin({
      id: 'binding-outlets',
      components: { debugConsole: {
        mount(host) {
          lifecycle.push('component:mount');
          const node = document.createElement('strong');
          node.textContent = '外部控制台';
          host.append(node);
          return () => lifecycle.push('component:dispose');
        },
        update() { lifecycle.push('component:update'); }
      } },
      contributions: [{
        id: 'action', zone: 'toolbar',
        mount(host) {
          lifecycle.push('contribution:mount');
          const button = document.createElement('button');
          button.textContent = '插件动作';
          host.append(button);
          return () => lifecycle.push('contribution:dispose');
        }
      }]
    });
    const binding = await ui.bindLuaWorkbench(root, {
      mode: 'debugger', storageKey: 'binding-outlet-test', plugins: [plugin]
    });
    const mounted = {
      console: root.querySelector('[data-lua-component]').textContent,
      action: root.querySelector('[data-lua-zone]').textContent,
      update: lifecycle.includes('component:update')
    };
    binding.dispose();
    return {
      mounted, lifecycle,
      restored: root.querySelector('[data-lua-component]').innerHTML,
      actionAfterDispose: root.querySelector('[data-lua-zone]').textContent
    };
  });
  expect(result.mounted).toEqual({
    console: '外部控制台', action: '原工具栏插件动作', update: true
  });
  expect(result.lifecycle).toEqual(expect.arrayContaining([
    'component:mount', 'component:dispose',
    'contribution:mount', 'contribution:dispose'
  ]));
  expect(result.restored).toBe('<i>原控制台</i>');
  expect(result.actionAfterDispose).toBe('原工具栏');
});

test('绑定式注册支持宿主状态选择器、可见性与输入命令', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/blank.html');
  const result = await page.evaluate(async () => {
    const { bindLuaWorkbench } = await import('/release/editor/wasm-lua-editor.js');
    const root = document.createElement('section');
    root.innerHTML = [
      '<button data-lua-command="run">运行</button>',
      '<button data-lua-command="stop" data-lua-visible="running">停止</button>',
      '<input id="watch" data-lua-command-on-enter="addWatch">',
      '<span data-lua-bind="status"></span>',
      '<div data-lua-editor style="height:240px"></div>'
    ].join('');
    document.body.append(root);
    const binding = await bindLuaWorkbench(root, {
      mode: 'debugger', storageKey: 'binding-state-test'
    });
    root.querySelector('#watch').value = 'value';
    root.querySelector('#watch').dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true
    }));
    await new Promise(resolve => setTimeout(resolve, 0));
    const snapshot = binding.controller.snapshot();
    const state = {
      rootState: root.getAttribute('data-lua-state'),
      rootMode: root.getAttribute('data-lua-mode'),
      stopHidden: root.querySelector('[data-lua-command="stop"]').hidden,
      watch: snapshot.watches[0]?.expression,
      status: root.querySelector('[data-lua-bind="status"]').textContent
    };
    binding.dispose();
    return state;
  });
  expect(result).toEqual({
    rootState: 'idle', rootMode: 'debugger', stopHidden: true,
    watch: 'value', status: '就绪 · Lua 5.5.1'
  });
  expect(errors).toEqual([]);
});

test('绑定可重复卸载、恢复宿主状态并隔离多个 Monaco 工作区', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/blank.html');
  const result = await page.evaluate(async () => {
    const { bindLuaWorkbench } = await import('/release/editor/wasm-lua-editor.js');
    const makeRoot = id => {
      const root = document.createElement('section');
      root.id = id;
      root.setAttribute('data-lua-mode', 'host-owned');
      root.innerHTML = '<div data-lua-editor style="height:180px"><i>原始内容</i></div>';
      document.body.append(root);
      return root;
    };
    const firstRoot = makeRoot('first');
    const secondRoot = makeRoot('second');
    const first = await bindLuaWorkbench(firstRoot, { storageKey: 'isolation-a' });
    const second = await bindLuaWorkbench(secondRoot, { storageKey: 'isolation-b' });
    let duplicate = '';
    try { await bindLuaWorkbench(firstRoot); }
    catch (error) { duplicate = error.message; }
    const differentUris = first.controller.model.uri.toString() !==
      second.controller.model.uri.toString();
    let disposeEvents = 0;
    firstRoot.addEventListener('lua-dispose', () => { disposeEvents++; });
    first.dispose();
    first.dispose();
    const firstDisposeEvents = disposeEvents;
    const restored = {
      mode: firstRoot.getAttribute('data-lua-mode'),
      editor: firstRoot.querySelector('[data-lua-editor]').innerHTML,
      hasController: Object.hasOwn(firstRoot, 'luaController')
    };
    const rebound = await bindLuaWorkbench(firstRoot, { storageKey: 'isolation-c' });
    rebound.dispose();
    second.dispose();
    return { duplicate, differentUris, firstDisposeEvents, disposeEvents, restored };
  });
  expect(result.duplicate).toContain('已经绑定');
  expect(result.differentUris).toBe(true);
  expect(result.firstDisposeEvents).toBe(1);
  expect(result.disposeEvents).toBe(2);
  expect(result.restored).toEqual({
    mode: 'host-owned', editor: '<i>原始内容</i>', hasController: false
  });
  expect(errors).toEqual([]);
});

test('生产 UI bundle 导入无注册副作用并可按需绑定宿主 DOM', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/blank.html');
  const result = await page.evaluate(async () => {
    const before = customElements.get('lua-workbench');
    const ui = await import('/release/editor/wasm-lua-editor.js');
    const afterImport = customElements.get('lua-workbench');
    const root = document.createElement('section');
    root.innerHTML = [
      '<button data-lua-command="run">运行零件</button>',
      '<span data-lua-bind="status"></span>',
      '<div data-lua-editor style="height:240px"></div>',
      '<pre data-lua-bind="output"></pre>'
    ].join('');
    document.body.append(root);
    const binding = await ui.bindLuaWorkbench(root, {
      mode: 'playground', storageKey: 'production-ui-bundle-test'
    });
    binding.controller.model.setValue('print("生产绑定", 42)');
    await binding.controller.execute();
    const output = root.querySelector('[data-lua-bind="output"]').textContent;
    const registeredBeforeMount = Boolean(customElements.get('lua-workbench'));
    binding.dispose();
    return { before: Boolean(before), afterImport: Boolean(afterImport),
      registeredBeforeMount, output };
  });
  expect(result).toEqual({
    before: false, afterImport: false, registeredBeforeMount: false,
    output: expect.stringContaining('生产绑定\t42')
  });
  expect(errors).toEqual([]);
});

test('按需挂载完整壳会把对象配置传入控制器且不污染宿主页', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/blank.html');
  const result = await page.evaluate(async () => {
    document.documentElement.style.background = 'rgb(1, 2, 3)';
    document.body.style.margin = '17px';
    const ui = await import('/release/editor/wasm-lua-editor.js');
    const host = document.createElement('main');
    host.style.height = '500px';
    document.body.append(host);
    const element = ui.mountLuaWorkbench(host, {
      mode: 'playground', storageKey: 'mount-options-test',
      capabilities: { 'host.answer': () => 42n },
      definitions: [{
        uri: 'file:///definitions/mounted.lua',
        source: 'host = {}\nfunction host.answer() end'
      }]
    });
    await element.ready;
    element.model.setValue('return js.call("host.answer")');
    const execution = await element.controller.execute();
    const state = {
      value: execution.values[0],
      capabilityRegistered: element.controller.options.capabilities['host.answer']() === 42n,
      definitionCount: element.controller.options.definitions.length,
      htmlBackground: getComputedStyle(document.documentElement).backgroundColor,
      bodyMargin: getComputedStyle(document.body).margin
    };
    element.controller.dispose();
    return state;
  });
  expect(result).toEqual({
    value: 42n, capabilityRegistered: true, definitionCount: 1,
    htmlBackground: 'rgb(1, 2, 3)', bodyMargin: '17px'
  });
  expect(errors).toEqual([]);
});

test('插件可替换调试、控制台和按键设置并接入主题与宿主命令', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/blank.html');
  const result = await page.evaluate(async () => {
    const ui = await import('/release/editor/wasm-lua-editor.js');
    const host = document.createElement('main');
    host.style.height = '620px';
    document.body.append(host);
    const lifecycle = [];
    const component = (text, className) => ({
      mount(outlet) {
        const node = document.createElement('section');
        node.className = className;
        node.textContent = text;
        outlet.append(node);
      }
    });
    const settings = {
      mount(outlet, context) {
        const node = document.createElement('section');
        node.className = 'host-keybindings';
        outlet.append(node);
        this.update(outlet, context);
      },
      update(outlet, context) {
        const node = outlet.querySelector('.host-keybindings');
        node.hidden = !context.shell.keybindingSettings;
        node.textContent = context.shell.keybindingSettings
          ? '宿主按键设置面板' : '';
      }
    };
    const theme = ui.createLuaWorkbenchThemePlugin({
      id: 'host-theme', themeName: 'host-dark',
      monacoTheme: { base: 'vs-dark', inherit: true, rules: [],
        colors: { 'editor.background': '#101820' } },
      className: 'host-themed', variables: { accent: '#ff00aa' }
    });
    const plugin = ui.defineLuaWorkbenchPlugin({
      id: 'host-parts',
      editorFactory(editorHost, options, context) {
        lifecycle.push('editorFactory');
        return context.monaco.editor.create(editorHost, options);
      },
      commands: {
        'host.ping': ({ controller }) => controller.appendOutput('插件命令\n')
      },
      components: {
        debugPanel: component('宿主调试视图', 'host-debug'),
        debugConsole: component('宿主调试控制台', 'host-console'),
        keybindingSettings: settings
      },
      contributions: [{
        id: 'ping', zone: 'toolbar', order: 10,
        mount(outlet, context) {
          const button = document.createElement('button');
          button.className = 'host-ping';
          button.textContent = '宿主插件';
          button.onclick = () => context.controller.command('host.ping');
          outlet.append(button);
        }
      }],
      runtimeReady({ runtime }) {
        lifecycle.push('runtimeReady');
        return runtime.registerCapability('plugin.answer', () => 42n);
      },
      hostReady() { lifecycle.push('hostReady'); },
      dispose() { lifecycle.push('dispose'); }
    });
    const element = ui.mountLuaWorkbench(host, {
      mode: 'debugger', storageKey: 'plugin-parts-test', plugins: [theme, plugin]
    });
    await element.ready;
    element.model.setValue('return js.call("plugin.answer")');
    const execution = await element.controller.execute();
    element.querySelector('.host-ping').click();
    element.querySelector('.settings-button').click();
    await element.updateComplete;
    const state = {
      value: execution.values[0],
      debug: element.querySelector('.host-debug')?.textContent,
      console: element.querySelector('.host-console')?.textContent,
      settings: element.querySelector('.host-keybindings:not([hidden])')?.textContent,
      command: element.output.includes('插件命令'),
      themed: element.classList.contains('host-themed'),
      accent: element.style.getPropertyValue('--accent'),
      theme: element.state.theme,
      lifecycle: [...lifecycle]
    };
    ui.unmountLuaWorkbench(element);
    state.lifecycle = [...lifecycle];
    state.disposed = lifecycle.includes('dispose');
    return state;
  });
  expect(result).toMatchObject({
    value: 42n,
    debug: '宿主调试视图',
    console: '宿主调试控制台',
    settings: '宿主按键设置面板',
    command: true,
    themed: true,
    accent: '#ff00aa',
    theme: 'host-dark',
    disposed: true
  });
  expect(result.lifecycle).toEqual(expect.arrayContaining([
    'editorFactory', 'runtimeReady', 'hostReady', 'dispose'
  ]));
  expect(errors).toEqual([]);
});

test('完整 release 可部署到宿主的非根路径', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Model a host copying the complete release directory below /nested/release.
  await page.route('**/nested/**', async route => {
    const url = new URL(route.request().url());
    url.pathname = url.pathname.replace(/^\/nested\//, '/');
    const response = await route.fetch({ url: url.href });
    await route.fulfill({ response });
  });
  await page.goto('/nested/blank.html');
  const result = await page.evaluate(async () => {
    const { bindLuaWorkbench } = await import(
      '/nested/release/editor/wasm-lua-editor.js');
    const root = document.createElement('section');
    root.innerHTML = '<div data-lua-editor style="height:240px"></div>' +
      '<pre data-lua-bind="output"></pre>';
    document.body.append(root);
    const binding = await bindLuaWorkbench(root, {
      mode: 'playground', storageKey: 'nested-ui-test'
    });
    binding.controller.model.setValue('local 中文 = 21\nprint("子路径", 中文 * 2)');
    await binding.controller.execute();
    const output = root.querySelector('pre').textContent;
    binding.dispose();
    return output;
  });
  expect(result).toContain('子路径\t42');
  expect(errors).toEqual([]);
});

test('窄容器仍保留调试侧栏和横向工具栏', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 720 });
  const errors = await loadWorkbench(page, 'index.html');
  const layout = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    const toolbar = document.querySelector('.commandbar');
    const run = document.querySelector('.run-tools button');
    const style = getComputedStyle(sidebar);
    return {
      sidebarVisible: style.display !== 'none',
      sidebarPosition: style.position,
      toolbarScrollable: toolbar.scrollWidth >= toolbar.clientWidth,
      runAspect: run.getBoundingClientRect().width / run.getBoundingClientRect().height
    };
  });
  expect(layout).toMatchObject({ sidebarVisible: true, sidebarPosition: 'absolute' });
  expect(layout.toolbarScrollable).toBe(true);
  expect(layout.runAspect).toBeGreaterThan(1.5);
  expect(errors).toEqual([]);
});
