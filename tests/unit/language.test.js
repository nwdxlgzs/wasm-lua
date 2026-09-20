import { describe, expect, it } from 'vitest';
import {
  analyze, completions, identifierAt, resolveAlias
} from '../../src/language/analyzer.js';
import { formatLua } from '../../src/language/formatter.js';
import { computeLuaFoldingRanges } from '../../src/language/folding.js';

describe('Lua 5.5 language analysis', () => {
  it('recognizes contextual global declarations', () => {
    const result = analyze('global 答案 <const> = 42\nreturn 答案');
    expect(result.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '答案', scope: 'global' })
    ]));
  });

  it('rejects LuaJIT-only number syntax', () => {
    expect(analyze('return 0b1010').diagnostics[0]?.message).toMatch(/LuaJIT/);
  });

  it('reports undeclared bare global assignments but not locals', () => {
    const result = analyze('local 已声明 = 1\n已声明 = 2\n未声明 = 3');
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'undeclared-global',
        message: expect.stringContaining("'未声明'") })
    ]));
    expect(result.diagnostics.some(item => item.message.includes("'已声明'"))).toBe(false);
  });

  it('filters standard-library members by cursor context', () => {
    const source = 'string.';
    const uri = 'file:///main.lua';
    const documents = new Map([[uri, analyze(source, uri)]]);
    const items = completions(documents, uri, source.length);
    expect(items.map(item => item.label)).toContain('format');
    expect(items.map(item => item.label)).not.toContain('if');
    expect(items.map(item => item.label)).not.toContain('math.floor');
    expect(items.find(item => item.label === 'format')).toEqual(
      expect.objectContaining({
        insertText: 'format', snippet: false,
        detail: 'string.format(formatstring, ...)'
      }));
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'format(…)', kind: 'snippet',
        insertText: 'format(${1:formatstring}, ${2:…})', snippet: true })
    ]));
  });

  it('completes table members and Chinese identifiers from read-only definitions', () => {
    const uri = 'file:///main.lua';
    const definitionUri = 'file:///definitions/business.lua';
    const source = '商业.';
    const definition = '--- 计算总价\nfunction 商业.计算(数量, 单价) end';
    const documents = new Map([
      [uri, analyze(source, uri)],
      [definitionUri, analyze(definition, definitionUri)]
    ]);
    const items = completions(documents, uri, source.length);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '计算', kind: 'function',
        documentation: '计算总价',
        insertText: '计算', snippet: false }),
      expect.objectContaining({ label: '计算(…)', kind: 'snippet',
        insertText: '计算(${1:数量}, ${2:单价})', snippet: true })
    ]));
    expect(identifierAt('return 商业.计算(1, 2)', 12).word).toBe('商业.计算');
  });

  it('does not mistake comments or strings for symbols', () => {
    const document = analyze('-- local 假变量 = 1\nprint("global 假函数")\nlocal 真变量 = 2');
    expect(document.symbols.map(item => item.name)).toContain('真变量');
    expect(document.symbols.map(item => item.name)).not.toContain('假变量');
    expect(document.occurrences.has('假函数')).toBe(false);
  });

  it('offers global symbols, modules, snippets and local parameters', () => {
    const uri = 'file:///main.lua';
    const source = 'local function 相加(a, b) return a + b end\n';
    const documents = new Map([[uri, analyze(source, uri)]]);
    const items = completions(documents, uri, source.length);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '相加', kind: 'function' }),
      expect.objectContaining({ label: 'math', kind: 'module' }),
      expect.objectContaining({ label: 'fori', kind: 'snippet', snippet: true })
    ]));
    expect(items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'a', kind: 'parameter' })
    ]));
    const inside = completions(documents, uri, source.indexOf('return a') + 8);
    expect(inside).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'a', kind: 'parameter' })
    ]));
  });

  it('keeps parameters and for-loop variables within lexical scope', () => {
    const uri = 'file:///main.lua';
    const source = [
      'local function 示例(参数)',
      '  for 索引 = 1, 3 do print(参数, 索引) end',
      'end',
      'return true'
    ].join('\n');
    const documents = new Map([[uri, analyze(source, uri)]]);
    const inside = completions(documents, uri, source.indexOf('print'));
    expect(inside).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '参数' }),
      expect.objectContaining({ label: '索引' })
    ]));
    const outside = completions(documents, uri, source.length);
    expect(outside.some(item => item.label === '参数' || item.label === '索引')).toBe(false);
  });

  it('infers table-constructor fields and assigned function signatures', () => {
    const uri = 'file:///main.lua';
    const source = [
      'local 用户 = { 姓名 = "Ada", 计算 = function(数量, 单价) end }',
      'local 转换 = function(输入) return 输入 end',
      '用户.'
    ].join('\n');
    const documents = new Map([[uri, analyze(source, uri)]]);
    const members = completions(documents, uri, source.length);
    expect(members).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '姓名', kind: 'field' }),
      expect.objectContaining({ label: '计算', kind: 'function',
        insertText: '计算' }),
      expect.objectContaining({ label: '计算(…)', kind: 'snippet',
        insertText: '计算(${1:数量}, ${2:单价})' })
    ]));
    const globals = completions(documents, uri, source.indexOf('用户.'));
    expect(globals).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '转换', kind: 'function',
        insertText: '转换' }),
      expect.objectContaining({ label: '转换(…)', kind: 'snippet',
        insertText: '转换(${1:输入})' })
    ]));
    expect(globals).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '计算' })
    ]));
  });

  it('indexes prefix-const Lua 5.5 global declarations', () => {
    const result = analyze('global <const> 答案, 次数 <const>\nreturn 答案 + 次数');
    expect(result.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '答案', scope: 'global' }),
      expect.objectContaining({ name: '次数', scope: 'global' })
    ]));
  });

  it('uses annotation types and field comments in completion presentation', () => {
    const uri = 'file:///main.lua';
    const source = [
      '--- 计算含税价格',
      '---@param 数量 integer 商品数',
      '---@param 单价 number 未税单价',
      '---@return number 含税总价',
      'local function 总价(数量, 单价) return 数量 * 单价 * 1.13 end',
      '---@class 用户',
      '---@field 姓名 string 显示名称',
      'local 用户 = {}',
      '用户.'
    ].join('\n');
    const documents = new Map([[uri, analyze(source, uri)]]);
    const globals = completions(documents, uri, source.indexOf('---@class'));
    expect(globals).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '总价',
        detail: 'function 总价(数量: integer, 单价: number): number',
        documentation: expect.stringContaining('计算含税价格') })
    ]));
    const members = completions(documents, uri, source.length);
    expect(members).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '姓名', detail: '用户.姓名: string',
        documentation: '显示名称' })
    ]));
  });

  it('shows optional LuaDoc parameters in generated signatures', () => {
    const uri = 'file:///main.lua';
    const source = [
      '---@param name? string 可选名称',
      'local function greet(name) end',
      'greet'
    ].join('\n');
    const documents = new Map([[uri, analyze(source, uri)]]);
    expect(completions(documents, uri, source.length)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'greet', detail: 'function greet(name?: string)'
        })
      ]));
  });

  it('resolves standard-library and annotated class aliases for member completion', () => {
    const uri = 'file:///main.lua';
    const source = [
      '---@class 用户模型',
      '---@field 名称 string',
      'local 原型 = {}',
      '---@type 用户模型',
      'local 当前 = makeUser()',
      'local 字符串库 = string',
      '当前.',
      '字符串库.'
    ].join('\n');
    const documents = new Map([[uri, analyze(source, uri)]]);
    const classMembers = completions(documents, uri, source.indexOf('当前.') + 3);
    expect(classMembers.map(item => item.label)).toContain('名称');
    const stdlibMembers = completions(documents, uri, source.length);
    expect(stdlibMembers.map(item => item.label)).toContain('format');
  });

  it('resolves require aliases into generated host capability modules', () => {
    const uri = 'file:///main.lua';
    const definitionUri = 'file:///definitions/capabilities/host.tasks.lua';
    const source = [
      'local 事务 = require("host.tasks")',
      '事务.users.'
    ].join('\n');
    const definition = [
      '---@meta',
      '---@module host.tasks',
      'local M = {}',
      'M.users = {}',
      '--- 获取用户',
      '---@param id integer 用户编号',
      '---@return table',
      'function M.users.get(id) end',
      'return M'
    ].join('\n');
    const documents = new Map([
      [uri, analyze(source, uri)],
      [definitionUri, analyze(definition, definitionUri)]
    ]);
    const items = completions(documents, uri, source.length);
    expect(resolveAlias(documents, documents.get(uri), '事务.users.get')).toEqual({
      name: 'M.users.get', uri: definitionUri
    });
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'get', kind: 'function',
        detail: 'function M.users.get(id: integer): table',
        documentation: expect.stringContaining('获取用户')
      })
    ]));
  });

  it('formats nested blocks without damaging one-line blocks or long strings', () => {
    const source = [
      'local 文本 = [[',
      '  原样内容',
      ']]',
      'if ok then print("x") end',
      'if ok then',
      'print(文本)',
      'else',
      'print("no")',
      'end'
    ].join('\n');
    expect(formatLua(source, '  ')).toBe([
      'local 文本 = [[',
      '  原样内容',
      ']]',
      'if ok then print("x") end',
      'if ok then',
      '  print(文本)',
      'else',
      '  print("no")',
      'end'
    ].join('\n'));
  });

  it('folds every named and expression function form, including nested callbacks', () => {
    const source = [
      'local function 外层()',
      '  return 1',
      'end',
      'global function 公开函数()',
      '  return 2',
      'end',
      'a = function ()',
      '  return function()',
      '    return 3',
      '  end',
      'end',
      'local 配置 = {',
      '  回调 = function(value)',
      '    return value',
      '  end,',
      '}'
    ].join('\n');
    expect(computeLuaFoldingRanges(source)).toEqual(expect.arrayContaining([
      { start: 1, end: 3 },
      { start: 4, end: 6 },
      { start: 7, end: 11 },
      { start: 8, end: 10 },
      { start: 12, end: 16 },
      { start: 13, end: 15 }
    ]));
  });

  it('folds Lua control blocks, comments, regions and long brackets without false keywords', () => {
    const source = [
      '-- #region 示例',
      '-- function 假函数()',
      '-- end',
      '-- #endregion',
      'local 文本 = [=[function() end',
      '仍是字符串]=]',
      'if true then',
      '  while false do',
      '    do',
      '      print(文本)',
      '    end',
      '  end',
      'else',
      '  repeat',
      '    print("end")',
      '  until true',
      'end',
      '--[[ 多行注释',
      'function 也是假函数()',
      ']]',
      'local 中文function = 1',
      'local function😀 = 2'
    ].join('\n');
    const ranges = computeLuaFoldingRanges(source);
    expect(ranges).toEqual(expect.arrayContaining([
      { start: 1, end: 4, kind: 'region' },
      { start: 5, end: 6 },
      { start: 7, end: 17 },
      { start: 8, end: 12 },
      { start: 9, end: 11 },
      { start: 14, end: 16 },
      { start: 18, end: 20, kind: 'comment' }
    ]));
    expect(ranges.filter(range => [2, 19, 21, 22].includes(range.start))).toEqual([]);
  });
});
