import {
  CapabilityGroupHandle, createLuaDebugger, createLuaRuntime,
  resolveLuaBreakpoint
} from '../sdk/index.js';
import {
  createLuaModel, forgetLuaModel, isReadonlyModel, luaLanguageClient,
  monaco, registerDefinition
} from '../language/monaco.js';
import { loadDocument, saveDocument } from './storage.js';
import { COMMAND_LABELS, parseKeybinding, resolveKeybindings } from './keybindings.js';

/**
 * @typedef {'playground'|'debugger'} WorkbenchMode
 * @typedef {'emscripten'|'wasi'} WorkbenchBackend
 * @typedef {'safe'|'trusted'|'full-access'} WorkbenchProfile
 * @typedef {{uri: string, source: string}} WorkbenchDefinition
 * @typedef {void|(()=>void)|{dispose(): void}} WorkbenchDisposable
 * @typedef {'titlebar'|'toolbar'|'fileTabs'|'debugPanel'|'filesPanel'|'outlinePanel'|'debugConsole'|'problemsPanel'|'searchPanel'|'breakpointDialog'|'fileDialog'|'keybindingSettings'|'statusbar'} WorkbenchComponentId
 * @typedef {'titlebar'|'toolbar'|'sidebar'|'bottom'|'statusbar'} WorkbenchPluginZone
 * @typedef {{controller: LuaWorkbenchController,
 *   monaco: typeof import('monaco-editor'), plugin: LuaWorkbenchPlugin,
 *   state: Record<string, any>, editor?: import('monaco-editor').editor.IStandaloneCodeEditor,
 *   runtime?: import('../sdk/runtime.js').LuaRuntime, host?: HTMLElement,
 *   shell?: HTMLElement}} LuaWorkbenchPluginContext
 * @typedef {{id: string, zone: WorkbenchPluginZone, order?: number,
 *   when?: (state: Record<string, any>) => boolean,
 *   mount: (host: HTMLElement, context: LuaWorkbenchPluginContext) =>
 *     Node|WorkbenchDisposable,
 *   update?: (host: HTMLElement, context: LuaWorkbenchPluginContext) => void}}
 *   WorkbenchContribution
 * @typedef {{mount: (host: HTMLElement, context: LuaWorkbenchPluginContext) =>
 *   Node|WorkbenchDisposable,
 *   update?: (host: HTMLElement, context: LuaWorkbenchPluginContext) => void}}
 *   WorkbenchComponent
 * @typedef {{id: string,
 *   themes?: Array<{name: string,
 *     data: import('monaco-editor').editor.IStandaloneThemeData}>,
 *   theme?: string,
 *   editorOptions?: import('monaco-editor').editor.IStandaloneEditorConstructionOptions,
 *   editorFactory?: (host: HTMLElement,
 *     options: import('monaco-editor').editor.IStandaloneEditorConstructionOptions,
 *     context: LuaWorkbenchPluginContext) =>
 *       import('monaco-editor').editor.IStandaloneCodeEditor|
 *       Promise<import('monaco-editor').editor.IStandaloneCodeEditor>,
 *   commands?: Record<string, (context: LuaWorkbenchPluginContext,
 *     argument?: any) => any>,
 *   components?: Partial<Record<WorkbenchComponentId, WorkbenchComponent|false>>,
 *   contributions?: WorkbenchContribution[],
 *   setup?: (context: LuaWorkbenchPluginContext & {
 *     registerCommand: (id: string, handler: Function) => WorkbenchDisposable,
 *     replaceComponent: (id: WorkbenchComponentId,
 *       component: WorkbenchComponent|false) => WorkbenchDisposable,
 *     contribute: (contribution: WorkbenchContribution) => WorkbenchDisposable,
 *     registerCapability: LuaWorkbenchController['registerCapability']}) =>
 *       WorkbenchDisposable|Promise<WorkbenchDisposable>,
 *   editorReady?: (context: LuaWorkbenchPluginContext) =>
 *     WorkbenchDisposable|Promise<WorkbenchDisposable>,
 *   runtimeReady?: (context: LuaWorkbenchPluginContext) =>
 *     WorkbenchDisposable|Promise<WorkbenchDisposable>,
 *   hostReady?: (context: LuaWorkbenchPluginContext & {host: HTMLElement}) =>
 *     WorkbenchDisposable|Promise<WorkbenchDisposable>,
 *   dispose?: (context: LuaWorkbenchPluginContext) => void}} LuaWorkbenchPlugin
 * @typedef {{mode?: WorkbenchMode, backend?: WorkbenchBackend,
 *   profile?: WorkbenchProfile, assetBaseUrl?: string, licenseUrl?: string,
 *   storageKey?: string,
 *   environment?: Record<string, string>,
 *   backends?: WorkbenchBackend[],
 *   theme?: string|{name: string,
 *     data: import('monaco-editor').editor.IStandaloneThemeData},
 *   editorOptions?: import('monaco-editor').editor.IStandaloneEditorConstructionOptions,
 *   editorFactory?: LuaWorkbenchPlugin['editorFactory'],
 *   plugins?: LuaWorkbenchPlugin[],
 *   components?: Partial<Record<WorkbenchComponentId, WorkbenchComponent|false>>,
 *   keybindings?: Record<string, string|null|undefined>,
 *   workspaceId?: string,
 *   capabilities?: Record<string, import('../sdk/capability-registry.js').CapabilityRegistration>,
 *   capabilityGroups?: Array<{namespace: string,
 *     capabilities: import('../sdk/capability-registry.js').CapabilityGroupMap,
 *     options?: {moduleName?: string|false, replace?: boolean}}>,
 *   modules?: Record<string, string|((...args: any[]) => any|Promise<any>)>,
 *   definitions?: WorkbenchDefinition[]}} LuaWorkbenchOptions
 * @typedef {import('../sdk/runtime.js').LuaBreakpoint &
 *   {file?: string, enabled?: boolean}} WorkbenchBreakpoint
 * @typedef {{name: string, uri: string,
 *   model: import('monaco-editor').editor.ITextModel, readonly: boolean,
 *   dirty: boolean, disposable?: import('monaco-editor').IDisposable}} WorkspaceFile
 * @typedef {{regex?: boolean, matchCase?: boolean, wholeWord?: boolean}} WorkspaceSearchOptions
 * @typedef {{file: string, line: number, column: number,
 *   range: import('monaco-editor').IRange, preview: string}} WorkspaceSearchResult
 * @typedef {'run'|'stop'|'pause'|'continue'|'stepOver'|'stepIn'|'stepOut'|'runToCursor'|'find'|'replace'|'commandPalette'|'outline'|'format'|'suggest'|'rename'|'references'|'gotoLine'|'nextProblem'|'previousProblem'|'toggleBreakpoint'|'clearBreakpoints'|'clearOutput'|'pickHostDirectory'|'addWatch'|'evaluate'|'openFile'|'removeFile'|'newFile'|'searchWorkspace'|'replaceWorkspace'|'setKeybindings'|'resetKeybindings'} WorkbenchCommand
 */

export const SAMPLE = `-- Lua 5.5.1 · 浏览器双后端
global print, string, js, math
global 问候语 <const> = "你好，Lua 5.5！"

local function fibonacci(n)
  if n < 2 then return n end
  return fibonacci(n - 1) + fibonacci(n - 2)
end

print(问候语)
for i = 0, 10 do
  print(string.format("fib(%d) = %d", i, fibonacci(i)))
end

local now = js.call("clock.now")
print("JavaScript 时间：", now)
return fibonacci(10), math.maxinteger
`;

export const HOST_DEFINITION = `--- JavaScript 宿主桥接（只读定义）
js = {}
--- 异步调用一个由宿主显式注册的能力
function js.call(capability, ...) end
host = {}
function host.version() return "1.0" end
`;

/** @type {import('monaco-editor').editor.IStandaloneEditorConstructionOptions} */
const DEFAULT_EDITOR_OPTIONS = {
  theme: 'lua55-vscode-dark',
  automaticLayout: true,
  fontFamily: '"Cascadia Code", "SFMono-Regular", Consolas, monospace',
  fontSize: 13.5,
  lineHeight: 22,
  minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },
  padding: { top: 10 },
  smoothScrolling: true,
  cursorSmoothCaretAnimation: 'on',
  bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
  guides: { bracketPairs: true, bracketPairsHorizontal: true, indentation: true },
  lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.On },
  renderWhitespace: 'selection',
  renderControlCharacters: true,
  stickyScroll: { enabled: true },
  suggest: { preview: true, showStatusBar: true, snippetsPreventQuickSuggestions: false },
  quickSuggestions: { other: true, comments: false, strings: false },
  suggestOnTriggerCharacters: true,
  parameterHints: { enabled: true, cycle: true },
  linkedEditing: true,
  formatOnPaste: false,
  formatOnType: false,
  scrollBeyondLastLine: false,
  wordWrap: 'off',
  unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: true },
  accessibilitySupport: 'auto'
};

function stringify(value) {
  return JSON.stringify(value, (_key, item) =>
    typeof item === 'bigint' ? item + 'n' : item, 2);
}

let instanceSequence = 0;

function workspaceUri(name, namespace) {
  return `file:///workspace/${encodeURIComponent(namespace)}/` +
    name.split('/').map(encodeURIComponent).join('/');
}

function normalizeWorkspaceName(value) {
  if (typeof value !== 'string' || value.includes('\\') || value.includes('\0'))
    throw new TypeError('工作区文件名必须使用 /，且不能包含 NUL。');
  const parts = value.trim().split('/').filter(Boolean);
  if (!parts.length || parts.some(part => part === '.' || part === '..'))
    throw new TypeError('工作区文件名不能为空，也不能包含 . 或 ..。');
  const normalized = parts.join('/');
  if (!normalized.endsWith('.lua')) throw new TypeError('工作区文件必须使用 .lua 扩展名。');
  return normalized;
}

function normalizeBreakpointFile(value) {
  return String(value ?? '').replace(/^[@=]/u, '').replaceAll('\\', '/');
}

/**
 * Headless workbench state plus an attachable Monaco surface. Host pages can
 * bind their own layout to this controller instead of rendering the bundled
 * `<lua-workbench>` shell.
 */
export class LuaWorkbenchController extends EventTarget {
  /** @param {LuaWorkbenchOptions} [options] */
  constructor(options = {}) {
    super();
    this.options = options;
    this.mode = options.mode === 'playground' ? 'playground' : 'debugger';
    this.backend = options.backend === 'wasi' ? 'wasi' : 'emscripten';
    this.availableBackends = options.backends?.length
      ? [...new Set(options.backends)] : ['emscripten', 'wasi'];
    this.profile = options.profile === 'trusted' || options.profile === 'full-access'
      ? options.profile : 'safe';
    /** @type {{handle: FileSystemDirectoryHandle, mountPoint: string}|null} */
    this.hostDirectory = null;
    this.assetBaseUrl = options.assetBaseUrl ??
      new URL('../runtime/wasm/', import.meta.url).href;
    this.storageKey = options.storageKey ?? 'default';
    this.workspaceNamespace = options.workspaceId ??
      `${this.storageKey}-${++instanceSequence}`;
    this.running = false;
    this.paused = false;
    this.operationActive = false;
    this.output = '';
    this.stack = [];
    this.variables = [];
    this.watches = [];
    this.problems = [];
    this.outline = [];
    this.searchResults = [];
    this.cursor = null;
    this.selectedFrame = 0;
    this.status = '正在载入编辑器';
    this.stopReason = '';
    this.theme = typeof options.theme === 'string'
      ? options.theme : options.theme?.name ?? DEFAULT_EDITOR_OPTIONS.theme;
    this.keybindings = resolveKeybindings(options.keybindings);
    /** @type {Map<number, WorkbenchBreakpoint>} */
    this.breakpoints = new Map();
    /** @type {Map<string, Map<number, WorkbenchBreakpoint>>} */
    this.breakpointMaps = new Map();
    /** @type {Map<string, WorkspaceFile>} */
    this.files = new Map();
    this.disposables = [];
    this.actionDisposables = [];
    this.definitionDisposables = [];
    this.runtimeDefinitionDisposables = new Map();
    this.pluginCommands = new Map();
    this.pluginComponents = new Map(Object.entries(options.components ?? {})
      .map(([id, component]) => [id, component === false ? false : {
        ...component, plugin: { id: 'host-components' }
      }]));
    this.pluginContributions = new Map();
    this.pluginDisposables = [];
    this.runtimePluginDisposables = [];
    this.pluginHostDisposables = new Set();
    this.plugins = options.plugins ?? [];
    this.pluginsInitialized = false;
    const pluginIds = new Set();
    for (const plugin of this.plugins) {
      const id = String(plugin?.id ?? '').trim();
      if (!id || pluginIds.has(id)) throw new Error(`重复或无效的工作台插件：${id}`);
      pluginIds.add(id);
    }
    this.persistentCapabilities = new Map();
    this.persistentCapabilityGroups = new Map();
    for (const group of options.capabilityGroups ?? []) {
      if (!group?.namespace || this.persistentCapabilityGroups.has(group.namespace))
        throw new Error(`重复或无效的能力组：${group?.namespace ?? ''}`);
      this.persistentCapabilityGroups.set(group.namespace, {
        namespace: group.namespace,
        registrations: group.capabilities,
        options: group.options ?? {},
        handle: null,
        token: Symbol(group.namespace)
      });
    }
  }

  /** @returns {Record<string, any>} */
  snapshot() {
    return {
      mode: this.mode, backend: this.backend, profile: this.profile,
      hostDirectory: this.profile !== 'safe'
        ? this.hostDirectory?.handle.name ?? null : null,
      availableBackends: [...this.availableBackends],
      running: this.running, paused: this.paused, output: this.output,
      stack: this.stack, variables: this.variables, watches: this.watches,
      problems: this.problems, outline: this.outline,
      searchResults: this.searchResults, status: this.status,
      theme: this.theme,
      cursor: this.cursor, selectedFrame: this.selectedFrame,
      keybindings: this.getKeybindings(),
      stopReason: this.stopReason, activeFile: this.activeFile,
      files: [...this.files.values()].map(file => ({
        name: file.name, uri: file.uri, readonly: file.readonly,
        dirty: file.dirty
      })),
      breakpoints: [...this.breakpoints.values()]
    };
  }

  /** @param {LuaWorkbenchPlugin} plugin @param {Record<string, any>} [extra] */
  pluginContext(plugin, extra = {}) {
    return {
      controller: this, monaco, plugin, state: this.snapshot(),
      editor: this.editor, runtime: this.runtime, ...extra
    };
  }

  trackPluginDisposable(value, target = this.pluginDisposables) {
    if (typeof value === 'function') target.push({ dispose: value });
    else if (value?.dispose) target.push(value);
    return value;
  }

  /** @param {string} id @param {Function} handler @param {LuaWorkbenchPlugin} plugin */
  registerPluginCommand(id, handler, plugin = { id: 'host' }) {
    if (!id || typeof handler !== 'function' || this.pluginCommands.has(id))
      throw new Error(`重复或无效的插件命令：${id}`);
    const record = { handler, plugin };
    this.pluginCommands.set(id, record);
    return () => {
      if (this.pluginCommands.get(id) === record) this.pluginCommands.delete(id);
    };
  }

  /** @param {WorkbenchComponentId} id @param {WorkbenchComponent|false} component
   * @param {LuaWorkbenchPlugin} [plugin] */
  replaceComponent(id, component, plugin = { id: 'host' }) {
    if (!id || (component !== false && typeof component?.mount !== 'function'))
      throw new TypeError(`组件 ${id} 必须为 false 或提供 mount()。`);
    const record = component === false ? false : { ...component, plugin };
    this.pluginComponents.set(id, record);
    this.changed('components');
    return () => {
      if (this.pluginComponents.get(id) === record) {
        this.pluginComponents.delete(id);
        this.changed('components');
      }
    };
  }

  /** @param {WorkbenchContribution} contribution @param {LuaWorkbenchPlugin} [plugin] */
  contribute(contribution, plugin = { id: 'host' }) {
    if (!contribution?.id || !contribution.zone ||
        typeof contribution.mount !== 'function')
      throw new TypeError('UI 贡献必须提供 id、zone 和 mount()。');
    const key = `${plugin.id}:${contribution.id}`;
    if (this.pluginContributions.has(key)) throw new Error(`重复的 UI 贡献：${key}`);
    const record = { ...contribution, key, plugin };
    this.pluginContributions.set(key, record);
    this.changed('contributions');
    return () => {
      if (this.pluginContributions.delete(key)) this.changed('contributions');
    };
  }

  getComponent(id) { return this.pluginComponents.get(id); }

  getContributions(zone, state = this.snapshot()) {
    return [...this.pluginContributions.values()]
      .filter(item => item.zone === zone && (!item.when || item.when(state)))
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  }

  getPluginMount(key) {
    if (key.startsWith('component:'))
      return this.pluginComponents.get(key.slice('component:'.length));
    if (key.startsWith('contribution:'))
      return this.pluginContributions.get(key.slice('contribution:'.length));
  }

  async initializePlugins() {
    if (this.pluginsInitialized) return;
    this.pluginsInitialized = true;
    if (typeof this.options.theme === 'object')
      monaco.editor.defineTheme(this.options.theme.name, this.options.theme.data);
    for (const plugin of this.plugins) {
      for (const theme of plugin.themes ?? [])
        monaco.editor.defineTheme(theme.name, theme.data);
      if (!this.options.theme && plugin.theme) this.theme = plugin.theme;
      for (const [id, handler] of Object.entries(plugin.commands ?? {}))
        this.trackPluginDisposable(this.registerPluginCommand(id, handler, plugin));
      for (const [id, component] of Object.entries(plugin.components ?? {}))
        this.trackPluginDisposable(this.replaceComponent(
          /** @type {WorkbenchComponentId} */ (id), component, plugin));
      for (const contribution of plugin.contributions ?? [])
        this.trackPluginDisposable(this.contribute(contribution, plugin));
      const context = Object.assign(this.pluginContext(plugin), {
        registerCommand: (id, handler) => {
          const result = this.registerPluginCommand(id, handler, plugin);
          this.trackPluginDisposable(result);
          return result;
        },
        replaceComponent: (id, component) => {
          const result = this.replaceComponent(id, component, plugin);
          this.trackPluginDisposable(result);
          return result;
        },
        contribute: contribution => {
          const result = this.contribute(contribution, plugin);
          this.trackPluginDisposable(result);
          return result;
        },
        registerCapability: this.registerCapability.bind(this)
      });
      this.trackPluginDisposable(await plugin.setup?.(context));
    }
  }

  setTheme(name) {
    if (!name) throw new TypeError('主题名称不能为空。');
    this.theme = String(name);
    if (this.editor) monaco.editor.setTheme(this.theme);
    this.changed('theme');
  }

  /** Run host integration hooks for the bundled shell or a bind() root. */
  async attachPluginHost(host, shell = host) {
    const disposables = [];
    for (const plugin of this.plugins)
      this.trackPluginDisposable(await plugin.hostReady?.(
        this.pluginContext(plugin, { host, shell })), disposables);
    const dispose = () => {
      for (const item of disposables.splice(0).reverse()) item.dispose?.();
      this.pluginHostDisposables.delete(dispose);
    };
    this.pluginHostDisposables.add(dispose);
    return dispose;
  }

  changed(reason = 'state') {
    const detail = { reason, controller: this, state: this.snapshot() };
    this.dispatchEvent(new CustomEvent('statechange', { detail }));
  }

  /** @param {string} text @param {string} [category] */
  appendOutput(text, category = 'stdout') {
    this.output += text;
    this.dispatchEvent(new CustomEvent('output', {
      detail: { output: text, category }
    }));
    this.changed('output');
  }

  /** @param {HTMLElement} editorHost */
  async initialize(editorHost) {
    if (this.editor) return this;
    await this.initializePlugins();
    await this.resolveAvailableBackends();
    const storedKeybindings = await loadDocument(
      `keybindings:${this.storageKey}`, {});
    this.keybindings = resolveKeybindings({
      ...(storedKeybindings && typeof storedKeybindings === 'object'
        ? storedKeybindings : {}),
      ...(this.options.keybindings ?? {})
    });
    const legacy = await loadDocument('main.lua', SAMPLE);
    const fallback = {
      version: 1,
      activeFile: 'main.lua',
      files: { 'main.lua': typeof legacy === 'string' ? legacy : SAMPLE }
    };
    const stored = await loadDocument(`workspace:${this.storageKey}`, fallback);
    const workspace = stored && typeof stored === 'object' && stored.files
      ? stored : fallback;
    for (const [name, source] of Object.entries(workspace.files))
      await this.addFile(name, String(source), { activate: false, persist: false });
    if (!this.files.size)
      await this.addFile('main.lua', SAMPLE, { activate: false, persist: false });

    this.definitionDisposables.push(await registerDefinition({
      uri: 'file:///definitions/host.lua', source: HOST_DEFINITION
    }));
    for (const definition of this.options.definitions ?? [])
      this.definitionDisposables.push(await registerDefinition(definition));

    const pluginEditorOptions = Object.assign({},
      ...this.plugins.map(plugin => plugin.editorOptions ?? {}));
    const editorOptions = {
      ...DEFAULT_EDITOR_OPTIONS,
      ...pluginEditorOptions,
      ...this.options.editorOptions,
      theme: this.options.editorOptions?.theme ?? this.theme,
      model: null,
      glyphMargin: this.mode === 'debugger'
    };
    const pluginFactories = this.plugins.filter(plugin => plugin.editorFactory);
    if (!this.options.editorFactory && pluginFactories.length > 1)
      throw new Error('只能有一个插件提供 editorFactory。');
    const factory = this.options.editorFactory ?? pluginFactories[0]?.editorFactory ??
      ((host, creationOptions) => monaco.editor.create(host, creationOptions));
    const factoryPlugin = pluginFactories[0] ?? { id: 'host' };
    this.editor = await factory(editorHost, editorOptions,
      this.pluginContext(factoryPlugin));
    if (!this.editor?.setModel || !this.editor?.addAction || !this.editor?.dispose)
      throw new TypeError('editorFactory 必须返回兼容 Monaco standalone editor 的实例。');
    this.breakpointDecorations = this.editor.createDecorationsCollection();
    this.currentDecoration = this.editor.createDecorationsCollection();
    this.installEditorBindings();
    for (const plugin of this.plugins)
      this.trackPluginDisposable(await plugin.editorReady?.(
        this.pluginContext(plugin)));
    await this.openFile(workspace.activeFile && this.files.has(workspace.activeFile)
      ? workspace.activeFile : this.files.keys().next().value);
    await this.createRuntime();
    this.status = '就绪 · Lua 5.5.1';
    this.changed('ready');
    return this;
  }

  async resolveAvailableBackends() {
    const requested = new Set(this.availableBackends);
    try {
      const base = new URL(this.assetBaseUrl.endsWith('/')
        ? this.assetBaseUrl : this.assetBaseUrl + '/', document.baseURI);
      const response = await fetch(new URL('manifest.json', base));
      if (!response.ok) return;
      const manifest = await response.json();
      const suffix = this.mode === 'debugger' ? '-lua-debug.wasm' : '-lua-runtime.wasm';
      const available = Object.keys(manifest.artifacts ?? {})
        .filter(name => name.endsWith(suffix))
        .map(name => name.startsWith('emscripten-') ? 'emscripten' :
          name.startsWith('wasi-') ? 'wasi' : null)
        .filter(Boolean)
        .filter(name => requested.has(name));
      this.availableBackends = [...new Set(available)];
    } catch {
      // A custom development asset server may omit the optional manifest.
      // The backend loader still provides the authoritative artifact error.
    }
    if (!this.availableBackends.length)
      throw new Error(`当前 release 不包含 ${this.mode === 'debugger' ? 'debug' : 'runtime'} 产物。`);
    if (!this.availableBackends.includes(this.backend))
      this.backend = this.availableBackends[0];
  }

  installEditorBindings() {
    this.disposables.push(this.editor.onMouseDown(event => {
      if (this.mode !== 'debugger' ||
          event.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN)
        return;
      const line = event.target.position?.lineNumber;
      if (!line) return;
      if (event.event.rightButton) this.requestBreakpointEditor(line);
      else this.toggleBreakpoint(line);
    }));
    this.disposables.push(this.editor.onContextMenu(event => {
      if (this.mode === 'debugger' &&
          event.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        event.event.preventDefault();
        const line = event.target.position?.lineNumber;
        if (line) this.requestBreakpointEditor(line);
      }
    }));
    this.disposables.push(this.editor.onDidChangeCursorPosition(event => {
      this.cursor = event.position;
      this.changed('cursor');
    }));
    this.disposables.push(monaco.editor.onDidChangeMarkers(resources => {
      if (this.model && resources.some(uri => uri.toString() === this.model.uri.toString()))
        this.refreshProblems();
    }));

    this.installCommandActions();
  }

  installCommandActions() {
    const action = (command, run) => this.editor.addAction({
      id: `wasm-lua.${command}`,
      label: `Lua：${COMMAND_LABELS[command] ?? command}`,
      keybindings: this.keybindings[command]
        ? [parseKeybinding(this.keybindings[command])] : [],
      contextMenuGroupId: 'lua', run
    });
    const actions = {
      run: () => this.paused ? this.resume('continue') : this.execute(),
      stop: () => this.stop(),
      pause: () => this.pauseExecution(),
      gotoLine: () => this.command('gotoLine'),
      find: () => this.command('find'), replace: () => this.command('replace'),
      suggest: () => this.command('suggest'), rename: () => this.command('rename'),
      references: () => this.command('references'), format: () => this.command('format'),
      commandPalette: () => this.command('commandPalette'),
      outline: () => this.command('outline'), nextProblem: () => this.command('nextProblem'),
      previousProblem: () => this.command('previousProblem')
    };
    for (const [command, run] of Object.entries(actions))
      this.actionDisposables.push(action(command, run));
    if (this.mode === 'debugger') {
      this.actionDisposables.push(action('toggleBreakpoint', () =>
        this.toggleBreakpoint(this.editor.getPosition()?.lineNumber)));
      this.actionDisposables.push(action('stepOver', () =>
        this.paused && this.resume('stepOver')));
      this.actionDisposables.push(action('stepIn', () =>
        this.paused && this.resume('stepIn')));
      this.actionDisposables.push(action('stepOut', () =>
        this.paused && this.resume('stepOut')));
      this.actionDisposables.push(action('runToCursor', () => this.runToCursor()));
    }
  }

  getKeybindings() { return { ...this.keybindings }; }

  /** Recreate Monaco actions with a complete, conflict-checked binding set. */
  async setKeybindings(overrides = {}) {
    this.keybindings = resolveKeybindings(overrides);
    for (const disposable of this.actionDisposables ?? []) disposable.dispose?.();
    this.actionDisposables = [];
    this.installCommandActions();
    await saveDocument(`keybindings:${this.storageKey}`, overrides);
    this.changed('keybindings');
    return this.getKeybindings();
  }

  resetKeybindings() { return this.setKeybindings({}); }

  async createRuntime() {
    for (const disposable of this.runtimePluginDisposables.splice(0).reverse())
      disposable?.dispose?.();
    this.runtime?.dispose();
    const factory = this.mode === 'debugger' ? createLuaDebugger : createLuaRuntime;
    this.runtime = factory({
      backend: /** @type {'emscripten'|'wasi'} */ (this.backend),
      profile: /** @type {WorkbenchProfile} */ (this.profile),
      timeout: this.profile === 'full-access' ? 0
        : this.profile === 'safe' ? 5000 : 60000,
      assetBaseUrl: this.assetBaseUrl,
      environment: this.options.environment
    });
    if (this.profile !== 'safe' && this.hostDirectory)
      await this.runtime.mountDirectory(this.hostDirectory.handle, {
        mountPoint: this.hostDirectory.mountPoint
      });
    this.runtime.addEventListener('definitionchange', event =>
      this.syncRuntimeDefinition(event.detail));
    this.runtime.registerCapability('clock.now', async () =>
      new Date().toLocaleString('zh-CN'));
    this.runtime.registerCapability('timer.sleep', milliseconds =>
      new Promise(resolve => setTimeout(
        () => resolve(true), Math.min(Number(milliseconds), 5000))));
    for (const [name, callback] of Object.entries(this.options.capabilities ?? {}))
      this.runtime.registerCapability(name, callback);
    for (const record of this.persistentCapabilities.values())
      record.handle = this.runtime.registerCapability(record.name, record.registration);
    for (const record of this.persistentCapabilityGroups.values())
      record.handle = this.runtime.registerCapabilityGroup(
        record.namespace, record.registrations, record.options);
    for (const [name, module] of Object.entries(this.options.modules ?? {}))
      this.runtime.registerModule(name, module);
    for (const definition of [
      { uri: 'file:///definitions/host.lua', source: HOST_DEFINITION },
      ...(this.options.definitions ?? [])
    ]) this.runtime.registerDefinition(definition);

    for (const plugin of this.plugins)
      this.trackPluginDisposable(await plugin.runtimeReady?.(
        this.pluginContext(plugin)), this.runtimePluginDisposables);

    this.runtime.addEventListener('output', event =>
      this.appendOutput(event.detail.output, event.detail.category ?? 'stdout'));
    this.runtime.addEventListener('stopped', async event => {
      this.paused = event.detail.resumable !== false;
      this.running = false;
      this.stopReason = event.detail.reason;
      const reasons = {
        breakpoint: '断点', step: '单步', goto: '运行到光标',
        pause: '主动暂停', exception: '未捕获异常'
      };
      this.status = `${reasons[event.detail.reason] ?? '已暂停'} · 第 ${event.detail.line ?? '?'} 行`;
      const source = String(event.detail.source ?? '').replace(/^[@=]/u, '');
      if (source && this.files.has(source) && source !== this.activeFile)
        await this.openFile(source);
      this.highlightLine(event.detail.line);
      await this.refreshDebug();
      this.changed('stopped');
    });
    this.runtime.addEventListener('breakpointchange', event =>
      this.applyRuntimeBreakpoints(event.detail.breakpoints ?? []));
    this.runtime.addEventListener('reset', () => {
      this.paused = false;
      this.running = false;
      this.status = 'VM 已重建';
      this.stopReason = '';
      this.changed('reset');
    });
    await Promise.all([...this.files.values()].map(file =>
      this.refreshCompilerDiagnostics(file)));
    this.dispatchEvent(new CustomEvent('runtimechange', {
      detail: { runtime: this.runtime, backend: this.backend, profile: this.profile }
    }));
  }

  async syncRuntimeDefinition({ uri, source }) {
    const previous = this.runtimeDefinitionDisposables.get(uri);
    previous?.dispose?.();
    this.runtimeDefinitionDisposables.delete(uri);
    if (typeof source !== 'string') return;
    const runtime = this.runtime;
    const disposable = await registerDefinition({ uri, source });
    if (runtime !== this.runtime || this.disposed) disposable.dispose();
    else this.runtimeDefinitionDisposables.set(uri, disposable);
  }

  /** Register one host function and replay it after backend/profile switches. */
  /** @param {string} name
   * @param {import('../sdk/capability-registry.js').CapabilityRegistration} registration */
  registerCapability(name, registration) {
    const previous = this.persistentCapabilities.get(name);
    previous?.handle?.();
    const token = Symbol(name);
    const record = {
      name, registration, token,
      handle: this.runtime?.registerCapability(name, registration) ?? null
    };
    this.persistentCapabilities.set(name, record);
    let disposed = false;
    return () => {
      if (disposed || this.persistentCapabilities.get(name)?.token !== token) return;
      disposed = true;
      record.handle?.();
      this.persistentCapabilities.delete(name);
    };
  }

  /** Register a managed API group which survives runtime reconstruction. */
  /** @param {string} namespace
   * @param {import('../sdk/capability-registry.js').CapabilityGroupMap} registrations
   * @param {{moduleName?: string|false, replace?: boolean}} [options] */
  registerCapabilityGroup(namespace, registrations, options = {}) {
    if (!this.runtime) throw new Error('请等待工作台 ready 后再注册能力组。');
    if (this.persistentCapabilityGroups.has(namespace))
      throw new Error(`能力组已注册：${namespace}`);
    const token = Symbol(namespace);
    const runtimeHandle = this.runtime.registerCapabilityGroup(
      namespace, registrations, options);
    const record = {
      namespace, registrations, options, token, handle: runtimeHandle
    };
    this.persistentCapabilityGroups.set(namespace, record);
    return new CapabilityGroupHandle(runtimeHandle.names, () => {
      if (this.persistentCapabilityGroups.get(namespace)?.token !== token) return;
      record.handle?.dispose();
      this.persistentCapabilityGroups.delete(namespace);
    }, runtimeHandle.module);
  }

  /** @param {{prefix?: string, includeInternal?: boolean}} [options] */
  listCapabilities(options = {}) {
    return this.runtime?.listCapabilities(options) ?? [];
  }

  /** @param {'backend'|'profile'} name @param {string} value */
  async switchOption(name, value) {
    if (name !== 'backend' && name !== 'profile')
      throw new TypeError('只能切换 backend 或 profile。');
    if (name === 'backend' && !['emscripten', 'wasi'].includes(value))
      throw new TypeError('未知后端：' + value);
    if (name === 'backend' && !this.availableBackends.includes(value))
      throw new Error(`当前 release 未包含 ${value} 的 ` +
        `${this.mode === 'debugger' ? 'debug' : 'runtime'} 产物。`);
    if (name === 'profile' && !['safe', 'trusted', 'full-access'].includes(value))
      throw new TypeError('未知安全档：' + value);
    this[name] = value;
    this.status = '正在切换运行时';
    await this.createRuntime();
    await this.syncBreakpoints();
    this.status = '就绪 · ' + this.backend.toUpperCase();
    this.changed('runtime-option');
  }

  /** Browser picker must be reached from a direct user click. The handle is
   * replayed after backend switches only while a host-access profile is active. */
  async pickHostDirectory() {
    if (this.profile === 'safe')
      throw new Error('请先切换至可信档或 full-access 再选择宿主文件夹。');
    if (this.hostDirectory) {
      this.hostDirectory = null;
      await this.createRuntime();
      this.status = '宿主文件夹已卸载';
    } else {
      const { handle } = await this.runtime.pickDirectory({ mountPoint: '/host' });
      this.hostDirectory = { handle, mountPoint: '/host' };
      this.status = `已挂载 /host · ${handle.name}`;
    }
    this.changed('host-directory');
  }

  async execute() {
    if (this.running || this.operationActive || !this.model) return;
    this.operationActive = true;
    this.output = '';
    this.stack = [];
    this.variables = [];
    this.running = true;
    this.paused = false;
    this.stopReason = '';
    this.status = '正在运行';
    this.highlightLine(null);
    this.changed('run');
    try {
      if (this.mode === 'debugger') await this.syncBreakpoints();
      const result = await this.runtime.run(this.model.getValue(), {
        chunkName: '@' + this.activeFile
      });
      if (result.state === 'paused') return result;
      this.appendOutput('\n返回值：' + stringify(result.values) + '\n');
      this.status = '执行完成';
      return result;
    } catch (error) {
      this.appendOutput('\n[错误] ' + error.message + '\n', 'stderr');
      if (this.stopReason !== 'exception') this.status = '执行失败';
      throw error;
    } finally {
      if (!this.paused) this.running = false;
      this.operationActive = false;
      this.changed('run-finished');
    }
  }

  /** @param {'continue'|'stepIn'|'stepOver'|'stepOut'} [method] */
  async resume(method = 'continue') {
    if (!this.paused || this.running || this.operationActive) return;
    this.operationActive = true;
    this.running = true;
    this.paused = false;
    this.stopReason = '';
    this.status = '正在运行';
    this.highlightLine(null);
    this.changed('resume');
    try {
      const result = await this.runtime[method]();
      if (result.state === 'paused') return result;
      this.appendOutput('\n返回值：' + stringify(result.values) + '\n');
      this.status = '执行完成';
      return result;
    } catch (error) {
      this.appendOutput('\n[错误] ' + error.message + '\n', 'stderr');
      if (this.stopReason !== 'exception') this.status = '执行失败';
      throw error;
    } finally {
      if (!this.paused) this.running = false;
      this.operationActive = false;
      this.changed('resume-finished');
    }
  }

  async stop() {
    await this.runtime.interrupt();
    this.running = false;
    this.paused = false;
    this.stopReason = '';
    this.highlightLine(null);
    this.status = '已停止并重建 VM';
    this.changed('stop');
  }

  async pauseExecution() {
    this.status = '正在请求协作式暂停';
    this.changed('pause-request');
    await this.runtime.pause();
  }

  async runToCursor() {
    const line = this.editor?.getPosition()?.lineNumber;
    if (!line || !this.paused || this.running || this.operationActive) return;
    this.operationActive = true;
    this.running = true;
    this.paused = false;
    this.stopReason = '';
    this.highlightLine(null);
    try {
      const result = await this.runtime.runToCursor(line, this.activeFile);
      if (result.state !== 'paused') this.status = '执行完成';
      return result;
    } catch (error) {
      this.appendOutput(`\n[错误] ${error.message}\n`, 'stderr');
      this.status = '执行失败';
      throw error;
    } finally {
      if (!this.paused) this.running = false;
      this.operationActive = false;
      this.changed('run-to-cursor');
    }
  }

  /** @param {number} line */
  toggleBreakpoint(line) {
    if (!line) return Promise.resolve([]);
    const location = resolveLuaBreakpoint(this.model?.getValue() ?? '', line);
    const target = location.verified ? location.line : line;
    if (this.breakpoints.has(target)) this.breakpoints.delete(target);
    else this.breakpoints.set(target, {
      ...location, line: target, file: this.activeFile, enabled: true,
      condition: '', hitCondition: '', logMessage: '', hits: 0
    });
    this.renderBreakpoints();
    const synchronized = this.syncBreakpoints();
    this.changed('breakpoints');
    return synchronized;
  }

  /** @param {number} line */
  requestBreakpointEditor(line) {
    const location = resolveLuaBreakpoint(this.model?.getValue() ?? '', line);
    const target = location.verified ? location.line : line;
    const point = this.breakpoints.get(target) ?? {
      ...location, line: target, file: this.activeFile, enabled: true,
      condition: '', hitCondition: '', logMessage: '', hits: 0
    };
    this.dispatchEvent(new CustomEvent('breakpointedit', {
      detail: { point: { ...point }, controller: this }
    }));
  }

  /** @param {number} line @param {Partial<WorkbenchBreakpoint>} changes */
  async updateBreakpoint(line, changes) {
    const point = {
      line: Number(line), file: this.activeFile, enabled: true,
      condition: '', hitCondition: '',
      logMessage: '', hits: 0, ...(this.breakpoints.get(Number(line)) ?? {}), ...changes
    };
    this.breakpoints.set(point.line, point);
    this.renderBreakpoints();
    await this.syncBreakpoints();
    this.changed('breakpoints');
    return point;
  }

  /** @param {number} line */
  async removeBreakpoint(line) {
    this.breakpoints.delete(Number(line));
    this.renderBreakpoints();
    await this.syncBreakpoints();
    this.changed('breakpoints');
  }

  async clearBreakpoints() {
    this.breakpoints.clear();
    this.renderBreakpoints();
    await this.syncBreakpoints();
    this.changed('breakpoints');
  }

  syncBreakpoints() {
    if (!this.runtime || this.mode !== 'debugger') return Promise.resolve([]);
    for (const [name, points] of this.breakpointMaps) {
      const source = this.files.get(name)?.model.getValue();
      if (typeof source !== 'string') continue;
      const resolved = new Map();
      for (const point of points.values()) {
        const location = resolveLuaBreakpoint(
          source, point.requestedLine ?? point.line);
        const next = { ...point, ...location, file: name };
        resolved.set(next.verified ? next.line : next.requestedLine, next);
      }
      this.breakpointMaps.set(name, resolved);
      if (name === this.activeFile) this.breakpoints = resolved;
    }
    this.renderBreakpoints();
    return this.runtime.setBreakpoints([...this.breakpointMaps.values()]
      .flatMap(points => [...points.values()])
      .filter(point => point.enabled !== false));
  }

  /** Apply authoritative line-hook relocation without dropping disabled points.
   * @param {WorkbenchBreakpoint[]} points */
  applyRuntimeBreakpoints(points) {
    let changed = false;
    for (const actual of points) {
      const file = normalizeBreakpointFile(actual.file ?? actual.source) ||
        this.activeFile;
      const map = this.breakpointMaps.get(file);
      if (!map) continue;
      const requested = actual.requestedLine ?? actual.line;
      const entry = [...map.entries()].find(([, point]) =>
        (point.requestedLine ?? point.line) === requested);
      if (!entry) continue;
      map.delete(entry[0]);
      map.set(actual.line, { ...entry[1], ...actual, file });
      changed ||= entry[0] !== actual.line ||
        actual.verified !== entry[1].verified;
    }
    if (!changed) return;
    this.breakpoints = this.breakpointMaps.get(this.activeFile) ?? new Map();
    this.renderBreakpoints();
    this.changed('breakpoint-lines');
  }

  renderBreakpoints() {
    this.decoratedBreakpoints = [...this.breakpoints.values()];
    this.breakpointDecorations?.set(this.decoratedBreakpoints.map(point => ({
      range: new monaco.Range(point.line, 1, point.line, 1),
      options: {
        glyphMarginClassName: point.enabled === false
          ? 'glyph-breakpoint-disabled'
          : point.verified === false ? 'glyph-breakpoint-unverified'
            : point.logMessage ? 'glyph-logpoint'
              : point.condition || point.hitCondition
                ? 'glyph-breakpoint-conditional' : 'glyph-breakpoint',
        glyphMarginHoverMessage: {
          value: [
            point.logMessage ? `日志点：${point.logMessage}` : `Lua 断点 · 第 ${point.line} 行`,
            point.message ?? '',
            point.condition ? `条件：\`${point.condition}\`` : '',
            point.hitCondition ? `命中：\`${point.hitCondition}\`` : '',
            point.enabled === false ? '**已禁用**' : '',
            '右键编辑'
          ].filter(Boolean).join('  \n')
        }
      }
    })));
    // Decoration collections update Monaco's model synchronously, but its DOM
    // render is normally deferred to the next animation frame.  A fast WASI
    // pause could therefore briefly show neither the breakpoint glyph nor the
    // instruction arrow.  Force just this editor to paint the two independent
    // lanes before the stopped event is observable by an embedding host.
    this.editor?.render?.(true);
  }

  updateBreakpointLines() {
    if (this.mode !== 'debugger' || !this.breakpointDecorations?.length) return;
    const shifted = new Map();
    let moved = false;
    for (let index = 0; index < this.decoratedBreakpoints.length; index++) {
      const point = this.decoratedBreakpoints[index];
      const range = this.breakpointDecorations.getRange(index);
      const line = range?.startLineNumber ?? point.line;
      if (line !== point.line) moved = true;
      const delta = line - point.line;
      shifted.set(line, {
        ...point, line,
        requestedLine: Math.max(1, (point.requestedLine ?? point.line) + delta)
      });
    }
    if (moved) {
      this.breakpoints.clear();
      for (const [line, point] of shifted) this.breakpoints.set(line, point);
      this.syncBreakpoints();
      this.changed('breakpoint-lines');
    }
  }

  /** @param {number|null} line */
  highlightLine(line) {
    this.currentDecoration?.set(line ? [{
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 'current-line',
        linesDecorationsClassName: 'current-instruction'
      }
    }] : []);
    this.editor?.render?.(true);
    if (line) {
      this.editor?.setPosition({ lineNumber: line, column: 1 });
      this.editor?.revealLineInCenter(line);
    }
  }

  async refreshDebug(frame = 0) {
    try {
      this.stack = await this.runtime.stackTrace();
      this.selectedFrame = this.stack.some(item => item.id === frame) ? frame : 0;
      const decorate = (items, scope, scopeKind) => items.map(item => ({
        ...item, frame: this.selectedFrame, scope, scopeKind, depth: 0
      }));
      this.variables = [
        ...decorate(await this.runtime.variables(this.selectedFrame, 0), 0, 'locals'),
        ...decorate(await this.runtime.variables(this.selectedFrame, 1), 1, 'upvalues'),
        ...decorate(await this.runtime.variables(this.selectedFrame, 2), 2, 'globals')
      ];
      await this.refreshWatches(this.selectedFrame);
    } catch (error) {
      this.appendOutput('\n[调试器] ' + error.message + '\n', 'stderr');
    }
    this.changed('debug-state');
  }

  /** @param {import('../sdk/runtime.js').LuaDebugVariable &
   *   {frame?: number, scope?: number, scopeKind?: string,
   *    depth?: number, childCount?: number,
   *    expanded?: boolean}} variable */
  async expandVariable(variable) {
    if (!variable.variablesReference) return;
    const index = this.variables.indexOf(variable);
    if (index < 0) return;
    if (variable.expanded) {
      const depth = variable.depth ?? 0;
      let descendantCount = 0;
      while (index + 1 + descendantCount < this.variables.length &&
          (this.variables[index + 1 + descendantCount].depth ?? 0) > depth)
        descendantCount++;
      this.variables.splice(index + 1, descendantCount);
      variable.childCount = 0;
      variable.expanded = false;
      this.changed('variables');
      return;
    }
    const children = await this.runtime.variables(
      variable.frame ?? 0, variable.variablesReference);
    const oldCount = variable.childCount ?? 0;
    this.variables.splice(index + 1, oldCount, ...children.map(child => ({
      ...child,
      frame: variable.frame ?? 0,
      scope: variable.variablesReference,
      scopeKind: variable.scopeKind,
      depth: (variable.depth ?? 0) + 1
    })));
    variable.childCount = children.length;
    variable.expanded = true;
    this.changed('variables');
  }

  /** @param {import('../sdk/runtime.js').LuaDebugVariable &
   *   {frame?: number, scope?: number}} variable @param {string} value */
  async setVariable(variable, value) {
    await this.runtime.setVariable(variable.frame ?? 0,
      variable.scope ?? 0, variable.name, value);
    await this.refreshDebug(variable.frame ?? 0);
  }

  async refreshWatches(frame = 0) {
    for (const watch of this.watches) {
      try {
        const result = await this.runtime.evaluate(watch.expression, frame);
        watch.value = Array.isArray(result) ? result[0]?.value ?? 'nil' : result.error;
      } catch (error) {
        watch.value = error.message;
      }
    }
    this.changed('watches');
  }

  /** @param {string} expression */
  async addWatch(expression) {
    const value = expression.trim();
    if (!value) return;
    this.watches.push({ expression: value, value: '未求值' });
    if (this.paused) await this.refreshWatches(this.selectedFrame);
    this.changed('watches');
  }

  removeWatch(index) {
    this.watches.splice(index, 1);
    this.changed('watches');
  }

  async evaluate(expression, frame = this.selectedFrame) {
    if (!this.paused) throw new Error('Lua 暂停时才能在调试控制台求值。');
    const result = await this.runtime.evaluate(expression, frame);
    this.appendOutput('\n> ' + expression + '\n' + stringify(result) + '\n');
    return result;
  }

  /** @param {string} rawName @param {string} [source]
   * @param {{activate?: boolean, persist?: boolean}} [options]
   * @returns {Promise<WorkspaceFile>} */
  async addFile(rawName, source = '', options = {}) {
    const name = normalizeWorkspaceName(rawName);
    if (this.files.has(name)) throw new Error(`文件已存在：${name}`);
    const uri = workspaceUri(name, this.workspaceNamespace);
    const model = await createLuaModel(source, uri);
    /** @type {WorkspaceFile} */
    const file = { name, uri, model, readonly: false, dirty: false };
    this.files.set(name, file);
    let saveTimer;
    let compilerTimer;
    const contentDisposable = model.onDidChangeContent(() => {
      if (this.activeFile === name) this.updateBreakpointLines();
      file.dirty = true;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        await this.persistWorkspace();
        file.dirty = false;
        if (name === 'main.lua') await saveDocument('main.lua', model.getValue());
        this.changed('saved');
      }, 350);
      clearTimeout(compilerTimer);
      compilerTimer = setTimeout(() => this.refreshCompilerDiagnostics(file), 220);
      if (this.activeFile === name) this.refreshOutline();
      this.changed('content');
    });
    file.disposable = {
      dispose() {
        contentDisposable.dispose();
        clearTimeout(saveTimer);
        clearTimeout(compilerTimer);
      }
    };
    if (options.activate !== false && this.editor) await this.openFile(name);
    if (options.persist !== false) await this.persistWorkspace();
    this.changed('files');
    return file;
  }

  /** @param {string} name @param {import('monaco-editor').IPosition} [position]
   * @returns {Promise<WorkspaceFile>} */
  async openFile(name, position) {
    const file = this.files.get(name);
    if (!file) throw new Error(`工作区文件不存在：${name}`);
    if (this.activeFile && this.files.has(this.activeFile))
      this.breakpointMaps.set(this.activeFile, this.breakpoints);
    this.breakpoints = this.breakpointMaps.get(name) ?? new Map();
    this.breakpointMaps.set(name, this.breakpoints);
    this.activeFile = name;
    this.model = file.model;
    this.editor.setModel(file.model);
    this.editor.updateOptions({ readOnly: file.readonly || isReadonlyModel(file.uri) });
    if (position) {
      this.editor.setPosition(position);
      this.editor.revealPositionInCenter(position);
    }
    this.renderBreakpoints();
    await this.syncBreakpoints();
    await Promise.all([this.refreshProblems(), this.refreshOutline()]);
    await this.persistWorkspace();
    this.changed('active-file');
    return file;
  }

  /** @param {string} oldName @param {string} rawNewName */
  async renameFile(oldName, rawNewName) {
    const source = this.files.get(oldName)?.model.getValue();
    if (source === undefined) throw new Error(`工作区文件不存在：${oldName}`);
    const newName = normalizeWorkspaceName(rawNewName);
    await this.addFile(newName, source, { activate: false, persist: false });
    const points = this.breakpointMaps.get(oldName);
    if (points) this.breakpointMaps.set(newName, new Map(
      [...points].map(([line, point]) => [line, { ...point, file: newName }])));
    await this.removeFile(oldName, { activateFallback: false, persist: false });
    await this.openFile(newName);
    await this.persistWorkspace();
    return newName;
  }

  /** @param {string} name
   * @param {{activateFallback?: boolean, persist?: boolean}} [options] */
  async removeFile(name, options = {}) {
    const file = this.files.get(name);
    if (!file) return false;
    if (this.files.size === 1) throw new Error('工作区至少需要保留一个 Lua 文件。');
    file.disposable?.dispose();
    forgetLuaModel(file.uri);
    this.files.delete(name);
    this.breakpointMaps.delete(name);
    if (this.activeFile === name && options.activateFallback !== false)
      await this.openFile(this.files.keys().next().value);
    if (options.persist !== false) await this.persistWorkspace();
    this.changed('files');
    return true;
  }

  async persistWorkspace() {
    if (!this.files.size) return;
    await saveDocument(`workspace:${this.storageKey}`, {
      version: 1,
      activeFile: this.activeFile ?? this.files.keys().next().value,
      files: Object.fromEntries([...this.files].map(([name, file]) =>
        [name, file.model.getValue()]))
    });
  }

  async refreshProblems() {
    if (!this.model) return [];
    this.problems = monaco.editor.getModelMarkers({ resource: this.model.uri });
    this.changed('problems');
    return this.problems;
  }

  /** Run official Lua text-mode compilation through the public runtime SDK.
   * @param {WorkspaceFile} file
   * @returns {Promise<import('monaco-editor').editor.IMarkerData[]>} */
  async refreshCompilerDiagnostics(file) {
    const runtime = this.runtime;
    if (!runtime || this.running || this.paused || this.operationActive ||
        !file || file.model.isDisposed()) return [];
    const source = file.model.getValue();
    let markers = [];
    try {
      await runtime.check(source, { chunkName: '@' + file.name });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const line = Math.max(1, Number(/:(\d+):/.exec(message)?.[1] ?? 1));
      markers = [{
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: Math.max(2,
          (source.split('\n')[line - 1]?.length ?? 1) + 1),
        severity: monaco.MarkerSeverity.Error,
        source: 'Lua 5.5.1 编译器',
        message
      }];
    }
    if (runtime === this.runtime && !file.model.isDisposed() &&
        file.model.getValue() === source) {
      monaco.editor.setModelMarkers(file.model, 'lua55-compiler', markers);
      if (this.model === file.model) await this.refreshProblems();
    }
    return markers;
  }

  async refreshOutline() {
    if (!this.model) return [];
    try {
      this.outline = await luaLanguageClient.symbols(
        this.model.uri.toString(), this.model.getValue()) ?? [];
    }
    catch { this.outline = []; }
    this.changed('outline');
    return this.outline;
  }

  /** @param {string} name @param {number} lineNumber @param {number} [column] */
  openLocation(name, lineNumber, column = 1) {
    return this.openFile(name, { lineNumber, column });
  }

  /** @param {string} query @param {WorkspaceSearchOptions} [options]
   * @returns {Promise<WorkspaceSearchResult[]>} */
  async searchWorkspace(query, options = {}) {
    if (!query) {
      this.searchResults = [];
      this.changed('search');
      return [];
    }
    const results = [];
    for (const file of this.files.values()) {
      const matches = file.model.findMatches(
        query, false, Boolean(options.regex), Boolean(options.matchCase),
        options.wholeWord ? '~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?' : null,
        true, 5000
      );
      for (const match of matches) results.push({
        file: file.name,
        line: match.range.startLineNumber,
        column: match.range.startColumn,
        range: match.range,
        preview: file.model.getLineContent(match.range.startLineNumber).trim()
      });
    }
    this.searchResults = results;
    this.changed('search');
    return results;
  }

  /** @param {string} query @param {string} replacement
   * @param {WorkspaceSearchOptions} [options] @returns {Promise<number>} */
  async replaceWorkspace(query, replacement, options = {}) {
    const results = await this.searchWorkspace(query, options);
    if (options.regex) {
      const flags = options.matchCase ? 'gu' : 'giu';
      const expression = new RegExp(query, flags);
      for (const file of this.files.values())
        file.model.setValue(file.model.getValue().replace(expression, replacement));
      await this.persistWorkspace();
      await this.searchWorkspace(query, options);
      return results.length;
    }
    const byFile = new Map();
    for (const result of results) {
      const list = byFile.get(result.file) ?? [];
      list.push(result);
      byFile.set(result.file, list);
    }
    for (const [name, matches] of byFile) {
      const model = this.files.get(name).model;
      model.pushEditOperations([], matches.map(match => ({
        range: match.range, text: replacement
      })), () => null);
    }
    await this.persistWorkspace();
    await this.searchWorkspace(query, options);
    return results.length;
  }

  /** @param {string} id */
  runEditorAction(id) {
    this.editor?.focus();
    return this.editor?.getAction(id)?.run();
  }

  /** @param {WorkbenchCommand} name @param {any} [argument] */
  command(name, argument) {
    const commands = {
      run: () => this.paused ? this.resume('continue') : this.execute(),
      stop: () => this.stop(),
      pause: () => this.pauseExecution(),
      continue: () => this.resume('continue'),
      stepOver: () => this.resume('stepOver'),
      stepIn: () => this.resume('stepIn'),
      stepOut: () => this.resume('stepOut'),
      runToCursor: () => this.runToCursor(),
      find: () => this.runEditorAction('actions.find'),
      replace: () => this.runEditorAction('editor.action.startFindReplaceAction'),
      commandPalette: () => this.runEditorAction('editor.action.quickCommand'),
      outline: () => this.runEditorAction('editor.action.quickOutline'),
      format: () => this.runEditorAction('editor.action.formatDocument'),
      suggest: () => this.runEditorAction('editor.action.triggerSuggest'),
      rename: () => this.runEditorAction('editor.action.rename'),
      references: () => this.runEditorAction('editor.action.goToReferences'),
      gotoLine: () => this.runEditorAction('editor.action.gotoLine'),
      nextProblem: () => this.runEditorAction('editor.action.marker.next'),
      previousProblem: () => this.runEditorAction('editor.action.marker.prev'),
      toggleBreakpoint: () => this.toggleBreakpoint(
        Number(argument ?? this.editor?.getPosition()?.lineNumber)),
      clearBreakpoints: () => this.clearBreakpoints(),
      clearOutput: () => this.clearOutput(),
      pickHostDirectory: () => this.pickHostDirectory(),
      addWatch: () => this.addWatch(String(argument ?? '')),
      evaluate: () => this.evaluate(String(argument ?? '')),
      openFile: () => this.openFile(String(argument ?? '')),
      removeFile: () => this.removeFile(String(argument ?? '')),
      newFile: () => typeof argument === 'object' && argument
        ? this.addFile(String(argument.name ?? ''), String(argument.source ?? ''))
        : this.addFile(String(argument ?? ''), ''),
      searchWorkspace: () => typeof argument === 'object' && argument
        ? this.searchWorkspace(String(argument.query ?? ''), argument.options ?? {})
        : this.searchWorkspace(String(argument ?? '')),
      replaceWorkspace: () => {
        if (!argument || typeof argument !== 'object')
          throw new TypeError('replaceWorkspace 命令需要 query、replacement 和 options。');
        return this.replaceWorkspace(String(argument.query ?? ''),
          String(argument.replacement ?? ''), argument.options ?? {});
      },
      setKeybindings: () => {
        if (!argument || typeof argument !== 'object' || Array.isArray(argument))
          throw new TypeError('setKeybindings 命令需要快捷键映射对象。');
        return this.setKeybindings(argument);
      },
      resetKeybindings: () => this.resetKeybindings()
    };
    const command = commands[name];
    if (command) return command();
    const pluginCommand = this.pluginCommands.get(name);
    if (pluginCommand) return pluginCommand.handler(
      this.pluginContext(pluginCommand.plugin), argument);
    throw new Error('未知工作台命令：' + name);
  }

  clearOutput() {
    this.output = '';
    this.changed('output');
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const dispose of [...this.pluginHostDisposables]) dispose();
    for (const disposable of this.runtimePluginDisposables.splice(0).reverse())
      disposable?.dispose?.();
    this.runtime?.dispose();
    this.editor?.dispose();
    for (const disposable of this.actionDisposables) disposable?.dispose?.();
    for (const disposable of this.disposables) disposable?.dispose?.();
    for (const disposable of this.definitionDisposables) disposable?.dispose?.();
    for (const disposable of this.runtimeDefinitionDisposables.values())
      disposable?.dispose?.();
    for (const plugin of [...this.plugins].reverse())
      plugin.dispose?.(this.pluginContext(plugin));
    for (const disposable of this.pluginDisposables.splice(0).reverse())
      disposable?.dispose?.();
    for (const file of this.files.values()) {
      file.disposable?.dispose();
      forgetLuaModel(file.uri);
    }
    this.files.clear();
    this.disposables.length = 0;
    this.actionDisposables.length = 0;
    this.definitionDisposables.length = 0;
    this.runtimeDefinitionDisposables.clear();
    this.persistentCapabilities.clear();
    this.persistentCapabilityGroups.clear();
    this.pluginCommands.clear();
    this.pluginComponents.clear();
    this.pluginContributions.clear();
  }
}

/** @param {LuaWorkbenchOptions} [options] */
export function createLuaWorkbenchController(options = {}) {
  return new LuaWorkbenchController(options);
}
