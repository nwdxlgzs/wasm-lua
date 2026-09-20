const CAPABILITY_NAME = /^[\p{L}_][\p{L}\p{N}_.:/-]*$/u;
const LUA_IDENTIFIER = /^[\p{L}_][\p{L}\p{N}_]*$/u;
const LUA_KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'global', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat',
  'return', 'then', 'true', 'until', 'while'
]);

/**
 * @typedef {{name: string, type?: string, description?: string,
 *   optional?: boolean}} CapabilityParameter
 * @typedef {{type?: string, description?: string}} CapabilityReturn
 * @typedef {{description?: string, parameters?: ReadonlyArray<CapabilityParameter>,
 *   returns?: CapabilityReturn|ReadonlyArray<CapabilityReturn>, timeoutMs?: number,
 *   maxConcurrency?: number, queueLimit?: number, tags?: string[],
 *   internal?: boolean}} CapabilityMetadata
 * @typedef {{id: number, name: string, args: ReadonlyArray<any>,
 *   signal: AbortSignal, startedAt: number, capability: CapabilityInfo,
 *   runtime?: import('./runtime.js').LuaRuntime}} CapabilityInvocationContext
 * @typedef {(...args: any[]) => any|Promise<any>} CapabilityHandler
 * @typedef {CapabilityMetadata & {handler: CapabilityHandler}} CapabilityDescriptor
 * @typedef {CapabilityHandler|CapabilityDescriptor}
 *   CapabilityRegistration
 * @typedef {Record<string, CapabilityRegistration|Record<string, any>>} CapabilityGroupMap
 * @typedef {Readonly<CapabilityMetadata & {name: string, activeCount: number,
 *   queuedCount: number}>} CapabilityInfo
 * @typedef {{moduleName: string, source: string, definition: string,
 *   uri: string}} CapabilityModule
 * @callback CapabilityMiddleware
 * @param {CapabilityInvocationContext} context
 * @param {() => Promise<any>} next
 * @returns {any|Promise<any>}
 */

function assertCapabilityName(name) {
  if (typeof name !== 'string' || !CAPABILITY_NAME.test(name) || name.includes('..'))
    throw new TypeError(`无效的能力名称：${String(name)}`);
  return name;
}

function finiteInteger(value, fallback, label, minimum, allowInfinity = false) {
  if (value === undefined) return fallback;
  if (allowInfinity && value === Number.POSITIVE_INFINITY) return value;
  if (!Number.isInteger(value) || value < minimum)
    throw new TypeError(`${label} 必须是大于等于 ${minimum} 的整数。`);
  return value;
}

function normalizeDescriptor(registration) {
  const descriptor = typeof registration === 'function'
    ? { handler: registration }
    : registration && typeof registration === 'object'
      ? { ...registration } : null;
  if (!descriptor || typeof descriptor.handler !== 'function')
    throw new TypeError('能力必须是函数或包含 handler 函数的描述符。');
  const parameters = descriptor.parameters ?? [];
  if (!Array.isArray(parameters) || parameters.some(parameter =>
    !parameter || typeof parameter.name !== 'string' ||
    !LUA_IDENTIFIER.test(parameter.name) || LUA_KEYWORDS.has(parameter.name)))
    throw new TypeError('能力 parameters 必须使用非关键字的 Lua 标识符 name。');
  if (new Set(parameters.map(parameter => parameter.name)).size !== parameters.length)
    throw new TypeError('能力 parameters 不能包含重复名称。');
  const returns = descriptor.returns == null ? []
    : Array.isArray(descriptor.returns) ? descriptor.returns : [descriptor.returns];
  if (returns.some(item => !item || typeof item !== 'object'))
    throw new TypeError('能力 returns 必须是对象或对象数组。');
  return Object.freeze({
    description: String(descriptor.description ?? ''),
    parameters: Object.freeze(parameters.map(parameter => Object.freeze({
      name: parameter.name,
      type: String(parameter.type ?? 'any'),
      description: String(parameter.description ?? ''),
      optional: Boolean(parameter.optional)
    }))),
    returns: Object.freeze(returns.map(item => Object.freeze({
      type: String(item.type ?? 'any'),
      description: String(item.description ?? '')
    }))),
    timeoutMs: finiteInteger(descriptor.timeoutMs, 0, 'timeoutMs', 0),
    maxConcurrency: descriptor.maxConcurrency === undefined
      ? Number.POSITIVE_INFINITY
      : finiteInteger(descriptor.maxConcurrency, 1, 'maxConcurrency', 1, true),
    queueLimit: descriptor.queueLimit === undefined
      ? Number.POSITIVE_INFINITY
      : finiteInteger(descriptor.queueLimit, 0, 'queueLimit', 0, true),
    tags: Object.freeze((descriptor.tags ?? []).map(String)),
    internal: Boolean(descriptor.internal),
    handler: descriptor.handler
  });
}

/** @returns {CapabilityInfo} */
function publicDescriptor(name, entry) {
  const { handler: _handler, ...metadata } = entry.descriptor;
  return Object.freeze({
    name, ...metadata,
    activeCount: entry.active,
    queuedCount: entry.queue.length
  });
}

function emit(target, type, detail) {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}

function flattenGroup(value, prefix = '', output = []) {
  if (typeof value === 'function' || value?.handler instanceof Function) {
    if (!prefix) throw new TypeError('能力组中的能力必须拥有名称。');
    output.push([prefix, value]);
    return output;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`能力组 ${prefix || '<root>'} 必须是能力或嵌套对象。`);
  for (const [name, child] of Object.entries(value)) {
    if (!LUA_IDENTIFIER.test(name))
      throw new TypeError(`能力组成员不是合法 Lua 标识符：${name}`);
    if (LUA_KEYWORDS.has(name))
      throw new TypeError(`能力组成员不能使用 Lua 关键字：${name}`);
    flattenGroup(child, prefix ? `${prefix}.${name}` : name, output);
  }
  return output;
}

function escapeLuaString(value) {
  return JSON.stringify(value).replace(/\u2028|\u2029/gu, character =>
    `\\u{${character.codePointAt(0).toString(16)}}`);
}

function docLines(descriptor) {
  const lines = [];
  if (descriptor.description) lines.push(`--- ${descriptor.description}`);
  for (const parameter of descriptor.parameters)
    lines.push(`---@param ${parameter.name}${parameter.optional ? '?' : ''} ` +
      `${parameter.type}${parameter.description ? ` ${parameter.description}` : ''}`);
  for (const item of descriptor.returns)
    lines.push(`---@return ${item.type}${item.description ? ` ${item.description}` : ''}`);
  return lines;
}

/**
 * Build a text-only Lua module which forwards functions to `js.call`.
 * It is suitable for `registerModule` and as a read-only language definition.
 * @param {string} namespace
 * @param {ReadonlyArray<{relativeName: string, name: string,
 *   descriptor: CapabilityDescriptor}>} capabilities
 * @param {string} moduleName
 * @returns {Readonly<CapabilityModule>}
 */
export function createCapabilityModule(namespace, capabilities, moduleName) {
  assertCapabilityName(namespace);
  if (typeof moduleName !== 'string' || !moduleName ||
      !/^[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)*$/u.test(moduleName))
    throw new TypeError('moduleName 必须是安全的点分 Lua 标识符。');
  const source = ['local M = {}'];
  const definition = [`---@meta`, `---@module ${moduleName}`, 'local M = {}'];
  const tables = new Set();
  for (const capability of capabilities) {
    const parts = capability.relativeName.split('.');
    let container = 'M';
    for (const part of parts.slice(0, -1)) {
      container += '.' + part;
      if (!tables.has(container)) {
        tables.add(container);
        source.push(`${container} = {}`);
        definition.push(`${container} = {}`);
      }
    }
    const field = parts.at(-1);
    const params = capability.descriptor.parameters.map(item => item.name);
    const signature = params.length ? params.join(', ') : '...';
    source.push(`function ${container}.${field}(${signature})`,
      `  return js.call(${escapeLuaString(capability.name)}${params.length
        ? ', ' + params.join(', ') : ', ...'})`, 'end');
    definition.push(...docLines(capability.descriptor),
      `function ${container}.${field}(${signature}) end`);
  }
  source.push('return M');
  definition.push('return M');
  return Object.freeze({
    moduleName,
    source: source.join('\n') + '\n',
    definition: definition.join('\n') + '\n',
    uri: `file:///definitions/capabilities/${encodeURIComponent(moduleName)}.lua`
  });
}

/** A generation-safe, idempotent registration returned by grouped APIs. */
export class CapabilityGroupHandle {
  /** @param {ReadonlyArray<string>} names @param {() => void} dispose
   * @param {Readonly<CapabilityModule>|null} [module] */
  constructor(names, dispose, module = null) {
    this.names = Object.freeze([...names]);
    this.module = module;
    this.#dispose = dispose;
  }
  /** @type {ReadonlyArray<string>} */
  names;
  /** @type {Readonly<CapabilityModule>|null} */
  module;
  #dispose;
  disposed = false;
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.#dispose();
  }
  [Symbol.dispose]() { this.dispose(); }
}

/**
 * Registry for a large host API surface. Registration and invocation policy
 * live here so the Worker transport remains a small ABI concern.
 */
export class CapabilityRegistry extends EventTarget {
  #entries = new Map();
  #middlewares = [];
  #active = new Map();
  #sequence = 0;
  #disposed = false;

  /** @param {string} name @param {CapabilityRegistration} registration
   * @param {{replace?: boolean}} [options] */
  register(name, registration, options = {}) {
    if (this.#disposed) throw new Error('能力注册表已销毁。');
    assertCapabilityName(name);
    const descriptor = normalizeDescriptor(registration);
    if (this.#entries.has(name) && !options.replace)
      throw new Error(`能力已注册：${name}`);
    if (this.#entries.has(name)) this.#remove(name, this.#entries.get(name).token);
    const token = Symbol(name);
    const entry = { descriptor, token, active: 0, queue: [] };
    this.#entries.set(name, entry);
    emit(this, 'registered', { capability: publicDescriptor(name, entry) });
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      this.#remove(name, token);
    };
  }

  /** @param {string} namespace @param {CapabilityGroupMap} registrations
   * @param {{replace?: boolean}} [options]
   * @returns {{capabilities: Array<{relativeName: string, name: string,
   *   descriptor: CapabilityDescriptor}>, handle: CapabilityGroupHandle}} */
  registerGroup(namespace, registrations, options = {}) {
    assertCapabilityName(namespace);
    const flattened = flattenGroup(registrations).map(([relativeName, value]) => ({
      relativeName,
      name: `${namespace}.${relativeName}`,
      descriptor: normalizeDescriptor(value)
    }));
    if (!flattened.length) throw new Error('能力组不能为空。');
    for (const item of flattened) {
      assertCapabilityName(item.name);
      if (this.#entries.has(item.name) && !options.replace)
        throw new Error(`能力已注册：${item.name}`);
    }
    const disposers = [];
    try {
      for (const item of flattened)
        disposers.push(this.register(item.name, item.descriptor, options));
    } catch (error) {
      for (const dispose of disposers.reverse()) dispose();
      throw error;
    }
    return {
      capabilities: flattened,
      handle: new CapabilityGroupHandle(flattened.map(item => item.name), () => {
        for (const dispose of disposers.reverse()) dispose();
      })
    };
  }

  /** Install invocation middleware: `(context, next) => value`.
   * @param {CapabilityMiddleware} middleware */
  use(middleware) {
    if (typeof middleware !== 'function') throw new TypeError('中间件必须是函数。');
    this.#middlewares.push(middleware);
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      const index = this.#middlewares.indexOf(middleware);
      if (index >= 0) this.#middlewares.splice(index, 1);
    };
  }

  /** @param {{prefix?: string, includeInternal?: boolean}} [options]
   * @returns {CapabilityInfo[]} */
  list(options = {}) {
    const prefix = String(options.prefix ?? '');
    return [...this.#entries]
      .filter(([name, entry]) => name.startsWith(prefix) &&
        (options.includeInternal || !entry.descriptor.internal))
      .map(([name, entry]) => publicDescriptor(name, entry));
  }

  /** @param {string} name */
  has(name) { return this.#entries.has(name); }

  async #acquire(name, entry) {
    if (entry.active < entry.descriptor.maxConcurrency) {
      entry.active++;
      return;
    }
    if (entry.queue.length >= entry.descriptor.queueLimit)
      throw new Error(`能力调用队列已满：${name}`);
    await new Promise((resolve, reject) => entry.queue.push({ resolve, reject }));
    entry.active++;
  }

  #release(entry) {
    entry.active = Math.max(0, entry.active - 1);
    entry.queue.shift()?.resolve();
  }

  /** @param {string} name @param {any[]} [args] @param {object} [extra] */
  async invoke(name, args = [], extra = {}) {
    const entry = this.#entries.get(name);
    if (!entry) throw new Error('未注册的 JS 能力：' + name);
    await this.#acquire(name, entry);
    const id = ++this.#sequence;
    const controller = new AbortController();
    let cancel;
    const cancelled = new Promise((_resolve, reject) => { cancel = reject; });
    const context = Object.freeze({
      ...extra, id, name, signal: controller.signal,
      args: Object.freeze([...args]),
      capability: publicDescriptor(name, entry), startedAt: performance.now()
    });
    const active = { id, name, entry, controller, cancel };
    this.#active.set(id, active);
    emit(this, 'invocationstart', { context, args });

    const callHandler = () => entry.descriptor.handler.apply(context, args);
    const middleware = [...this.#middlewares];
    let lastIndex = -1;
    const dispatch = index => {
      if (index <= lastIndex)
        return Promise.reject(new Error('能力中间件 next() 不能重复调用。'));
      lastIndex = index;
      const current = middleware[index];
      return Promise.resolve(current
        ? current(context, () => dispatch(index + 1))
        : callHandler());
    };
    const handlerPromise = Promise.resolve().then(() => dispatch(0));
    handlerPromise.then(() => this.#finishActive(active), () => this.#finishActive(active));

    let timer;
    let timeout;
    if (entry.descriptor.timeoutMs) timeout = new Promise((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort(new Error(`能力调用超时：${name}`));
        this.#finishActive(active);
        reject(new Error(`能力调用超时：${name}`));
      }, entry.descriptor.timeoutMs);
    });
    try {
      const result = await Promise.race([
        handlerPromise,
        cancelled,
        ...(timeout ? [timeout] : [])
      ]);
      emit(this, 'invocationend', {
        context, result, durationMs: performance.now() - context.startedAt
      });
      return result;
    } catch (error) {
      emit(this, 'invocationerror', {
        context, error, durationMs: performance.now() - context.startedAt
      });
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  #finishActive(active) {
    if (!this.#active.has(active.id)) return;
    this.#active.delete(active.id);
    this.#release(active.entry);
  }

  cancelActive(reason = new Error('能力调用已取消。')) {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    for (const entry of this.#entries.values())
      for (const waiter of entry.queue.splice(0)) waiter.reject(error);
    for (const active of this.#active.values()) {
      active.controller.abort(error);
      active.cancel(error);
      this.#finishActive(active);
    }
  }

  #remove(name, token) {
    const entry = this.#entries.get(name);
    if (!entry || entry.token !== token) return false;
    this.#entries.delete(name);
    for (const waiter of entry.queue.splice(0))
      waiter.reject(new Error(`能力已撤销：${name}`));
    for (const active of this.#active.values()) if (active.entry === entry) {
      const error = new Error(`能力已撤销：${name}`);
      active.controller.abort(error);
      active.cancel(error);
      this.#finishActive(active);
    }
    emit(this, 'unregistered', { name });
    return true;
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.cancelActive(new Error('能力注册表已销毁。'));
    for (const [name, entry] of [...this.#entries]) this.#remove(name, entry.token);
    this.#middlewares.length = 0;
  }
}

export function createCapabilityRegistry() { return new CapabilityRegistry(); }
