import { LitElement, nothing } from 'lit';
import { monaco } from '../language/monaco.js';
export declare class LuaWorkbench extends LitElement {
    /** @type {import('./controller.js').LuaWorkbenchController | undefined} */
    controller: import('./controller.js').LuaWorkbenchController | undefined;
    /** @type {import('./controller.js').LuaWorkbenchOptions} Options assigned
     * by mountLuaWorkbench or a host before connection. */
    workbenchOptions: import('./controller.js').LuaWorkbenchOptions;
    /** @type {Promise<LuaWorkbench>} Resolves after Monaco, the language
     * service and the selected runtime are ready. */
    ready: Promise<LuaWorkbench>;
    mode: string;
    revision: number;
    sidePanel: string;
    bottomPanel: string;
    sidebarOpen: boolean;
    editingBreakpoint: any;
    fileDialog: {
        type: string;
        variable: any;
        value: any;
        file?: undefined;
    } | {
        variable?: undefined;
        type: any;
        file: any;
        value: any;
    };
    searchQuery: string;
    replaceValue: string;
    searchOptions: {
        matchCase: boolean;
        wholeWord: boolean;
        regex: boolean;
    };
    searchError: string;
    keybindingSettings: boolean;
    keybindingDraft: any;
    recordingCommand: string;
    settingsError: string;
    debugScopeOpen: {
        locals: boolean;
        upvalues: boolean;
        globals: boolean;
    };
    disposed: boolean;
    detachPluginHost: () => void;
    static properties: {
        mode: {
            type: StringConstructor;
            reflect: boolean;
        };
        revision: {
            state: boolean;
        };
        sidePanel: {
            state: boolean;
        };
        bottomPanel: {
            state: boolean;
        };
        sidebarOpen: {
            state: boolean;
        };
        editingBreakpoint: {
            state: boolean;
        };
        fileDialog: {
            state: boolean;
        };
        searchQuery: {
            state: boolean;
        };
        replaceValue: {
            state: boolean;
        };
        keybindingSettings: {
            state: boolean;
        };
        keybindingDraft: {
            state: boolean;
        };
        recordingCommand: {
            state: boolean;
        };
        settingsError: {
            state: boolean;
        };
    };
    createRenderRoot(): this;
    /** @private @type {(value: LuaWorkbench|PromiseLike<LuaWorkbench>) => void} */
    private resolveReady;
    /** @private @type {(reason?: any) => void} */
    private rejectReady;
    constructor();
    get state(): Record<string, any>;
    get runtime(): import("../../../runtime/types/runtime.js").LuaRuntime;
    get model(): monaco.editor.ITextModel;
    get editor(): any;
    get breakpoints(): Map<any, any>;
    get backend(): string;
    get profile(): string;
    get running(): boolean;
    get paused(): boolean;
    get output(): string;
    get licenseUrl(): string;
    firstUpdated(): Promise<void>;
    disconnectedCallback(): void;
    updated(): void;
    dispose(): void;
    invoke(name: any, ...args: any[]): Promise<any>;
    execute(): Promise<any>;
    resume(method?: string): Promise<any>;
    stop(): Promise<any>;
    pauseExecution(): Promise<any>;
    runToCursor(): Promise<any>;
    pickHostDirectory(): Promise<void>;
    toggleBreakpoint(line: any): Promise<any[]>;
    renderBreakpoints(): void;
    refreshDebug(frame?: number): Promise<any>;
    getDiagnostics(): monaco.editor.IMarker[];
    createDapAdapter(): import("../../../runtime/types/dap.js").LuaDapAdapter;
    /** @param {string} name
     * @param {import('../../../runtime/types/capability-registry.js').CapabilityRegistration} registration */
    registerCapability(name: string, registration: import('../../../runtime/types/capability-registry.js').CapabilityRegistration): () => void;
    /** @param {string} namespace
     * @param {import('../../../runtime/types/capability-registry.js').CapabilityGroupMap} registrations
     * @param {{moduleName?: string|false, replace?: boolean}} [options] */
    registerCapabilityGroup(namespace: string, registrations: import('../../../runtime/types/capability-registry.js').CapabilityGroupMap, options?: {
        moduleName?: string | false;
        replace?: boolean;
    }): import("../../../runtime/types/capability-registry.js").CapabilityGroupHandle;
    /** @param {{prefix?: string, includeInternal?: boolean}} [options] */
    listCapabilities(options?: {
        prefix?: string;
        includeInternal?: boolean;
    }): Readonly<import("../../../runtime/types/capability-registry.js").CapabilityMetadata & {
        name: string;
        activeCount: number;
        queuedCount: number;
    }>[];
    setTheme(name: any): void;
    pluginComponent(id: any, fallback: any): any;
    pluginZone(zone: any): typeof nothing | import("lit").TemplateResult<1>[];
    switchRuntime(event: any): Promise<any>;
    runEditorCommand(command: any): void;
    shortcut(command: any): any;
    saveKeybindings(event: any): Promise<void>;
    resetKeybindings(): Promise<void>;
    openKeybindingSettings(): void;
    closeKeybindingSettings(): void;
    startKeybindingRecording(command: any): void;
    recordKeybinding(command: any, event: any): void;
    resetKeybinding(command: any): void;
    clearKeybinding(command: any): void;
    setSidePanel(panel: any): void;
    setBottomPanel(panel: any): void;
    openProblem(marker: any): Promise<void>;
    openStackFrame(frame: any): Promise<void>;
    openOutline(symbol: any): Promise<void>;
    openSearchResult(result: any): Promise<void>;
    searchWorkspace(event: any): Promise<void>;
    replaceWorkspace(): Promise<void>;
    toggleSearchOption(name: any): Promise<void>;
    addWatch(event: any): Promise<void>;
    evaluateConsole(event: any): Promise<void>;
    editVariable(variable: any): void;
    submitVariable(event: any): Promise<void>;
    openFileDialog(type: any, file: any): void;
    submitFileDialog(event: any): Promise<void>;
    saveBreakpoint(event: any): Promise<void>;
    deleteBreakpoint(): Promise<void>;
    importFile(): void;
    exportFile(): void;
    debugSection(title: any, rows: any, empty: any, actions?: any): import("lit").TemplateResult<1>;
    renderVariableScopes(state: any): import("lit").TemplateResult<1>;
    renderDebugPanel(state: any): import("lit").TemplateResult<1>;
    renderDebugSidebar(state: any): any;
    renderFilesPanel(state: any): import("lit").TemplateResult<1>;
    renderOutlinePanel(state: any): import("lit").TemplateResult<1>;
    renderSidebar(state: any): typeof nothing | import("lit").TemplateResult<1>;
    renderBottom(state: any): import("lit").TemplateResult<1>;
    renderBreakpointDialog(): typeof nothing | import("lit").TemplateResult<1>;
    renderFileDialog(): typeof nothing | import("lit").TemplateResult<1>;
    renderKeybindingSettings(): typeof nothing | import("lit").TemplateResult<1>;
    render(): import("lit").TemplateResult<1>;
}
