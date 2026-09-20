# wasm-lua Workbench

面向 Chromium 152+ 的 Lua 5.5.1 Web SDK 与独立调试 IDE。普通运行页和完整
源码调试页均可即时切换 Emscripten 与 WASI Preview 1 后端；
运行版和调试版 WASM 使用同一套公共 Lua C API 桥接层。应用代码采用原生
ESM、JSDoc 和 Lit，Monaco、语言服务、WASM 以及中文资源均随生产包离线提供。

本仓库自身是专有项目（`package.json` 中 `private: true`），未授予项目源码的
开放源码许可。第三方组件的许可证、归属和 SPDX SBOM 随生产包交付。

## 交付结构

```text
playground.html             普通 Lua 编辑、运行与输出工作台
debugger.html               完整 Lua 源码调试 IDE
index.html                  兼容入口（完整源码调试 IDE）
embedded.html               release 外部组件与绑定生命周期验收页
src/sdk/                    浏览器 SDK 与 DAP MessagePort 适配器
src/ui/controller.js        无布局的编辑器/运行/调试状态控制器
src/ui/bind.js              把宿主 DOM 标记绑定到控制器
native/bridge/              只使用 Lua 公共 C API 的 ABI v1 桥接层
adapters/dap/               Node stdio DAP 1.68 适配器
patches/lua/                独立、可审计的 Lua 5.5.1 补丁
patches/tree-sitter-lua/    编辑器语法适配说明
public/wasm/                四个 WASM 产物及哈希清单
dist/                       可部署的离线生产包
release/runtime/            唯一 Lua 执行/调试 SDK、Worker、WASM 与类型
release/editor/             只依赖 runtime 的 Monaco/语言服务/插件化绑定库
dist/release/               release 的逐字节副本；站点薄壳只消费这里
```

每个 Lua VM 位于独立 Worker。JS Promise 通过 Lua 协程 yield/resume 恢复，
不使用 Asyncify、JSPI 或主线程阻塞。硬停止会终止并重建 Worker，旧 `LuaRef`
随 VM 代际失效。WASM 线性内存硬上限为 512 MiB。

## 固定工具链

- Node.js 24.18.0、pnpm 11.19.0
- CMake 3.31.3、Ninja 1.12.1
- Emscripten 6.0.9（项目本地 `.tools/emsdk`）
- WASI SDK 34.0、Wasmtime 48.0.2
- Monaco 0.56.0、Vite 7.3.6、Lit 3.3.3
- Playwright 1.63.0、tree-sitter 0.27.0、DAP 1.68

工具和源码下载固定在 `tools.lock.json`。运行以下命令会下载或验证缺失工具，
包括项目本地新版 Emscripten，并校验固定归档的 SHA-256：

```powershell
corepack pnpm bootstrap
```

Lua 官方 `lua-5.5.1.tar.gz` 的 SHA-256 必须为
`1c4b4068d67061f2a2231ad2b5422e77acea1487ea9890f6320af614f4373dce`。
每次生产构建都会重新校验、解压，再按顺序应用 `patches/lua`，不会直接修改
官方压缩包：

```powershell
corepack pnpm build
corepack pnpm preview
```

预览服务启动后访问 `/playground.html` 或 `/debugger.html`；`/index.html` 保留为
调试 IDE 兼容入口，`/embedded.html` 是绑定宿主自有布局的最小示例。网页必须
通过 HTTP(S) 提供，不支持直接用 `file://` 打开。

`dist/` 是完整调试工具站点，可直接部署；页面只导入 `dist/release/editor`，
不会从源码再打另一套运行时。`release/` 只含第三方接入所需的
runtime、editor、类型、四个 WASM、语言服务资源、许可证、SBOM 和完整性清单，不含
展示页面或 source map。详细接入步骤见 [`docs/INTEGRATION.md`](docs/INTEGRATION.md)。

`corepack pnpm release` 默认交付四个 WASM 变体；可用
`--variants=emscripten-runtime,wasi-debug` 或 `--backend/--flavor` 只保留指定的
一个或多个变体。生成器会重写 manifest、`release.json` 与完整性哈希，并自动验证
未选文件没有残留。`corepack pnpm test:release` 覆盖完整、单变体和混合组合矩阵。

## 浏览器 SDK

生产 SDK 位于 `release/runtime/wasm-lua.js`（站点副本位于
`dist/release/runtime`），类型声明位于 `runtime/types`。默认自动相对入口定位
唯一的 `runtime/wasm`；只有单独托管资产时才需要覆盖 `assetBaseUrl`。

```js
import { createLuaRuntime } from './runtime/wasm-lua.js';

const lua = createLuaRuntime({
  backend: 'emscripten', // 改为 'wasi' 即切换 WASI Preview 1
  profile: 'safe'
});

lua.addEventListener('output', event => console.log(event.detail.output));
const result = await lua.run('local 中文 = 21; return 中文 * 2');
console.log(result.values[0]); // 42n：Lua 整数保持为 BigInt
lua.dispose();
```

主要接口包括 `run/call/get/set`、`registerCapability`、
`registerCapabilityGroup`、`useCapabilityMiddleware`、`listCapabilities`、`registerModule`、
`registerFile/readFile/writeFile/listFiles`、`readFileAsync/writeFileAsync`、
`mountDirectory/pickDirectory`、`registerDefinition`、`interrupt` 和
`dispose`。复杂 Lua 表及函数
默认返回有生命周期的 `LuaRef`；引用不能跨实例或跨 Worker 重建使用。
每次顶层 `run()` 都会创建一个干净的 Lua VM 代际，因此相同的 Lua 5.5
`global` 声明可以安全重复运行。一次 `run()` 返回的引用可继续用于
`call/get/set`，但会在下一次 `run()`、`interrupt()` 或 `dispose()` 时失效。

浏览器运行时通过内置 JS 桥补齐了无宿主权限的 `os` 子集：`clock`、`time`、
`date`、`difftime`、显式环境映射的 `getenv`、内存 VFS 的 `remove/rename`、
`tmpname` 和固定 C locale。`os.execute` 与 `os.exit` 明确禁用，不会取得进程或
操作系统权限。可在创建运行时时用 `environment: { APP_ENV: 'production' }`
显式提供允许 Lua 读取的环境值。
Lua `io.open` 与 `vfs.write` 接入每实例独立的内存 VFS；`wb` 可原样保存
`string.dump()` 的二进制字节，经 `readFile()` 取回 `Uint8Array`。`loadfile/dofile`
从 VFS 读取，安全档只执行文本；可信档和 full-access 允许 `load`/`loadfile`
加载 Lua 字节码。默认 VFS 总字节配额安全档 16 MiB、可信档 64 MiB，full-access
不设人工配额。可信档和 full-access 可通过浏览器授权的文件夹句柄挂载 `/host`，
访问严格限定在该目录内；写入会持久改变用户所选文件。

调试版使用 `createLuaDebugger`。若 DAP 客户端运行在同一浏览器中，可使用
不带 stdio `Content-Length` 包装的 structured-clone 消息：

断点采用“受限域向下落点”：空行、注释或其他无行钩子位置会移动到当前 Lua
函数、条件分支或循环域内的首个可执行行，不会越过 `else/elseif`、`end` 或
`until`。SDK 与 DAP 返回实际行和验证状态；IDE 红点同步显示实际落点。

```js
import { createLuaDapAdapter } from './runtime/wasm-lua.js';

const adapter = createLuaDapAdapter({
  backend: 'wasi'
});
const port = adapter.port;
port.onmessage = event => console.log(event.data);
port.start();
port.postMessage({ seq: 1, type: 'request', command: 'initialize' });
// 完成后：adapter.dispose();
```

Node stdio DAP 适配器通过 `corepack pnpm dap` 启动，使用 DAP 1.68
`Content-Length` 帧，并启动同一 WASI 调试引擎。首版不支持附加到一个已运行
的浏览器 VM，也不提供反向/时光调试。

## 编辑器组件与绑定式嵌入

生产编辑器模块位于 `release/editor/wasm-lua-editor.js`，Monaco 基础样式与内置壳样式位于
`release/editor/wasm-lua-editor.css`。它静态导入同级唯一 runtime，但不内嵌
SDK、Lua Worker 或 WASM。导入模块本身不会注册全局
元素或创建固定布局；宿主可以选择以下三层集成深度：

1. `createLuaWorkbenchController(options)`：只创建状态、命令、Monaco、运行时和
   调试协调器，布局完全由宿主负责。
2. `bindLuaWorkbench(root, options)`：扫描宿主提供的 `data-lua-*` 标记并绑定，
   不要求使用 Lit 或 `<lua-workbench>`。
3. `mountLuaWorkbench(root, options)`：显式注册并挂载本项目提供的完整 IDE 壳。

完整壳也接受 `plugins`。标题栏、工具栏、文件标签、调试/文件/大纲侧栏、调试
控制台、问题、搜索、断点/文件/按键设置对话框和状态栏都能按稳定 ID 替换或关闭；
插件还可注册 Monaco 主题与 editor factory、宿主命令、区域组件及随 runtime 重建
的能力。详见接入手册“工作台插件、组件替换与主题接入”。

`mountLuaWorkbench()` 的对象配置会在自定义元素连接前传入控制器；通过
`await element.ready` 等待 Monaco、语言服务和所选 WASM 运行时完成初始化，
无需猜测或抢监听中间状态事件。UI 样式只作用于工作台本身，不改写宿主页面的
`html`、`body`、`:root` 或全局 `*` 规则。

`embedded.html` 采用绑定式 `mode: 'debugger'`，加载所选后端的 debug WASM，
提供可见断点、首轮暂停和独立调试面板；不是 runtime-only 的演示页。

```js
import {
  mountLuaWorkbench, unmountLuaWorkbench
} from './editor/wasm-lua-editor.js';

const element = mountLuaWorkbench('#lua-host', {
  mode: 'debugger',
  capabilities: { 'app.answer': () => 42n },
  definitions: [{
    uri: 'file:///definitions/app.lua',
    source: 'app = {}\nfunction app.answer() end'
  }]
});
await element.ready;
element.model.setValue('return js.call("app.answer")');

// 路由离开时释放 Worker、Monaco model、定义索引和监听器。
unmountLuaWorkbench(element);
```

绑定式集成只要求一个编辑器挂载点，但仍必须加载 CSS；缺少它会破坏 Monaco
隐藏输入区、浮层、minimap 和布局，并非只是少了完整壳主题：

```html
<link rel="stylesheet" href="./editor/wasm-lua-editor.css">
<section id="lua-part">
  <nav>
    <button data-lua-command="run" data-lua-enabled="idle">运行</button>
    <button data-lua-command="stop" data-lua-enabled="running">停止</button>
    <button data-lua-command="find">查找</button>
    <select data-lua-option="backend">
      <option value="emscripten">Emscripten</option>
      <option value="wasi">WASI</option>
    </select>
    <span data-lua-bind="status"></span>
  </nav>
  <div data-lua-editor style="height:500px"></div>
  <pre data-lua-bind="output"></pre>
</section>
<script type="module">
  import { bindLuaWorkbench } from './editor/wasm-lua-editor.js';
  const binding = await bindLuaWorkbench('#lua-part', {
    mode: 'playground',
    capabilities: { 'app.currentUser': () => ({ name: '示例' }) },
    definitions: [{ uri: 'file:///definitions/app.lua', source: 'app = {}' }]
  });
  // binding.controller 提供 run/stop/searchWorkspace/addFile 等完整 API。
  await binding.controller.command('setKeybindings', {
    run: 'Ctrl+Enter', gotoLine: 'Ctrl+L', find: ''
  });
  binding.dispose(); // 幂等；恢复宿主属性和原始编辑器子节点。
</script>
```

同一根节点不能重复绑定；需要重新绑定时先 dispose。若宿主传入外部 controller，
binding 不拥有它，最终还应由宿主调用 `controller.dispose()`。完整壳从 DOM 移除
时默认自动销毁；只有确需临时摘下并重新挂回时才设置
`preserve-on-disconnect`。

内置壳提供多文件工作区、IndexedDB 持久化、文件/大纲/问题面板、当前文件与
跨文件搜索替换、Monaco 查找替换、命令面板、补全、重命名、引用、格式化、
断点/条件断点/命中断点/日志点、断点启停与集中管理。工具栏提供显式“跳转行”
和“按键设置”；运行、暂停、停止、单步、断点和编辑器命令均可自由改绑，留空
禁用、重复组合拒绝，并按 `storageKey` 保存到 IndexedDB。窄容器时调试侧栏
变为覆盖层而不会被直接隐藏。断点在
Worker 中按源码名与行号二次匹配，入口文件与 `require` 模块存在相同行号时不会
误停；DAP 调用栈也保留每一帧实际的 Lua `source`。

## 安全档、可信档与完全访问档

`safe` 是默认档：Lua 堆 64 MiB、1000 万指令、5 秒活动执行时间、1 MiB
输出，只开放安全基础库、受限 `package` 与内存 VFS 的 `io/os` 子集。
`load/loadfile/dofile` 仅执行文本，拒绝 `debug`、二进制 chunk、动态库、网络、
宿主文件系统以及未注册能力。

`trusted` 默认使用 256 MiB、1 亿指令、60 秒和 16 MiB 输出，开放调试库与
显式注册的内存 VFS、Lua 字节码加载，还可挂载用户在浏览器明确授权的文件夹。
仍禁止进程执行、原生动态库和未授权宿主访问。等待 JS
Promise 或停在断点的时间不计入活动执行时间。

`full-access` 不设置 Lua 堆、指令、活动执行时间、输出和 VFS 人工配额，并开放
`trusted` 的全部库、字节码和授权目录能力。它仍运行在浏览器/WASM 沙箱中：实际
内存受构建的 512 MiB WASM 上限和浏览器资源约束，进程、原生动态库、隐式网络、
未注册 JS 能力及未获用户授权的文件系统不会因此出现。只可运行完全可信的代码，
无限循环必须由宿主调用 `interrupt()`/停止按钮终止。

## 中文支持与语言服务

产品要求的 `patches/lua/0001-utf8-identifiers.patch` 使 Lua 标识符接受合法
UTF-8（包括中文），同时拒绝截断、过长、代理区及超出 Unicode 范围的编码。
字符串和注释原本就保留 UTF-8。补丁独立应用到哈希匹配的 Lua 5.5.1 解压副本，
并由运行时、编辑器诊断和官方测试适配回归验证。

Monaco 使用简体中文 NLS，并组合 Monarch、定制 tree-sitter Lua 5.5.1 语法和
官方 `luaL_loadbufferx(..., "t")` 编译器诊断。语言服务提供语义高亮、补全、
签名、中文悬停、定义/引用、局部重命名、符号、折叠、代码操作和保守格式化。
补全会识别当前位置是全局还是 `table.`/`table:` 成员上下文，并索引当前工作区
及只读定义文件中的函数、参数、中文标识符、表成员和相邻文档注释。

默认 `lua55-vscode-dark` 主题以 VS Code Dark+ 为基线，并针对 Lua 5.5 增加
声明/控制/运算关键字、语言常量、全局/局部/只读变量、函数/方法、参数、字段、
命名空间、类型属性、LuaDoc 注解、数值、字符串转义和两类注释的语义配色。

大量外部接口应通过分组能力注册表接入。它提供原子注册/撤销、后端切换重放、
并发和队列上限、超时/AbortSignal、中间件、调用事件，以及自动生成的 Lua 模块
与 Monaco 定义。详见 [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md)。

## 验收

```powershell
corepack pnpm check
corepack pnpm test:runtime
corepack pnpm test:grammar
corepack pnpm test:dap
corepack pnpm test:e2e
corepack pnpm build:official
corepack pnpm test:official
corepack pnpm test:official-browser
corepack pnpm compliance
```

官方 Lua 5.5.1 `_U` 套件在 Emscripten/Node、Wasmtime/WASI、
Emscripten/Chromium 和浏览器 WASI shim 四种宿主运行。与真实进程、原生 C 栈、
宿主文件系统或宿主 locale 绑定的项目会以有说明的测试专用补丁显式跳过；详情见
`patches/lua-tests/README.md`，这些适配不会链接进生产运行时。

## 闭源商用说明

自动合规检查仅允许白名单中的宽松许可证，并从锁文件和原生工具清单生成
`THIRD_PARTY_NOTICES.txt`、许可证副本及 `SBOM.spdx.json`。当前固定版本的 Lua、
Monaco、tree-sitter、DAP、Emscripten、WASI SDK/libc、Lit、WASI 浏览器 shim、
Wasmtime 和测试工具可在遵守各自通知及许可条款的前提下用于专有商业发行。

浏览器交付的 JavaScript/WASM 必然可被用户检查、下载或逆向；“可闭源商用”是
法律授权和项目许可层面的结论，不代表产物在技术上不可见。本说明不是法律意见，
正式发行前仍应由贵方根据发行地区和产品组合完成法律审查。
