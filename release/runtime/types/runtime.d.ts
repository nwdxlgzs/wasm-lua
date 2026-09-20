import { LuaRef } from './wire.js';
import { CapabilityGroupHandle, CapabilityRegistry } from './capability-registry.js';
export type LuaBackend = 'emscripten' | 'wasi';
export type LuaProfile = 'safe' | 'trusted' | 'full-access';
export type LuaRuntimeOptions = {
    backend?: LuaBackend;
    profile?: LuaProfile;
    debug?: boolean;
    timeout?: number;
    memoryLimit?: number;
    instructionLimit?: number;
    vfsLimit?: number;
    assetBaseUrl?: string;
    environment?: Record<string, string>;
};
export type LuaExecutionResult = {
    state: string;
    values: Array<any>;
};
export type LuaStackFrame = {
    id: number;
    name: string;
    source: string;
    line: number;
    column: number;
};
export type LuaDebugVariable = {
    name: string;
    type: string;
    value: string;
    variablesReference: number;
};
export type LuaBreakpoint = {
    line: number;
    requestedLine?: number;
    endLine?: number;
    verified?: boolean;
    message?: string;
    source?: string;
    file?: string;
    condition?: string;
    hitCondition?: string;
    logMessage?: string;
    hits?: number;
};
export type CapabilityRegistration = import('./capability-registry.js').CapabilityRegistration;
/**
 * @typedef {'emscripten'|'wasi'} LuaBackend
 * @typedef {'safe'|'trusted'|'full-access'} LuaProfile
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
export declare class LuaRuntime extends EventTarget {
    #private;
    /** @param {LuaRuntimeOptions} [options] */
    constructor(options?: LuaRuntimeOptions);
    options: any;
    /** Structured host API registry. Prefer grouped registration for large APIs. */
    capabilities: CapabilityRegistry;
    /** @param {string} source @param {{chunkName?: string}} [options]
     * @returns {Promise<LuaExecutionResult>} */
    run(source: string, options?: {
        chunkName?: string;
    }): Promise<LuaExecutionResult>;
    /** Compile a text chunk with the official Lua compiler without executing it.
     * @param {string} source @param {{chunkName?: string}} [options]
     * @returns {Promise<boolean>} */
    check(source: string, options?: {
        chunkName?: string;
    }): Promise<boolean>;
    /** @returns {Promise<LuaExecutionResult>} */
    continue(): Promise<LuaExecutionResult>;
    /** @returns {Promise<LuaExecutionResult>} */
    stepIn(): Promise<LuaExecutionResult>;
    /** @returns {Promise<LuaExecutionResult>} */
    stepOver(): Promise<LuaExecutionResult>;
    /** @returns {Promise<LuaExecutionResult>} */
    stepOut(): Promise<LuaExecutionResult>;
    /** @param {Array<number|LuaBreakpoint>} breakpoints
     * @param {{source?: string}} [options]
     * @returns {Promise<LuaBreakpoint[]>} */
    setBreakpoints(breakpoints: Array<number | LuaBreakpoint>, options?: {
        source?: string;
    }): Promise<LuaBreakpoint[]>;
    /** @returns {Promise<LuaStackFrame[]>} */
    stackTrace(): Promise<LuaStackFrame[]>;
    /** @returns {Promise<LuaDebugVariable[]>} */
    variables(frame?: number, reference?: number): Promise<LuaDebugVariable[]>;
    /** @param {string} expression @param {number} [frame]
     * @returns {Promise<LuaDebugVariable[]|{error: string}>} */
    evaluate(expression: string, frame?: number): Promise<LuaDebugVariable[] | {
        error: string;
    }>;
    /** Request a cooperative pause at the next execution slice. */
    pause(): Promise<any>;
    /** @param {number} line @param {string} [source]
     * @returns {Promise<LuaExecutionResult>} */
    runToCursor(line: number, source?: string): Promise<LuaExecutionResult>;
    /** @param {number} frame @param {number} reference @param {string} name
     * @param {string} value @returns {Promise<LuaDebugVariable[]>} */
    setVariable(frame: number, reference: number, name: string, value: string): Promise<LuaDebugVariable[]>;
    /** @param {string} name
     * @param {CapabilityRegistration} registration
     * @returns {() => void} */
    registerCapability(name: string, registration: CapabilityRegistration): () => void;
    /**
     * Atomically register a hierarchical host API and optionally expose it as a
     * typed Lua module (default: `host.<namespace>` for dot-safe namespaces).
     * @param {string} namespace
     * @param {import('./capability-registry.js').CapabilityGroupMap} registrations
     * @param {{moduleName?: string|false, replace?: boolean}} [options]
     * @returns {CapabilityGroupHandle}
     */
    registerCapabilityGroup(namespace: string, registrations: import('./capability-registry.js').CapabilityGroupMap, options?: {
        moduleName?: string | false;
        replace?: boolean;
    }): CapabilityGroupHandle;
    /** @param {{prefix?: string, includeInternal?: boolean}} [options] */
    listCapabilities(options?: {
        prefix?: string;
        includeInternal?: boolean;
    }): Readonly<import("./capability-registry.js").CapabilityMetadata & {
        name: string;
        activeCount: number;
        queuedCount: number;
    }>[];
    /** @param {import('./capability-registry.js').CapabilityMiddleware} middleware */
    useCapabilityMiddleware(middleware: import('./capability-registry.js').CapabilityMiddleware): () => void;
    /** @param {string} name
     * @param {string|((...args: any[]) => any|Promise<any>)} factory
     * @returns {() => void} */
    registerModule(name: string, factory: string | ((...args: any[]) => any | Promise<any>)): () => void;
    /** Mount only a directory handle explicitly granted by the browser/user.
     * Lua never sees the handle, and a separate namespace prevents VFS paths
     * from accidentally aliasing host files.
     * @param {FileSystemDirectoryHandle} handle
     * @param {{mountPoint?: string, mode?: 'read'|'readwrite'}} [options] */
    mountDirectory(handle: FileSystemDirectoryHandle, options?: {
        mountPoint?: string;
        mode?: 'read' | 'readwrite';
    }): Promise<() => void>;
    /** Must be called directly from a user gesture in Chromium on HTTPS/localhost.
     * @param {{mountPoint?: string, mode?: 'read'|'readwrite'}} [options] */
    pickDirectory(options?: {
        mountPoint?: string;
        mode?: 'read' | 'readwrite';
    }): Promise<{
        handle: any;
        unmount: () => void;
    }>;
    /** @param {string} path @param {string|Uint8Array} value
     * @returns {() => void} */
    registerFile(path: string, value: string | Uint8Array): () => void;
    /** Read a host-visible copy of a memory VFS file.
     * @param {string} path @param {{encoding?: 'binary'|'utf8'}} [options]
     * @returns {Uint8Array|string} */
    readFile(path: string, options?: {
        encoding?: 'binary' | 'utf8';
    }): Uint8Array | string;
    /** Read an in-memory or explicitly mounted host file asynchronously.
     * @param {string} path @param {{encoding?: 'binary'|'utf8'}} [options] */
    readFileAsync(path: string, options?: {
        encoding?: 'binary' | 'utf8';
    }): Promise<any>;
    /** Create or replace a host-visible memory VFS file.
     * @param {string} path @param {string|Uint8Array} value
     * @param {{append?: boolean}} [options] */
    writeFile(path: string, value: string | Uint8Array, options?: {
        append?: boolean;
    }): void;
    /** @param {string} path @param {string|Uint8Array} value
     * @param {{append?: boolean}} [options] */
    writeFileAsync(path: string, value: string | Uint8Array, options?: {
        append?: boolean;
    }): Promise<void>;
    /** @param {string} path @returns {boolean} */
    removeFile(path: string): boolean;
    /** @param {string} path */
    removeFileAsync(path: string): Promise<boolean>;
    /** @param {string} from @param {string} to @returns {boolean} */
    renameFile(from: string, to: string): boolean;
    /** @param {string} [prefix] @returns {string[]} */
    listFiles(prefix?: string): string[];
    /** @param {{uri: string, source: string}} definition
     * @returns {() => void} */
    registerDefinition({ uri, source }: {
        uri: string;
        source: string;
    }): () => void;
    get definitions(): Map<any, any>;
    interrupt(): Promise<void>;
    dispose(): void;
    /** @param {LuaRef} reference @param {...any} args
     * @returns {Promise<any[]>} */
    call(reference: LuaRef, ...args: any[]): Promise<any[]>;
    /** @param {LuaRef} reference @param {any} key @returns {Promise<any>} */
    get(reference: LuaRef, key: any): Promise<any>;
    /** @param {LuaRef} reference @param {any} key @param {any} value
     * @returns {Promise<boolean>} */
    set(reference: LuaRef, key: any, value: any): Promise<boolean>;
}
/** @param {LuaRuntimeOptions} [options] */
export declare function createLuaRuntime(options?: LuaRuntimeOptions): LuaRuntime;
/** @param {LuaRuntimeOptions} [options] */
export declare function createLuaDebugger(options?: LuaRuntimeOptions): LuaRuntime;
