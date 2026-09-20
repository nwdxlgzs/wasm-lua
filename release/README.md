# Wasm Lua 5.5.1 商业项目接入手册

`release/` 是面向 Chromium 152+ 的完整离线交付包，可作为专有产品中的本地
依赖使用。默认包包含纯运行时 SDK、Monaco 工作台、双后端四个 WASM、中文语言服务、
类型声明、许可证副本、SPDX SBOM 和逐文件完整性清单，不依赖 CDN，也不包含
JavaScript/C/WASM source map。

本手册按“先部署、再选集成层、最后接业务能力”的顺序给出可直接使用的配置。
所有页面必须通过 HTTP(S) 提供；`file://` 无法正确启动 ESM Worker 和 WASM。

## 1. 发布目录与入口

完整工作台复制整个 `release/`；仅执行 Lua 时只需 `runtime/` 与根许可证/清单。
运行时会相对入口加载 Worker；工作台另需 Monaco Worker、tree-sitter 语法和
中文资源。所有引用应保留内部相对路径。

```text
release/
├─ runtime/
│  ├─ wasm-lua.js                 唯一运行/调试 SDK ESM 入口
│  ├─ assets/                     唯一 Lua VM Worker
│  ├─ wasm/                       唯一 WASM/glue 清单与四个可裁剪变体
│  └─ types/                      SDK 声明
├─ editor/
│  ├─ wasm-lua-editor.js          外部导入 ../runtime/wasm-lua.js
│  ├─ wasm-lua-editor.css         完整壳样式
│  ├─ assets/、grammar/           Monaco 与语法服务资源，不含 Lua VM
│  └─ types/                      编辑器/控制器声明，引用 runtime/types
├─ licenses/                      第三方许可证原文
├─ CAPABILITIES.md                大型业务 API/事务接入手册
├─ SBOM.spdx.json                 SPDX 2.3 SBOM
├─ THIRD_PARTY_NOTICES.txt        第三方归属与许可选择
├─ release.json                   本次实际选择的 WASM 变体
├─ integrity.json                 release 内所有文件的 SHA-256
└─ package.json                   私有 ESM 包与 exports
```

只存在一个 runtime。编辑器通过公开 SDK 的 `run/check/调试` 等接口调用它，
官方编译诊断也通过 `runtime.check()`，tree-sitter Worker 不会直接载入 Lua
WASM。默认情况下无需手工指定 `assetBaseUrl`：SDK/编辑器相对自身入口定位唯一的
`runtime/wasm/`；若宿主需要独立资产域名或自定义部署位置，可显式覆盖。

| 导入入口 | 默认 WASM 目录 |
| --- | --- |
| `/vendor/wasm-lua/runtime/wasm-lua.js` | `/vendor/wasm-lua/runtime/wasm/` |
| `/vendor/wasm-lua/editor/wasm-lua-editor.js` | `/vendor/wasm-lua/runtime/wasm/` |

路径必须以 `/` 结尾。推荐把每个 release 放入带版本或内容哈希的目录，例如
`/vendor/wasm-lua/0.1.0/`，升级时即可原子切换并安全使用长期缓存。

### 四个 WASM 产物

| 文件 | 用途 |
| --- | --- |
| `emscripten-lua-runtime.wasm` + `.mjs` | Emscripten 普通运行版 |
| `emscripten-lua-debug.wasm` + `.mjs` | Emscripten 调试版 |
| `wasi-lua-runtime.wasm` | WASI Preview 1 普通运行版 |
| `wasi-lua-debug.wasm` | WASI Preview 1 调试版 |

`createLuaRuntime()` 自动选择 runtime 产物，`createLuaDebugger()` 和调试工作台自动
选择 debug 产物。应用不应直接实例化这些低层文件。

### 生成完整或裁剪 release

正式生成脚本是 `pnpm release`。不提供筛选参数时，`release/` 默认包含上表四种
变体；也可只发布一个或任意几个变体：

```powershell
# 默认：双后端 × runtime/debug，四种全部包含
corepack pnpm release

# 只含 Emscripten 普通运行版（.mjs + .wasm）
corepack pnpm release -- --variants=emscripten-runtime

# 任意组合
corepack pnpm release -- --variants=emscripten-debug,wasi-runtime

# 也可按维度筛选，并指定工作区内的输出目录
corepack pnpm release -- --backend=wasi --flavor=runtime --output=release-wasi
```

合法变体名为 `emscripten-runtime`、`emscripten-debug`、`wasi-runtime`、
`wasi-debug`。`--backend` 和 `--flavor` 都接受逗号列表或 `all`。生成器会同时：

1. 从唯一的 `runtime/wasm` 删除未选择文件；
2. 重写唯一 `manifest.json` 的 `artifacts/backends/flavors/releaseVariants`；
3. 写入根 `release.json` 和 `package.json.wasmLuaRelease`；
4. 对裁剪后的实际文件重新生成 `integrity.json`；
5. 自动运行发布校验，禁止残留未选择的 WASM/glue。

不要在生成后手工删除 WASM，否则清单和完整性哈希会失配。运行时在加载前读取
`manifest.json`；调用精简包未包含的变体会明确报错。完整工作台也会按当前
`mode` 只显示清单中实际可用的后端。使用精简 UI 包时，建议同时显式声明
`backends: ['emscripten']` 等宿主约束；若当前模式没有任何相应产物，初始化会
直接失败。例如只有 `emscripten-runtime` 的包只能创建普通运行时或
`mode: 'playground'`，不能创建调试器。

### 拆包与 dist 的依赖边界

```text
runtime/（纯执行或调试器的唯一 SDK + Worker + WASM）
    ↑ 公开 ESM API，editor 不内嵌或复制运行时
editor/（Monaco、语言服务、无布局 Controller、绑定器、可插拔壳）
    ↑ dist 页面只按 release/editor 的 URL 导入
dist/release/（根 release 的逐字节副本） + dist/*.html（薄适配页）
```

三种取用方式：

1. **安全执行**：用 `--variants=emscripten-runtime` 等选取运行版；部署
   `runtime/`，从 `runtime/wasm-lua.js` 导入 `createLuaRuntime()`，以默认
   `profile: 'safe'` 启动。保留根 `licenses/`、NOTICE、SBOM、manifest 与完整性清单。
2. **独立调试器**：用 `--variants=emscripten-debug` 等选取调试版；仍只部署
   `runtime/`，导入 `createLuaDebugger()`/`createLuaDapAdapter()`。并不需要
   `editor/`；调试版不强迫 trusted，默认仍是安全档。
3. **整体编辑器库**：部署完整 release 的 `editor/` 和 `runtime/`，导入
   `bindLuaWorkbench`、`createLuaWorkbenchController` 或 `mountLuaWorkbench`。
   仅复制 `editor/` 不能运行；它对同级 `runtime/wasm-lua.js` 有静态 ESM 依赖。

`corepack pnpm build` 先生成并验证 release，再用薄站点适配器生成
`dist/release/`，不会另行打包一套运行时。`corepack pnpm release -- ...` 只
生成/裁剪库，不覆盖现有 dist；如果需要部署特定裁剪 profile 的站点，发布后
执行 `corepack pnpm build:web`，它会把当前 release 原样复制进 dist。
`corepack pnpm verify:release` 与 `corepack pnpm verify:dist` 分别验证单副本
架构、所有文件的 SHA-256 和 dist/release 的逐字节相等。

安全边界是 Worker + 资源配额 + 显式能力白名单，不是“目录隔离”；网页交付
的 WASM/JS 可被读取，宿主不得把 trusted/full-access 或敏感能力暴露给不可信代码。

## 2. 后端怎么选

两个后端共享 Lua 5.5.1 源码、C ABI v1、值协议、安全模型和 JS API。

- Emscripten：浏览器生态最成熟，带一个很小的本地 glue 模块，建议作为默认项。
- WASI Preview 1：WASM 更接近标准 WASI 产物，浏览器内由随包 shim 提供最小
  Preview 1 导入；适合还要在 Wasmtime 等宿主复用产物的项目。
- 工作台切换后端或安全档会安全重建 Worker/VM，并保留编辑器源码、工作区与
  断点；当前 Lua 栈、协程和 `LuaRef` 不会迁移。
- 两个后端都不直接获得浏览器网络、宿主文件系统或进程权限。宿主访问需显式
  注册能力；可信档和 full-access 也可在用户授权 File System Access 目录句柄后
  挂载该目录。

业务代码不要按后端分支；应在 CI 中对同一源码和输入做双后端差分测试。

## 3. 只使用运行时 SDK

### 最小可运行示例

```js
import {
  createLuaRuntime, LuaRef
} from '/vendor/wasm-lua/runtime/wasm-lua.js';

const lua = createLuaRuntime({
  backend: 'emscripten',
  profile: 'safe',
  environment: { APP_ENV: 'production' }
});

lua.addEventListener('output', event => {
  console.log(`[${event.detail.category}]`, event.detail.output);
});

try {
  const result = await lua.run(`
    local 中文数量 = 21
    print("来自 Lua", 中文数量)
    return 中文数量 * 2, os.getenv("APP_ENV")
  `, { chunkName: '@main.lua' });
  console.log(result.state, result.values); // complete, [42n, 'production']
} finally {
  lua.dispose();
}
```

### 创建选项

| 选项 | 类型与默认值 | 说明 |
| --- | --- | --- |
| `backend` | `'emscripten'` | 也可为 `'wasi'` |
| `profile` | `'safe'` | 也可为 `'trusted'` 或 `'full-access'` |
| `assetBaseUrl` | 相对运行时入口的 `wasm/` | 可覆盖唯一的运行时 WASM 公开目录，建议以 `/` 结尾 |
| `timeout` | safe `5000`、trusted `60000`、full-access `0` | 单次活动执行的墙钟上限，毫秒；`0` 表示不限制 |
| `memoryLimit` | safe 64 MiB、trusted 256 MiB、full-access 无人工配额 | Lua allocator 堆配额，字节；实际 WASM 内存最大 512 MiB |
| `instructionLimit` | safe 1000 万、trusted 1 亿、full-access 无 | VM 指令配额 |
| `environment` | `{}` | `os.getenv` 唯一可见的字符串键值映射 |

`debug` 是内部选择项；业务代码应使用 `createLuaRuntime()` 或
`createLuaDebugger()`，不要自行改变它。

等待宿主 Promise、停在断点和浏览器调度 slice 的时间不计入活动执行时间。
超时会终止并重建整个 Worker，不会继续运行旧 Lua 代码。

### 值映射与引用

| Lua/JS 值 | 跨边界表示 |
| --- | --- |
| `nil` | `null`（JS 的 `undefined` 传入 Lua 也视为 nil） |
| boolean | `boolean` |
| Lua float | JS `number` |
| Lua integer | JS `BigInt`，完整保留 64 位精度 |
| UTF-8 字符串 | JS `string` |
| 二进制字符串 | `Uint8Array` |
| JS 数组/普通对象 | Lua 数组/映射值 |
| Lua 函数、复杂表等 | 有 VM 所有权的 `LuaRef` |

传输值最大嵌套 64 层，不接受循环 JS 对象。不要对包含 `BigInt` 的结果直接调用
`JSON.stringify()`；先用 replacer 转成字符串。

```js
const { values: [fn, table] } = await lua.run(`
  return function(a, b) return a + b end, { 值 = 42 }
`);

if (fn instanceof LuaRef && table instanceof LuaRef) {
  console.log(await lua.call(fn, 19n, 23n)); // [42n]
  console.log(await lua.get(table, '值'));  // 42n
  await lua.set(table, '值', 84n);
  fn.release();
  table.release();
}
```

`release()` 幂等，建议不再使用时立即调用。引用只能交回创建它的当前 VM；以下
操作会使旧引用失效：下一次顶层 `run()`、`interrupt()`、切换后端/安全档、硬
超时以及 `dispose()`。这项代际隔离也阻止伪造 registry 编号访问新 VM。

### 顶层运行、用户 yield 与停止

- 每次 `run(source)` 都从干净 VM 代际开始，可安全重复执行包含同名 `global`
  声明的源码。
- `result.state === 'complete'` 表示结束；普通 `coroutine.yield` 会得到 `yield`，
  可用 `continue()` 恢复。不要在 `complete` 或未捕获异常后再次恢复。
- `interrupt()` 用于停止并立即得到一个新 Worker/VM，随后仍可再次 `run()`。
- `dispose()` 是终态释放，之后不要再调用实例方法。
- 不要并发启动多个顶层操作。需要并发脚本时创建多个 runtime；每个实例拥有
  独立 Worker 和 VM。

运行时事件如下：

| 事件 | `detail` / 时机 |
| --- | --- |
| `ready` | 后端与 WASM 初始化完成 |
| `generation` | 新的顶层 VM 代际建立，旧引用已失效 |
| `output` | `{category, output}`，可能分片到达 |
| `stopped` | 调试暂停或未捕获异常，含 `reason/line/source/resumable` |
| `terminated` | Lua 正常结束 |
| `reset` | `interrupt()` 完成 Worker 重建 |
| `definitionchange` | 只读语言定义注册或撤销 |

## 4. 把 JavaScript 能力接给 Lua

Lua 只能通过 `js.call(name, ...)` 调用显式注册名称。返回 Promise 时，Lua 协程会
yield，Promise 完成后恢复原协程；主线程不会阻塞，也没有 Asyncify/JSPI。

```js
const unregister = lua.registerCapability('orders.load', {
  description: '读取订单',
  timeoutMs: 5000,
  maxConcurrency: 8,
  queueLimit: 64,
  handler: async function (id) {
    const response = await fetch(`/api/orders/${id}`, { signal: this.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
});

await lua.run('return js.call("orders.load", 42)');
unregister();
```

停止、超时或撤销能力时会中止 `this.signal`。宿主应把它传给 `fetch` 或业务 SDK；
否则迟到结果虽会被 VM 丢弃，已发生的外部副作用仍需业务层自行处理。

接口很多时使用 `registerCapabilityGroup()`。它支持原子注册/撤销、分层名称、
并发/排队、超时、中间件、调用事件，并自动生成 `require()` 模块及 Monaco
中文定义。完整描述符、事务模式和审计示例见 [CAPABILITIES.md](./CAPABILITIES.md)。

在工作台中应调用 `workbench.registerCapability()` 或
`workbench.registerCapabilityGroup()`，这样后端/安全档切换后会自动重放；不要
只注册到当时的 `workbench.runtime`。

## 5. 模块、内存 VFS 与语言定义是三套独立接口

### Lua 模块

```js
const removeModule = lua.registerModule('app.math', `
  return { double = function(value) return value * 2 end }
`);
await lua.run('local m = require("app.math"); return m.double(21)');
```

注册模块必须是文本 Lua 源码或返回源码/值的 JS 工厂；不加载原生动态库。
`load/loadfile` 的字节码规则另见下文，不能以字节码作为注册模块。

### 运行时内存文件与 Lua `io`

```js
const removeFile = lua.registerFile('/data/config.json', '{"theme":"dark"}');
await lua.run('return vfs.read("/data/config.json")');
lua.renameFile('/data/config.json', '/data/current.json');
lua.removeFile('/data/current.json');

// Lua 可新建、写入、追加、定位及读取同一实例的内存文件。
await lua.run(`
  global io, string, require
  io.open('z.lua', 'wb'):write(string.dump(require, true)):close()
`);
const binary = lua.readFile('/z.lua'); // Uint8Array：原样保留 Lua 字节码
lua.writeFile('/logs/app.txt', '你好\n', { append: true });
const text = lua.readFile('/logs/app.txt', { encoding: 'utf8' });
const paths = lua.listFiles('/logs');
```

路径统一使用 `/`，不允许空路径、反斜线、NUL、`.` 或 `..` 段。默认情况下
VFS 只在实例内存中；`os.remove/os.rename` 操作同一实例的文件（挂载点内的
`os.remove` 也可删除授权的真实文件；不支持跨挂载重命名）。默认总字节配额：
安全档 16 MiB、可信档 64 MiB，full-access 不设人工配额；创建时可通过
`vfsLimit` 自定义受限档配额，最大 512 MiB。
内存文件在顶层 `run()` 之间保留，但不会自动持久化到磁盘、IndexedDB 或跨
Runtime 实例共享；宿主若需要持久化，可显式读取字节并自行存储，或使用下述
用户授权的文件夹挂载。

`io.open` 接受 `r/w/a`、`+` 和 `b` 的 Lua 常用组合；句柄支持 `read`（数字、
`*l/*L/*a/*n`）、`write`、`seek`、`flush`、`close`、`lines`，另有
`io.input/output/read/write/lines/type/tmpfile` 和 `vfs.read/write/size/exists`。
这是基于 Lua 表实现的受限文件句柄，不是 libc `FILE*`，不提供宿主文件描述符、
锁、目录、权限或 POSIX 文件语义。二进制 Lua 字符串经 ABI 返回 JS 时：合法
UTF-8 映射 `string`，非 UTF-8 映射 `Uint8Array`；`readFile()` 默认始终返回
`Uint8Array`，`encoding: 'utf8'` 对非法 UTF-8 明确报错。存放字节码不意味着允许
执行：三档都支持通过 VFS 的 `loadfile/dofile` 与文本 `load`；安全档拒绝
二进制 chunk，可信档和 full-access 可用 `load` 或 `loadfile` 执行 Lua 字节码。
字节码不适合不可信输入，可信档及 full-access 的源码与挂载文件均必须可信。
原生动态库仍禁止。

### 可信档/full-access 挂载浏览器授权的文件夹

```js
// 只能在用户点击事件里调用；Chromium 安全上下文（HTTPS/localhost）。
const { handle, unmount } = await trustedLua.pickDirectory({
  mountPoint: '/host', mode: 'readwrite' // 或 mode: 'read'
});
await trustedLua.run(`
  local f = assert(io.open('/host/example.lua', 'w'))
  assert(f:write('return 42'))
  f:close()
  return dofile('/host/example.lua')
`);
const content = await trustedLua.readFileAsync('/host/example.lua', {
  encoding: 'utf8'
});
await trustedLua.writeFileAsync('/host/out.txt', '你好');
unmount();

// 若宿主已经从浏览器获得目录句柄，也可显式挂载：
const release = await trustedLua.mountDirectory(handle, {
  mountPoint: '/project', mode: 'read'
});
release();
```

选择器返回的句柄不会传给 Lua；只有实例内 `/host/…` 或自选挂载点子路径
能够访问它，`..`、反斜线和重叠挂载被拒绝。实例重新创建后要重新挂载句柄；
浏览器可撤销权限。同步 `readFile/writeFile/removeFile` 只操作内存文件，挂载
文件应使用其 `Async` 对应 API。`io.open('w')` 会截断目标文件，`os.remove`
会删除目标文件：可信档/full-access 执行前请确认所选目录和源码，挂载文件修改会持久化，
无法通过 `dispose()` 回滚。安全档不能挂载，也不能通过 VFS 间接接触宿主文件。
不授予进程、网络或原生动态库权限。这里使用浏览器文件句柄而不是 WASM 的
宿主文件描述符；Emscripten 与 WASI 后端行为相同。

### 只读 Monaco 定义

```js
const removeDefinition = lua.registerDefinition({
  uri: 'file:///definitions/app.lua',
  source: `
    app = {}
    --- 读取当前用户
    ---@return table
    function app.currentUser() end
  `
});
```

定义只进入语言索引，不会挂载进 VM，也不能被重命名修改。纯 SDK 没有 Monaco
消费者时可以不注册定义；工作台会同步 runtime 定义到语言服务。

## 6. 浏览器中的 os 兼容层

三个 profile 都提供无宿主权限的 `os` 子集：

- `os.clock()`：当前顶层执行累计的活动 CPU/调度时间；断点暂停和等待 Promise
  的时间不计入；
- `os.time()`、`os.date()`、`os.difftime()`：由浏览器日期能力实现，支持 UTC
  `!` 前缀、`*t` 和常用 C99 格式；
- `os.getenv()`：只读取创建实例时显式传入的 `environment`；
- `os.tmpname()`：生成内存 VFS 风格随机路径，不创建宿主磁盘文件；
- `os.remove()`、`os.rename()`：仅操作显式注册的内存 VFS；
- `os.setlocale()`：只接受确定性的 `C` locale。

`os.execute()` 与 `os.exit()` 明确报错；进程、真实环境变量、网络和动态库
不可用。`io/loadfile/dofile` 默认只使用实例内存 VFS；可信档/full-access 显式
目录挂载后也可访问挂载点。网络应封装为带鉴权和取消的注册能力。

## 7. 源码调试 API

```js
import { createLuaDebugger } from '/vendor/wasm-lua/runtime/wasm-lua.js';

const debug = createLuaDebugger({
  backend: 'wasi', profile: 'safe',
});

await debug.setBreakpoints([
  { line: 3, source: 'main.lua', condition: 'i == 2' },
  { line: 4, source: 'main.lua', hitCondition: '3' },
  { line: 5, source: 'main.lua', logMessage: 'i={i}' }
]);

debug.addEventListener('stopped', async event => {
  if (event.detail.reason === 'exception') {
    console.error('未捕获异常；栈仍可检查，但不可继续');
    console.table(await debug.stackTrace());
  }
});

const pending = debug.run('for i=1,5 do print(i) end', {
  chunkName: '@main.lua'
});
// 暂停后可调用 stackTrace/variables/evaluate/setVariable，随后：
// await debug.stepIn(); await debug.stepOver(); await debug.stepOut();
// await debug.continue(); await debug.runToCursor(8, 'main.lua');
await pending;
```

断点在 `run()` 前保存在实例中，并随本次源码原子提交，因此第一次运行就会生效。
支持普通/条件/命中断点、日志点、继续、暂停、步入/步过/步出、运行到光标、栈、
局部变量/upvalue/全局、懒加载表、监视求值和改值。未捕获异常会保留失败协程栈，
但该协程已终止，不能继续；捕获后的异常不会在展开前暂停。

### 浏览器 DAP 1.68 MessagePort

```js
import { createLuaDapAdapter } from '/vendor/wasm-lua/runtime/wasm-lua.js';

const adapter = createLuaDapAdapter({
  backend: 'wasi',
});
const port = adapter.port;
port.onmessage = event => console.log('DAP', event.data);
port.start();
port.postMessage({
  seq: 1, type: 'request', command: 'initialize',
  arguments: { adapterID: 'wasm-lua', pathFormat: 'path' }
});
// 最终必须 adapter.dispose()。
```

消息体使用标准 DAP request/response/event 模型，但 `MessagePort` 直接 structured
clone，不带 stdio 的 `Content-Length` 外壳。初始化响应的
`wasmLuaProtocolVersion` 必须为 `DAP 1.68 / ABI 1.0`。首版不支持 VS Code
附加到已运行的浏览器 VM，也不支持反向/时光调试。

## 8. 完整 Monaco 工作台

`wasm-lua-editor.css` 同时包含 Monaco 必需基础样式与完整壳样式。无论使用
`mountLuaWorkbench`、`bindLuaWorkbench` 还是直接 Controller，只要创建 Monaco
编辑器就必须加载它；不能把它当作可选皮肤省略。

```html
<link rel="stylesheet" href="/vendor/wasm-lua/editor/wasm-lua-editor.css">
<div id="lua-host" style="height:720px; min-height:420px"></div>
<script type="module">
  import {
    mountLuaWorkbench, unmountLuaWorkbench
  } from '/vendor/wasm-lua/editor/wasm-lua-editor.js';

  const workbench = mountLuaWorkbench('#lua-host', {
    mode: 'debugger',
    backend: 'emscripten',
    profile: 'safe',
    storageKey: 'my-product-lua',
    workspaceId: 'editor-main',
    environment: { APP_ENV: 'production' },
    // 可选；默认相对当前宿主页解析为 ./licenses.html。
    licenseUrl: './open-source-licenses.html',
    editorOptions: { fontSize: 14, minimap: { enabled: false } },
    keybindings: { run: 'Ctrl+Enter', gotoLine: 'Ctrl+L' },
    capabilities: { 'app.currentUser': () => ({ name: '用户' }) },
    modules: { 'app.math': 'return { double=function(x) return x*2 end }' },
    definitions: [{
      uri: 'file:///definitions/app.lua',
      source: 'app = {}\n---@return table\nfunction app.currentUser() end'
    }]
  });

  await workbench.ready;
  workbench.model.setValue('return js.call("app.currentUser")');

  // SPA 路由或微前端卸载：
  unmountLuaWorkbench(workbench);
</script>
```

`mode: 'playground'` 提供普通编辑/运行页；`mode: 'debugger'` 增加断点装订线、调用
栈、协程、变量、监视和调试控制台。`storageKey` 隔离 IndexedDB 中的工作区与
快捷键；同页多个实例还应使用不同 `workspaceId` 隔离 Monaco URI。

组件移出 DOM 时默认自动销毁。只有确需临时摘下并重新挂回时才添加
`preserve-on-disconnect` 属性；最终仍必须调用 `unmountLuaWorkbench()`。

完整壳公开 `lua-statechange`、`lua-runtimechange`、`lua-breakpointedit` 和
`lua-dispose` DOM 事件；可从 `event.detail` 读取 controller/state/runtime。

### 工作台插件、组件替换与主题接入

UI 扩展不是限定为“多几个按钮”。`plugins` 覆盖编辑器工厂、Monaco 主题、命令、
runtime 生命周期、宿主生命周期、内置组件替换和区域贡献。以下内置组件都有稳定
ID，可传 `false` 关闭，或用 `{mount, update?}` 替换：

| 组件 ID | 默认组件 |
| --- | --- |
| `titlebar`、`toolbar`、`fileTabs`、`statusbar` | 标题、运行/编辑命令、文件标签、状态栏 |
| `debugPanel`、`filesPanel`、`outlinePanel` | 调试、文件和大纲侧栏 |
| `debugConsole`、`problemsPanel`、`searchPanel` | 调试控制台/输出、问题、工作区搜索 |
| `breakpointDialog`、`fileDialog`、`keybindingSettings` | 断点、文件和录制式按键设置对话框 |

插件还可向 `titlebar/toolbar/sidebar/bottom/statusbar` 区域贡献可排序组件。挂载函数
得到原生 DOM outlet 和 `{controller, monaco, editor, runtime, state, host, shell}`；
因此 React/Vue/Svelte 可在 `mount()` 内挂载自己的根，并从返回的 disposer 中卸载。
插件通过 `controller.command()`、事件和 snapshot 与内核通信；切换 WASM 后端时
由 `runtimeReady()` 重新接入临时 runtime。

```js
import {
  createLuaWorkbenchThemePlugin,
  defineLuaWorkbenchPlugin,
  mountLuaWorkbench
} from '/vendor/wasm-lua/editor/wasm-lua-editor.js';

const productTheme = createLuaWorkbenchThemePlugin({
  id: 'product-theme',
  themeName: 'product-dark',
  monacoTheme: {
    base: 'vs-dark', inherit: true,
    rules: [{ token: 'function.lua55', foreground: 'FFD866' }],
    colors: { 'editor.background': '#10151d' }
  },
  className: 'product-lua',
  variables: {
    surface: '#10151d', border: '#314155', accent: '#ff7a59'
  },
  editorOptions: { fontFamily: 'var(--product-code-font)' }
});

const productParts = defineLuaWorkbenchPlugin({
  id: 'product-parts',
  commands: {
    'product.openDocs': ({ controller }) =>
      controller.appendOutput('由宿主打开帮助\n', 'console')
  },
  components: {
    debugPanel: {
      mount(outlet, { controller }) {
        const root = document.createElement('div');
        root.className = 'product-debug-panel';
        outlet.append(root);
        const render = () => {
          root.textContent = `栈帧：${controller.snapshot().stack.length}`;
        };
        controller.addEventListener('statechange', render);
        render();
        return () => controller.removeEventListener('statechange', render);
      }
    },
    // false 可完全关闭默认按键设置；也可换成贵方统一设置中心。
    keybindingSettings: false
  },
  contributions: [{
    id: 'docs', zone: 'toolbar', order: 100,
    mount(outlet, { controller }) {
      const button = document.createElement('button');
      button.textContent = '产品帮助';
      button.onclick = () => controller.command('product.openDocs');
      outlet.append(button);
    }
  }],
  runtimeReady({ runtime }) {
    // 每次切换 backend/profile 都重新注册；返回值在旧 runtime 释放前调用。
    return runtime.registerCapability('product.currentUser', () => ({ id: 7n }));
  }
});

const workbench = mountLuaWorkbench('#lua-host', {
  mode: 'debugger', plugins: [productTheme, productParts],
  // 最终优先级：内置默认 < 插件 editorOptions < 此处 editorOptions。
  editorOptions: { fontSize: 15 }
});
await workbench.ready;
```

若宿主已经封装 Monaco，可提供唯一的 `editorFactory(host, options, context)`；返回值
必须兼容 standalone editor 的 `setModel/addAction/dispose` 等接口。`setup()` 可用
`context.monaco.languages.register*` 注册额外语言能力并返回 disposer。主题可在创建时
传字符串或 `{name,data}`，运行中调用 `controller.setTheme(name)`；壳层颜色通过
`createLuaWorkbenchThemePlugin().variables` 写入 `--surface/--surface-2/--surface-3/
--surface-raised/--border/--muted/--text/--accent/--accent-2/--danger/--warning`，产品仍可
利用插件 `className` 及自己的 CSS 完全覆盖壳样式。

生命周期顺序为 `setup → editorFactory/editorReady → runtimeReady → hostReady`。
切换 backend/profile 时先释放上一轮 `runtimeReady` disposer，再调用新一轮；卸载时
依次释放宿主、runtime 和普通插件资源，并调用 `plugin.dispose()`。插件 ID、插件命令
和同一插件内的贡献 ID 必须唯一。

## 9. 使用宿主自己的布局

`bindLuaWorkbench()` 不创建布局，只扫描 `data-lua-*` 标记。唯一必需节点是
`[data-lua-editor]`。补全建议、签名帮助、悬停、查找/替换、命令面板等编辑器内
浮层继续由 Monaco 在编辑器内部定位和渲染，不应重新实现成外部组件。可插拔
组件指编辑器之外的工具栏、文件/调试侧栏、控制台、问题列表、对话框和状态栏。

```html
<section id="lua-part">
  <button data-lua-command="run" data-lua-enabled="idle">运行</button>
  <button data-lua-command="continue" data-lua-enabled="paused">继续</button>
  <button data-lua-command="stop" data-lua-visible="running">停止</button>
  <button data-lua-command="gotoLine">跳转行</button>
  <select data-lua-option="backend">
    <option value="emscripten">Emscripten</option>
    <option value="wasi">WASI Preview 1</option>
  </select>
  <span data-lua-bind="status"></span>
  <div data-lua-editor style="height:500px"></div>
  <section data-lua-component="debugConsole">
    <!-- 没有替换插件时保留的宿主回退内容 -->
    <pre data-lua-bind="output"></pre>
  </section>
  <aside data-lua-component="debugPanel"></aside>
  <span data-lua-zone="toolbar"></span>
</section>
<script type="module">
  import { bindLuaWorkbench } from
    '/vendor/wasm-lua/editor/wasm-lua-editor.js';

  const binding = await bindLuaWorkbench('#lua-part', {
    mode: 'debugger',
    storageKey: 'host-layout',
  });
  binding.root.addEventListener('lua-error', event => {
    console.error(event.detail.error);
  });

  // 幂等；撤销监听、恢复宿主属性和原编辑器子节点。
  binding.dispose();
</script>
```

常用标记：

| 标记 | 作用 |
| --- | --- |
| `data-lua-command="run"` | 点击时执行 controller 命令 |
| `data-lua-command-on-enter="evaluate"` | 输入框 Enter 时执行并传入值 |
| `data-lua-value="#input"` | 从另一控件读取命令参数 |
| `data-lua-option="backend|profile"` | select 改变运行选项 |
| `data-lua-bind="status|output|activeFile|problemCount"` | 单向呈现状态 |
| `data-lua-enabled="executing|active|paused|idle|debugger"` | 按状态启禁控件；`executing` 不含暂停，`active` 包含暂停 |
| `data-lua-visible="executing|active|paused|idle|debugger|playground|safe|trusted|full-access|host-access"` | 按运行、安全档或模式显示；`host-access` 匹配 trusted/full-access |
| `data-lua-component="debugPanel|debugConsole|…"` | 在宿主指定位置挂载插件替换组件；无插件时保留原 DOM |
| `data-lua-zone="toolbar|sidebar|bottom|statusbar"` | 按顺序挂载插件 contribution，不删除宿主原有 DOM |

绑定模式和完整壳使用同一套 `plugins/components/contributions` 契约。组件的
`mount/update/disposer` 生命周期在状态刷新和 `binding.dispose()` 时同样成立；
dispose 会恢复组件插槽绑定前的宿主子节点，并移除 contribution。`embedded.html`
是完整 release 的绑定式验收示例，展示宿主工具栏、文件面板、调试面板、调试
控制台、按键设置及插件命令，而非另一套 Monaco 内部窗口。示例明确使用
`mode: 'debugger'`，按所选后端加载对应的 `-lua-debug.wasm`；可单击编辑器装订线、
使用“当前行断点”/F9 下断点，右键装订线或单击断点列表配置条件、命中次数与
日志点。首次运行即应命中；运行版 `mode: 'playground'` 不包含断点能力。

调试面板中的局部变量、upvalue 与全局变量按作用域分组，默认收起全局变量。
展开与修改是独立控件，不需要双击整行；变量树随侧栏统一滚动。宿主自制面板
应读取 `state.variables` 的 `scopeKind/depth/variablesReference/expanded`，
调用 `controller.expandVariable(variable)` 与 `controller.setVariable(variable, luaExpression)`。

同一根节点不能重复绑定。传入外部 `controller` 时 binding 不拥有它；binding
dispose 后还需由宿主在最终阶段调用 `controller.dispose()`。绑定根会发出
`lua-statechange`、`lua-output`、`lua-runtimechange`、`lua-breakpointedit`、
`lua-error` 和 `lua-dispose`。

## 10. 直接使用无布局 Controller

当 React/Vue/Svelte 或自研界面需要完全控制 DOM 时：

```js
import {
  createLuaWorkbenchController
} from '/vendor/wasm-lua/editor/wasm-lua-editor.js';

const controller = createLuaWorkbenchController({
  mode: 'debugger',
});
await controller.initialize(document.querySelector('#editor'));

controller.addEventListener('statechange', event => {
  renderYourUI(event.detail.state);
});
await controller.command('run');
// 最终：controller.dispose();
```

可用命令包括 `run/stop/pause/continue/stepOver/stepIn/stepOut/runToCursor`、
`find/replace/commandPalette/outline/format/suggest/rename/references/gotoLine`、
`nextProblem/previousProblem/toggleBreakpoint/clearBreakpoints/clearOutput`、
`addWatch/evaluate/openFile/removeFile/newFile/searchWorkspace/replaceWorkspace`、
`setKeybindings/resetKeybindings`。需要结构化返回值时可直接调用同名 controller
方法，而不是 `command()`。

## 11. 快捷键、折叠与编辑器行为

完整壳的“按键设置”采用录制式操作：点击某一功能的按键框，再按组合；只按
Ctrl/Shift/Alt/Meta 会继续等待，Escape 取消。每项都有独立“默认”和“清除”，
底部“全部恢复默认”会立即恢复整个映射。重复组合在保存时拒绝。

代码方式支持 Ctrl/Control/Cmd/Meta、Shift、Alt/Option 与 Monaco 普通键名：

```js
await controller.setKeybindings({
  run: 'Ctrl+Enter',
  gotoLine: 'Ctrl+L',
  find: '' // 空串禁用
});
await controller.resetKeybindings();
```

Lua 折叠器按词法 token 扫描，不依赖缩进或“行首 function”正则。当前覆盖：

- `function name()`、`local function`、`global function`；
- 任意表达式位置的匿名函数，如 `a = function()`、表字段回调和嵌套函数；
- `if/end`、`for/do/end`、`while/do/end`、独立 `do/end`、`repeat/until`；
- 多行表构造、长字符串、长注释、连续整行注释；
- `-- region` / `-- #region` 与对应 endregion。

扫描会跳过普通/长字符串与注释中的 `function/end` 假关键字。Monaco 还提供中文
NLS、Lua 5.5.1 诊断、语义高亮、补全、签名、悬停、定义/引用、局部重命名、
符号、代码操作和保守格式化。只读定义参与这些能力，但不会被重命名修改。

## 12. 安全档、可信档与 full-access

| 项目 | safe（默认） | trusted | full-access |
| --- | --- | --- | --- |
| Lua 堆 | 64 MiB | 256 MiB | 无人工配额；WASM 物理上限 512 MiB |
| 指令 | 1000 万 | 1 亿 | 无配额 |
| 活动执行超时 | 5 秒 | 60 秒 | 无超时 |
| `print` 输出 | 1 MiB | 16 MiB | 无人工配额 |
| `debug` 库 | 无 | 有，复合 hook | 有，复合 hook |
| 安全 `os` 子集 | 有 | 有 | 有 |
| 内存 VFS/注册模块 | 16 MiB | 64 MiB | 无人工配额 |
| 授权宿主目录 | 无 | 有 | 有 |

三档都有实例内存 VFS 的 `io`、文本 `load/loadfile/dofile`；安全档禁止二进制
chunk 与宿主文件夹挂载。可信档和 full-access 允许 Lua 字节码及用户明确授权的
目录句柄挂载，所选目录内的读写/删除真实且持久。浏览器/WASM 三档均不提供进程、
原生动态库、隐式网络、未注册 JS 能力或未授权文件系统。full-access 的“不限制”
只指不设置应用层资源配额，并不绕过浏览器沙箱、WASM 512 MiB 构建上限或设备实际
资源；只适合完全可信源码，无限循环必须由宿主 `interrupt()` 或停止按钮终止。

## 13. HTTP、CSP、缓存与子路径部署

服务器至少应返回：

```text
.js/.mjs       text/javascript; charset=utf-8
.wasm          application/wasm
.json          application/json; charset=utf-8
.css           text/css; charset=utf-8
```

建议 CSP 起点（再按宿主现有 nonce/域名合并）：

```text
default-src 'self';
script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval';
worker-src 'self';
connect-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self';
```

Monaco 会设置必要的元素内联 style，因此严格 CSP 可使用宿主允许的样式策略替代
示例中的 `'unsafe-inline'`。当前固定的 `web-tree-sitter` Emscripten loader 在
初始化语法 WASM 时使用动态函数构造，因此语言服务页面还需要 `'unsafe-eval'`；
纯 SDK 运行时不加载 Monaco/tree-sitter 时可去掉它。本实现不使用
SharedArrayBuffer/线程，通常不要求 COOP/COEP。所有 Worker 与 WASM URL 必须
保持同源或具备正确 CORS。

子路径部署时保持 release 内部结构即可，SDK/编辑器以各自模块 URL 定位资源；完整
工作台的许可证入口默认相对 `document.baseURI`，宿主可通过 `licenseUrl` 选项或
`license-url` 属性改写。站点入口必须使用相对 `src/href`，不要把 `/assets/`、
`/release/` 或 `/licenses.html` 写成站点根路径。GitHub Pages 等仓库子路径可以直接
部署 `dist/` 内容。
只有把 WASM 单独托管到别处时才填写绝对 `assetBaseUrl`。hashed `assets/` 可 `immutable` 长缓存；固定文件名的 WASM
应配合版本目录缓存。`integrity.json` 自身应短缓存或随版本目录原子发布。

## 14. TypeScript 与框架生命周期

实现是纯 ESM JavaScript，声明由 JSDoc 生成。通过本地包解析时：

```js
import { createLuaRuntime } from 'wasm-lua-commercial-kit/runtime';
import { mountLuaWorkbench } from 'wasm-lua-commercial-kit/editor';
import 'wasm-lua-commercial-kit/editor.css';
```

`package.json` exports 会把 SDK 指向 `runtime/types/index.d.ts`，编辑器指向
`editor/types/ui/index.d.ts`；旧的 `./sdk`、`./ui` 导出名仅是无文件复制的包级别兼容别名。直接 URL 导入时，可在宿主 `paths` 中把入口映射到对应
声明文件。

React effect、Vue `onUnmounted`、Svelte `onDestroy`、微前端 unmount 和 SPA
路由离开都必须调用相应的 `dispose()`/`unmountLuaWorkbench()`。只把 DOM 删除
而不释放会遗留 Worker、Monaco model 和事件监听器。

## 15. 完整性、许可证与闭源商用

部署前可读取 `integrity.json.files`，对相对 release 根的每个文件计算 SHA-256
并逐项比较。唯一的 `runtime/wasm/manifest.json` 另含 Lua 版本、
Lua 源码 SHA-256、ABI、DAP 版本和每个 WASM 的哈希。

本项目业务源码未授予开放源码许可，包清单保持 `private: true`；这不妨碍作为
贵方项目中的本地专有依赖复制部署。第三方组件采用白名单内宽松许可，分发时必须
原样保留 `THIRD_PARTY_NOTICES.txt`、`SBOM.spdx.json` 和 `licenses/`。Lua、
Monaco、tree-sitter、Lit、Emscripten/WASI 运行时等仍分别受其许可证约束。

浏览器交付的 JavaScript/WASM 能被最终用户下载或逆向。“闭源商用”指法律授权和
源代码许可策略，不代表浏览器产物技术不可见。本手册不是法律意见，正式发行仍应
由贵方法务按地区、分发方式和产品组合复核。

## 16. 升级与兼容检查

升级 release 时按以下顺序做门禁：

1. 比较 `runtime/wasm/manifest.json` 的 `luaVersion`、`luaSourceSha256`、
   `abiVersion` 和 `debugProtocol`；ABI/DAP 主版本不一致时禁止混用新旧 JS/WASM。
2. 整目录替换，不单独覆盖一个 Worker、glue 或 WASM。
3. 校验 `integrity.json`，检查新 SBOM/NOTICE/许可证。
4. 用产品实际源码在 Emscripten/WASI 做返回值、输出、错误位置与异步能力差分。
5. 在 Chromium 152 基线和当前最新版执行运行、停止、后端切换及完整 DAP 流程。
6. 确认生产服务器没有发布 `.map`，再切换带版本目录的线上引用。

## 17. 常见故障

| 现象 | 检查与处理 |
| --- | --- |
| `Failed to fetch` / WASM 404 | 是否保留 `release/runtime/wasm/`；自定义 `assetBaseUrl` 应指向它 |
| WASM MIME 报错 | 为 `.wasm` 配置 `application/wasm` |
| Worker 被 CSP 拒绝 | `worker-src 'self'`、`script-src` 和子路径/同源配置 |
| 页面能开但编辑器 Worker 404 | 是否复制了完整 `editor/assets`、`editor/grammar`，不要只复制入口 JS |
| WASI 能跑、Emscripten glue 404 | 是否遗漏两个 `emscripten-*.mjs` |
| `LuaRef 已失效` | 引用跨过了下一次 `run`、interrupt、切换或超时；在同一代内完成 call/get/set |
| `cannot resume dead coroutine` | 代码试图恢复已完成/异常协程；未捕获异常只能检查栈，不能继续 |
| 第一次运行断点未命中 | 在 `run()` 前 `await setBreakpoints()`；工作台装订线会自动原子提交 |
| 空行/注释不能下断点 | SDK、工作台和 DAP 会在当前 Lua 函数/分支/循环域内向下移动到首个可执行行；不会穿过 `else/elseif`、`end` 或 `until`。`setBreakpoints()`/DAP 响应会返回实际 `line`、`verified` 和说明 |
| `os.getenv` 为 nil | 仅显式 `environment` 可见；浏览器真实环境变量不会透传 |
| `os.remove/rename` 失败 | 只能操作当前实例 `registerFile()` 注册的规范化 VFS 路径 |
| `JSON.stringify` 报 BigInt | 用 replacer 把 `bigint` 转字符串，或使用支持 BigInt 的序列化协议 |
| 快捷键保存失败 | 存在重复组合；逐项“默认/清除”后再保存 |
| 修改后端后能力消失 | 工作台应通过 workbench/controller 注册，而不是直接注册到临时 runtime |
| 运行一直不返回 | 设置 timeout；需要立即停止时调用 `interrupt()` 或工作台 stop |
| UI 尺寸为 0 | 宿主容器必须有明确高度；推荐至少 420px |

若仍无法定位，请同时记录：Chromium 完整版本、入口 URL、`assetBaseUrl`、所选
backend/profile、`wasm/manifest.json`、控制台第一条异常和失败资源的 HTTP
状态/MIME；这些信息足以区分部署、协议、CSP 与 Lua 运行错误。
