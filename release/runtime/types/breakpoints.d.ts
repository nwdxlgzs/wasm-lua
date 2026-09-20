/**
 * Syntax-only breakpoint relocation shared by the SDK, DAP adapters and IDE.
 * Lua's line hook is authoritative at execution time; this resolver gives the
 * host an immediate location and a lexical upper bound for native fallback.
 */
/**
 * Move an unsupported line down to the first syntactically executable line in
 * the smallest enclosing Lua block/branch. Never crosses its end/else/until.
 * @param {string} source
 * @param {number} requestedLine
 */
export declare function resolveLuaBreakpoint(source: string, requestedLine: number): {
    requestedLine: number;
    line: any;
    endLine: any;
    verified: boolean;
    message: string;
};
/** @param {string} source @param {Array<Record<string, any>>} breakpoints */
export declare function resolveLuaBreakpoints(source: string, breakpoints: Array<Record<string, any>>): {
    requestedLine: number;
    line: any;
    endLine: any;
    verified: boolean;
    message: string;
}[];
