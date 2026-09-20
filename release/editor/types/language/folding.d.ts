/**
 * Lua folding scanner.
 *
 * This deliberately works on lexical tokens instead of indentation or line
 * prefixes. Lua permits anonymous functions anywhere an expression is valid,
 * so forms such as `value = function ()` and table-field callbacks must be
 * treated exactly like `local function name()` declarations. Strings and
 * comments are skipped before keywords are considered.
 */
export type LuaFoldingRange = {
    start: number;
    end: number;
    kind?: 'comment' | 'region';
};
/**
 * Compute syntax-aware, one-based Monaco folding ranges for Lua source.
 *
 * Covered constructs:
 * - named, local/global and anonymous `function ... end` forms;
 * - `if`, `for`, `while`, standalone `do`, and `repeat ... until` blocks;
 * - multiline table constructors;
 * - long strings, long comments, consecutive full-line comments and regions.
 *
 * @param {string} source
 * @returns {LuaFoldingRange[]}
 */
export declare function computeLuaFoldingRanges(source: string): LuaFoldingRange[];
