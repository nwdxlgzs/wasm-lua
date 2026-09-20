import { LitElement, html, nothing } from 'lit';
import { createLuaDapAdapter } from '../sdk/index.js';
import { monaco } from '../language/monaco.js';
import { createLuaWorkbenchController } from './controller.js';
import {
  COMMAND_LABELS, DEFAULT_KEYBINDINGS, displayKeybinding
} from './keybindings.js';
import { keyboardEventToBinding } from './keybinding-recorder.js';

const EMPTY_STATE = {
  mode: 'debugger', backend: 'emscripten', profile: 'safe', running: false,
  availableBackends: ['emscripten', 'wasi'],
  paused: false, output: '', stack: [], variables: [], watches: [],
  problems: [], outline: [], searchResults: [], status: '正在载入编辑器',
  stopReason: '', activeFile: 'main.lua', files: [], breakpoints: [],
  selectedFrame: 0, keybindings: DEFAULT_KEYBINDINGS
};

export class LuaWorkbench extends LitElement {
  static properties = {
    mode: { type: String, reflect: true },
    revision: { state: true },
    sidePanel: { state: true },
    bottomPanel: { state: true },
    sidebarOpen: { state: true },
    editingBreakpoint: { state: true },
    fileDialog: { state: true },
    searchQuery: { state: true },
    replaceValue: { state: true },
    keybindingSettings: { state: true },
    keybindingDraft: { state: true },
    recordingCommand: { state: true },
    settingsError: { state: true }
  };

  createRenderRoot() { return this; }

  /** @private @type {(value: LuaWorkbench|PromiseLike<LuaWorkbench>) => void} */
  resolveReady;
  /** @private @type {(reason?: any) => void} */
  rejectReady;

  constructor() {
    super();
    /** @type {import('./controller.js').LuaWorkbenchController | undefined} */
    this.controller = undefined;
    /** @type {import('./controller.js').LuaWorkbenchOptions} Options assigned
     * by mountLuaWorkbench or a host before connection. */
    this.workbenchOptions = {};
    /** @type {Promise<LuaWorkbench>} Resolves after Monaco, the language
     * service and the selected runtime are ready. */
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.mode = this.getAttribute('mode') ?? 'debugger';
    this.revision = 0;
    this.sidePanel = this.mode === 'debugger' ? 'debug' : 'files';
    this.bottomPanel = 'output';
    this.sidebarOpen = this.mode === 'debugger';
    this.editingBreakpoint = null;
    this.fileDialog = null;
    this.searchQuery = '';
    this.replaceValue = '';
    this.searchOptions = { matchCase: false, wholeWord: false, regex: false };
    this.searchError = '';
    this.keybindingSettings = false;
    this.keybindingDraft = null;
    this.recordingCommand = '';
    this.settingsError = '';
    this.debugScopeOpen = { locals: true, upvalues: true, globals: false };
    this.disposed = false;
    this.detachPluginHost = null;
  }

  get state() { return this.controller?.snapshot() ?? { ...EMPTY_STATE, mode: this.mode }; }
  get runtime() { return this.controller?.runtime; }
  get model() { return this.controller?.model; }
  get editor() { return this.controller?.editor; }
  get breakpoints() { return this.controller?.breakpoints ?? new Map(); }
  get backend() { return this.controller?.backend ?? 'emscripten'; }
  get profile() { return this.controller?.profile ?? 'safe'; }
  get running() { return this.controller?.running ?? false; }
  get paused() { return this.controller?.paused ?? false; }
  get output() { return this.controller?.output ?? ''; }

  get licenseUrl() {
    const configured = this.workbenchOptions?.licenseUrl ??
      this.getAttribute('license-url') ?? './licenses.html';
    return new URL(configured, document.baseURI).href;
  }

  async firstUpdated() {
    try {
      const supplied = this.workbenchOptions ?? {};
      this.controller ??= createLuaWorkbenchController({
        ...supplied,
        mode: /** @type {'playground'|'debugger'} */ (this.mode),
        backend: /** @type {'emscripten'|'wasi'} */ (
          supplied.backend === 'wasi' || this.getAttribute('backend') === 'wasi'
            ? 'wasi' : 'emscripten'),
        profile: /** @type {'safe'|'trusted'} */ (
          supplied.profile === 'trusted' || this.getAttribute('profile') === 'trusted'
            ? 'trusted' : 'safe'),
        assetBaseUrl: supplied.assetBaseUrl ??
          this.getAttribute('asset-base-url') ?? undefined,
        storageKey: supplied.storageKey ??
          this.getAttribute('storage-key') ?? this.mode
      });
      this.controller.addEventListener('statechange', event => {
        this.revision++;
        this.dispatchEvent(new CustomEvent('lua-statechange', {
          bubbles: true, composed: true, detail: event.detail
        }));
      });
      this.controller.addEventListener('runtimechange', event =>
        this.dispatchEvent(new CustomEvent('lua-runtimechange', {
          bubbles: true, composed: true, detail: event.detail
        })));
      this.controller.addEventListener('breakpointedit', event => {
        this.editingBreakpoint = event.detail.point;
        this.dispatchEvent(new CustomEvent('lua-breakpointedit', {
          bubbles: true, composed: true, detail: event.detail
        }));
      });
      await this.controller.initialize(this.querySelector('[data-lua-editor]'));
      this.detachPluginHost = await this.controller.attachPluginHost(this, this);
      this.resolveReady(this);
    } catch (error) {
      this.rejectReady(error);
      throw error;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (!this.hasAttribute('preserve-on-disconnect')) this.dispose();
  }

  updated() {
    for (const outlet of this.querySelectorAll('lua-plugin-outlet'))
      /** @type {import('./plugin-outlet.js').LuaPluginOutlet} */ (outlet).update();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.detachPluginHost?.();
    this.controller?.dispose();
    this.dispatchEvent(new CustomEvent('lua-dispose', {
      bubbles: true, composed: true, detail: { controller: this.controller }
    }));
  }

  invoke(name, ...args) {
    return Promise.resolve(this.controller?.[name](...args)).catch(() => null);
  }

  execute() { return this.invoke('execute'); }
  resume(method = 'continue') { return this.invoke('resume', method); }
  stop() { return this.invoke('stop'); }
  pauseExecution() { return this.invoke('pauseExecution'); }
  runToCursor() { return this.invoke('runToCursor'); }
  async pickHostDirectory() {
    try { return await this.controller?.pickHostDirectory(); }
    catch (error) {
      if (error?.name === 'AbortError') return null;
      this.controller.status = `文件夹操作失败：${error?.message ?? error}`;
      this.controller.changed('host-directory-error');
      return null;
    }
  }
  toggleBreakpoint(line) { return this.controller?.toggleBreakpoint(line); }
  renderBreakpoints() { return this.controller?.renderBreakpoints(); }
  refreshDebug(frame = 0) { return this.invoke('refreshDebug', frame); }
  getDiagnostics() {
    return this.model
      ? monaco.editor.getModelMarkers({ resource: this.model.uri }) : [];
  }
  createDapAdapter() { return createLuaDapAdapter(this.runtime); }
  /** @param {string} name
   * @param {import('../sdk/capability-registry.js').CapabilityRegistration} registration */
  registerCapability(name, registration) {
    return this.controller?.registerCapability(name, registration);
  }
  /** @param {string} namespace
   * @param {import('../sdk/capability-registry.js').CapabilityGroupMap} registrations
   * @param {{moduleName?: string|false, replace?: boolean}} [options] */
  registerCapabilityGroup(namespace, registrations, options) {
    return this.controller?.registerCapabilityGroup(namespace, registrations, options);
  }
  /** @param {{prefix?: string, includeInternal?: boolean}} [options] */
  listCapabilities(options = {}) {
    return this.controller?.listCapabilities(options) ?? [];
  }

  setTheme(name) { return this.controller?.setTheme(name); }

  pluginComponent(id, fallback) {
    const component = this.controller?.getComponent(id);
    if (component === false) return nothing;
    if (component) return html`<lua-plugin-outlet
      mount-key=${`component:${id}`}></lua-plugin-outlet>`;
    return fallback;
  }

  pluginZone(zone) {
    return this.controller?.getContributions(zone, this.state).map(item => html`
      <lua-plugin-outlet mount-key=${`contribution:${item.key}`}></lua-plugin-outlet>
    `) ?? nothing;
  }

  switchRuntime(event) {
    return this.invoke('switchOption', event.target.name, event.target.value);
  }

  runEditorCommand(command) {
    this.controller?.command(command);
  }

  shortcut(command) {
    return displayKeybinding(this.state.keybindings?.[command] ?? '');
  }

  async saveKeybindings(event) {
    event.preventDefault();
    try {
      await this.controller.setKeybindings(this.keybindingDraft ?? {});
      this.closeKeybindingSettings();
    } catch (error) {
      this.settingsError = error.message;
    }
  }

  async resetKeybindings() {
    await this.controller.resetKeybindings();
    this.closeKeybindingSettings();
  }

  openKeybindingSettings() {
    this.keybindingDraft = { ...this.state.keybindings };
    this.recordingCommand = '';
    this.settingsError = '';
    this.keybindingSettings = true;
  }

  closeKeybindingSettings() {
    this.keybindingSettings = false;
    this.keybindingDraft = null;
    this.recordingCommand = '';
    this.settingsError = '';
  }

  startKeybindingRecording(command) {
    this.recordingCommand = command;
    this.settingsError = '';
  }

  recordKeybinding(command, event) {
    if (this.recordingCommand !== command) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    if (event.key === 'Escape') {
      this.recordingCommand = '';
      return;
    }
    const binding = keyboardEventToBinding(event);
    if (!binding) return;
    this.keybindingDraft = { ...this.keybindingDraft, [command]: binding };
    this.recordingCommand = '';
  }

  resetKeybinding(command) {
    this.keybindingDraft = {
      ...this.keybindingDraft,
      [command]: DEFAULT_KEYBINDINGS[command] ?? ''
    };
    this.recordingCommand = '';
    this.settingsError = '';
  }

  clearKeybinding(command) {
    this.keybindingDraft = { ...this.keybindingDraft, [command]: '' };
    this.recordingCommand = '';
    this.settingsError = '';
  }

  setSidePanel(panel) {
    this.sidePanel = panel;
    this.sidebarOpen = true;
  }

  setBottomPanel(panel) {
    this.bottomPanel = panel;
  }

  async openProblem(marker) {
    this.editor.setPosition({
      lineNumber: marker.startLineNumber, column: marker.startColumn
    });
    this.editor.revealPositionInCenter({
      lineNumber: marker.startLineNumber, column: marker.startColumn
    });
    this.editor.focus();
  }

  async openStackFrame(frame) {
    const source = String(frame.source ?? '').replace(/^[@=]/u, '');
    if (source && this.controller.files.has(source))
      await this.controller.openFile(source, {
        lineNumber: Number(frame.line) || 1,
        column: Number(frame.column) || 1
      });
    else if (frame.line) {
      this.editor.setPosition({ lineNumber: Number(frame.line), column: 1 });
      this.editor.revealLineInCenter(Number(frame.line));
    }
    await this.refreshDebug(frame.id);
  }

  async openOutline(symbol) {
    const file = this.state.files.find(item => item.uri === symbol.uri)?.name ??
      this.state.activeFile;
    await this.controller.openLocation(file,
      symbol.range.startLineNumber, symbol.range.startColumn);
  }

  async openSearchResult(result) {
    await this.controller.openLocation(result.file, result.line, result.column);
  }

  async searchWorkspace(event) {
    if (event) this.searchQuery = event.target.value;
    try {
      await this.controller.searchWorkspace(this.searchQuery, this.searchOptions);
      this.searchError = '';
    } catch (error) {
      this.searchError = error.message;
      this.requestUpdate();
    }
  }

  async replaceWorkspace() {
    try {
      await this.controller.replaceWorkspace(
        this.searchQuery, this.replaceValue, this.searchOptions);
      this.searchError = '';
    } catch (error) {
      this.searchError = error.message;
      this.requestUpdate();
    }
  }

  async toggleSearchOption(name) {
    this.searchOptions = { ...this.searchOptions, [name]: !this.searchOptions[name] };
    await this.searchWorkspace();
  }

  async addWatch(event) {
    if (event.key !== 'Enter' || !event.target.value.trim()) return;
    const value = event.target.value;
    event.target.value = '';
    await this.controller.addWatch(value);
  }

  async evaluateConsole(event) {
    if (event.key !== 'Enter' || !event.target.value.trim() || !this.paused) return;
    const value = event.target.value;
    event.target.value = '';
    await this.invoke('evaluate', value);
  }

  editVariable(variable) {
    this.fileDialog = { type: 'variable', variable, value: variable.value };
  }

  async submitVariable(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await this.controller.setVariable(
        this.fileDialog.variable, String(data.get('value') ?? ''));
      this.fileDialog = null;
    } catch (error) {
      this.fileDialog = { ...this.fileDialog, error: error.message };
      this.requestUpdate();
    }
  }

  openFileDialog(type, file) {
    this.fileDialog = {
      type,
      file,
      value: type === 'rename' ? file.name : 'module.lua'
    };
  }

  async submitFileDialog(event) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name'));
    try {
      if (this.fileDialog.type === 'new') await this.controller.addFile(name, '-- ' + name + '\n');
      else await this.controller.renameFile(this.fileDialog.file.name, name);
      this.fileDialog = null;
    } catch (error) {
      this.fileDialog = { ...this.fileDialog, error: error.message };
    }
  }

  async saveBreakpoint(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await this.controller.updateBreakpoint(this.editingBreakpoint.line, {
      enabled: data.get('enabled') === 'on',
      condition: String(data.get('condition') ?? '').trim(),
      hitCondition: String(data.get('hitCondition') ?? '').trim(),
      logMessage: String(data.get('logMessage') ?? '').trim()
    });
    this.editingBreakpoint = null;
  }

  async deleteBreakpoint() {
    await this.controller.removeBreakpoint(this.editingBreakpoint.line);
    this.editingBreakpoint = null;
  }

  importFile() {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.lua,text/x-lua,text/plain';
    picker.multiple = true;
    picker.onchange = async () => {
      for (const file of picker.files ?? []) {
        const existing = this.controller.files.get(file.name);
        if (existing) existing.model.setValue(await file.text());
        else await this.controller.addFile(file.name, await file.text());
      }
    };
    picker.click();
  }

  exportFile() {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(
      [this.model.getValue()], { type: 'text/x-lua;charset=utf-8' }));
    link.download = this.state.activeFile;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  debugSection(title, rows, empty, actions = /** @type {any} */ (nothing)) {
    return html`
      <section class="debug-section">
        <div class="debug-heading"><span>${title}</span>${actions}</div>
        <div class="debug-list">
          ${rows.length ? rows : html`<div class="empty">${empty}</div>`}
        </div>
      </section>
    `;
  }

  renderVariableScopes(state) {
    const scopes = [
      ['locals', '局部变量'], ['upvalues', 'Upvalue'], ['globals', '全局变量']
    ];
    return html`<section class="debug-section variable-scopes">
      <div class="debug-heading"><span>变量</span></div>
      ${scopes.map(([key, label]) => {
        const values = state.variables.filter(variable => variable.scopeKind === key);
        const open = this.debugScopeOpen[key];
        return html`<section class="variable-scope">
          <button class="scope-heading" aria-expanded=${open}
            @click=${() => {
              this.debugScopeOpen = { ...this.debugScopeOpen, [key]: !open };
              this.requestUpdate();
            }}>
            <span>${open ? '▾' : '▸'} ${label}</span><span>${values.length}</span>
          </button>
          ${open ? html`<div class="debug-list">
            ${values.length ? values.map(variable => html`
              <div class="debug-row variable-row"
                style=${`--depth:${variable.depth ?? 0}`}>
                <button class="variable-toggle"
                  aria-label=${variable.variablesReference
                    ? `${variable.expanded ? '收起' : '展开'}变量 ${variable.name}`
                    : `变量 ${variable.name} 没有子项`}
                  aria-expanded=${variable.variablesReference
                    ? String(Boolean(variable.expanded)) : nothing}
                  ?disabled=${!variable.variablesReference}
                  @click=${() => this.controller.expandVariable(variable)}>
                  ${variable.variablesReference ? (variable.expanded ? '▾' : '▸') : '·'}
                </button>
                <span class="variable-name" title=${variable.name}>${variable.name}</span>
                <span class="variable-value" title=${variable.value}>${variable.value}</span>
                <button class="variable-edit" aria-label=${`修改变量 ${variable.name}`}
                  title="修改变量" @click=${() => this.editVariable(variable)}>✎</button>
              </div>`)
              : html`<div class="empty">没有可见${label}</div>`}
          </div>` : nothing}
        </section>`;
      })}
    </section>`;
  }

  renderDebugPanel(state) {
    if (state.mode !== 'debugger') return html`
      <div class="empty panel-empty">调试面板仅在调试版中可用。</div>`;
    return html`
      ${this.debugSection('调用栈', state.stack.map(frame => html`
        <button class=${'debug-row row-button ' +
          (frame.id === state.selectedFrame ? 'active' : '')}
          aria-pressed=${frame.id === state.selectedFrame}
          @click=${() => this.openStackFrame(frame)}>
          <span>${frame.name}</span><span class="value">${frame.line}</span>
        </button>
      `), '运行并暂停后显示调用栈')}
      ${this.renderVariableScopes(state)}
      ${this.debugSection('协程', state.paused ? [html`
        <div class="debug-row"><span>当前 Lua 协程</span><span class="value">已暂停</span></div>
      `] : [], '运行并暂停后显示活动协程')}
      <section class="debug-section">
        <div class="debug-heading"><span>监视</span></div>
        <input class="panel-input" aria-label="添加监视表达式"
          placeholder="输入表达式并按 Enter" @keydown=${this.addWatch}>
        <div class="debug-list">
          ${state.watches.map((watch, index) => html`
            <div class="debug-row">
              <span>${watch.expression}</span>
              <span class="value">${watch.value}</span>
              <button class="icon-button" aria-label="移除监视表达式"
                @click=${() => this.controller.removeWatch(index)}>×</button>
            </div>
          `)}
        </div>
      </section>
      ${this.debugSection('断点', state.breakpoints.map(point => html`
        <div class="breakpoint-row">
          <input type="checkbox" aria-label=${`启用第 ${point.line} 行断点`}
            .checked=${point.enabled !== false}
            @change=${event => this.controller.updateBreakpoint(point.line, {
              enabled: event.target.checked
            })}>
          <button class="debug-row row-button" @click=${() =>
              this.editingBreakpoint = { ...point }}>
            <span>${state.activeFile}:${point.line}</span>
            <span class="value">${point.logMessage ? '日志点' :
              point.condition || point.hitCondition ? '条件' : '断点'}</span>
          </button>
          <button class="icon-button" aria-label=${`删除第 ${point.line} 行断点`}
            @click=${() => this.controller.removeBreakpoint(point.line)}>×</button>
        </div>
      `), '单击装订线添加；右键配置断点', html`
        <button class="link-button" ?disabled=${!state.breakpoints.length}
          @click=${() => this.controller.clearBreakpoints()}>全部移除</button>
      `)}
    `;
  }

  renderDebugSidebar(state) {
    return this.pluginComponent('debugPanel', this.renderDebugPanel(state));
  }

  renderFilesPanel(state) {
    return html`
      <div class="panel-actions">
        <button @click=${() => this.openFileDialog('new')}>＋ 新建</button>
        <button @click=${this.importFile}>导入</button>
        <button @click=${this.exportFile}>导出当前</button>
      </div>
      <div class="file-list">
        ${state.files.map(file => html`
          <div class=${'file-row ' + (file.name === state.activeFile ? 'active' : '')}>
            <button class="file-open" @click=${() => this.controller.openFile(file.name)}>
              <span class="file-icon">Lua</span>
              <span>${file.name}</span>${file.dirty ? html`<span>●</span>` : nothing}
            </button>
            <button class="icon-button" aria-label=${`重命名 ${file.name}`}
              @click=${() => this.openFileDialog('rename', file)}>✎</button>
            <button class="icon-button" aria-label=${`关闭 ${file.name}`}
              ?disabled=${state.files.length === 1}
              @click=${() => this.controller.removeFile(file.name)}>×</button>
          </div>
        `)}
      </div>
    `;
  }

  renderOutlinePanel(state) {
    return html`
      <div class="outline-list">
        ${state.outline.length ? state.outline.map(symbol => html`
          <button class="outline-row" @click=${() => this.openOutline(symbol)}>
            <span class=${'symbol-kind ' + symbol.kind}>${symbol.kind === 'function' ? 'ƒ' : '◆'}</span>
            <span>${symbol.name}</span>
            <span class="line-number">${symbol.range.startLineNumber}</span>
          </button>
        `) : html`<div class="empty">当前文件没有可索引符号。</div>`}
      </div>
    `;
  }

  renderSidebar(state) {
    if (!this.sidebarOpen) return nothing;
    return html`
      <aside class="sidebar" aria-label="工作台侧栏">
        <div class="side-tabs" role="tablist" aria-label="侧栏面板">
          ${state.mode === 'debugger' ? html`
            <button role="tab" aria-selected=${this.sidePanel === 'debug'}
              class=${this.sidePanel === 'debug' ? 'active' : ''}
              @click=${() => this.setSidePanel('debug')}>调试</button>` : nothing}
          <button role="tab" aria-selected=${this.sidePanel === 'files'}
            class=${this.sidePanel === 'files' ? 'active' : ''}
            @click=${() => this.setSidePanel('files')}>文件</button>
          <button role="tab" aria-selected=${this.sidePanel === 'outline'}
            class=${this.sidePanel === 'outline' ? 'active' : ''}
            @click=${() => this.setSidePanel('outline')}>大纲</button>
          <span class="spacer"></span>
          <button class="icon-button" aria-label="关闭侧栏"
            @click=${() => { this.sidebarOpen = false; }}>×</button>
        </div>
        <div class="side-content">
          ${this.sidePanel === 'debug'
            ? this.renderDebugSidebar(state)
            : this.sidePanel === 'files'
              ? this.pluginComponent('filesPanel', this.renderFilesPanel(state))
              : this.pluginComponent('outlinePanel', this.renderOutlinePanel(state))}
          ${this.pluginZone('sidebar')}
        </div>
      </aside>
    `;
  }

  renderBottom(state) {
    return html`
      <section class="bottom-panel">
        <div class="panel-tabs" role="tablist" aria-label="底部面板">
          <button role="tab" class=${this.bottomPanel === 'output' ? 'active' : ''}
            aria-selected=${this.bottomPanel === 'output'}
            @click=${() => this.setBottomPanel('output')}>
            ${state.mode === 'debugger' ? '调试控制台' : '输出'}
          </button>
          <button role="tab" class=${this.bottomPanel === 'problems' ? 'active' : ''}
            aria-selected=${this.bottomPanel === 'problems'}
            @click=${() => this.setBottomPanel('problems')}>
            问题 <span class="count">${state.problems.length}</span>
          </button>
          <button role="tab" class=${this.bottomPanel === 'search' ? 'active' : ''}
            aria-selected=${this.bottomPanel === 'search'}
            @click=${() => this.setBottomPanel('search')}>
            工作区搜索 <span class="count">${state.searchResults.length}</span>
          </button>
          <span class="spacer"></span>
          ${this.bottomPanel === 'output' ? html`
            <button class="link-button" @click=${() => this.controller.clearOutput()}>清空</button>` : nothing}
        </div>
        ${this.bottomPanel === 'output' ? this.pluginComponent('debugConsole', html`
          <div class="output-content">
            <pre class="console" aria-live="polite">${state.output || '运行 Lua 代码后，输出将显示在这里。'}</pre>
            ${state.mode === 'debugger' ? html`
              <input class="console-input" ?disabled=${!state.paused}
                aria-label="调试控制台表达式"
                placeholder="暂停时输入表达式并按 Enter 求值"
                @keydown=${this.evaluateConsole}>` : nothing}
          </div>`) : nothing}
        ${this.bottomPanel === 'problems' ? this.pluginComponent('problemsPanel', html`
          <div class="problem-list">
            ${state.problems.length ? state.problems.map(marker => html`
              <button class="problem-row" @click=${() => this.openProblem(marker)}>
                <span class=${marker.severity === 8 ? 'problem-error' : 'problem-warning'}>
                  ${marker.severity === 8 ? '●' : '▲'}
                </span>
                <span>${marker.message}</span>
                <span class="problem-source">${marker.source ?? 'Lua'} · ${marker.startLineNumber}:${marker.startColumn}</span>
              </button>
            `) : html`<div class="empty">当前文件没有问题。</div>`}
          </div>`) : nothing}
        ${this.bottomPanel === 'search' ? this.pluginComponent('searchPanel', html`
          <div class="workspace-search">
            <div class="search-controls">
              <input aria-label="工作区搜索" placeholder="在所有 Lua 文件中搜索"
                .value=${this.searchQuery}
                @input=${this.searchWorkspace}>
              <div class="search-flags" aria-label="搜索选项">
                <button aria-label="区分大小写" aria-pressed=${this.searchOptions.matchCase}
                  @click=${() => this.toggleSearchOption('matchCase')}>Aa</button>
                <button aria-label="全字匹配" aria-pressed=${this.searchOptions.wholeWord}
                  @click=${() => this.toggleSearchOption('wholeWord')}>ab</button>
                <button aria-label="使用正则表达式" aria-pressed=${this.searchOptions.regex}
                  @click=${() => this.toggleSearchOption('regex')}>.*</button>
              </div>
              <input aria-label="工作区替换" placeholder="替换为"
                .value=${this.replaceValue}
                @input=${event => { this.replaceValue = event.target.value; }}>
              <button ?disabled=${!this.searchQuery || !state.searchResults.length}
                @click=${this.replaceWorkspace}>全部替换</button>
            </div>
            ${this.searchError ? html`<div class="search-error" role="alert">${this.searchError}</div>` : nothing}
            <div class="search-results">
              ${state.searchResults.map(result => html`
                <button class="search-row" @click=${() => this.openSearchResult(result)}>
                  <span>${result.file}:${result.line}</span><code>${result.preview}</code>
                </button>
              `)}
            </div>
          </div>`) : nothing}
        ${this.pluginZone('bottom')}
      </section>
    `;
  }

  renderBreakpointDialog() {
    const point = this.editingBreakpoint;
    if (!point) return nothing;
    return html`
      <div class="modal-backdrop" @mousedown=${event => {
        if (event.target === event.currentTarget) this.editingBreakpoint = null;
      }}>
        <section class="modal" role="dialog" aria-modal="true"
          aria-labelledby="breakpoint-title">
          <form @submit=${this.saveBreakpoint}>
            <header><h2 id="breakpoint-title">第 ${point.line} 行断点</h2>
              <button type="button" class="icon-button" aria-label="关闭"
                @click=${() => { this.editingBreakpoint = null; }}>×</button></header>
            <label class="check-row"><input name="enabled" type="checkbox"
              .checked=${point.enabled !== false}>启用断点</label>
            <label>条件表达式
              <input name="condition" .value=${point.condition ?? ''}
                placeholder="例如：i == 5"></label>
            <label>命中条件
              <input name="hitCondition" .value=${point.hitCondition ?? ''}
                placeholder="N、>=N 或 %N"></label>
            <label>日志消息（填写后成为日志点）
              <input name="logMessage" .value=${point.logMessage ?? ''}
                placeholder="例如：i={i}, value={value}"></label>
            <footer>
              <button type="button" class="danger" @click=${this.deleteBreakpoint}>删除</button>
              <span class="spacer"></span>
              <button type="button" @click=${() => { this.editingBreakpoint = null; }}>取消</button>
              <button class="primary" type="submit">保存断点</button>
            </footer>
          </form>
        </section>
      </div>`;
  }

  renderFileDialog() {
    if (!this.fileDialog) return nothing;
    if (this.fileDialog.type === 'variable') return html`
      <div class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="variable-title">
          <form @submit=${this.submitVariable}>
            <header><h2 id="variable-title">修改 ${this.fileDialog.variable.name}</h2></header>
            <label>Lua 表达式<input name="value" .value=${this.fileDialog.value}></label>
            ${this.fileDialog.error
              ? html`<div class="form-error" role="alert">${this.fileDialog.error}</div>`
              : nothing}
            <footer><span class="spacer"></span>
              <button type="button" @click=${() => { this.fileDialog = null; }}>取消</button>
              <button type="submit" class="primary">应用</button></footer>
          </form>
        </section>
      </div>`;
    const title = this.fileDialog.type === 'new' ? '新建 Lua 文件' : '重命名文件';
    return html`
      <div class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="file-title">
          <form @submit=${this.submitFileDialog}>
            <header><h2 id="file-title">${title}</h2></header>
            <label>工作区路径<input name="name" .value=${this.fileDialog.value}
              required pattern=".*\\.lua" placeholder="modules/example.lua"></label>
            ${this.fileDialog.error ? html`<div class="form-error" role="alert">${this.fileDialog.error}</div>` : nothing}
            <footer><span class="spacer"></span>
              <button type="button" @click=${() => { this.fileDialog = null; }}>取消</button>
              <button type="submit" class="primary">确认</button></footer>
          </form>
        </section>
      </div>`;
  }

  renderKeybindingSettings() {
    if (!this.keybindingSettings) return nothing;
    const bindings = this.keybindingDraft ?? this.state.keybindings ?? DEFAULT_KEYBINDINGS;
    return html`
      <div class="modal-backdrop" @mousedown=${event => {
        if (event.target === event.currentTarget) this.closeKeybindingSettings();
      }}>
        <section class="modal keybinding-modal" role="dialog" aria-modal="true"
          aria-labelledby="keybinding-title">
          <form @submit=${this.saveKeybindings}>
            <header><h2 id="keybinding-title">按键设置</h2>
              <button type="button" class="icon-button" aria-label="关闭"
                @click=${this.closeKeybindingSettings}>×</button></header>
            <p class="settings-help">点击一个按键框，再按下所需组合。只按修饰键时会继续等待；Escape 取消录制。重复快捷键会被拒绝。</p>
            <p class="recording-status" aria-live="polite">${this.recordingCommand
              ? `正在录制“${COMMAND_LABELS[this.recordingCommand]}”：请按下按键组合`
              : '当前未录制快捷键'}</p>
            <div class="keybinding-list">
              ${Object.entries(COMMAND_LABELS).map(([command, label]) => html`
                <div class="keybinding-row">
                  <span class="keybinding-label">${label}</span>
                  <button type="button" class="keybinding-record"
                    aria-label=${`录制“${label}”快捷键`}
                    aria-pressed=${this.recordingCommand === command}
                    @click=${() => this.startKeybindingRecording(command)}
                    @keydown=${event => this.recordKeybinding(command, event)}>
                    ${this.recordingCommand === command
                      ? html`<span class="recording-dot"></span>请按键…`
                      : bindings[command]
                        ? html`<kbd>${displayKeybinding(bindings[command])}</kbd>`
                        : html`<span class="unbound">未绑定</span>`}
                  </button>
                  <button type="button" class="keybinding-row-action"
                    aria-label=${`恢复“${label}”默认快捷键`}
                    title=${`默认：${DEFAULT_KEYBINDINGS[command] ?? '未绑定'}`}
                    ?disabled=${bindings[command] === DEFAULT_KEYBINDINGS[command]}
                    @click=${() => this.resetKeybinding(command)}>默认</button>
                  <button type="button" class="keybinding-row-action"
                    aria-label=${`清除“${label}”快捷键`}
                    ?disabled=${!bindings[command]}
                    @click=${() => this.clearKeybinding(command)}>清除</button>
                </div>`)}
            </div>
            ${this.settingsError ? html`<div class="form-error" role="alert">${this.settingsError}</div>` : nothing}
            <footer>
              <button type="button" @click=${this.resetKeybindings}>全部恢复默认</button>
              <span class="spacer"></span>
              <button type="button" @click=${this.closeKeybindingSettings}>取消</button>
              <button class="primary" type="submit">保存按键</button>
            </footer>
          </form>
        </section>
      </div>`;
  }

  render() {
    this.revision;
    const state = this.state;
    const debugging = state.mode === 'debugger';
    return html`
      <div class="app-shell">
        ${this.pluginComponent('titlebar', html`<header class="titlebar">
          <div class="brand"><div class="logo">L55</div><span>Wasm Lua</span></div>
          <select name="backend" aria-label="运行后端" .value=${state.backend}
            @change=${this.switchRuntime}>
            ${state.availableBackends.includes('emscripten')
              ? html`<option value="emscripten">Emscripten</option>` : nothing}
            ${state.availableBackends.includes('wasi')
              ? html`<option value="wasi">WASI Preview 1</option>` : nothing}
          </select>
          <select name="profile" aria-label="安全配置" .value=${state.profile}
            @change=${this.switchRuntime}>
            <option value="safe">安全档</option><option value="trusted">可信档</option>
          </select>
          ${state.profile === 'trusted' ? html`
            <button aria-label=${state.hostDirectory ? '卸载宿主文件夹' : '打开宿主文件夹'}
              title=${state.hostDirectory ? `已挂载 /host · ${state.hostDirectory}` :
                '选择浏览器授权的宿主文件夹，映射为 /host'}
              @click=${this.pickHostDirectory}>
              ${state.hostDirectory ? '卸载文件夹' : '打开文件夹'}</button>` : nothing}
          <div class="spacer"></div>
          <button class="settings-button" @click=${this.openKeybindingSettings}>
            按键设置</button>
          ${this.pluginZone('titlebar')}
        </header>`)}
        ${this.pluginComponent('toolbar', html`<div class="commandbar" role="toolbar" aria-label="Lua 与编辑器命令">
          <div class="tool-group run-tools">
            <button class="primary" aria-label=${state.paused ? '▶ 继续' : '▶ 运行'}
              ?disabled=${state.paused && state.stopReason === 'exception'}
              @click=${state.paused ? () => this.resume('continue') : this.execute}>
              ${state.paused ? '▶ 继续' : '▶ 运行'} <kbd>${this.shortcut('run')}</kbd></button>
            ${debugging ? html`
              <button ?disabled=${!state.paused} @click=${() => this.resume('stepOver')}>步过 <kbd>${this.shortcut('stepOver')}</kbd></button>
              <button ?disabled=${!state.paused} @click=${() => this.resume('stepIn')}>步入 <kbd>${this.shortcut('stepIn')}</kbd></button>
              <button ?disabled=${!state.paused} @click=${() => this.resume('stepOut')}>步出 <kbd>${this.shortcut('stepOut')}</kbd></button>
              <button aria-label="⇥ 运行到光标" ?disabled=${!state.paused}
                @click=${this.runToCursor}>到光标 <kbd>${this.shortcut('runToCursor')}</kbd></button>
              <button ?disabled=${!state.running || state.paused} @click=${this.pauseExecution}>暂停 <kbd>${this.shortcut('pause')}</kbd></button>
            ` : nothing}
            <button class="danger" ?disabled=${!state.running && !state.paused}
              @click=${this.stop}>■ 停止 <kbd>${this.shortcut('stop')}</kbd></button>
          </div>
          <div class="tool-separator"></div>
          <div class="tool-group editor-tools">
            <button @click=${() => this.runEditorCommand('find')}>查找 <kbd>${this.shortcut('find')}</kbd></button>
            <button @click=${() => this.runEditorCommand('replace')}>替换 <kbd>${this.shortcut('replace')}</kbd></button>
            <button @click=${() => this.runEditorCommand('suggest')}>补全 <kbd>${this.shortcut('suggest')}</kbd></button>
            <button @click=${() => this.runEditorCommand('rename')}>重命名 <kbd>${this.shortcut('rename')}</kbd></button>
            <button @click=${() => this.runEditorCommand('format')}>格式化 <kbd>${this.shortcut('format')}</kbd></button>
            <button @click=${() => this.runEditorCommand('gotoLine')}>跳转行 <kbd>${this.shortcut('gotoLine')}</kbd></button>
            <button @click=${() => this.runEditorCommand('commandPalette')}>命令面板 <kbd>${this.shortcut('commandPalette')}</kbd></button>
          </div>
          <div class="spacer"></div>
          <div class="tool-group view-tools">
            <button aria-pressed=${this.bottomPanel === 'search'}
              @click=${() => this.setBottomPanel('search')}>全局搜索</button>
            <button aria-pressed=${this.sidebarOpen}
              @click=${() => { this.sidebarOpen = !this.sidebarOpen; }}>侧栏</button>
          </div>
          ${this.pluginZone('toolbar')}
        </div>`)}
        <main class=${'main-area ' + (this.sidebarOpen ? 'with-sidebar' : '')}>
          <section class="center-pane">
            ${this.pluginComponent('fileTabs', html`<div class="tabbar" role="tablist" aria-label="打开的 Lua 文件">
              ${state.files.map(file => html`
                <button role="tab" class=${file.name === state.activeFile ? 'tab active' : 'tab'}
                  aria-selected=${file.name === state.activeFile}
                  @click=${() => this.controller.openFile(file.name)}>
                  <span class="dot"></span>${file.name}${file.dirty ? ' ●' : ''}
                </button>
              `)}
              <button class="new-tab" aria-label="新建 Lua 文件"
                @click=${() => this.openFileDialog('new')}>＋</button>
            </div>`)}
            <div class="editor" data-lua-editor aria-label="Lua 5.5 源码编辑器"></div>
            ${this.renderBottom(state)}
          </section>
          ${this.renderSidebar(state)}
        </main>
        ${this.pluginComponent('statusbar', html`<footer class="statusbar">
          <button @click=${() => this.setBottomPanel('problems')}>
            ${state.problems.length ? '●' : '✓'} ${state.problems.length} 个问题</button>
          <span>${state.status}</span>
          <span>${state.cursor ? `${state.cursor.lineNumber}:${state.cursor.column}` : ''}</span>
          <span class="right">${state.activeFile} · ${state.backend.toUpperCase()} ·
            ${state.profile === 'safe' ? '安全档' : '可信档'} · Lua 5.5.1 ·
            <a href=${this.licenseUrl}>许可证</a></span>
          ${this.pluginZone('statusbar')}
        </footer>`)}
      </div>
      ${this.pluginComponent('breakpointDialog', this.renderBreakpointDialog())}
      ${this.pluginComponent('fileDialog', this.renderFileDialog())}
      ${this.pluginComponent('keybindingSettings', this.renderKeybindingSettings())}
    `;
  }
}
