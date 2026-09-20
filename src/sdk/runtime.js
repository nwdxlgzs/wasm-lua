import { decodeWire, encodeWire, LuaRef } from './wire.js';
import {
  CapabilityGroupHandle, CapabilityRegistry, createCapabilityModule
} from './capability-registry.js';
import { createOsBridge } from './os-bridge.js';
import { resolveLuaBreakpoints } from './breakpoints.js';

const fileEncoder = new TextEncoder();
const fileDecoder = new TextDecoder('utf-8', { fatal: true });
const VFS_MODES = new Set([
  'r', 'rb', 'r+', 'r+b', 'rb+',
  'w', 'wb', 'w+', 'w+b', 'wb+',
  'a', 'ab', 'a+', 'a+b', 'ab+'
]);

const DEFAULTS = {
  backend: 'emscripten',
  profile: 'safe',
  debug: false,
  timeout: 5000,
  assetBaseUrl: new URL('./wasm/', import.meta.url).href
};

/**
 * @typedef {'emscripten'|'wasi'} LuaBackend
 * @typedef {'safe'|'trusted'} LuaProfile
 * @typedef {{backend?: LuaBackend, profile?: LuaProfile, debug?: boolean,
 *   timeout?: number, memoryLimit?: number, instructionLimit?: number,
 *   vfsLimit?: number, assetBaseUrl?: string,
 *   environment?: Record<string, string>}} LuaRuntimeOptions
 * @typedef {{state: string, values: Array<any>}} LuaExecutionResult
 * @typedef {{id: number, name: string, source: string, line: number, column: number}} LuaStackFrame
 * @typedef {{name: string, type: string, value: string, variablesReference: number}} LuaDebugVariable
 * @typedef {{line: number, requestedLine?: number, endLine?: number,
 *   verified?: boolean, message?: string, source?: string, file?: string,
 *   condition?: string, hitCondition?: string,
 *   logMessage?: string, hits?: number}} LuaBreakpoint
 * @typedef {import('./capability-registry.js').CapabilityRegistration}
 *   CapabilityRegistration
 */

export class LuaRuntime extends EventTarget {
  /** @param {LuaRuntimeOptions} [options] */
  constructor(options = {}) {
    super();
    this.options = {
      ...DEFAULTS,
      ...options,
      timeout: options.timeout ?? (options.profile === 'trusted' ? 60000 : 5000),
      vfsLimit: options.vfsLimit ??
        (options.profile === 'trusted' ? 64 : 16) * 1024 * 1024
    };
    if (!Number.isSafeInteger(this.options.vfsLimit) || this.options.vfsLimit < 0 ||
        this.options.vfsLimit > 512 * 1024 * 1024)
      throw new RangeError('VFS 配额必须是 0 到 512 MiB 的安全整数。');
    this.#osBridge = createOsBridge({
      environment: this.options.environment,
      clock: () => this.#executionClockSeconds()
    });
    this.registerCapability('vfs.read', {
      internal: true,
      description: '读取显式注册到当前运行时的内存文件。',
      parameters: [{ name: 'path', type: 'string', description: 'VFS 绝对路径' }],
      returns: { type: 'string|binary' },
      handler: async path => {
        const normalized = this.#normalizePath(path);
        return (await this.#readBytes(normalized)).slice();
      }
    });
    this.registerCapability('__wlua.os.remove', {
      internal: true,
      description: '删除当前运行时显式注册的内存 VFS 文件。',
      handler: async path => {
        const normalized = this.#normalizePath(path);
        const mounted = this.#mounted(normalized);
        if (mounted) {
          this.#requireMountWrite(mounted);
          const { directory, name } = await this.#mountedParent(mounted, normalized);
          await directory.removeEntry(name);
          return true;
        }
        if (!this.#deleteFile(normalized))
          throw new Error('VFS 文件不存在：' + normalized);
        return true;
      }
    });
    this.registerCapability('__wlua.os.rename', {
      internal: true,
      description: '重命名当前运行时显式注册的内存 VFS 文件。',
      handler: (from, to) => {
        const source = this.#normalizePath(from);
        const target = this.#normalizePath(to);
        if (this.#mounted(source) || this.#mounted(target))
          throw new Error('宿主挂载文件不支持原子重命名，请由宿主显式操作。');
        if (!this.#files.has(source)) throw new Error('VFS 文件不存在：' + source);
        if (this.#files.has(target)) throw new Error('VFS 目标已存在：' + target);
        const value = this.#files.get(source);
        this.#files.delete(source);
        this.#files.set(target, value);
        return true;
      }
    });
    this.registerCapability('__wlua.vfs.open', {
      internal: true,
      description: '在当前运行时的内存 VFS 中打开文件。',
      handler: (path, mode = 'r') => this.#openVfs(path, mode)
    });
    this.registerCapability('__wlua.vfs.read', {
      internal: true,
      description: '从内存 VFS 文件的指定字节位置读取。',
      handler: (path, position, format) =>
        this.#readVfs(path, position, format)
    });
    this.registerCapability('__wlua.vfs.write', {
      internal: true,
      description: '原子写入内存 VFS 文件并执行配额检查。',
      handler: (path, position, append, value) =>
        this.#writeVfs(path, position, append, value)
    });
    this.registerCapability('__wlua.vfs.size', {
      internal: true,
      description: '返回内存 VFS 文件的字节数。',
      handler: async path => {
        const normalized = this.#normalizePath(path);
        const value = await this.#readBytes(normalized);
        return BigInt(value.length);
      }
    });
    this.#spawn();
  }
  options;
  /** Structured host API registry. Prefer grouped registration for large APIs. */
  capabilities = new CapabilityRegistry();
  #worker;
  #ready;
  #sequence = 0;
  #pending = new Map();
  #definitions = new Map();
  #files = new Map();
  #mounts = new Map();
  #vfsBytes = 0;
  #referenceToken = {};
  #osBridge;
  #breakpoints = [];
  #executionClockElapsed = 0;
  #executionClockStarted = null;
  #executionClockId = 0;

  #clockNow() { return globalThis.performance?.now?.() ?? Date.now(); }

  #executionClockSeconds() {
    const active = this.#executionClockStarted == null
      ? 0 : this.#clockNow() - this.#executionClockStarted;
    return (this.#executionClockElapsed + active) / 1000;
  }

  #startExecutionClock(id, reset = false) {
    if (reset) this.#executionClockElapsed = 0;
    this.#executionClockId = id;
    if (this.#executionClockStarted == null)
      this.#executionClockStarted = this.#clockNow();
  }

  #pauseExecutionClock(id) {
    if (id !== this.#executionClockId || this.#executionClockStarted == null) return;
    this.#executionClockElapsed += this.#clockNow() - this.#executionClockStarted;
    this.#executionClockStarted = null;
  }

  #spawn() {
    this.#referenceToken = {};
    this.#worker = new Worker(new URL('../runtime/worker.js', import.meta.url), {
      type: 'module',
      name: 'wasm-lua'
    });
    this.#ready = new Promise((resolve, reject) => {
      const onError = event => reject(event.error ?? new Error(event.message));
      this.#worker.addEventListener('error', onError, { once: true });
      this.#worker.onmessage = event => this.#message(event.data, resolve, reject);
    });
    this.#worker.postMessage({ type: 'initialize', options: this.options });
  }

  #message(message, readyResolve, readyReject) {
    if (message.type === 'ready') {
      if (message.ok === false) {
        readyReject(new Error(message.error ?? 'Lua Worker 初始化失败。'));
        return;
      }
      readyResolve(message);
      this.dispatchEvent(new CustomEvent('ready', { detail: message }));
      return;
    }
    if (message.type === 'generation') {
      // A top-level run owns a fresh Lua VM. Rotate the ownership token before
      // its response is decoded so stale LuaRef objects cannot address a new
      // VM that happens to reuse the same registry integer.
      this.#referenceToken = {};
      this.#osBridge = createOsBridge({
        environment: this.options.environment,
        clock: () => this.#executionClockSeconds()
      });
      this.dispatchEvent(new CustomEvent('generation'));
      return;
    }
    if (message.type === 'event') {
      if (message.event === 'breakpointchange' &&
          Array.isArray(message.body?.breakpoints))
        this.#breakpoints = message.body.breakpoints.map(point => ({ ...point }));
      this.dispatchEvent(new CustomEvent(message.event, { detail: message.body }));
      return;
    }
    if (message.type === 'capability') {
      this.#capability(message);
      return;
    }
    if (message.type === 'response') {
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pauseExecutionClock(message.id);
      this.#pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.ok) pending.resolve(this.#rehydrate(message.result));
      else pending.reject(new Error(message.error));
    }
  }

  async #capability(message) {
    const pending = this.#pending.get(message.id);
    this.#pauseExecutionClock(message.id);
    clearTimeout(pending?.timer);
    if (pending) pending.timer = null;
    let rejected = false;
    let result;
    const worker = this.#worker;
    const referenceToken = this.#referenceToken;
    try {
      const [name, ...args] = decodeWire(new Uint8Array(message.payload));
      const values = args.map(value => this.#rehydrate(value));
      const builtin = this.#osBridge.invoke(name, values);
      result = builtin.handled ? builtin.value : await this.capabilities.invoke(
        name, values, { runtime: this });
      this.#assertReferences(result);
    } catch (error) {
      rejected = true;
      result = error instanceof Error ? error.message : String(error);
    }
    // A hard stop may replace the Worker while a host Promise is pending.
    // Never deliver a stale capability result into the new VM generation.
    if (worker !== this.#worker || referenceToken !== this.#referenceToken) return;
    const payload = encodeWire(result);
    this.#startExecutionClock(message.id);
    worker.postMessage({
      type: 'capabilityResult',
      id: message.id,
      token: message.token,
      rejected,
      payload
    }, [payload.buffer]);
    if (pending?.timed) this.#armTimer(message.id);
  }

  #rehydrate(value) {
    if (Array.isArray(value)) return value.map(item => this.#rehydrate(item));
    if (value && typeof value === 'object' && Number.isInteger(value.$luaRef)) {
      const referenceToken = this.#referenceToken;
      const worker = this.#worker;
      return new LuaRef(
        value.$luaRef,
        value.luaType,
        id => {
          if (this.#referenceToken === referenceToken)
            worker.postMessage({ type: 'release', reference: id });
        },
        referenceToken
      );
    }
    if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value))
        value[key] = this.#rehydrate(item);
    }
    return value;
  }

  async #request(type, body = {}, timed = false) {
    await this.#ready;
    const id = ++this.#sequence;
    const promise = new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject, timed });
    });
    if (['run', 'call', 'resume', 'runToCursor'].includes(type))
      this.#startExecutionClock(id, type === 'run');
    this.#worker.postMessage({ type, id, ...body });
    if (timed) this.#armTimer(id);
    return promise;
  }

  #armTimer(id) {
    const pending = this.#pending.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      if (!pending) return;
      pending.reject(new Error('Lua 执行已超过活动时间限制，Worker 已重建。'));
      this.#pending.delete(id);
      this.interrupt();
    }, this.options.timeout);
  }

  /** @param {string} source @param {{chunkName?: string}} [options]
   * @returns {Promise<LuaExecutionResult>} */
  run(source, options = {}) {
    return this.#request('run', {
      source,
      chunkName: options.chunkName ?? '@main.lua',
      breakpoints: this.options.debug
        ? this.#breakpoints.map(point => ({ ...point })) : undefined
    }, true);
  }
  /** Compile a text chunk with the official Lua compiler without executing it.
   * @param {string} source @param {{chunkName?: string}} [options]
   * @returns {Promise<boolean>} */
  check(source, options = {}) {
    return this.#request('check', {
      source,
      chunkName: options.chunkName ?? '@main.lua'
    });
  }
  /** @returns {Promise<LuaExecutionResult>} */
  continue() { return this.#request('resume', { mode: 0 }, true); }
  /** @returns {Promise<LuaExecutionResult>} */
  stepIn() { return this.#request('resume', { mode: 1 }, true); }
  /** @returns {Promise<LuaExecutionResult>} */
  stepOver() { return this.#request('resume', { mode: 2 }, true); }
  /** @returns {Promise<LuaExecutionResult>} */
  stepOut() { return this.#request('resume', { mode: 3 }, true); }
  /** @param {Array<number|LuaBreakpoint>} breakpoints
   * @param {{source?: string}} [options]
   * @returns {Promise<LuaBreakpoint[]>} */
  async setBreakpoints(breakpoints, options = {}) {
    let normalized = breakpoints.map(point => typeof point === 'number'
        ? { line: point }
        : { ...point, line: Number(point.line) });
    if (typeof options.source === 'string')
      normalized = resolveLuaBreakpoints(options.source, normalized);
    this.#breakpoints = normalized;
    const resolved = await this.#request('setBreakpoints', {
      breakpoints: normalized.map(point => ({ ...point }))
    });
    this.#breakpoints = resolved.map(point => ({ ...point }));
    return resolved;
  }
  /** @returns {Promise<LuaStackFrame[]>} */
  stackTrace() { return this.#request('stack'); }
  /** @returns {Promise<LuaDebugVariable[]>} */
  variables(frame = 0, reference = 0) {
    return this.#request('variables', { frame, reference }, true);
  }
  /** @param {string} expression @param {number} [frame]
   * @returns {Promise<LuaDebugVariable[]|{error: string}>} */
  evaluate(expression, frame = 0) {
    return this.#request('evaluate', { expression, frame }, true);
  }
  /** Request a cooperative pause at the next execution slice. */
  pause() { return this.#request('pause'); }
  /** @param {number} line @param {string} [source]
   * @returns {Promise<LuaExecutionResult>} */
  runToCursor(line, source) {
    return this.#request('runToCursor', { line: Number(line), source }, true);
  }
  /** @param {number} frame @param {number} reference @param {string} name
   * @param {string} value @returns {Promise<LuaDebugVariable[]>} */
  setVariable(frame, reference, name, value) {
    return this.#request('setVariable', { frame, reference, name, value }, true);
  }

  /** @param {string} name
   * @param {CapabilityRegistration} registration
   * @returns {() => void} */
  registerCapability(name, registration) {
    // Direct registration historically replaced the same name. Keep that
    // behavior while generation-safe disposers prevent old handles removing
    // a newer replacement.
    return this.capabilities.register(name, registration, { replace: true });
  }

  /**
   * Atomically register a hierarchical host API and optionally expose it as a
   * typed Lua module (default: `host.<namespace>` for dot-safe namespaces).
   * @param {string} namespace
   * @param {import('./capability-registry.js').CapabilityGroupMap} registrations
   * @param {{moduleName?: string|false, replace?: boolean}} [options]
   * @returns {CapabilityGroupHandle}
   */
  registerCapabilityGroup(namespace, registrations, options = {}) {
    const group = this.capabilities.registerGroup(namespace, registrations, options);
    const dotSafe = /^[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)*$/u
      .test(namespace);
    const moduleName = options.moduleName === false ? null
      : options.moduleName ?? (dotSafe ? `host.${namespace}` : null);
    const disposers = [() => group.handle.dispose()];
    let module = null;
    try {
      if (moduleName) {
        module = createCapabilityModule(namespace, group.capabilities, moduleName);
        disposers.push(this.registerModule(moduleName, module.source));
        disposers.push(this.registerDefinition({
          uri: module.uri,
          source: module.definition
        }));
      }
      return new CapabilityGroupHandle(group.handle.names, () => {
        for (const dispose of disposers.reverse()) dispose();
      }, module);
    } catch (error) {
      for (const dispose of disposers.reverse()) dispose();
      throw error;
    }
  }

  /** @param {{prefix?: string, includeInternal?: boolean}} [options] */
  listCapabilities(options = {}) { return this.capabilities.list(options); }

  /** @param {import('./capability-registry.js').CapabilityMiddleware} middleware */
  useCapabilityMiddleware(middleware) { return this.capabilities.use(middleware); }

  /** @param {string} name
   * @param {string|((...args: any[]) => any|Promise<any>)} factory
   * @returns {() => void} */
  registerModule(name, factory) {
    if (!/^[\p{L}_][\p{L}\p{N}_.-]*$/u.test(name) || name.includes('..'))
      throw new TypeError('模块名必须是安全的点分标识符。');
    if (typeof factory === 'string') {
      const source = factory;
      return this.registerCapability('module:' + name, {
        internal: true,
        description: `加载 Lua 模块 ${name}`,
        handler: () => ({ source })
      });
    }
    if (typeof factory !== 'function')
      throw new TypeError('模块必须是 Lua 源码字符串或工厂函数。');
    return this.registerCapability('module:' + name, {
      internal: true,
      description: `加载宿主模块 ${name}`,
      handler: async (...args) => {
        const value = await factory(...args);
        return typeof value === 'string' ? { source: value } : value;
      }
    });
  }

  #normalizePath(value) {
    if (typeof value !== 'string' || value.includes('\\') || value.includes('\0'))
      throw new TypeError('VFS 路径必须是使用 / 的 UTF-8 字符串。');
    const parts = value.split('/').filter(Boolean);
    if (!parts.length || parts.some(part => part === '.' || part === '..'))
      throw new TypeError('VFS 路径不允许为空、. 或 ..。');
    return '/' + parts.join('/');
  }

  #mounted(path) {
    if (this.#mounts.has(path))
      throw new Error('挂载点是目录，不是文件：' + path);
    return [...this.#mounts.values()]
      .filter(mount => path.startsWith(mount.mountPoint + '/'))
      .sort((a, b) => b.mountPoint.length - a.mountPoint.length)[0] ?? null;
  }

  #requireMountWrite(mount) {
    if (mount.mode !== 'readwrite')
      throw new Error('宿主文件夹以只读方式挂载。');
  }

  async #mountedParent(mount, path) {
    const relative = path.slice(mount.mountPoint.length + 1);
    const parts = relative.split('/');
    const name = parts.pop();
    let directory = mount.handle;
    for (const part of parts)
      directory = await directory.getDirectoryHandle(part);
    return { directory, name };
  }

  async #mountedHandle(mount, path, create = false) {
    const { directory, name } = await this.#mountedParent(mount, path);
    return directory.getFileHandle(name, { create });
  }

  async #readBytes(path) {
    const mount = this.#mounted(path);
    if (!mount) {
      const bytes = this.#files.get(path);
      if (!bytes) throw new Error('VFS 文件不存在：' + path);
      return bytes;
    }
    const handle = await this.#mountedHandle(mount, path);
    const file = await handle.getFile();
    if (file.size > this.options.vfsLimit)
      throw new RangeError('宿主文件超出当前 VFS 单文件读取配额。');
    return new Uint8Array(await file.arrayBuffer());
  }

  /** Mount only a directory handle explicitly granted by the browser/user.
   * Lua never sees the handle, and a separate namespace prevents VFS paths
   * from accidentally aliasing host files.
   * @param {FileSystemDirectoryHandle} handle
   * @param {{mountPoint?: string, mode?: 'read'|'readwrite'}} [options] */
  async mountDirectory(handle, options = {}) {
    if (this.options.profile !== 'trusted')
      throw new Error('宿主文件夹挂载仅限可信档。');
    if (!handle || handle.kind !== 'directory' ||
        typeof handle.getFileHandle !== 'function')
      throw new TypeError('必须传入浏览器授权的 FileSystemDirectoryHandle。');
    const mountPoint = this.#normalizePath(options.mountPoint ?? '/host');
    const mode = options.mode ?? 'readwrite';
    if (mode !== 'read' && mode !== 'readwrite')
      throw new TypeError('挂载模式只能为 read 或 readwrite。');
    if ([...this.#mounts.keys()].some(path =>
      path === mountPoint || path.startsWith(mountPoint + '/') ||
      mountPoint.startsWith(path + '/')) ||
      [...this.#files.keys()].some(path =>
        path === mountPoint || path.startsWith(mountPoint + '/')))
      throw new Error('挂载点与现有文件或挂载重叠。');
    const permission = { mode };
    /** @type {FileSystemDirectoryHandle & {
     * queryPermission?: (options: {mode: 'read'|'readwrite'}) => Promise<string>,
     * requestPermission?: (options: {mode: 'read'|'readwrite'}) => Promise<string>
     * }} */
    const permissionHandle = handle;
    if (typeof permissionHandle.queryPermission === 'function' &&
        await permissionHandle.queryPermission(permission) !== 'granted' &&
        (typeof permissionHandle.requestPermission !== 'function' ||
          await permissionHandle.requestPermission(permission) !== 'granted'))
      throw new Error('浏览器未授权访问选中的宿主文件夹。');
    const mount = { mountPoint, mode, handle };
    this.#mounts.set(mountPoint, mount);
    return () => {
      if (this.#mounts.get(mountPoint) === mount)
        this.#mounts.delete(mountPoint);
    };
  }

  /** Must be called directly from a user gesture in Chromium on HTTPS/localhost.
   * @param {{mountPoint?: string, mode?: 'read'|'readwrite'}} [options] */
  async pickDirectory(options = {}) {
    if (this.options.profile !== 'trusted')
      throw new Error('宿主文件夹选择仅限可信档。');
    if (typeof globalThis.showDirectoryPicker !== 'function')
      throw new Error('浏览器不支持文件夹选择；请使用 Chromium 的安全上下文。');
    const mode = options.mode ?? 'readwrite';
    const handle = await globalThis.showDirectoryPicker({ mode });
    const unmount = await this.mountDirectory(handle, options);
    return { handle, unmount };
  }

  #fileBytes(value) {
    if (typeof value === 'string') return fileEncoder.encode(value);
    if (value instanceof Uint8Array) return value.slice();
    throw new TypeError('VFS 文件必须是字符串或 Uint8Array。');
  }

  #position(value) {
    const position = Number(value);
    if (!Number.isSafeInteger(position) || position < 0)
      throw new RangeError('VFS 文件位置必须是非负安全整数。');
    return position;
  }

  #storeFile(path, value) {
    const previous = this.#files.get(path);
    const used = this.#vfsBytes - (previous?.length ?? 0) + value.length;
    if (used > this.options.vfsLimit)
      throw new RangeError(`VFS 配额不足：需要 ${used} 字节，限制为 ` +
        `${this.options.vfsLimit} 字节。`);
    this.#files.set(path, value);
    this.#vfsBytes = used;
  }

  #deleteFile(path) {
    const previous = this.#files.get(path);
    if (!previous) return false;
    this.#files.delete(path);
    this.#vfsBytes -= previous.length;
    return true;
  }

  async #openVfs(path, rawMode) {
    const normalized = this.#normalizePath(path);
    const mode = String(rawMode ?? 'r');
    if (!VFS_MODES.has(mode)) throw new TypeError('无效的 VFS 打开模式：' + mode);
    const operation = mode[0];
    const mount = this.#mounted(normalized);
    if (mount) {
      if (operation !== 'r' || mode.includes('+')) this.#requireMountWrite(mount);
      const handle = await this.#mountedHandle(mount, normalized,
        operation !== 'r');
      const previous = await handle.getFile();
      if (previous.size > this.options.vfsLimit)
        throw new RangeError('宿主文件超出当前 VFS 单文件配额。');
      if (operation === 'w') {
        const writer = await handle.createWritable();
        await writer.close();
      }
      return {
        path: normalized, readable: operation === 'r' || mode.includes('+'),
        writable: operation !== 'r' || mode.includes('+'),
        append: operation === 'a',
        position: BigInt(operation === 'a' ? previous.size : 0)
      };
    }
    if (operation === 'r' && !this.#files.has(normalized))
      throw new Error('VFS 文件不存在：' + normalized);
    if (operation === 'w') this.#storeFile(normalized, new Uint8Array());
    if (operation === 'a' && !this.#files.has(normalized))
      this.#storeFile(normalized, new Uint8Array());
    const size = this.#files.get(normalized)?.length ?? 0;
    return {
      path: normalized,
      readable: operation === 'r' || mode.includes('+'),
      writable: operation !== 'r' || mode.includes('+'),
      append: operation === 'a',
      position: BigInt(operation === 'a' ? size : 0)
    };
  }

  async #readVfs(path, rawPosition, rawFormat) {
    const normalized = this.#normalizePath(path);
    const bytes = await this.#readBytes(normalized);
    const position = this.#position(rawPosition);
    if (typeof rawFormat === 'bigint' || typeof rawFormat === 'number') {
      const count = this.#position(rawFormat);
      if (position >= bytes.length)
        return { value: count === 0 ? new Uint8Array() : null,
          position: BigInt(position) };
      const end = Math.min(bytes.length, position + count);
      return { value: bytes.slice(position, end), position: BigInt(end) };
    }
    const format = rawFormat == null ? '*l' : String(rawFormat);
    if (format === '*a')
      return { value: bytes.slice(Math.min(position, bytes.length)),
        position: BigInt(bytes.length) };
    if (format === '*l' || format === '*L') {
      if (position >= bytes.length)
        return { value: null, position: BigInt(position) };
      let end = bytes.indexOf(0x0a, position);
      if (end < 0) end = bytes.length;
      const next = end < bytes.length ? end + 1 : end;
      const contentEnd = format === '*L' ? next :
        (end > position && bytes[end - 1] === 0x0d ? end - 1 : end);
      return { value: bytes.slice(position, contentEnd), position: BigInt(next) };
    }
    if (format === '*n') {
      const tail = new TextDecoder('latin1').decode(bytes.subarray(position));
      const match = /^[\t\n\v\f\r ]*([+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?))/u.exec(tail);
      if (!match) return { value: null, position: BigInt(position) };
      const token = match[1];
      const number = Number(token);
      const value = Number.isSafeInteger(number) && !/[.eE]/u.test(token)
        ? BigInt(number) : number;
      return { value, position: BigInt(position + match[0].length) };
    }
    throw new TypeError('不支持的 VFS 读取格式：' + format);
  }

  async #writeVfs(path, rawPosition, append, value) {
    const normalized = this.#normalizePath(path);
    const mount = this.#mounted(normalized);
    if (mount) this.#requireMountWrite(mount);
    const previous = await this.#readBytes(normalized);
    const data = this.#fileBytes(value);
    const position = append ? previous.length : this.#position(rawPosition);
    if (position > this.options.vfsLimit ||
        data.length > this.options.vfsLimit - position)
      throw new RangeError('VFS 写入超出文件配额。');
    const length = Math.max(previous.length, position + data.length);
    const next = new Uint8Array(length);
    next.set(previous);
    next.set(data, position);
    if (mount) {
      const handle = await this.#mountedHandle(mount, normalized);
      const writer = await handle.createWritable();
      try {
        await writer.write(next);
        await writer.close();
      } catch (error) {
        await writer.abort?.();
        throw error;
      }
    } else this.#storeFile(normalized, next);
    return BigInt(position + data.length);
  }

  /** @param {string} path @param {string|Uint8Array} value
   * @returns {() => void} */
  registerFile(path, value) {
    const normalized = this.#normalizePath(path);
    if (this.#mounted(normalized))
      throw new Error('宿主挂载文件请使用 writeFileAsync()。');
    const bytes = this.#fileBytes(value);
    this.#storeFile(normalized, bytes);
    return () => {
      if (this.#files.get(normalized) === bytes) this.#deleteFile(normalized);
    };
  }

  /** Read a host-visible copy of a memory VFS file.
   * @param {string} path @param {{encoding?: 'binary'|'utf8'}} [options]
   * @returns {Uint8Array|string} */
  readFile(path, options = {}) {
    const normalized = this.#normalizePath(path);
    if (this.#mounted(normalized))
      throw new Error('宿主挂载文件请使用 readFileAsync()。');
    const value = this.#files.get(normalized);
    if (!value) throw new Error('VFS 文件不存在：' + normalized);
    if ((options.encoding ?? 'binary') === 'binary') return value.slice();
    if (options.encoding === 'utf8') return fileDecoder.decode(value);
    throw new TypeError('VFS encoding 只能是 binary 或 utf8。');
  }

  /** Read an in-memory or explicitly mounted host file asynchronously.
   * @param {string} path @param {{encoding?: 'binary'|'utf8'}} [options] */
  async readFileAsync(path, options = {}) {
    const bytes = (await this.#readBytes(this.#normalizePath(path))).slice();
    if ((options.encoding ?? 'binary') === 'binary') return bytes;
    if (options.encoding === 'utf8') return fileDecoder.decode(bytes);
    throw new TypeError('VFS encoding 只能是 binary 或 utf8。');
  }

  /** Create or replace a host-visible memory VFS file.
   * @param {string} path @param {string|Uint8Array} value
   * @param {{append?: boolean}} [options] */
  writeFile(path, value, options = {}) {
    const normalized = this.#normalizePath(path);
    if (this.#mounted(normalized))
      throw new Error('宿主挂载文件请使用 writeFileAsync()。');
    const data = this.#fileBytes(value);
    if (!options.append) {
      this.#storeFile(normalized, data);
      return;
    }
    const previous = this.#files.get(normalized) ?? new Uint8Array();
    if (data.length > this.options.vfsLimit - previous.length)
      throw new RangeError('VFS 追加写入超出文件配额。');
    const next = new Uint8Array(previous.length + data.length);
    next.set(previous);
    next.set(data, previous.length);
    this.#storeFile(normalized, next);
  }

  /** @param {string} path @param {string|Uint8Array} value
   * @param {{append?: boolean}} [options] */
  async writeFileAsync(path, value, options = {}) {
    const normalized = this.#normalizePath(path);
    const mount = this.#mounted(normalized);
    if (!mount) return this.writeFile(normalized, value, options);
    this.#requireMountWrite(mount);
    const bytes = this.#fileBytes(value);
    if (bytes.length > this.options.vfsLimit)
      throw new RangeError('宿主文件写入超出当前 VFS 单文件配额。');
    const handle = await this.#mountedHandle(mount, normalized, true);
    let next = bytes;
    if (options.append) {
      const previous = await handle.getFile();
      if (previous.size > this.options.vfsLimit - bytes.length)
        throw new RangeError('宿主文件追加超出当前 VFS 单文件配额。');
      next = new Uint8Array(previous.size + bytes.length);
      next.set(new Uint8Array(await previous.arrayBuffer()));
      next.set(bytes, previous.size);
    }
    const writer = await handle.createWritable();
    try {
      await writer.write(next);
      await writer.close();
    } catch (error) {
      await writer.abort?.();
      throw error;
    }
  }

  /** @param {string} path @returns {boolean} */
  removeFile(path) {
    const normalized = this.#normalizePath(path);
    if (this.#mounted(normalized))
      throw new Error('宿主挂载文件请使用 removeFileAsync()。');
    return this.#deleteFile(normalized);
  }

  /** @param {string} path */
  async removeFileAsync(path) {
    const normalized = this.#normalizePath(path);
    const mount = this.#mounted(normalized);
    if (!mount) return this.#deleteFile(normalized);
    this.#requireMountWrite(mount);
    const { directory, name } = await this.#mountedParent(mount, normalized);
    await directory.removeEntry(name);
    return true;
  }

  /** @param {string} from @param {string} to @returns {boolean} */
  renameFile(from, to) {
    const source = this.#normalizePath(from);
    const target = this.#normalizePath(to);
    if (this.#mounted(source) || this.#mounted(target))
      throw new Error('宿主挂载文件不支持原子重命名。');
    if (!this.#files.has(source) || this.#files.has(target)) return false;
    const value = this.#files.get(source);
    this.#files.delete(source);
    this.#files.set(target, value);
    return true;
  }

  /** @param {string} [prefix] @returns {string[]} */
  listFiles(prefix = '/') {
    const normalized = prefix === '/' ? '/' : this.#normalizePath(prefix);
    return [...this.#files.keys()].filter(path =>
      normalized === '/' || path === normalized || path.startsWith(normalized + '/'))
      .sort();
  }

  /** @param {{uri: string, source: string}} definition
   * @returns {() => void} */
  registerDefinition({ uri, source }) {
    if (!uri || typeof source !== 'string')
      throw new TypeError('Definition requires uri and source.');
    const token = Symbol(uri);
    this.#definitions.set(uri, { source, token });
    this.dispatchEvent(new CustomEvent('definitionchange', {
      detail: { uri, source }
    }));
    return () => {
      if (this.#definitions.get(uri)?.token !== token) return;
      this.#definitions.delete(uri);
      this.dispatchEvent(new CustomEvent('definitionchange', {
        detail: { uri, source: null }
      }));
    };
  }

  get definitions() {
    return new Map([...this.#definitions].map(([uri, entry]) => [uri, entry.source]));
  }

  #assertReferences(value, seen = new WeakSet()) {
    if (value instanceof LuaRef) {
      if (!value.isOwnedBy(this.#referenceToken))
        throw new TypeError('LuaRef 已失效，或属于另一个 Lua VM。');
      return;
    }
    if (!value || typeof value !== 'object' || value instanceof Uint8Array ||
        seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) this.#assertReferences(item, seen);
    } else {
      for (const item of Object.values(value)) this.#assertReferences(item, seen);
    }
  }

  async interrupt() {
    this.capabilities.cancelActive(new Error('Lua VM 已中止。'));
    for (const { reject, timer } of this.#pending.values()) {
      clearTimeout(timer);
      reject(new Error('Lua VM 已中止。'));
    }
    this.#pending.clear();
    this.#executionClockElapsed = 0;
    this.#executionClockStarted = null;
    this.#executionClockId = 0;
    this.#worker.terminate();
    this.#spawn();
    await this.#ready;
    this.dispatchEvent(new CustomEvent('reset'));
  }

  dispose() {
    this.capabilities.dispose();
    this.#worker.terminate();
    for (const { reject, timer } of this.#pending.values()) {
      clearTimeout(timer);
      reject(new Error('Lua VM 已销毁。'));
    }
    this.#pending.clear();
  }

  /** @param {LuaRef} reference @param {...any} args
   * @returns {Promise<any[]>} */
  async call(reference, ...args) {
    if (!(reference instanceof LuaRef) || !reference.isOwnedBy(this.#referenceToken))
      throw new TypeError('call() 需要当前 Lua VM 的有效 LuaRef。');
    this.#assertReferences(args);
    const result = await this.#request('call', {
      reference: reference.id,
      payload: encodeWire(args)
    }, true);
    return result.values;
  }

  /** @param {LuaRef} reference @param {any} key @returns {Promise<any>} */
  async get(reference, key) {
    if (!(reference instanceof LuaRef) || !reference.isOwnedBy(this.#referenceToken))
      throw new TypeError('get() 需要当前 Lua VM 的有效 LuaRef。');
    this.#assertReferences(key);
    const values = await this.#request('get', {
      reference: reference.id,
      payload: encodeWire(key)
    }, true);
    return values[0];
  }

  /** @param {LuaRef} reference @param {any} key @param {any} value
   * @returns {Promise<boolean>} */
  set(reference, key, value) {
    if (!(reference instanceof LuaRef) || !reference.isOwnedBy(this.#referenceToken))
      throw new TypeError('set() 需要当前 Lua VM 的有效 LuaRef。');
    this.#assertReferences(key);
    this.#assertReferences(value);
    return this.#request('set', {
      reference: reference.id,
      payload: encodeWire([key, value])
    }, true);
  }
}

/** @param {LuaRuntimeOptions} [options] */
export function createLuaRuntime(options = {}) {
  return new LuaRuntime({ ...options, debug: false });
}

/** @param {LuaRuntimeOptions} [options] */
export function createLuaDebugger(options = {}) {
  return new LuaRuntime({ ...options, debug: true });
}
