import { LuaRuntime } from './runtime.js';
export type DapRequest = {
    seq: number;
    type: 'request';
    command: string;
    arguments?: Record<string, any>;
};
export type ResumeMethod = 'continue' | 'stepIn' | 'stepOver' | 'stepOut';
/**
 * @typedef {{seq: number, type: 'request', command: string,
 *   arguments?: Record<string, any>}} DapRequest
 * @typedef {'continue'|'stepIn'|'stepOver'|'stepOut'} ResumeMethod
 */
/**
 * DAP 1.68 adapter transported as structured-clone messages over MessagePort.
 * Requests and responses use the standard Debug Adapter Protocol message
 * objects without stdio's Content-Length envelope.
 */
export declare class LuaDapAdapter {
    /** @param {LuaRuntime|import('./runtime.js').LuaRuntimeOptions} [runtimeOrOptions] */
    constructor(runtimeOrOptions?: LuaRuntime | import('./runtime.js').LuaRuntimeOptions);
    /** @type {LuaRuntime} */ runtime: LuaRuntime;
    /** Client-facing DAP transport. */
    /** @type {MessagePort} */ port: MessagePort;
    /** @type {MessagePort} */ adapterPort: MessagePort;
    /** @type {boolean} */ ownsRuntime: boolean;
    /** @type {AbortController} */ controller: AbortController;
    sequence: number;
    source: string;
    chunkName: string;
    lastException: string;
    /** @type {Map<string, import('./runtime.js').LuaBreakpoint[]>} */
    breakpointsBySource: Map<string, import('./runtime.js').LuaBreakpoint[]>;
    /** @type {Map<number, number>} */ variableReferences: Map<number, number>;
    /** @type {Map<number, number>} */ reverseVariableReferences: Map<number, number>;
    /** @type {Map<number, {frame: number, scope: number}>} */ scopeReferences: Map<number, {
        frame: number;
        scope: number;
    }>;
    nextVariableReference: number;
    /** @param {Record<string, any>} message */
    send(message: Record<string, any>): void;
    /** @param {string} event @param {Record<string, any>} body */
    sendEvent(event: string, body: Record<string, any>): void;
    /** @param {DapRequest} request @param {Record<string, any>} [body] */
    respond(request: DapRequest, body?: Record<string, any>): void;
    /** @param {DapRequest} request @param {unknown} error */
    fail(request: DapRequest, error: unknown): void;
    /** @param {number} nativeReference @returns {number} */
    mapReference(nativeReference: number): number;
    /** @param {import('./runtime.js').LuaDebugVariable[]} variables */
    mapVariables(variables: import('./runtime.js').LuaDebugVariable[]): {
        name: string;
        type: string;
        value: string;
        variablesReference: number;
    }[];
    /** @param {DapRequest} request @param {ResumeMethod} method */
    resume(request: DapRequest, method: ResumeMethod): Promise<void>;
    /** @param {DapRequest} request */
    handle(request: DapRequest): Promise<void>;
    /** Close the transport and, when owned, dispose the Lua runtime. */
    dispose(): void;
}
/** @param {LuaRuntime|import('./runtime.js').LuaRuntimeOptions} [runtimeOrOptions] */
export declare function createLuaDapAdapter(runtimeOrOptions?: LuaRuntime | import('./runtime.js').LuaRuntimeOptions): LuaDapAdapter;
