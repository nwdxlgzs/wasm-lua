import { createLuaWorkbenchController, LuaWorkbenchController } from './controller.js';

const activeBindings = new WeakMap();

function resolveRoot(target) {
  if (typeof target === 'string') {
    const element = document.querySelector(target);
    if (!element) throw new Error(`找不到绑定根节点：${target}`);
    return element;
  }
  if (!(target instanceof Element))
    throw new TypeError('bindLuaWorkbench() 需要 DOM Element 或选择器。');
  return target;
}

function stringValue(state, key) {
  if (key === 'problemCount') return String(state.problems.length);
  if (key === 'breakpointCount') return String(state.breakpoints.length);
  if (key === 'fileCount') return String(state.files.length);
  const value = state[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return value == null ? '' : JSON.stringify(value);
}

function stateRule(state, rule) {
  if (rule === 'running' || rule === 'executing')
    return state.running && !state.paused;
  if (rule === 'active') return state.running || state.paused;
  if (rule === 'paused') return state.paused;
  if (rule === 'idle') return !state.running && !state.paused;
  if (rule === 'debugger') return state.mode === 'debugger';
  if (rule === 'playground') return state.mode === 'playground';
  if (rule === 'safe' || rule === 'trusted' || rule === 'full-access')
    return state.profile === rule;
  if (rule === 'host-access') return state.profile !== 'safe';
  if (rule === 'emscripten' || rule === 'wasi') return state.backend === rule;
  return Boolean(state[rule]);
}

function resultCleanup(result) {
  if (typeof result === 'function') return result;
  if (result?.dispose) return () => result.dispose();
  return null;
}

function commandArgument(root, node, attribute = 'data-lua-argument') {
  const source = node.getAttribute('data-lua-value');
  if (source) {
    const input = root.querySelector(source);
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement ||
          input instanceof HTMLSelectElement))
      throw new Error(`data-lua-value 找不到可读取控件：${source}`);
    return input.value;
  }
  const value = node.getAttribute(attribute);
  if (value == null) return undefined;
  if (/^\s*(?:\{|\[|"|-?\d|true\b|false\b|null\b)/.test(value)) {
    try { return JSON.parse(value); } catch { /* Treat as a literal below. */ }
  }
  return value;
}

/**
 * Bind an arbitrary host-owned DOM layout to a Lua workbench controller.
 *
 * Required marker: `[data-lua-editor]`.
 * Optional markers:
 * - `[data-lua-command="run|stop|find|replace|format|setKeybindings|..."]`
 * - `[data-lua-option="backend|profile"]`
 * - `[data-lua-bind="status|output|activeFile|problemCount|..."]`
 * - `[data-lua-enabled="running|paused|idle|debugger"]`
 * - `[data-lua-visible="running|paused|idle|debugger|playground|safe|trusted|full-access|host-access"]`
 * - `[data-lua-component="debugPanel|debugConsole|..."]`
 * - `[data-lua-zone="toolbar|sidebar|bottom|..."]`
 * - `[data-lua-command-on-enter="addWatch|evaluate|searchWorkspace|..."]`
 * - `data-lua-value="#selector"` reads a host input as the command argument.
 *
 * @param {Element|string} target
 * @param {import('./controller.js').LuaWorkbenchOptions & {
 *   controller?: LuaWorkbenchController, editorHost?: HTMLElement,
 *   editorSelector?: string}} [options]
 */
export async function bindLuaWorkbench(target, options = {}) {
  const root = resolveRoot(target);
  if (activeBindings.has(root))
    throw new Error('该根节点已经绑定；请先调用现有 binding.dispose()。');
  const controller = options.controller instanceof LuaWorkbenchController
    ? options.controller
    : createLuaWorkbenchController(options);
  const ownsController = !(options.controller instanceof LuaWorkbenchController);
  const editorHost = options.editorHost ?? root.querySelector(
    options.editorSelector ?? '[data-lua-editor]');
  if (!(editorHost instanceof HTMLElement))
    throw new Error('绑定布局必须提供 [data-lua-editor] 编辑器挂载点。');

  const managedAttributes = [
    'data-lua-state', 'data-lua-mode', 'data-lua-backend', 'data-lua-profile'
  ];
  const previousAttributes = new Map(managedAttributes.map(name =>
    [name, root.hasAttribute(name) ? root.getAttribute(name) : undefined]));
  const previousController = Object.getOwnPropertyDescriptor(root, 'luaController');
  const originalEditorChildren = [...editorHost.childNodes];
  const componentOutlets = /** @type {HTMLElement[]} */ ([
    ...root.querySelectorAll('[data-lua-component]')
  ].filter(node => node instanceof HTMLElement &&
    node !== editorHost && !editorHost.contains(node)));
  const zoneOutlets = /** @type {HTMLElement[]} */ ([
    ...root.querySelectorAll('[data-lua-zone]')
  ].filter(node => node instanceof HTMLElement &&
    node !== editorHost && !editorHost.contains(node)));
  const componentStates = new Map(componentOutlets.map(node => [node, {
    record: undefined, cleanup: null, original: [...node.childNodes],
    hidden: node.hidden
  }]));
  const zoneStates = new Map(zoneOutlets.map(node => [node, new Map()]));
  let outletsReady = false;

  const componentContext = (record, host) => controller.pluginContext(
    record.plugin, { host, shell: root });
  const restoreComponent = (node, state) => {
    state.cleanup?.();
    state.cleanup = null;
    state.record = undefined;
    node.replaceChildren(...state.original);
    node.hidden = state.hidden;
  };
  const refreshPluginOutlets = state => {
    if (!outletsReady) return;
    for (const node of componentOutlets) {
      const slot = componentStates.get(node);
      const id = node.getAttribute('data-lua-component') ?? '';
      const record = controller.getComponent(id);
      if (!record) {
        if (slot.record !== undefined) restoreComponent(node, slot);
        if (record === false) {
          node.replaceChildren();
          node.hidden = true;
          slot.record = false;
        }
        continue;
      }
      if (typeof record !== 'object') continue;
      if (slot.record !== record) {
        slot.cleanup?.();
        node.replaceChildren();
        node.hidden = false;
        const result = record.mount(node, componentContext(record, node));
        if (result instanceof Node && !node.contains(result)) node.append(result);
        slot.record = record;
        slot.cleanup = resultCleanup(result);
        record.update?.(node, componentContext(record, node));
      } else if (record.update) {
        record.update(node, componentContext(record, node));
      }
    }
    for (const node of zoneOutlets) {
      const mounted = zoneStates.get(node);
      const zone = node.getAttribute('data-lua-zone') ?? '';
      const records = controller.getContributions(zone, state);
      const wanted = new Set(records.map(record => record.key));
      for (const [key, item] of mounted) {
        if (wanted.has(key)) continue;
        item.cleanup?.();
        item.host.remove();
        mounted.delete(key);
      }
      for (const record of records) {
        let item = mounted.get(record.key);
        if (!item) {
          const host = document.createElement('span');
          host.dataset.luaPlugin = record.key;
          host.style.display = 'contents';
          const result = record.mount(host, componentContext(record, host));
          if (result instanceof Node && !host.contains(result)) host.append(result);
          item = { host, record, cleanup: resultCleanup(result) };
          mounted.set(record.key, item);
          record.update?.(host, componentContext(record, host));
        } else if (record.update) {
          record.update(item.host, componentContext(record, item.host));
        }
        node.append(item.host);
      }
    }
  };

  const abort = new AbortController();
  const { signal } = abort;
  const refresh = () => {
    const state = controller.snapshot();
    for (const node of root.querySelectorAll('[data-lua-bind]')) {
      const key = node.getAttribute('data-lua-bind');
      const value = stringValue(state, key);
      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement ||
          node instanceof HTMLSelectElement) node.value = value;
      else node.textContent = value;
    }
    for (const node of root.querySelectorAll('[data-lua-option]')) {
      const key = node.getAttribute('data-lua-option');
      if (node instanceof HTMLSelectElement && state[key] !== undefined)
        node.value = state[key];
    }
    for (const node of root.querySelectorAll('[data-lua-enabled]')) {
      const rule = node.getAttribute('data-lua-enabled');
      const enabled = stateRule(state, rule);
      if ('disabled' in node) node.disabled = !enabled;
      node.toggleAttribute('aria-disabled', !enabled);
    }
    for (const node of root.querySelectorAll('[data-lua-visible]'))
      node.toggleAttribute('hidden',
        !stateRule(state, node.getAttribute('data-lua-visible')));
    root.setAttribute('data-lua-state',
      state.paused ? 'paused' : state.running ? 'running' : 'idle');
    root.setAttribute('data-lua-mode', state.mode);
    root.setAttribute('data-lua-backend', state.backend);
    root.setAttribute('data-lua-profile', state.profile);
    root.dispatchEvent(new CustomEvent('lua-statechange', {
      bubbles: true,
      detail: { controller, state }
    }));
    refreshPluginOutlets(state);
  };

  root.addEventListener('click', event => {
    const target = event.target instanceof Element
      ? event.target.closest('[data-lua-command]') : null;
    if (!target || !root.contains(target)) return;
    const command = target.getAttribute('data-lua-command');
    Promise.resolve(controller.command(command, commandArgument(root, target)))
      .catch(error => root.dispatchEvent(new CustomEvent('lua-error', {
        bubbles: true, detail: { error, command }
      })));
  }, { signal });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    const target = event.target instanceof Element
      ? event.target.closest('[data-lua-command-on-enter]') : null;
    if (!target || !root.contains(target)) return;
    event.preventDefault();
    const command = target.getAttribute('data-lua-command-on-enter');
    const argument = commandArgument(root, target,
      'data-lua-argument') ?? ('value' in target ? target.value : undefined);
    Promise.resolve(controller.command(command, argument))
      .then(() => {
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
          target.value = '';
      })
      .catch(error => root.dispatchEvent(new CustomEvent('lua-error', {
        bubbles: true, detail: { error, command }
      })));
  }, { signal });
  root.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.matches('[data-lua-option]')) return;
    const name = target.getAttribute('data-lua-option');
    if (name !== 'backend' && name !== 'profile') return;
    controller.switchOption(name, target.value)
      .catch(error => root.dispatchEvent(new CustomEvent('lua-error', {
        bubbles: true, detail: { error }
      })));
  }, { signal });
  controller.addEventListener('statechange', refresh, { signal });
  for (const name of ['output', 'runtimechange', 'breakpointedit']) {
    controller.addEventListener(name, event =>
      root.dispatchEvent(new CustomEvent(`lua-${name}`, {
        bubbles: true, detail: event.detail
      })), { signal });
  }
  let disposed = false;
  let detachPluginHost = null;
  const binding = {
    root,
    controller,
    refresh,
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      detachPluginHost?.();
      outletsReady = false;
      for (const [node, state] of componentStates) restoreComponent(node, state);
      for (const [node, mounted] of zoneStates) {
        for (const item of mounted.values()) {
          item.cleanup?.();
          item.host.remove();
        }
        mounted.clear();
      }
      if (ownsController) controller.dispose();
      if (ownsController) editorHost.replaceChildren(...originalEditorChildren);
      for (const [name, value] of previousAttributes) {
        if (value === undefined) root.removeAttribute(name);
        else root.setAttribute(name, value);
      }
      if (previousController) Object.defineProperty(root, 'luaController', previousController);
      else delete /** @type {any} */ (root).luaController;
      activeBindings.delete(root);
      root.dispatchEvent(new CustomEvent('lua-dispose', {
        bubbles: true, detail: { controller, binding }
      }));
    }
  };
  activeBindings.set(root, binding);
  try {
    await controller.initialize(editorHost);
    detachPluginHost = await controller.attachPluginHost(root, root);
    outletsReady = true;
    refresh();
    Object.defineProperty(root, 'luaController', {
      configurable: true, value: controller
    });
    return binding;
  } catch (error) {
    binding.dispose();
    throw error;
  }
}
