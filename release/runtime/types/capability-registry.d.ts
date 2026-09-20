export type CapabilityParameter = {
    name: string;
    type?: string;
    description?: string;
    optional?: boolean;
};
export type CapabilityReturn = {
    type?: string;
    description?: string;
};
export type CapabilityMetadata = {
    description?: string;
    parameters?: ReadonlyArray<CapabilityParameter>;
    returns?: CapabilityReturn | ReadonlyArray<CapabilityReturn>;
    timeoutMs?: number;
    maxConcurrency?: number;
    queueLimit?: number;
    tags?: string[];
    internal?: boolean;
};
export type CapabilityInvocationContext = {
    id: number;
    name: string;
    args: ReadonlyArray<any>;
    signal: AbortSignal;
    startedAt: number;
    capability: CapabilityInfo;
    runtime?: import('./runtime.js').LuaRuntime;
};
export type CapabilityHandler = (...args: any[]) => any | Promise<any>;
export type CapabilityDescriptor = CapabilityMetadata & {
    handler: CapabilityHandler;
};
export type CapabilityRegistration = CapabilityHandler | CapabilityDescriptor;
export type CapabilityGroupMap = Record<string, CapabilityRegistration | Record<string, any>>;
export type CapabilityInfo = Readonly<CapabilityMetadata & {
    name: string;
    activeCount: number;
    queuedCount: number;
}>;
export type CapabilityModule = {
    moduleName: string;
    source: string;
    definition: string;
    uri: string;
};
export type CapabilityMiddleware = (context: CapabilityInvocationContext, next: () => Promise<any>) => any | Promise<any>;
/**
 * Build a text-only Lua module which forwards functions to `js.call`.
 * It is suitable for `registerModule` and as a read-only language definition.
 * @param {string} namespace
 * @param {ReadonlyArray<{relativeName: string, name: string,
 *   descriptor: CapabilityDescriptor}>} capabilities
 * @param {string} moduleName
 * @returns {Readonly<CapabilityModule>}
 */
export declare function createCapabilityModule(namespace: string, capabilities: ReadonlyArray<{
    relativeName: string;
    name: string;
    descriptor: CapabilityDescriptor;
}>, moduleName: string): Readonly<CapabilityModule>;
/** A generation-safe, idempotent registration returned by grouped APIs. */
export declare class CapabilityGroupHandle {
    #private;
    /** @param {ReadonlyArray<string>} names @param {() => void} dispose
     * @param {Readonly<CapabilityModule>|null} [module] */
    constructor(names: ReadonlyArray<string>, dispose: () => void, module?: Readonly<CapabilityModule> | null);
    /** @type {ReadonlyArray<string>} */
    names: ReadonlyArray<string>;
    /** @type {Readonly<CapabilityModule>|null} */
    module: Readonly<CapabilityModule> | null;
    disposed: boolean;
    dispose(): void;
    [Symbol.dispose](): void;
}
/**
 * Registry for a large host API surface. Registration and invocation policy
 * live here so the Worker transport remains a small ABI concern.
 */
export declare class CapabilityRegistry extends EventTarget {
    #private;
    /** @param {string} name @param {CapabilityRegistration} registration
     * @param {{replace?: boolean}} [options] */
    register(name: string, registration: CapabilityRegistration, options?: {
        replace?: boolean;
    }): () => void;
    /** @param {string} namespace @param {CapabilityGroupMap} registrations
     * @param {{replace?: boolean}} [options]
     * @returns {{capabilities: Array<{relativeName: string, name: string,
     *   descriptor: CapabilityDescriptor}>, handle: CapabilityGroupHandle}} */
    registerGroup(namespace: string, registrations: CapabilityGroupMap, options?: {
        replace?: boolean;
    }): {
        capabilities: Array<{
            relativeName: string;
            name: string;
            descriptor: CapabilityDescriptor;
        }>;
        handle: CapabilityGroupHandle;
    };
    /** Install invocation middleware: `(context, next) => value`.
     * @param {CapabilityMiddleware} middleware */
    use(middleware: CapabilityMiddleware): () => void;
    /** @param {{prefix?: string, includeInternal?: boolean}} [options]
     * @returns {CapabilityInfo[]} */
    list(options?: {
        prefix?: string;
        includeInternal?: boolean;
    }): CapabilityInfo[];
    /** @param {string} name */
    has(name: string): boolean;
    /** @param {string} name @param {any[]} [args] @param {object} [extra] */
    invoke(name: string, args?: any[], extra?: object): Promise<any>;
    cancelActive(reason?: Error): void;
    dispose(): void;
}
export declare function createCapabilityRegistry(): CapabilityRegistry;
