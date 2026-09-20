export declare class LuaLanguageClient extends EventTarget {
    constructor();
    worker: any;
    sequence: number;
    pending: Map<any, any>;
    request(method: any, params?: {}): Promise<any>;
    update(uri: any, source: any): Promise<any>;
    remove(uri: any): Promise<any>;
    completions(uri: any, offset: any, source: any): Promise<any>;
    hover(uri: any, offset: any, source: any): Promise<any>;
    signature(uri: any, offset: any, source: any): Promise<any>;
    definition(uri: any, offset: any, source: any): Promise<any>;
    references(uri: any, offset: any, source: any): Promise<any>;
    symbols(uri: any, source: any): Promise<any>;
    dispose(): void;
}
