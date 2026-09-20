import { describe, expect, test } from 'vitest';
import {
  resolveLuaBreakpoint, resolveLuaBreakpoints
} from '../../src/sdk/breakpoints.js';

describe('Lua 断点下移', () => {
  test('空行和注释下移到同一函数内的首个可执行行', () => {
    const source = [
      'local function run()',
      '  -- comment',
      '',
      '  local value = 42',
      '  return value',
      'end',
      'print(run())'
    ].join('\n');
    expect(resolveLuaBreakpoint(source, 2)).toMatchObject({
      requestedLine: 2, line: 4, endLine: 5, verified: true
    });
  });

  test('不会越过函数末尾落到外部语句', () => {
    const source = [
      'local function run()',
      '  return 42',
      '  -- trailing',
      'end',
      'print(run())'
    ].join('\n');
    expect(resolveLuaBreakpoint(source, 3)).toMatchObject({
      line: 3, endLine: 3, verified: false
    });
  });

  test('不会从 if 分支越过 else，并能在 else 内下移', () => {
    const source = [
      'if ready then',
      '  -- no statement',
      'else',
      '  -- move here',
      '  print("fallback")',
      'end',
      'print("done")'
    ].join('\n');
    expect(resolveLuaBreakpoint(source, 2)).toMatchObject({
      line: 2, endLine: 2, verified: false
    });
    expect(resolveLuaBreakpoint(source, 3)).toMatchObject({
      requestedLine: 3, line: 5, endLine: 5, verified: true
    });
  });

  test('同一行多个保留字按 token 顺序处理且边界行整体不可跨越', () => {
    const source = [
      'if outer then',
      '  -- no statement in this branch',
      'elseif first then if nested then print("a") end else print("b") end',
      'print("outside")'
    ].join('\n');
    expect(resolveLuaBreakpoint(source, 2)).toMatchObject({
      line: 2, endLine: 2, verified: false
    });
    expect(resolveLuaBreakpoint(source, 3)).toMatchObject({
      line: 3, verified: true
    });
  });

  test('字符串和注释中的边界词不参与作用域计算', () => {
    const source = [
      'local function run()',
      '  -- end elseif else until',
      '  local text = "end elseif else until"',
      '  return text',
      'end'
    ].join('\n');
    expect(resolveLuaBreakpoint(source, 2)).toMatchObject({
      line: 3, endLine: 4, verified: true
    });
  });

  test('多行函数声明映射到外层 CLOSURE 的 end，非函数体入口', () => {
    const source = [
      'local function fibonacci(n)',
      '  if n < 2 then return n end',
      '  return fibonacci(n - 1) + fibonacci(n - 2)',
      'end',
      'return fibonacci(3)'
    ].join('\n');
    expect(resolveLuaBreakpoint(source, 1)).toMatchObject({
      requestedLine: 1, line: 4, endLine: 4, verified: true
    });
    expect(resolveLuaBreakpoint(source, 2).line).toBe(2);
  });

  test('保留条件和请求行元数据', () => {
    const [point] = resolveLuaBreakpoints('-- comment\nprint(42)', [{
      line: 1, condition: 'value == 42'
    }]);
    expect(point).toMatchObject({
      requestedLine: 1, line: 2, verified: true, condition: 'value == 42'
    });
  });
});
