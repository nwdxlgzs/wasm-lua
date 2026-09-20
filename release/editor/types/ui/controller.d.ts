import { CapabilityGroupHandle } from '../../../runtime/types/index.js';
import { monaco } from '../language/monaco.js';
export type WorkbenchMode = 'playground' | 'debugger';
export type WorkbenchBackend = 'emscripten' | 'wasi';
export type WorkbenchProfile = 'safe' | 'trusted' | 'full-access';
export type WorkbenchDefinition = {
    uri: string;
    source: string;
};
export type WorkbenchDisposable = void | (() => void) | {
    dispose(): void;
};
export type WorkbenchComponentId = 'titlebar' | 'toolbar' | 'fileTabs' | 'debugPanel' | 'filesPanel' | 'outlinePanel' | 'debugConsole' | 'problemsPanel' | 'searchPanel' | 'breakpointDialog' | 'fileDialog' | 'keybindingSettings' | 'statusbar';
export type WorkbenchPluginZone = 'titlebar' | 'toolbar' | 'sidebar' | 'bottom' | 'statusbar';
export type LuaWorkbenchPluginContext = {
    controller: LuaWorkbenchController;
    monaco: typeof import('monaco-editor');
    plugin: LuaWorkbenchPlugin;
    state: Record<string, any>;
    editor?: import('monaco-editor').editor.IStandaloneCodeEditor;
    runtime?: import('../../../runtime/types/runtime.js').LuaRuntime;
    host?: HTMLElement;
    shell?: HTMLElement;
};
export type WorkbenchContribution = {
    id: string;
    zone: WorkbenchPluginZone;
    order?: number;
    when?: (state: Record<string, any>) => boolean;
    mount: (host: HTMLElement, context: LuaWorkbenchPluginContext) => Node | WorkbenchDisposable;
    update?: (host: HTMLElement, context: LuaWorkbenchPluginContext) => void;
};
export type WorkbenchComponent = {
    mount: (host: HTMLElement, context: LuaWorkbenchPluginContext) => Node | WorkbenchDisposable;
    update?: (host: HTMLElement, context: LuaWorkbenchPluginContext) => void;
};
export type LuaWorkbenchPlugin = {
    id: string;
    themes?: Array<{
        name: string;
        data: import('monaco-editor').editor.IStandaloneThemeData;
    }>;
    theme?: string;
    editorOptions?: import('monaco-editor').editor.IStandaloneEditorConstructionOptions;
    editorFactory?: (host: HTMLElement, options: import('monaco-editor').editor.IStandaloneEditorConstructionOptions, context: LuaWorkbenchPluginContext) => import('monaco-editor').editor.IStandaloneCodeEditor | Promise<import('monaco-editor').editor.IStandaloneCodeEditor>;
    commands?: Record<string, (context: LuaWorkbenchPluginContext, argument?: any) => any>;
    components?: Partial<Record<WorkbenchComponentId, WorkbenchComponent | false>>;
    contributions?: WorkbenchContribution[];
    setup?: (context: LuaWorkbenchPluginContext & {
        registerCommand: (id: string, handler: Function) => WorkbenchDisposable;
        replaceComponent: (id: WorkbenchComponentId, component: WorkbenchComponent | false) => WorkbenchDisposable;
        contribute: (contribution: WorkbenchContribution) => WorkbenchDisposable;
        registerCapability: LuaWorkbenchController['registerCapability'];
    }) => WorkbenchDisposable | Promise<WorkbenchDisposable>;
    editorReady?: (context: LuaWorkbenchPluginContext) => WorkbenchDisposable | Promise<WorkbenchDisposable>;
    runtimeReady?: (context: LuaWorkbenchPluginContext) => WorkbenchDisposable | Promise<WorkbenchDisposable>;
    hostReady?: (context: LuaWorkbenchPluginContext & {
        host: HTMLElement;
    }) => WorkbenchDisposable | Promise<WorkbenchDisposable>;
    dispose?: (context: LuaWorkbenchPluginContext) => void;
};
export type LuaWorkbenchOptions = {
    mode?: WorkbenchMode;
    backend?: WorkbenchBackend;
    profile?: WorkbenchProfile;
    assetBaseUrl?: string;
    licenseUrl?: string;
    storageKey?: string;
    environment?: Record<string, string>;
    backends?: WorkbenchBackend[];
    theme?: string | {
        name: string;
        data: import('monaco-editor').editor.IStandaloneThemeData;
    };
    editorOptions?: import('monaco-editor').editor.IStandaloneEditorConstructionOptions;
    editorFactory?: LuaWorkbenchPlugin['editorFactory'];
    plugins?: LuaWorkbenchPlugin[];
    components?: Partial<Record<WorkbenchComponentId, WorkbenchComponent | false>>;
    keybindings?: Record<string, string | null | undefined>;
    workspaceId?: string;
    capabilities?: Record<string, import('../../../runtime/types/capability-registry.js').CapabilityRegistration>;
    capabilityGroups?: Array<{
        namespace: string;
        capabilities: import('../../../runtime/types/capability-registry.js').CapabilityGroupMap;
        options?: {
            moduleName?: string | false;
            replace?: boolean;
        };
    }>;
    modules?: Record<string, string | ((...args: any[]) => any | Promise<any>)>;
    definitions?: WorkbenchDefinition[];
};
export type WorkbenchBreakpoint = import('../../../runtime/types/runtime.js').LuaBreakpoint & {
    file?: string;
    enabled?: boolean;
};
export type WorkspaceFile = {
    name: string;
    uri: string;
    model: import('monaco-editor').editor.ITextModel;
    readonly: boolean;
    dirty: boolean;
    disposable?: import('monaco-editor').IDisposable;
};
export type WorkspaceSearchOptions = {
    regex?: boolean;
    matchCase?: boolean;
    wholeWord?: boolean;
};
export type WorkspaceSearchResult = {
    file: string;
    line: number;
    column: number;
    range: import('monaco-editor').IRange;
    preview: string;
};
export type WorkbenchCommand = 'run' | 'stop' | 'pause' | 'continue' | 'stepOver' | 'stepIn' | 'stepOut' | 'runToCursor' | 'find' | 'replace' | 'commandPalette' | 'outline' | 'format' | 'suggest' | 'rename' | 'references' | 'gotoLine' | 'nextProblem' | 'previousProblem' | 'toggleBreakpoint' | 'clearBreakpoints' | 'clearOutput' | 'pickHostDirectory' | 'addWatch' | 'evaluate' | 'openFile' | 'removeFile' | 'newFile' | 'searchWorkspace' | 'replaceWorkspace' | 'setKeybindings' | 'resetKeybindings';
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
 *   runtime?: import('../../../runtime/types/runtime.js').LuaRuntime, host?: HTMLElement,
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
 *   capabilities?: Record<string, import('../../../runtime/types/capability-registry.js').CapabilityRegistration>,
 *   capabilityGroups?: Array<{namespace: string,
 *     capabilities: import('../../../runtime/types/capability-registry.js').CapabilityGroupMap,
 *     options?: {moduleName?: string|false, replace?: boolean}}>,
 *   modules?: Record<string, string|((...args: any[]) => any|Promise<any>)>,
 *   definitions?: WorkbenchDefinition[]}} LuaWorkbenchOptions
 * @typedef {import('../../../runtime/types/runtime.js').LuaBreakpoint &
 *   {file?: string, enabled?: boolean}} WorkbenchBreakpoint
 * @typedef {{name: string, uri: string,
 *   model: import('monaco-editor').editor.ITextModel, readonly: boolean,
 *   dirty: boolean, disposable?: import('monaco-editor').IDisposable}} WorkspaceFile
 * @typedef {{regex?: boolean, matchCase?: boolean, wholeWord?: boolean}} WorkspaceSearchOptions
 * @typedef {{file: string, line: number, column: number,
 *   range: import('monaco-editor').IRange, preview: string}} WorkspaceSearchResult
 * @typedef {'run'|'stop'|'pause'|'continue'|'stepOver'|'stepIn'|'stepOut'|'runToCursor'|'find'|'replace'|'commandPalette'|'outline'|'format'|'suggest'|'rename'|'references'|'gotoLine'|'nextProblem'|'previousProblem'|'toggleBreakpoint'|'clearBreakpoints'|'clearOutput'|'pickHostDirectory'|'addWatch'|'evaluate'|'openFile'|'removeFile'|'newFile'|'searchWorkspace'|'replaceWorkspace'|'setKeybindings'|'resetKeybindings'} WorkbenchCommand
 */
export declare const SAMPLE = "-- Lua 5.5.1 \u00B7 \u6D4F\u89C8\u5668\u53CC\u540E\u7AEF\nglobal print, string, js, math\nglobal \u95EE\u5019\u8BED <const> = \"\u4F60\u597D\uFF0CLua 5.5\uFF01\"\n\nlocal function fibonacci(n)\n  if n < 2 then return n end\n  return fibonacci(n - 1) + fibonacci(n - 2)\nend\n\nprint(\u95EE\u5019\u8BED)\nfor i = 0, 10 do\n  print(string.format(\"fib(%d) = %d\", i, fibonacci(i)))\nend\n\nlocal now = js.call(\"clock.now\")\nprint(\"JavaScript \u65F6\u95F4\uFF1A\", now)\nreturn fibonacci(10), math.maxinteger\n";
export declare const HOST_DEFINITION = "--- JavaScript \u5BBF\u4E3B\u6865\u63A5\uFF08\u53EA\u8BFB\u5B9A\u4E49\uFF09\njs = {}\n--- \u5F02\u6B65\u8C03\u7528\u4E00\u4E2A\u7531\u5BBF\u4E3B\u663E\u5F0F\u6CE8\u518C\u7684\u80FD\u529B\nfunction js.call(capability, ...) end\nhost = {}\nfunction host.version() return \"1.0\" end\n";
/**
 * Headless workbench state plus an attachable Monaco surface. Host pages can
 * bind their own layout to this controller instead of rendering the bundled
 * `<lua-workbench>` shell.
 */
export declare class LuaWorkbenchController extends EventTarget {
    options: LuaWorkbenchOptions;
    mode: string;
    backend: string;
    availableBackends: string[];
    profile: string;
    /** @type {{handle: FileSystemDirectoryHandle, mountPoint: string}|null} */
    hostDirectory: {
        handle: FileSystemDirectoryHandle;
        mountPoint: string;
    } | null;
    assetBaseUrl: string;
    storageKey: string;
    workspaceNamespace: string;
    running: boolean;
    paused: boolean;
    operationActive: boolean;
    output: string;
    stack: any[];
    variables: any[];
    watches: any[];
    problems: any[];
    outline: any[];
    searchResults: any[];
    cursor: monaco.Position;
    selectedFrame: number;
    status: string;
    stopReason: string;
    theme: string;
    keybindings: Record<string, string>;
    /** @type {Map<number, WorkbenchBreakpoint>} */
    breakpoints: Map<number, WorkbenchBreakpoint>;
    /** @type {Map<string, Map<number, WorkbenchBreakpoint>>} */
    breakpointMaps: Map<string, Map<number, WorkbenchBreakpoint>>;
    /** @type {Map<string, WorkspaceFile>} */
    files: Map<string, WorkspaceFile>;
    disposables: any[];
    actionDisposables: any[];
    definitionDisposables: any[];
    runtimeDefinitionDisposables: Map<any, any>;
    pluginCommands: Map<any, any>;
    pluginComponents: Map<string, boolean | {
        mount: (host: HTMLElement, context: LuaWorkbenchPluginContext) => Node | WorkbenchDisposable;
        update?: (host: HTMLElement, context: LuaWorkbenchPluginContext) => void;
        plugin: {
            id: string;
        };
    }>;
    pluginContributions: Map<any, any>;
    pluginDisposables: any[];
    runtimePluginDisposables: any[];
    pluginHostDisposables: Set<any>;
    plugins: LuaWorkbenchPlugin[];
    pluginsInitialized: boolean;
    persistentCapabilities: Map<any, any>;
    persistentCapabilityGroups: Map<any, any>;
    editor: any;
    breakpointDecorations: any;
    currentDecoration: any;
    runtime: import("../../../runtime/types/runtime.js").LuaRuntime;
    decoratedBreakpoints: WorkbenchBreakpoint[];
    activeFile: string;
    model: monaco.editor.ITextModel;
    disposed: boolean;
    /** @param {LuaWorkbenchOptions} [options] */
    constructor(options?: LuaWorkbenchOptions);
    /** @returns {Record<string, any>} */
    snapshot(): Record<string, any>;
    /** @param {LuaWorkbenchPlugin} plugin @param {Record<string, any>} [extra] */
    pluginContext(plugin: LuaWorkbenchPlugin, extra?: Record<string, any>): any;
    trackPluginDisposable(value: any, target?: any[]): any;
    /** @param {string} id @param {Function} handler @param {LuaWorkbenchPlugin} plugin */
    registerPluginCommand(id: string, handler: Function, plugin?: LuaWorkbenchPlugin): () => void;
    /** @param {WorkbenchComponentId} id @param {WorkbenchComponent|false} component
     * @param {LuaWorkbenchPlugin} [plugin] */
    replaceComponent(id: WorkbenchComponentId, component: WorkbenchComponent | false, plugin?: LuaWorkbenchPlugin): () => void;
    /** @param {WorkbenchContribution} contribution @param {LuaWorkbenchPlugin} [plugin] */
    contribute(contribution: WorkbenchContribution, plugin?: LuaWorkbenchPlugin): () => void;
    getComponent(id: any): boolean | {
        mount: (host: HTMLElement, context: LuaWorkbenchPluginContext) => Node | WorkbenchDisposable;
        update?: (host: HTMLElement, context: LuaWorkbenchPluginContext) => void;
        plugin: {
            id: string;
        };
    };
    getContributions(zone: any, state?: Record<string, any>): any[];
    getPluginMount(key: any): any;
    initializePlugins(): Promise<void>;
    setTheme(name: any): void;
    /** Run host integration hooks for the bundled shell or a bind() root. */
    attachPluginHost(host: any, shell?: any): Promise<() => void>;
    changed(reason?: string): void;
    /** @param {string} text @param {string} [category] */
    appendOutput(text: string, category?: string): void;
    /** @param {HTMLElement} editorHost */
    initialize(editorHost: HTMLElement): Promise<this>;
    resolveAvailableBackends(): Promise<void>;
    installEditorBindings(): void;
    installCommandActions(): void;
    getKeybindings(): {
        [x: string]: string;
    };
    /** Recreate Monaco actions with a complete, conflict-checked binding set. */
    setKeybindings(overrides?: {}): Promise<{
        [x: string]: string;
    }>;
    resetKeybindings(): Promise<{
        [x: string]: string;
    }>;
    createRuntime(): Promise<void>;
    syncRuntimeDefinition({ uri, source }: {
        source: any;
        uri: any;
    }): Promise<void>;
    /** Register one host function and replay it after backend/profile switches. */
    /** @param {string} name
     * @param {import('../../../runtime/types/capability-registry.js').CapabilityRegistration} registration */
    registerCapability(name: string, registration: import('../../../runtime/types/capability-registry.js').CapabilityRegistration): () => void;
    /** Register a managed API group which survives runtime reconstruction. */
    /** @param {string} namespace
     * @param {import('../../../runtime/types/capability-registry.js').CapabilityGroupMap} registrations
     * @param {{moduleName?: string|false, replace?: boolean}} [options] */
    registerCapabilityGroup(namespace: string, registrations: import('../../../runtime/types/capability-registry.js').CapabilityGroupMap, options?: {
        moduleName?: string | false;
        replace?: boolean;
    }): CapabilityGroupHandle;
    /** @param {{prefix?: string, includeInternal?: boolean}} [options] */
    listCapabilities(options?: {
        prefix?: string;
        includeInternal?: boolean;
    }): Readonly<import("../../../runtime/types/capability-registry.js").CapabilityMetadata & {
        name: string;
        activeCount: number;
        queuedCount: number;
    }>[];
    /** @param {'backend'|'profile'} name @param {string} value */
    switchOption(name: 'backend' | 'profile', value: string): Promise<void>;
    /** Browser picker must be reached from a direct user click. The handle is
     * replayed after backend switches only while a host-access profile is active. */
    pickHostDirectory(): Promise<void>;
    execute(): Promise<import("../../../runtime/types/runtime.js").LuaExecutionResult>;
    /** @param {'continue'|'stepIn'|'stepOver'|'stepOut'} [method] */
    resume(method?: 'continue' | 'stepIn' | 'stepOver' | 'stepOut'): Promise<import("../../../runtime/types/runtime.js").LuaExecutionResult>;
    stop(): Promise<void>;
    pauseExecution(): Promise<void>;
    runToCursor(): Promise<import("../../../runtime/types/runtime.js").LuaExecutionResult>;
    /** @param {number} line */
    toggleBreakpoint(line: number): Promise<any[]>;
    /** @param {number} line */
    requestBreakpointEditor(line: number): void;
    /** @param {number} line @param {Partial<WorkbenchBreakpoint>} changes */
    updateBreakpoint(line: number, changes: Partial<WorkbenchBreakpoint>): Promise<{
        requestedLine?: number;
        endLine?: number;
        verified?: boolean;
        message?: string;
        source?: string;
        line: number;
        file: string;
        enabled: boolean;
        condition: string;
        hitCondition: string;
        logMessage: string;
        hits: number;
    }>;
    /** @param {number} line */
    removeBreakpoint(line: number): Promise<void>;
    clearBreakpoints(): Promise<void>;
    syncBreakpoints(): Promise<any[]>;
    /** Apply authoritative line-hook relocation without dropping disabled points.
     * @param {WorkbenchBreakpoint[]} points */
    applyRuntimeBreakpoints(points: WorkbenchBreakpoint[]): void;
    renderBreakpoints(): void;
    updateBreakpointLines(): void;
    /** @param {number|null} line */
    highlightLine(line: number | null): void;
    refreshDebug(frame?: number): Promise<void>;
    /** @param {import('../../../runtime/types/runtime.js').LuaDebugVariable &
     *   {frame?: number, scope?: number, scopeKind?: string,
     *    depth?: number, childCount?: number,
     *    expanded?: boolean}} variable */
    expandVariable(variable: import('../../../runtime/types/runtime.js').LuaDebugVariable & {
        frame?: number;
        scope?: number;
        scopeKind?: string;
        depth?: number;
        childCount?: number;
        expanded?: boolean;
    }): Promise<void>;
    /** @param {import('../../../runtime/types/runtime.js').LuaDebugVariable &
     *   {frame?: number, scope?: number}} variable @param {string} value */
    setVariable(variable: import('../../../runtime/types/runtime.js').LuaDebugVariable & {
        frame?: number;
        scope?: number;
    }, value: string): Promise<void>;
    refreshWatches(frame?: number): Promise<void>;
    /** @param {string} expression */
    addWatch(expression: string): Promise<void>;
    removeWatch(index: any): void;
    evaluate(expression: any, frame?: number): Promise<import("../../../runtime/types/runtime.js").LuaDebugVariable[] | {
        error: string;
    }>;
    /** @param {string} rawName @param {string} [source]
     * @param {{activate?: boolean, persist?: boolean}} [options]
     * @returns {Promise<WorkspaceFile>} */
    addFile(rawName: string, source?: string, options?: {
        activate?: boolean;
        persist?: boolean;
    }): Promise<WorkspaceFile>;
    /** @param {string} name @param {import('monaco-editor').IPosition} [position]
     * @returns {Promise<WorkspaceFile>} */
    openFile(name: string, position?: import('monaco-editor').IPosition): Promise<WorkspaceFile>;
    /** @param {string} oldName @param {string} rawNewName */
    renameFile(oldName: string, rawNewName: string): Promise<string>;
    /** @param {string} name
     * @param {{activateFallback?: boolean, persist?: boolean}} [options] */
    removeFile(name: string, options?: {
        activateFallback?: boolean;
        persist?: boolean;
    }): Promise<boolean>;
    persistWorkspace(): Promise<void>;
    refreshProblems(): Promise<any[]>;
    /** Run official Lua text-mode compilation through the public runtime SDK.
     * @param {WorkspaceFile} file
     * @returns {Promise<import('monaco-editor').editor.IMarkerData[]>} */
    refreshCompilerDiagnostics(file: WorkspaceFile): Promise<import('monaco-editor').editor.IMarkerData[]>;
    refreshOutline(): Promise<any[]>;
    /** @param {string} name @param {number} lineNumber @param {number} [column] */
    openLocation(name: string, lineNumber: number, column?: number): Promise<WorkspaceFile>;
    /** @param {string} query @param {WorkspaceSearchOptions} [options]
     * @returns {Promise<WorkspaceSearchResult[]>} */
    searchWorkspace(query: string, options?: WorkspaceSearchOptions): Promise<WorkspaceSearchResult[]>;
    /** @param {string} query @param {string} replacement
     * @param {WorkspaceSearchOptions} [options] @returns {Promise<number>} */
    replaceWorkspace(query: string, replacement: string, options?: WorkspaceSearchOptions): Promise<number>;
    /** @param {string} id */
    runEditorAction(id: string): any;
    /** @param {WorkbenchCommand} name @param {any} [argument] */
    command(name: WorkbenchCommand, argument?: any): any;
    clearOutput(): void;
    dispose(): void;
}
/** @param {LuaWorkbenchOptions} [options] */
export declare function createLuaWorkbenchController(options?: LuaWorkbenchOptions): LuaWorkbenchController;
