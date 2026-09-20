import { LUA_KEYWORDS, LUA_STDLIB } from './stdlib.js';

const IDENTIFIER_SOURCE = '(?:[A-Za-z_]|[^\\x00-\\x7F])(?:[A-Za-z0-9_]|[^\\x00-\\x7F])*';
const IDENTIFIER = new RegExp(`^${IDENTIFIER_SOURCE}$`, 'u');
const IDENTIFIER_GLOBAL = new RegExp(IDENTIFIER_SOURCE, 'gu');

function offsetToPosition(text, offset) {
  const before = text.slice(0, offset).split('\n');
  return { lineNumber: before.length, column: before.at(-1).length + 1 };
}

function rangeAt(text, offset, length) {
  const start = offsetToPosition(text, offset);
  const end = offsetToPosition(text, offset + length);
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column
  };
}

/** Replace strings and comments with spaces while preserving offsets/newlines. */
export function maskTrivia(source) {
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
        const end = source.indexOf(close, index + long[0].length);
        const finish = end < 0 ? source.length : end + close.length;
        mask(index, finish);
        index = finish;
      } else {
        const end = source.indexOf('\n', index);
        const finish = end < 0 ? source.length : end;
        mask(index, finish);
        index = finish;
      }
      continue;
    }
    const long = /^\[(=*)\[/.exec(source.slice(index));
    if (long) {
      const close = `]${long[1]}]`;
      const end = source.indexOf(close, index + long[0].length);
      const finish = end < 0 ? source.length : end + close.length;
      mask(index, finish);
      index = finish;
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

function documentationInfoBefore(source, offset) {
  const before = source.slice(0, offset).split('\n');
  const lines = [];
  for (let index = before.length - 2; index >= 0; index--) {
    const match = /^\s*---?\s?(.*)$/.exec(before[index]);
    if (!match) break;
    lines.unshift(match[1]);
  }
  const summary = [];
  const parameters = {};
  const returns = [];
  const fields = [];
  let declaredType = '';
  for (const line of lines) {
    let match;
    if ((match = /^@param\s+(\S+)\s+(\S+)(?:\s+(.*))?$/u.exec(line))) {
      const optional = match[1].endsWith('?');
      const name = optional ? match[1].slice(0, -1) : match[1];
      parameters[name] = {
        type: match[2], description: match[3] ?? '', optional
      };
    } else if ((match = /^@return\s+(\S+)(?:\s+(.*))?$/u.exec(line))) {
      returns.push({ type: match[1], description: match[2] ?? '' });
    } else if ((match = /^@field\s+(\S+)\s+(\S+)(?:\s+(.*))?$/u.exec(line))) {
      fields.push({ name: match[1], type: match[2], description: match[3] ?? '' });
    } else if ((match = /^@(?:class|type)\s+(\S+)/u.exec(line))) {
      declaredType = match[1];
    } else if (!line.startsWith('@')) summary.push(line);
  }
  const annotationText = [
    ...Object.entries(parameters).map(([name, item]) =>
      `参数 \`${name}\`：\`${item.type}\`${item.description ? ` — ${item.description}` : ''}`),
    ...returns.map(item =>
      `返回：\`${item.type}\`${item.description ? ` — ${item.description}` : ''}`),
    ...fields.map(item =>
      `字段 \`${item.name}\`：\`${item.type}\`${item.description ? ` — ${item.description}` : ''}`)
  ];
  return {
    documentation: [...summary, ...annotationText].filter(Boolean).join('\n'),
    parameters, returns, fields, declaredType
  };
}

function documentationBefore(source, offset) {
  return documentationInfoBefore(source, offset).documentation;
}

function functionDetail(name, parameters, docs) {
  const argumentsText = parameters.map(parameter => {
    const item = docs.parameters[parameter];
    return item ? `${parameter}${item.optional ? '?' : ''}: ${item.type}` : parameter;
  }).join(', ');
  const returns = docs.returns.length
    ? `: ${docs.returns.map(item => item.type).join(', ')}` : '';
  return `function ${name}(${argumentsText})${returns}`;
}

function addOccurrence(occurrences, name, range, offset) {
  const list = occurrences.get(name) ?? [];
  list.push({ range, offset });
  occurrences.set(name, list);
}

function addSymbol(symbols, source, uri, name, offset, options = {}) {
  if (!IDENTIFIER.test(name.split(/[.:]/).at(-1))) return;
  symbols.push({
    name,
    kind: options.kind ?? 'variable',
    scope: options.scope ?? 'global',
    uri,
    range: rangeAt(source, offset, name.length),
    detail: options.detail ?? name,
    documentation: options.documentation ?? documentationBefore(source, offset),
    containerName: options.containerName,
    parameters: options.parameters ?? [],
    offset,
    visibilityStart: options.visibilityStart ?? 0,
    visibilityEnd: options.visibilityEnd ?? source.length
  });
}

function createScopes(masked) {
  const root = { type: 'root', start: 0, end: masked.length, parent: null };
  const scopes = [root];
  const stack = [root];
  const tokenPattern = /\b(function|if|for|while|repeat|do|end|until)\b/gu;
  for (const match of masked.matchAll(tokenPattern)) {
    const token = match[1];
    if (token === 'end' || token === 'until') {
      if (stack.length > 1) {
        const scope = stack.pop();
        scope.end = match.index + token.length;
      }
      continue;
    }
    if (token === 'do') {
      const current = stack.at(-1);
      if ((current.type === 'for' || current.type === 'while') && !current.bodyStarted) {
        current.bodyStarted = true;
        continue;
      }
    }
    const scope = {
      type: token,
      start: match.index,
      end: masked.length,
      parent: stack.at(-1),
      bodyStarted: false
    };
    scopes.push(scope);
    stack.push(scope);
  }
  return scopes;
}

function innermostScope(scopes, offset, type) {
  return scopes
    .filter(scope => (!type || scope.type === type) &&
      scope.start <= offset && offset <= scope.end)
    .sort((left, right) => right.start - left.start)[0] ?? scopes[0];
}

function curlyDepthAt(source, offset) {
  let depth = 0;
  for (let index = 0; index < offset; index++) {
    if (source[index] === '{') depth++;
    else if (source[index] === '}') depth = Math.max(0, depth - 1);
  }
  return depth;
}

/** Analyze editor-oriented Lua symbols without changing compiler semantics. */
export function analyze(source, uri = 'file:///main.lua') {
  const symbols = [];
  const members = new Map();
  const aliases = new Map();
  const occurrences = new Map();
  const masked = maskTrivia(source);
  const scopes = createScopes(masked);
  const moduleName = /^\s*---@module\s+([^\s]+)\s*$/mu.exec(source)?.[1] ?? '';
  const moduleRoot = moduleName
    ? new RegExp(`\breturn\s+(${IDENTIFIER_SOURCE})\b`, 'u').exec(masked)?.[1] ?? 'M'
    : '';

  const functionPattern = new RegExp(
    `\\b(?:(local|global)\\s+)?function\\s+(${IDENTIFIER_SOURCE}(?:[.:]${IDENTIFIER_SOURCE})*)\\s*\\(([^)]*)\\)`,
    'gu'
  );
  for (const match of masked.matchAll(functionPattern)) {
    const name = match[2];
    const offset = match.index + match[0].indexOf(name);
    const parameters = match[3].split(',').map(item => item.trim())
      .filter(item => item === '...' || IDENTIFIER.test(item));
    const docs = documentationInfoBefore(source, offset);
    const separator = Math.max(name.lastIndexOf('.'), name.lastIndexOf(':'));
    const containerName = separator >= 0 ? name.slice(0, separator) : undefined;
    const shortName = separator >= 0 ? name.slice(separator + 1) : name;
    const functionScope = innermostScope(scopes,
      match.index + match[0].indexOf('function'), 'function');
    const declarationScope = functionScope.parent ?? scopes[0];
    addSymbol(symbols, source, uri, name, offset, {
      kind: 'function', scope: match[1] ?? 'global', containerName,
      parameters,
      documentation: docs.documentation,
      visibilityStart: match[1] === 'local' ? offset : 0,
      visibilityEnd: match[1] === 'local' ? declarationScope.end : source.length,
      detail: functionDetail(name, parameters, docs)
    });
    if (containerName) {
      const list = members.get(containerName) ?? [];
      list.push({ name: shortName, symbol: symbols.at(-1) });
      members.set(containerName, list);
    }
    for (const parameter of parameters) {
      if (parameter === '...') continue;
      const parameterOffset = match.index + match[0].lastIndexOf(parameter);
      const parameterScope = innermostScope(scopes,
        match.index + match[0].indexOf('function'), 'function');
      addSymbol(symbols, source, uri, parameter, parameterOffset, {
        kind: 'parameter', scope: name, detail: `参数 ${parameter}`,
        visibilityStart: parameterOffset, visibilityEnd: parameterScope.end
      });
    }
  }

  const declarationPattern = new RegExp(
    `\\b(local|global)\\s+(?!function\\b)(${IDENTIFIER_SOURCE}(?:\\s*,\\s*${IDENTIFIER_SOURCE})*)`,
    'gu'
  );
  for (const match of masked.matchAll(declarationPattern)) {
    let cursor = match.index + match[0].indexOf(match[2]);
    for (const rawName of match[2].split(',')) {
      const name = rawName.trim();
      const relative = masked.indexOf(name, cursor);
      const declarationScope = innermostScope(scopes, relative);
      addSymbol(symbols, source, uri, name, relative, {
        scope: match[1], detail: `${match[1]} ${name}`,
        visibilityStart: relative,
        visibilityEnd: match[1] === 'local' ? declarationScope.end : source.length
      });
      const docs = documentationInfoBefore(source, match.index);
      if (docs.declaredType) aliases.set(name, docs.declaredType);
      cursor = relative + name.length;
    }
  }

  const prefixedGlobalPattern = new RegExp(
    `\\bglobal\\s+<const>\\s+(${IDENTIFIER_SOURCE}(?:\\s*,\\s*${IDENTIFIER_SOURCE}(?:\\s*<const>)?)*)`,
    'gu'
  );
  for (const match of masked.matchAll(prefixedGlobalPattern)) {
    let cursor = match.index + match[0].indexOf(match[1]);
    for (const rawName of match[1].split(',')) {
      const name = rawName.replace(/\s*<const>\s*$/u, '').trim();
      const offset = masked.indexOf(name, cursor);
      if (!symbols.some(symbol => symbol.name === name && symbol.offset === offset))
        addSymbol(symbols, source, uri, name, offset, {
          scope: 'global', detail: `global <const> ${name}`,
          visibilityStart: 0, visibilityEnd: source.length
        });
      cursor = offset + name.length;
    }
  }

  const functionAssignmentPattern = new RegExp(
    `\\b(?:(local|global)\\s+)?(${IDENTIFIER_SOURCE}(?:[.:]${IDENTIFIER_SOURCE})*)\\s*=\\s*function\\s*\\(([^)]*)\\)`,
    'gu'
  );
  for (const match of masked.matchAll(functionAssignmentPattern)) {
    if (curlyDepthAt(masked, match.index) > 0) continue;
    const name = match[2];
    const offset = match.index + match[0].indexOf(name);
    const parameters = match[3].split(',').map(item => item.trim())
      .filter(item => item === '...' || IDENTIFIER.test(item));
    const docs = documentationInfoBefore(source, offset);
    const separator = Math.max(name.lastIndexOf('.'), name.lastIndexOf(':'));
    const containerName = separator >= 0 ? name.slice(0, separator) : undefined;
    const shortName = separator >= 0 ? name.slice(separator + 1) : name;
    let symbol = symbols.find(item => item.name === name && item.offset === offset);
    if (symbol) {
      symbol.kind = 'function';
      symbol.parameters = parameters;
      symbol.detail = functionDetail(name, parameters, docs);
      symbol.documentation = docs.documentation;
      symbol.containerName = containerName;
    } else {
      addSymbol(symbols, source, uri, name, offset, {
        kind: 'function', scope: match[1] ?? (containerName ? 'member' : 'global'),
        containerName, parameters,
        documentation: docs.documentation,
        detail: functionDetail(name, parameters, docs)
      });
      symbol = symbols.at(-1);
    }
    if (containerName) {
      const list = members.get(containerName) ?? [];
      if (!list.some(item => item.name === shortName))
        list.push({ name: shortName, symbol });
      members.set(containerName, list);
    }
    const functionOffset = match.index + match[0].indexOf('function');
    const functionScope = innermostScope(scopes, functionOffset, 'function');
    for (const parameter of parameters) {
      if (parameter === '...') continue;
      const parameterOffset = match.index + match[0].lastIndexOf(parameter);
      addSymbol(symbols, source, uri, parameter, parameterOffset, {
        kind: 'parameter', scope: name, detail: `参数 ${parameter}`,
        visibilityStart: parameterOffset, visibilityEnd: functionScope.end
      });
    }
  }

  const tableAssignmentPattern = new RegExp(
    `\\b(?:(?:local|global)\\s+)?(${IDENTIFIER_SOURCE})\\s*=\\s*\\{`, 'gu');
  for (const match of masked.matchAll(tableAssignmentPattern)) {
    const containerName = match[1];
    const tableDocs = documentationInfoBefore(source, match.index);
    if (tableDocs.declaredType) {
      aliases.delete(containerName);
      aliases.set(tableDocs.declaredType, containerName);
    }
    const open = match.index + match[0].lastIndexOf('{');
    let close = open + 1;
    let depth = 1;
    while (close < masked.length && depth > 0) {
      if (masked[close] === '{') depth++;
      else if (masked[close] === '}') depth--;
      close++;
    }
    if (depth !== 0) continue;
    const body = masked.slice(open + 1, close - 1);
    const fieldPattern = new RegExp(
      `(?:^|[,;])\\s*(${IDENTIFIER_SOURCE})\\s*=`, 'gu');
    for (const field of body.matchAll(fieldPattern)) {
      const prefix = body.slice(0, field.index);
      const nestedDepth = [...prefix].reduce((level, character) =>
        character === '{' ? level + 1 : character === '}' ? level - 1 : level, 0);
      if (nestedDepth !== 0) continue;
      const name = field[1];
      const offset = open + 1 + field.index + field[0].lastIndexOf(name);
      const after = masked.slice(offset + name.length).replace(/^\s*=\s*/u, '');
      const functionMatch = /^function\s*\(([^)]*)\)/u.exec(after);
      const parameters = functionMatch
        ? functionMatch[1].split(',').map(item => item.trim())
          .filter(item => item === '...' || IDENTIFIER.test(item))
        : [];
      const list = members.get(containerName) ?? [];
      if (list.some(item => item.name === name)) continue;
      addSymbol(symbols, source, uri, `${containerName}.${name}`, offset, {
        kind: functionMatch ? 'function' : 'field', scope: 'member',
        containerName, parameters,
        detail: functionMatch
          ? `function ${containerName}.${name}(${parameters.join(', ')})`
          : `${containerName}.${name}`
      });
      list.push({ name, symbol: symbols.at(-1) });
      members.set(containerName, list);
    }
    for (const field of tableDocs.fields) {
      const list = members.get(containerName) ?? [];
      if (list.some(item => item.name === field.name)) continue;
      addSymbol(symbols, source, uri, `${containerName}.${field.name}`,
        match.index + match[0].indexOf(containerName), {
          kind: 'field', scope: 'member', containerName,
          documentation: field.description,
          detail: `${containerName}.${field.name}: ${field.type}`
        });
      list.push({ name: field.name, symbol: symbols.at(-1) });
      members.set(containerName, list);
    }
  }

  const forPattern = new RegExp(
    `\\bfor\\s+(${IDENTIFIER_SOURCE}(?:\\s*,\\s*${IDENTIFIER_SOURCE})*)\\s*(?:=|\\bin\\b)`,
    'gu'
  );
  for (const match of masked.matchAll(forPattern)) {
    const forScope = innermostScope(scopes, match.index, 'for');
    let cursor = match.index + match[0].indexOf(match[1]);
    for (const rawName of match[1].split(',')) {
      const name = rawName.trim();
      const offset = masked.indexOf(name, cursor);
      addSymbol(symbols, source, uri, name, offset, {
        kind: 'variable', scope: 'for', detail: `循环变量 ${name}`,
        visibilityStart: offset, visibilityEnd: forScope.end
      });
      cursor = offset + name.length;
    }
  }

  const memberPattern = new RegExp(
    `\\b(${IDENTIFIER_SOURCE}(?:\\.${IDENTIFIER_SOURCE})*)[.:](${IDENTIFIER_SOURCE})\\s*=`,
    'gu'
  );
  for (const match of masked.matchAll(memberPattern)) {
    const containerName = match[1];
    const name = match[2];
    const offset = match.index + match[0].lastIndexOf(name);
    const list = members.get(containerName) ?? [];
    if (!list.some(item => item.name === name)) {
      addSymbol(symbols, source, uri, `${containerName}.${name}`, offset, {
        kind: 'field', scope: 'member', containerName,
        detail: `${containerName}.${name}`
      });
      list.push({ name, symbol: symbols.at(-1) });
      members.set(containerName, list);
    }
  }

  const aliasPattern = new RegExp(
    `\\b(?:(?:local|global)\\s+)?(${IDENTIFIER_SOURCE})\\s*=\\s*` +
    `(${IDENTIFIER_SOURCE}(?:\\.${IDENTIFIER_SOURCE})*)\\b`, 'gu');
  for (const match of masked.matchAll(aliasPattern)) {
    if (/^\s*\(/u.test(masked.slice(match.index + match[0].length))) continue;
    if (match[1] !== match[2] && !LUA_KEYWORDS.includes(match[2]))
      aliases.set(match[1], match[2]);
  }

  const requireAliasPattern = new RegExp(
    `\\b(?:local\\s+|global\\s+)?(${IDENTIFIER_SOURCE})\\s*=\\s*` +
    `require\\s*\\(\\s*(['"])([^'"]+)\\2\\s*\\)`, 'gu');
  for (const match of source.matchAll(requireAliasPattern)) {
    const requireOffset = match.index + match[0].indexOf('require');
    if (masked.slice(requireOffset, requireOffset + 7) === 'require')
      aliases.set(match[1], `@module:${match[3]}::`);
  }

  for (const match of masked.matchAll(IDENTIFIER_GLOBAL))
    addOccurrence(occurrences, match[0],
      rangeAt(source, match.index, match[0].length), match.index);

  const diagnostics = [];
  const lines = masked.split('\n');
  lines.forEach((line, index) => {
    const invalid = /(?:^|[^A-Za-z0-9_])(?:0[bB][01]+|\d+(?:ULL|LL|i)\b)/.exec(line);
    if (invalid) diagnostics.push({
      startLineNumber: index + 1,
      startColumn: invalid.index + 1,
      endLineNumber: index + 1,
      endColumn: invalid.index + invalid[0].length + 1,
      severity: 8,
      source: 'Lua 5.5.1 语义分析',
      message: 'Lua 5.5.1 不支持 LuaJIT 数字后缀或二进制数字。'
    });
  });
  const knownGlobals = new Set([
    ...LUA_KEYWORDS,
    ...Object.keys(LUA_STDLIB).map(name => name.split('.')[0]),
    '_G', '_VERSION', 'coroutine', 'debug', 'io', 'math', 'os', 'package',
    'string', 'table', 'utf8', 'js', 'vfs'
  ]);
  const assignmentPattern = new RegExp(
    `^(\\s*)(${IDENTIFIER_SOURCE})\\s*=(?!=)`, 'gmu'
  );
  for (const match of masked.matchAll(assignmentPattern)) {
    const name = match[2];
    const offset = match.index + match[0].indexOf(name);
    const declared = symbols.some(symbol =>
      symbol.name.split(/[.:]/).at(-1) === name &&
      symbol.visibilityStart <= offset && offset <= symbol.visibilityEnd);
    if (!declared && !knownGlobals.has(name)) diagnostics.push({
      startLineNumber: rangeAt(source, offset, name.length).startLineNumber,
      startColumn: rangeAt(source, offset, name.length).startColumn,
      endLineNumber: rangeAt(source, offset, name.length).endLineNumber,
      endColumn: rangeAt(source, offset, name.length).endColumn,
      severity: 4,
      source: 'Lua 5.5.1 语义分析',
      code: 'undeclared-global',
      message: `全局变量 '${name}' 未声明；Lua 5.5 可使用 global 声明。`
    });
  }
  return {
    uri, source, masked, symbols, members, aliases, occurrences, diagnostics,
    scopes, moduleName, moduleRoot
  };
}

const SNIPPETS = [
  { label: 'local function', kind: 'snippet', detail: '局部函数',
    insertText: 'local function ${1:name}(${2:args})\n\t${0}\nend', snippet: true },
  { label: 'function', kind: 'snippet', detail: '函数声明',
    insertText: 'function ${1:name}(${2:args})\n\t${0}\nend', snippet: true },
  { label: 'if', kind: 'snippet', detail: '条件分支',
    insertText: 'if ${1:condition} then\n\t${0}\nend', snippet: true },
  { label: 'fori', kind: 'snippet', detail: '数值 for 循环',
    insertText: 'for ${1:i} = ${2:1}, ${3:10} do\n\t${0}\nend', snippet: true },
  { label: 'forp', kind: 'snippet', detail: 'pairs 遍历',
    insertText: 'for ${1:key}, ${2:value} in pairs(${3:table}) do\n\t${0}\nend', snippet: true },
  { label: 'while', kind: 'snippet', detail: 'while 循环',
    insertText: 'while ${1:condition} do\n\t${0}\nend', snippet: true }
];

function stdlibCompletion(label, item, member = false) {
  const short = member ? label.split('.').at(-1) : label;
  const open = item.signature.indexOf('(');
  const close = item.signature.lastIndexOf(')');
  const parameters = open >= 0 && close > open
    ? (item.signature.slice(open + 1, close).match(
        /(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*|\.\.\./gu) ?? [])
    : null;
  const callText = parameters
    ? `${short}(${parameters.map((parameter, index) =>
        `\${${index + 1}:${parameter === '...' ? '…' : parameter}}`).join(', ')})`
    : null;
  const symbol = {
    label: short,
    filterText: short,
    sortText: member ? '1-' + label : '2-' + label,
    kind: label.includes('.') ? 'method' : 'function',
    detail: item.signature,
    documentation: item.doc,
    insertText: short,
    snippet: false,
    preselect: true
  };
  return callText ? [symbol, {
    label: `${short}(…)`,
    filterText: `调用完整函数 ${short}`,
    sortText: symbol.sortText + '-call',
    kind: 'snippet',
    detail: `调用 · ${item.signature}`,
    documentation: item.doc,
    insertText: callText,
    snippet: true
  }] : [symbol];
}

function symbolCompletion(symbol, label, documentation, sortText) {
  const parameters = symbol.kind === 'function' ? symbol.parameters ?? [] : null;
  const value = {
    label,
    kind: symbol.kind,
    detail: symbol.detail,
    documentation,
    insertText: label,
    snippet: false,
    preselect: symbol.kind === 'function',
    sortText
  };
  return parameters ? [value, {
    label: `${label}(…)`,
    filterText: `调用完整函数 ${label}`,
    kind: 'snippet',
    detail: `调用 · ${symbol.detail}`,
    documentation,
    insertText: `${label}(${parameters.map((parameter, index) =>
      `\${${index + 1}:${parameter === '...' ? '…' : parameter}}`).join(', ')})`,
    snippet: true,
    sortText: sortText + '-call'
  }] : [value];
}

/** Resolve local/library aliases and `require()` aliases into indexed names. */
export function resolveAlias(documents, document, requested) {
  let name = requested;
  const visited = new Set();
  while (!visited.has(name)) {
    visited.add(name);
    const aliases = [...(document?.aliases?.entries() ?? [])]
      .filter(([alias]) => name === alias || name.startsWith(alias + '.'))
      .sort((left, right) => right[0].length - left[0].length);
    if (!aliases.length) break;
    name = aliases[0][1] + name.slice(aliases[0][0].length);
  }
  const moduleTarget = /^@module:(.+?)::(.*)$/u.exec(name);
  if (!moduleTarget) return { name };
  const target = [...documents.values()].find(item =>
    item.moduleName === moduleTarget[1]);
  if (!target) return { name };
  const suffix = moduleTarget[2].replace(/^\./u, '');
  return {
    name: target.moduleRoot + (suffix ? '.' + suffix : ''),
    uri: target.uri
  };
}

/** Return completion items filtered by member/global context at the cursor. */
export function completions(documents, uri, offset) {
  const current = documents.get(uri);
  const prefixText = current?.source.slice(0, offset) ?? '';
  const memberMatch = new RegExp(
    `(${IDENTIFIER_SOURCE}(?:\\.${IDENTIFIER_SOURCE})*)[.:](${IDENTIFIER_SOURCE})?$`, 'u'
  ).exec(prefixText);
  const result = [];
  const seen = new Set();
  const push = item => {
    const key = `${item.label}:${item.kind}`;
    if (!seen.has(key)) { seen.add(key); result.push(item); }
  };
  const pushAll = items => { for (const item of items) push(item); };

  if (memberMatch) {
    const requestedContainer = memberMatch[1];
    const resolved = resolveAlias(documents, current, requestedContainer);
    const container = resolved.name;
    for (const [label, item] of Object.entries(LUA_STDLIB))
      if (label.startsWith(container + '.'))
        pushAll(stdlibCompletion(label, item, true));
    for (const document of documents.values()) {
      if (resolved.uri && document.uri !== resolved.uri) continue;
      for (const member of document.members.get(container) ?? []) {
        pushAll(symbolCompletion(member.symbol, member.name,
          member.symbol.documentation ||
            (document.uri === uri ? '当前工作区成员' : '只读定义：' + document.uri),
          '0-' + member.name));
      }
    }
    return result;
  }

  for (const snippet of SNIPPETS) push(snippet);
  for (const label of LUA_KEYWORDS)
    push({ label, kind: 'keyword', detail: 'Lua 5.5.1 关键字', sortText: '3-' + label });
  for (const [label, item] of Object.entries(LUA_STDLIB))
    if (!label.includes('.')) pushAll(stdlibCompletion(label, item));

  const modules = new Set(Object.keys(LUA_STDLIB).filter(label => label.includes('.'))
    .map(label => label.split('.')[0]));
  for (const label of modules)
    push({ label, kind: 'module', detail: 'Lua 5.5 标准库', sortText: '1-' + label });

  for (const document of documents.values()) {
    for (const symbol of document.symbols) {
      if (symbol.containerName || symbol.kind === 'parameter' && document.uri !== uri) continue;
      if (document.uri === uri && (offset < symbol.visibilityStart ||
          offset > symbol.visibilityEnd)) continue;
      const label = symbol.name.split(/[.:]/).at(-1);
      pushAll(symbolCompletion(symbol, label,
        symbol.documentation ||
          (document.uri === uri ? '当前文档符号' : '只读虚拟定义：' + document.uri),
        document.uri === uri ? '0-' + label : '1-' + label));
    }
  }
  return result;
}

export function identifierAt(source, offset) {
  let start = offset;
  let end = offset;
  const isPart = value => /[A-Za-z0-9_.:\u0080-\uFFFF]/u.test(value);
  while (start > 0 && isPart(source[start - 1])) start--;
  while (end < source.length && isPart(source[end])) end++;
  return { word: source.slice(start, end).replace(':', '.'), start, end };
}
