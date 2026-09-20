import { expect, test } from '@playwright/test';

test('单独拆出安全运行时：两个后端、官方编译诊断、配额和宿主隔离',
  async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/blank.html');
    for (const backend of ['emscripten', 'wasi']) {
      const result = await page.evaluate(async backend => {
        const { createLuaRuntime } = await import('/release/runtime/wasm-lua.js');
        const runtime = createLuaRuntime({ backend, profile: 'safe' });
        const text = await runtime.run('local 中文 = 21; return 中文 * 2');
        const checked = await runtime.check('local 合法 = 42; return 合法');
        let syntax = '';
        try { await runtime.check('local =', { chunkName: '@compile.lua' }); }
        catch (error) { syntax = error.message; }
        const isolated = await runtime.run(
          'global pcall, type, os, io, debug, loadfile, dofile;' +
          ' local ok, value = pcall(function() return os end);' +
          ' return ok, type(value), type(io), type(io.open), type(debug),' +
          ' type(loadfile), type(dofile)');
        const capability = await runtime.run(
          'return js.call("host.private")').then(
          () => 'unexpected success', error => error.message);
        runtime.dispose();
        return {
          value: text.values[0], checked, syntax,
          isolated: isolated.values, capability
        };
      }, backend);
      expect(result.value).toBe(42n);
      expect(result.checked).toBe(true);
      expect(result.syntax).toContain('compile.lua');
      expect(result.isolated.slice(2)).toEqual([
        'table', 'function', 'nil', 'function', 'function'
      ]);
      expect(result.capability).not.toBe('unexpected success');
    }
    expect(errors).toEqual([]);
  });

test('单独拆出调试运行时：首轮断点、步进、DAP 与旧引用失效',
  async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/blank.html');
    for (const backend of ['emscripten', 'wasi']) {
      const result = await page.evaluate(async backend => {
        const { createLuaDebugger, createLuaDapAdapter } =
          await import('/release/runtime/wasm-lua.js');
        const runtime = createLuaDebugger({ backend, profile: 'safe' });
        const adapter = createLuaDapAdapter(runtime);
        await runtime.setBreakpoints([{ line: 2, file: 'main.lua' }]);
        const first = await runtime.run('local 数 = 41\n数 = 数 + 1\nreturn 数');
        const stack = await runtime.stackTrace();
        const stepped = await runtime.stepOver();
        const completed = await runtime.continue();
        const reference = (await runtime.run('return { 中文 = 42 }')).values[0];
        await runtime.run('return 1');
        let invalid = '';
        try { await runtime.get(reference, '中文'); }
        catch (error) { invalid = error.message; }
        adapter.dispose?.();
        runtime.dispose();
        return {
          first: first.state, line: stack[0]?.line, step: stepped.state,
          value: completed.values[0], invalid
        };
      }, backend);
      expect(result.first).toBe('paused');
      expect(result.line).toBe(2);
      expect(result.value).toBe(42n);
      expect(result.invalid).toContain('有效 LuaRef');
    }
    expect(errors).toEqual([]);
});

for (const backend of ['emscripten', 'wasi']) {
  test(`${backend} 实例 VFS 的 loadfile/dofile 与可信字节码`, async ({ page }) => {
    await page.goto('/blank.html');
    const result = await page.evaluate(async backend => {
      const { createLuaRuntime } = await import('/release/runtime/wasm-lua.js');
      const safe = createLuaRuntime({ backend, profile: 'safe' });
      safe.writeFile('/scripts/value.lua', 'return 21 * 2');
      const text = await safe.run(`
        local chunk = assert(loadfile('/scripts/value.lua'))
        local absent, why = loadfile('/scripts/missing.lua')
        local escaped, reason = loadfile('/scripts/../missing.lua')
        local binary, message = load(string.dump(function() return 42 end))
        local parts = {'return ', '6 * 7'}
        local reader = assert(load(function() return table.remove(parts, 1) end))
        return chunk(), dofile('/scripts/value.lua'), absent == nil,
          type(why), escaped == nil, type(reason),
          binary == nil, type(message), reader()
      `);
      let denied = '';
      try { await safe.mountDirectory({ kind: 'directory', getFileHandle() {} }); }
      catch (error) { denied = error.message; }
      safe.dispose();
      const trusted = createLuaRuntime({ backend, profile: 'trusted' });
      const bytes = await trusted.run(`
        local code = string.dump(function(n) return n + 1 end, true)
        assert(io.open('/bytecode.lua', 'wb')):write(code):close()
        return assert(load(code))(41), assert(loadfile('/bytecode.lua'))(41)
      `);
      const textMode = (await trusted.run(`
        local chunk, why = loadfile('/bytecode.lua', 't')
        return chunk == nil, type(why)
      `)).values;
      trusted.dispose();
      return { text: text.values, denied, bytes: bytes.values, textMode };
    }, backend);
    expect(result.text).toEqual([42n, 42n, true, 'string', true, 'string',
      true, 'string', 42n]);
    expect(result.denied).toContain('仅限可信档');
    expect(result.bytes).toEqual([42n, 42n]);
    // Explicit text mode must refuse bytecode even in trusted profile.
    expect(result.textMode).toEqual([true, 'string']);
  });
}

test('可信档显式目录挂载：读写、只读、路径隔离和权限撤销', async ({ page }) => {
  await page.goto('/blank.html');
  for (const backend of ['emscripten', 'wasi']) {
    const result = await page.evaluate(async backend => {
      const { createLuaRuntime } = await import('/release/runtime/wasm-lua.js');
      const files = new Map([['seed.lua', new TextEncoder().encode('return 40 + 2')]]);
      let allowed = true;
      const handle = {
        kind: 'directory', name: '用户选择的目录',
        async queryPermission() { return allowed ? 'granted' : 'denied'; },
        async requestPermission() { return allowed ? 'granted' : 'denied'; },
        async getFileHandle(name, { create = false } = {}) {
          if (!allowed) throw new Error('浏览器权限已撤销');
          if (!files.has(name) && !create) throw new Error('文件不存在');
          if (!files.has(name)) files.set(name, new Uint8Array());
          return {
            async getFile() { return new File([files.get(name)], name); },
            async createWritable() {
              let next = new Uint8Array();
              return {
                async write(value) { next = new Uint8Array(value); },
                async close() { files.set(name, next); },
                async abort() {}
              };
            }
          };
        }
      };
      const runtime = createLuaRuntime({ backend, profile: 'trusted' });
      const unmount = await runtime.mountDirectory(handle, { mountPoint: '/host' });
      const loaded = (await runtime.run(`return dofile('/host/seed.lua')`)).values[0];
      await runtime.writeFileAsync('/host/new.lua', 'return 10');
      const written = (await runtime.run(`
        local file = assert(io.open('/host/new.lua', 'a'))
        assert(file:write(' + 32')):close()
        return dofile('/host/new.lua')
      `)).values[0];
      const persisted = new TextDecoder().decode(files.get('new.lua'));
      let escape = '';
      try { await runtime.readFileAsync('/host/../seed.lua'); }
      catch (error) { escape = error.message; }
      let sync = '';
      try { runtime.readFile('/host/new.lua'); }
      catch (error) { sync = error.message; }
      const other = createLuaRuntime({ backend, profile: 'trusted' });
      let isolated = '';
      try { await other.run(`return dofile('/host/seed.lua')`); }
      catch (error) { isolated = error.message; }
      other.dispose();
      unmount();
      const readonly = await runtime.mountDirectory(handle, {
        mountPoint: '/host', mode: 'read'
      });
      let readOnly = '';
      try { await runtime.writeFileAsync('/host/seed.lua', 'replaced'); }
      catch (error) { readOnly = error.message; }
      readonly();
      allowed = false;
      let permission = '';
      try { await runtime.mountDirectory(handle); }
      catch (error) { permission = error.message; }
      runtime.dispose();
      return { loaded, written, persisted, escape, sync, isolated,
        readOnly, permission };
    }, backend);
    expect(result.loaded).toBe(42n);
    expect(result.written).toBe(42n);
    expect(result.persisted).toBe('return 10 + 32');
    expect(result.escape).toContain('..');
    expect(result.sync).toContain('readFileAsync');
    expect(result.isolated).toContain('VFS 文件不存在');
    expect(result.readOnly).toContain('只读');
    expect(result.permission).toContain('未授权');
  }
});
