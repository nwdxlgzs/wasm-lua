/** Replace strings and comments with spaces while preserving offsets/newlines. */
export declare function maskTrivia(source: any): any;
/** Analyze editor-oriented Lua symbols without changing compiler semantics. */
export declare function analyze(source: any, uri?: string): {
    uri: string;
    source: any;
    masked: any;
    symbols: any[];
    members: Map<any, any>;
    aliases: Map<any, any>;
    occurrences: Map<any, any>;
    diagnostics: any[];
    scopes: {
        type: string;
        start: number;
        end: any;
        parent: any;
    }[];
    moduleName: string;
    moduleRoot: string;
};
/** Resolve local/library aliases and `require()` aliases into indexed names. */
export declare function resolveAlias(documents: any, document: any, requested: any): {
    name: any;
    uri?: undefined;
} | {
    name: string;
    uri: any;
};
/** Return completion items filtered by member/global context at the cursor. */
export declare function completions(documents: any, uri: any, offset: any): any[];
export declare function identifierAt(source: any, offset: any): {
    word: any;
    start: any;
    end: any;
};
