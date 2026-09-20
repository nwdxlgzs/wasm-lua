import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Language, Parser } from 'web-tree-sitter';
import { root } from './lib.mjs';

const grammarDir = path.join(root, 'public', 'grammar');
await Parser.init({
  locateFile: () => path.join(grammarDir, 'tree-sitter.wasm')
});
const parser = new Parser();
parser.setLanguage(await Language.load(
  path.join(grammarDir, 'tree-sitter-lua.wasm')));

const factory = (await import(new URL(
  '../public/wasm/emscripten-lua-runtime.mjs', import.meta.url).href)).default;
const luaWasm = new URL(
  '../public/wasm/emscripten-lua-runtime.wasm', import.meta.url).href;
const lua = await factory({ locateFile: () => luaWasm });
const encoder = new TextEncoder();

function compilerAccepts(source) {
  const bytes = encoder.encode(source);
  const name = encoder.encode('@tree-sitter-differential.lua');
  const sourcePointer = lua._wlua_alloc(bytes.length);
  const namePointer = lua._wlua_alloc(name.length);
  lua.HEAPU8.set(bytes, sourcePointer);
  lua.HEAPU8.set(name, namePointer);
  const handle = lua._wlua_create(0, 64n * 1024n * 1024n, 1_000_000n);
  const status = lua._wlua_check(handle, sourcePointer, bytes.length,
    namePointer, name.length);
  lua._wlua_destroy(handle);
  lua._wlua_free(sourcePointer);
  lua._wlua_free(namePointer);
  return status === 0;
}

const corpus = [
  ['Lua 5.5 中文 global 与属性', 'global 答案 <const> = 42', true],
  ['global 前缀 const 星号', 'global <const> *', true],
  ['global 前缀与后缀 const', 'global <const> x, y <const>', true],
  ['Lua 5.5 global function', 'global function 计算(x) return x end', true],
  ['global 在兼容模式仍可作普通名字', 'global = 1', true],
  ['局部变量可命名为 global', 'local global = 1; return global', true],
  ['注释后的上下文 global', 'global -- 声明下一行\n答案', true],
  ['局部属性', 'local 资源 <close> = nil', true],
  ['长字符串和长注释', '--[=[ 中文注释 ]=]\nreturn [==[中文字符串]==]', true],
  ['十六进制浮点边界', 'return 0x1.fffffffffffffp+1023', true],
  ['64 位整数边界', 'return 9223372036854775807', true],
  ['LuaJIT 二进制数字', 'return 0b1010', false],
  ['LuaJIT 整数后缀', 'return 1ULL', false],
  ['LuaJIT 虚数后缀', 'return 2i', false],
  ['数字不能开始标识符', 'local 1中文 = 2', false],
  ['非法属性', 'local x <mutable> = 1', false],
  ['global 不允许 close 后缀', 'global x <close>', false],
  ['global 不允许 close 前缀', 'global <close> *', false]
];

for (const [label, source, expected] of corpus) {
  if (typeof label !== 'string' || typeof source !== 'string' ||
      typeof expected !== 'boolean')
    throw new TypeError('Malformed differential corpus case.');
  const tree = parser.parse(source);
  const parserAccepted = !tree.rootNode.hasError;
  const compilerAccepted = compilerAccepts(source);
  tree.delete();
  if (compilerAccepted !== expected)
    throw new Error(`${label}: Lua compiler expectation changed.`);
  if (parserAccepted !== compilerAccepted)
    throw new Error(`${label}: tree-sitter/compiler mismatch for ${JSON.stringify(source)}`);
}

// The C lexer regression uses raw bytes because JavaScript strings cannot
// represent malformed UTF-8. It complements, rather than duplicates, this CST
// corpus and is exercised by `pnpm test:runtime`.
console.log(`Tree-sitter/Lua 5.5.1 differential corpus passed (${corpus.length} cases).`);
