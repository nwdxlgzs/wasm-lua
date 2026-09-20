/**
 * Syntax-only breakpoint relocation shared by the SDK, DAP adapters and IDE.
 * Lua's line hook is authoritative at execution time; this resolver gives the
 * host an immediate location and a lexical upper bound for native fallback.
 */

/** Replace strings/comments with spaces while preserving line positions. */
function maskTrivia(source) {
  const chars = source.split('');
  const mask = (start, end) => {
    for (let index = start; index < end; index++)
      if (chars[index] !== '\n' && chars[index] !== '\r') chars[index] = ' ';
  };
  let index = 0;
  while (index < source.length) {
    if (source.startsWith('--', index)) {
      const long = /^--\[(=*)\[/.exec(source.slice(index));
      if (long) {
        const close = `]${long[1]}]`;
        const closeAt = source.indexOf(close, index + long[0].length);
        const end = closeAt < 0 ? source.length : closeAt + close.length;
        mask(index, end);
        index = end;
      } else {
        const newline = source.indexOf('\n', index);
        const end = newline < 0 ? source.length : newline;
        mask(index, end);
        index = end;
      }
      continue;
    }
    const long = /^\[(=*)\[/.exec(source.slice(index));
    if (long) {
      const close = `]${long[1]}]`;
      const closeAt = source.indexOf(close, index + long[0].length);
      const end = closeAt < 0 ? source.length : closeAt + close.length;
      mask(index, end);
      index = end;
      continue;
    }
    if (source[index] === '"' || source[index] === "'") {
      const quote = source[index];
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === '\\') end += 2;
        else if (source[end++] === quote) break;
      }
      mask(index, end);
      index = end;
      continue;
    }
    index++;
  }
  return chars.join('');
}

function lineAt(offset, starts) {
  let low = 0;
  let high = starts.length;
  while (low + 1 < high) {
    const middle = (low + high) >>> 1;
    if (starts[middle] <= offset) low = middle;
    else high = middle;
  }
  return low + 1;
}

const BLOCK_KEYWORDS = new Set([
  'function', 'if', 'then', 'elseif', 'else', 'for', 'while', 'do',
  'repeat', 'until', 'end'
]);
const HARD_BOUNDARIES = new Set(['elseif', 'else', 'until', 'end']);

/** Tokenize only unmasked Lua identifiers, retaining source order.  A line
 * may contain any number of keywords; scope changes are applied at each
 * token offset rather than once per line. */
function luaKeywordTokens(masked) {
  const starts = [0];
  for (let index = 0; index < masked.length; index++)
    if (masked[index] === '\n') starts.push(index + 1);
  const identifier = /(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*/gu;
  return [...masked.matchAll(identifier)]
    .filter(match => BLOCK_KEYWORDS.has(match[0]))
    .map(match => {
      const line = lineAt(match.index, starts);
      return {
        value: match[0], offset: match.index, line,
        column: match.index - starts[line - 1] + 1
      };
    });
}

function executableCandidate(maskedLine) {
  const line = maskedLine.trim();
  if (!line || /^(?:end|else)\s*;?$/u.test(line) ||
      /^::(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*::\s*;?$/u
        .test(line)) return false;
  return !/^[()\[\]{},.;:=]*$/u.test(line);
}

function luaScopes(masked, lines, tokens) {
  const lastLine = lines.length;
  const root = {
    type: 'chunk', start: 1, end: lastLine, searchEnd: lastLine,
    openOffset: -1
  };
  const scopes = [root];
  const stack = [];

  const open = (type, token, branch = false) => {
    const block = {
      type, start: token.line, end: lastLine, searchEnd: lastLine,
      openOffset: token.offset,
      awaitingDo: type === 'for' || type === 'while', branch: null
    };
    if (branch) {
      block.branch = {
        type: 'branch', start: token.line, end: lastLine,
        searchEnd: lastLine, openOffset: token.offset
      };
      scopes.push(block.branch);
    }
    scopes.push(block);
    stack.push(block);
  };
  const close = (token, repeat) => {
    for (let index = stack.length - 1; index >= 0; index--) {
      const block = stack[index];
      if ((repeat && block.type !== 'repeat') ||
          (!repeat && block.type === 'repeat')) continue;
      stack.splice(index, 1);
      block.end = token.line;
      block.closeOffset = token.offset;
      block.searchEnd = Math.max(block.start, token.line - 1);
      if (block.branch) {
        block.branch.end = token.line;
        block.branch.closeOffset = token.offset;
        block.branch.searchEnd = Math.max(
          block.branch.start, token.line - 1);
      }
      return;
    }
  };

  for (const token of tokens) {
    const keyword = token.value;
    if (keyword === 'function') open(keyword, token);
    else if (keyword === 'if') open(keyword, token, true);
    else if (keyword === 'for' || keyword === 'while' || keyword === 'repeat')
      open(keyword, token);
    else if (keyword === 'do') {
      const current = stack.at(-1);
      if (current?.awaitingDo) current.awaitingDo = false;
      else open(keyword, token);
    } else if (keyword === 'elseif' || keyword === 'else') {
      const current = stack.at(-1);
      if (current?.type === 'if') {
        if (current.branch) {
          current.branch.end = Math.max(current.branch.start, token.line - 1);
          current.branch.searchEnd = current.branch.end;
          current.branch.closeOffset = token.offset;
        }
        current.branch = {
          type: 'branch', start: token.line, end: lastLine,
          searchEnd: lastLine, openOffset: token.offset
        };
        scopes.push(current.branch);
      }
    } else if (keyword === 'end') close(token, false);
    else if (keyword === 'until') close(token, true);
  }
  return scopes;
}

/**
 * Move an unsupported line down to the first syntactically executable line in
 * the smallest enclosing Lua block/branch. Never crosses its end/else/until.
 * @param {string} source
 * @param {number} requestedLine
 */
export function resolveLuaBreakpoint(source, requestedLine) {
  const text = String(source ?? '');
  const masked = maskTrivia(text);
  const lines = masked.split(/\r?\n/u);
  const tokens = luaKeywordTokens(masked);
  const requested = Math.trunc(Number(requestedLine));
  if (!Number.isFinite(requested) || requested < 1 || requested > lines.length) {
    return {
      requestedLine: requested, line: requested, endLine: requested,
      verified: false, message: '断点行超出源码范围。'
    };
  }
  const scope = luaScopes(masked, lines, tokens)
    .filter(item => item.start <= requested && requested <= item.end)
    .sort((left, right) =>
      (left.end - left.start) - (right.end - right.start) ||
      right.start - left.start || right.openOffset - left.openOffset)[0];
  // Lua 5.5 attributes a multi-line function declaration's CLOSURE opcode to
  // its closing `end`, in the enclosing function. Header/body hooks are not
  // the declaration: stopping in the callee would change program behavior.
  const declaration = tokens.find(token =>
    token.value === 'function' && token.line === requested);
  if (declaration) {
    const closure = luaScopes(masked, lines, tokens).find(item =>
      item.type === 'function' && item.openOffset === declaration.offset &&
      item.closeOffset !== undefined && item.end > requested);
    if (closure) return {
      requestedLine: requested, line: closure.end, endLine: closure.end,
      verified: true,
      message: `第 ${requested} 行的函数声明在第 ${closure.end} 行创建闭包。`
    };
  }
  // A debugger breakpoint has line granularity, not a source column.  When a
  // later line contains end/elseif/else/until—even alongside other statements
  // on that same line—the whole line is a hard fence for relocation from
  // above.  This deliberately prefers an unverified breakpoint over crossing
  // a lexical boundary that cannot be represented precisely by line alone.
  const boundary = tokens.find(token =>
    token.line > requested && HARD_BOUNDARIES.has(token.value));
  const lexicalEnd = boundary ? boundary.line - 1 : lines.length;
  const endLine = Math.max(requested,
    Math.min(scope?.searchEnd ?? lines.length, lexicalEnd));
  for (let line = requested; line <= endLine; line++) {
    if (!executableCandidate(lines[line - 1])) continue;
    return {
      requestedLine: requested,
      line,
      endLine,
      verified: true,
      message: line === requested ? '' :
        `第 ${requested} 行不可执行，断点已下移到同一作用域的第 ${line} 行。`
    };
  }
  return {
    requestedLine: requested,
    line: requested,
    endLine,
    verified: false,
    message: `第 ${requested} 行到当前作用域末尾没有可执行语句。`
  };
}

/** @param {string} source @param {Array<Record<string, any>>} breakpoints */
export function resolveLuaBreakpoints(source, breakpoints) {
  return breakpoints.map(point => {
    const requestedLine = Number(point.requestedLine ?? point.line);
    return { ...point, ...resolveLuaBreakpoint(source, requestedLine) };
  });
}
