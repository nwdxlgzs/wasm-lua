import { maskTrivia } from './analyzer.js';

function longStringInteriorLines(source) {
  const protectedLines = new Set();
  let index = 0;
  let line = 0;
  while (index < source.length) {
    if (source[index] === '\n') { line++; index++; continue; }
    if (source.startsWith('--', index)) {
      const longComment = /^--\[(=*)\[/u.exec(source.slice(index));
      if (longComment) {
        const close = `]${longComment[1]}]`;
        const end = source.indexOf(close, index + longComment[0].length);
        const finish = end < 0 ? source.length : end + close.length;
        line += (source.slice(index, finish).match(/\n/gu) ?? []).length;
        index = finish;
      } else {
        const end = source.indexOf('\n', index);
        index = end < 0 ? source.length : end;
      }
      continue;
    }
    if (source[index] === '"' || source[index] === "'") {
      const quote = source[index++];
      while (index < source.length) {
        if (source[index] === '\\') index += 2;
        else if (source[index++] === quote) break;
      }
      continue;
    }
    const long = /^\[(=*)\[/u.exec(source.slice(index));
    if (long) {
      const startLine = line;
      const close = `]${long[1]}]`;
      const end = source.indexOf(close, index + long[0].length);
      const finish = end < 0 ? source.length : end + close.length;
      const segment = source.slice(index, finish);
      const lineCount = (segment.match(/\n/gu) ?? []).length;
      for (let current = startLine + 1; current < startLine + lineCount; current++)
        protectedLines.add(current);
      line += lineCount;
      index = finish;
      continue;
    }
    index++;
  }
  return protectedLines;
}

/** Conservative Lua formatter: only leading/trailing whitespace changes. */
export function formatLua(source, indentUnit = '  ') {
  const maskedLines = maskTrivia(source).split('\n');
  const originalLines = source.split('\n');
  const protectedLines = longStringInteriorLines(source);
  let depth = 0;
  const formatted = originalLines.map((original, lineIndex) => {
    if (protectedLines.has(lineIndex)) return original;
    const structural = maskedLines[lineIndex].trim();
    const content = original.trim();
    if (!content) return '';
    const leadingKeywordClose = /^(?:end\b|until\b|else\b|elseif\b)/u
      .test(structural) ? 1 : 0;
    const leadingBracketClose = /^[}\])]+/u.exec(structural)?.[0].length ?? 0;
    const lineDepth = Math.max(0, depth - leadingKeywordClose - leadingBracketClose);

    const tokens = structural.match(/\b(?:function|then|do|repeat|else|end|until)\b/gu) ?? [];
    let keywordDelta = tokens.reduce((value, token) =>
      value + (['function', 'then', 'do', 'repeat'].includes(token) ? 1
        : ['end', 'until'].includes(token) ? -1 : 0), 0);
    if (/^elseif\b/u.test(structural)) keywordDelta--;
    const brackets = structural.replace(/\b(?:function|then|do|repeat|else|end|until)\b/gu, '');
    const bracketDelta = [...brackets].reduce((value, char) =>
      value + ('{(['.includes(char) ? 1 : '}])'.includes(char) ? -1 : 0), 0);
    depth = Math.max(0, depth + keywordDelta + bracketDelta);
    return indentUnit.repeat(lineDepth) + content;
  });
  return formatted.join('\n');
}
