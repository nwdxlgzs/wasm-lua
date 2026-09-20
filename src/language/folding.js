/**
 * Lua folding scanner.
 *
 * This deliberately works on lexical tokens instead of indentation or line
 * prefixes. Lua permits anonymous functions anywhere an expression is valid,
 * so forms such as `value = function ()` and table-field callbacks must be
 * treated exactly like `local function name()` declarations. Strings and
 * comments are skipped before keywords are considered.
 */

/** @typedef {{start: number, end: number, kind?: 'comment'|'region'}} LuaFoldingRange */

function longBracketAt(source, index) {
  if (source[index] !== '[') return null;
  let cursor = index + 1;
  while (source[cursor] === '=') cursor++;
  return source[cursor] === '[' ? {
    equals: cursor - index - 1,
    length: cursor - index + 1
  } : null;
}

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
export function computeLuaFoldingRanges(source) {
  /** @type {LuaFoldingRange[]} */
  const ranges = [];
  /** @type {Array<{type: string, line: number, awaitingDo?: boolean}>} */
  const stack = [];
  /** @type {Array<{line: number, text: string}>} */
  const lineComments = [];
  /** @type {number[]} */
  const regions = [];
  let index = 0;
  let line = 1;
  let lineHasCode = false;
  // Match the patched Lua lexer exactly: a non-ASCII UTF-8 code point is valid
  // in both the first and following positions (not only Unicode Letter). This
  // prevents `function😀` from being mistaken for the `function` keyword.
  const identifier = /(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*/uy;

  const addRange = (start, end, kind) => {
    if (end > start) ranges.push({ start, end, ...(kind ? { kind } : {}) });
  };
  const closeBlock = (types, endLine) => {
    const open = stack.at(-1);
    if (open && types.includes(open.type)) {
      stack.pop();
      addRange(open.line, endLine);
    }
  };
  const advance = end => {
    while (index < end) {
      if (source[index] === '\n') {
        line++;
        lineHasCode = false;
      }
      index++;
    }
  };
  const consumeLongBracket = (open, kind) => {
    const startLine = line;
    const close = `]${'='.repeat(open.equals)}]`;
    const bodyStart = index + open.length;
    const closeAt = source.indexOf(close, bodyStart);
    const end = closeAt < 0 ? source.length : closeAt + close.length;
    advance(end);
    addRange(startLine, line, kind);
  };
  const recordLineComment = (commentLine, text) => {
    lineComments.push({ line: commentLine, text });
    const marker = text.replace(/^--\s*/u, '').trim();
    if (/^#?endregion\b/iu.test(marker)) {
      const start = regions.pop();
      if (start) addRange(start, commentLine, 'region');
    } else if (/^#?region\b/iu.test(marker)) {
      regions.push(commentLine);
    }
  };

  while (index < source.length) {
    const character = source[index];
    if (character === '\n') {
      line++;
      lineHasCode = false;
      index++;
      continue;
    }
    if (/\s/u.test(character)) {
      index++;
      continue;
    }

    if (character === '-' && source[index + 1] === '-') {
      const commentLine = line;
      const fullLine = !lineHasCode;
      const longOpen = longBracketAt(source, index + 2);
      if (longOpen) {
        index += 2;
        consumeLongBracket(longOpen, 'comment');
      } else {
        const end = source.indexOf('\n', index);
        const lineEnd = end < 0 ? source.length : end;
        const text = source.slice(index, lineEnd);
        if (fullLine) recordLineComment(commentLine, text);
        index = lineEnd;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      const quote = character;
      lineHasCode = true;
      index++;
      while (index < source.length) {
        if (source[index] === '\\') {
          if (source[index + 1] === 'z') {
            index += 2;
            while (index < source.length && /\s/u.test(source[index])) {
              if (source[index] === '\n') {
                line++;
                lineHasCode = false;
              }
              index++;
            }
          } else if (source[index + 1] === '\r' && source[index + 2] === '\n') {
            index += 3;
            line++;
            lineHasCode = false;
          } else {
            if (source[index + 1] === '\n') {
              line++;
              lineHasCode = false;
            }
            index += Math.min(2, source.length - index);
          }
          continue;
        }
        const current = source[index++];
        if (current === quote) break;
        if (current === '\n') {
          line++;
          lineHasCode = false;
        }
      }
      lineHasCode = true;
      continue;
    }

    const longOpen = longBracketAt(source, index);
    if (longOpen) {
      lineHasCode = true;
      consumeLongBracket(longOpen);
      lineHasCode = true;
      continue;
    }

    identifier.lastIndex = index;
    const identifierMatch = identifier.exec(source);
    if (identifierMatch) {
      const token = identifierMatch[0];
      index = identifier.lastIndex;
      lineHasCode = true;
      if (token === 'function' || token === 'if' || token === 'repeat') {
        stack.push({ type: token, line });
      } else if (token === 'for' || token === 'while') {
        stack.push({ type: token, line, awaitingDo: true });
      } else if (token === 'do') {
        const loop = stack.at(-1);
        if (loop && (loop.type === 'for' || loop.type === 'while') && loop.awaitingDo)
          loop.awaitingDo = false;
        else stack.push({ type: 'do', line });
      } else if (token === 'end') {
        closeBlock(['function', 'if', 'for', 'while', 'do'], line);
      } else if (token === 'until') {
        closeBlock(['repeat'], line);
      }
      continue;
    }

    lineHasCode = true;
    if (character === '{') stack.push({ type: 'table', line });
    else if (character === '}') closeBlock(['table'], line);
    index++;
  }

  for (let start = 0; start < lineComments.length;) {
    let end = start;
    while (end + 1 < lineComments.length &&
      lineComments[end + 1].line === lineComments[end].line + 1) end++;
    if (end > start)
      addRange(lineComments[start].line, lineComments[end].line, 'comment');
    start = end + 1;
  }

  const priority = { region: 2, comment: 1 };
  const unique = new Map();
  for (const range of ranges) {
    const key = `${range.start}:${range.end}`;
    const previous = unique.get(key);
    if (!previous || (priority[range.kind] ?? 0) > (priority[previous.kind] ?? 0))
      unique.set(key, range);
  }
  return [...unique.values()].sort((left, right) =>
    left.start - right.start || right.end - left.end);
}
