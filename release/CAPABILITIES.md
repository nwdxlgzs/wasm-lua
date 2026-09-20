# 外部能力与事务接口

能力注册表负责 Lua 与宿主业务之间的边界。业务函数不会直接进入 Worker，也不会
获得浏览器或宿主权限；Lua 只能用 `js.call(name, ...)` 调用显式注册的名称。

```text
Lua 协程
  → js.call("事务.users.get", id)
  → Worker ABI tagged-value 消息 + 单次恢复令牌
  → CapabilityRegistry（限流、队列、超时、中间件、事件）
  → 宿主 handler
  → tagged-value 结果
  → 恢复原 Lua 协程
```

## 注册一个大型分组 API

在完整工作台上注册时应调用 `workbench.registerCapabilityGroup()`，不要直接调用
当前 `runtime`。工作台入口会在切换 Emscripten/WASI 或安全档、重建 VM 后自动
重放注册，并同步只读语言定义：

```js
const handle = workbench.registerCapabilityGroup('事务', {
  users: {
    get: {
      description: '按编号读取用户',
      parameters: [
        { name: 'id', type: 'integer', description: '用户编号' }
      ],
      returns: { type: 'table', description: '用户数据' },
      timeoutMs: 5_000,
      maxConcurrency: 8,
      queueLimit: 64,
      tags: ['read', 'users'],
      handler: async function (id) {
        // this.signal 在超时、停止、后端切换或撤销注册时会被中止。
        const response = await fetch(`/api/users/${id}`, {
          signal: this.signal
        });
        return response.json();
      }
    }
  },
  save: {
    description: '提交一个事务',
    parameters: [{ name: 'input', type: 'table' }],
    returns: { type: 'boolean' },
    maxConcurrency: 2,
    queueLimit: 16,
    handler: async function (input) {
      await transactionService.save(input, { signal: this.signal });
      return true;
    }
  }
}, {
  moduleName: 'host.事务'
});
```

注册后 Lua 使用普通模块接口，无需散布能力名称字符串：

```lua
local 事务 = require("host.事务")
local 用户 = 事务.users.get(42)
事务.save({ user = 用户 })
```

模块源码只包含 `js.call` 转发函数。SDK 同时生成带 `---@param`、`---@return`
和中文说明的只读定义，因此 Monaco 能提供成员补全、签名、悬停和定义跳转。

不用模块时传入 `{ moduleName: false }`。分组句柄是幂等的：

```js
handle.dispose();
handle.dispose(); // 安全；不会删除后来注册的同名能力
```

## 描述符与调用策略

单个能力可以继续使用兼容接口：

```js
const unregister = runtime.registerCapability('clock.now', () => Date.now());
```

需要管理策略时使用描述符：

| 字段 | 含义 |
| --- | --- |
| `handler` | 必填的宿主函数；普通函数的 `this` 是只读调用上下文 |
| `description` | 中文说明，也用于生成 Lua 定义 |
| `parameters` / `returns` | 参数和返回类型元数据 |
| `timeoutMs` | 单次宿主调用上限；`0` 表示不单独限时 |
| `maxConcurrency` | 该能力同时执行的最大数量 |
| `queueLimit` | 达到并发上限后最多排队数量；满时立即拒绝 |
| `tags` | 供权限、中间件、审计和监控使用的标签 |
| `internal` | 从默认能力清单中隐藏内部模块/VFS 能力 |

调用上下文包括：

- `id`、`name`、`args`、`startedAt`；
- `signal`：停止、超时或撤销时触发的 `AbortSignal`；
- `capability`：当前只读描述符与并发状态；
- `runtime`：发起调用的当前 LuaRuntime。

宿主处理器必须尽量把 `signal` 传给 `fetch`、数据库/IPC 客户端或自己的取消机制。
即使处理器不响应取消，注册表也会在 VM 硬重建时释放调度槽，并丢弃旧 Worker 的
迟到结果；已开始的外部副作用是否能撤销仍由业务事务层保证。

## 中间件和可观测性

中间件适合统一鉴权、审计、追踪、重试或事务上下文：

```js
const removeMiddleware = runtime.useCapabilityMiddleware(
  async (context, next) => {
    if (!permission.canCall(context.name)) throw new Error('无调用权限');
    const span = tracer.startSpan(context.name);
    try { return await next(); }
    finally { span.end(); }
  }
);
```

一个中间件的 `next()` 只能调用一次，避免重复提交有副作用的事务。

注册表公开以下事件：

```js
runtime.capabilities.addEventListener('registered', onRegistered);
runtime.capabilities.addEventListener('unregistered', onUnregistered);
runtime.capabilities.addEventListener('invocationstart', onStart);
runtime.capabilities.addEventListener('invocationend', onEnd);
runtime.capabilities.addEventListener('invocationerror', onError);
```

`runtime.listCapabilities({ prefix: '事务.' })` 返回不含 handler 的只读元数据，适合
能力管理页；`includeInternal: true` 可同时查看 `module:*` 和 VFS 等内部能力。

## 生命周期与安全边界

- 名称、分组成员和生成的参数名都经过 Lua 标识符/关键字检查。
- 分组注册先完整验证再提交；失败时不会留下半组能力。
- 旧的撤销函数不会误删后来替换的同名能力。
- Worker 每次能力请求都带不可复用恢复令牌；硬停止后旧结果被丢弃。
- 传输值仍受 ABI v1 限制，`LuaRef` 不能跨 VM 代际或实例使用。
- `dispose()` 会撤销组、拒绝排队调用并中止活动调用；宿主应继续释放自己的资源。
- `CapabilityRegistry` 解决调用调度和生命周期，不替代数据库原子性、幂等键、补偿
  操作或权限系统；这些仍应由相应业务层实现并通过中间件接入。

