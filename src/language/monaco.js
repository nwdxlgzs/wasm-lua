import 'monaco-editor/nls/lang/zh-cn.js';
// Monaco 0.56 splits the editor API from contributions. Without this import,
// `editor.api.js` silently lacks find/replace, suggest, rename and F1 actions.
import 'monaco-editor/features/register.all.js';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import { LuaLanguageClient } from './service.js';
import { LUA_KEYWORDS, LUA_STDLIB } from './stdlib.js';
import { analyze } from './analyzer.js';
import { formatLua } from './formatter.js';
import { computeLuaFoldingRanges } from './folding.js';

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  }
};

const client = new LuaLanguageClient();
const models = new Map();
const TOKEN_KEYWORDS = LUA_KEYWORDS.filter(keyword => keyword !== 'global');
const TOKEN_BUILTINS = Object.keys(LUA_STDLIB ?? {}).filter(name => !name.includes('.'));

monaco.languages.register({
  id: 'lua55',
  extensions: ['.lua'],
  aliases: ['Lua 5.5', 'lua'],
  mimetypes: ['text/x-lua']
});

monaco.languages.setLanguageConfiguration('lua55', {
  wordPattern: /(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*/g,
  comments: { lineComment: '--', blockComment: ['--[[', ']]'] },
  brackets: [['{', '}'], ['[', ']'], ['(', ')']],
  autoClosingPairs: [
    { open: '{', close: '}' }, { open: '[', close: ']' },
    { open: '(', close: ')' }, { open: '"', close: '"' },
    { open: "'", close: "'" }
  ],
  surroundingPairs: [
    { open: '{', close: '}' }, { open: '[', close: ']' },
    { open: '(', close: ')' }, { open: '"', close: '"' },
    { open: "'", close: "'" }
  ],
  folding: { markers: { start: /^\s*--\s*#?region\b/, end: /^\s*--\s*#?endregion\b/ } },
  indentationRules: {
    increaseIndentPattern: /^\s*(?:(?:local|global\s+)?function\b|if\b.*\bthen\s*$|for\b.*\bdo\s*$|while\b.*\bdo\s*$|do\s*$|repeat\s*$)/,
    decreaseIndentPattern: /^\s*(?:end\b|until\b|elseif\b|else\b)/
  }
});

monaco.languages.setMonarchTokensProvider('lua55', {
  defaultToken: '',
  tokenPostfix: '.lua55',
  keywords: TOKEN_KEYWORDS,
  builtins: TOKEN_BUILTINS,
  operators: ['+', '-', '*', '/', '//', '%', '^', '#', '&', '~', '|', '<<', '>>', '..', '<', '<=', '>', '>=', '==', '~=', '='],
  symbols: /[=><!~?:&|+\-*\/\^%#]+/,
  tokenizer: {
    root: [
      [/--\[([=]*)\[/, { token: 'comment.doc', next: '@comment.$1' }],
      [/(---\s*)([@]param)(\s+)((?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*\??)(\s+)([^\s]+)(.*$)/,
        ['comment.doc', 'annotation', 'comment.doc', 'parameter', 'comment.doc', 'type', 'comment.doc']],
      [/(---\s*)([@]field)(\s+)((?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*\??)(\s+)([^\s]+)(.*$)/,
        ['comment.doc', 'annotation', 'comment.doc', 'property.declaration', 'comment.doc', 'type', 'comment.doc']],
      [/(---\s*)([@](?:return|class|type|alias|generic|module|overload))(\s+)([^\s]+)(.*$)/,
        ['comment.doc', 'annotation', 'comment.doc', 'type', 'comment.doc']],
      [/(---\s*)([@](?:deprecated|nodiscard|meta))\b(.*$)/,
        ['comment.doc', 'annotation', 'comment.doc']],
      [/---.*$/, 'comment.doc'],
      [/--.*$/, 'comment'],
      [/\b(?:local|function)\b/, 'keyword.declaration'],
      [/\bglobal(?=\s+(?:<const>\s+)?(?:\*|function\b|(?:[A-Za-z_]|[^\x00-\x7F])))/, 'keyword.declaration'],
      [/\b(?:if|then|else|elseif|for|while|do|repeat|until|end|break|goto|return|in)\b/, 'keyword.control'],
      [/\b(?:and|or|not)\b/, 'keyword.operator'],
      [/\b(?:true|false|nil)\b/, 'constant.language'],
      [/\b(?:_G|_ENV|_VERSION)\b/, 'constant.predefined'],
      [/\bself\b/, 'variable.language'],
      [/<(?:const|close)>/, 'type.attribute'],
      [/::(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*::/, 'tag'],
      [/\.\.\./, 'keyword.vararg'],
      [/(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*(?=\s*\()/, {
        cases: { '@keywords': 'keyword', '@builtins': 'support.function', '@default': 'function' }
      }],
      [/(?<=[.:])(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*/, 'property'],
      [/(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*(?=\s*=)/, 'property.declaration'],
      [/(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*/, {
        cases: { '@keywords': 'keyword', '@builtins': 'support.function', '@default': 'identifier' }
      }],
      [/[{}()\[\]]/, '@brackets'],
      [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
      [/0[xX][0-9a-fA-F]+(?:\.[0-9a-fA-F]*)?(?:[pP][+-]?\d+)?/, 'number.hex'],
      [/\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/, 'number'],
      [/\[([=]*)\[/, { token: 'string', next: '@longstring.$1' }],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, { token: 'string.quote', bracket: '@open', next: '@double' }],
      [/'/, { token: 'string.quote', bracket: '@open', next: '@single' }]
    ],
    comment: [
      [/[^\]]+/, 'comment'],
      [/\]([=]*)\]/, { cases: { '$1==$S2': { token: 'comment', next: '@pop' }, '@default': 'comment' } }],
      [/./, 'comment']
    ],
    longstring: [
      [/[^\]]+/, 'string'],
      [/\]([=]*)\]/, { cases: { '$1==$S2': { token: 'string', next: '@pop' }, '@default': 'string' } }],
      [/./, 'string']
    ],
    double: [[/[^\\"]+/, 'string'], [/\\./, 'string.escape'], [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]],
    single: [[/[^\\']+/, 'string'], [/\\./, 'string.escape'], [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }]]
  }
});

/** @type {Parameters<typeof monaco.editor.defineTheme>[1]} */
const VSCODE_DARK_PLUS_LUA = {
  base: 'vs-dark', inherit: true,
  rules: [
    { token: 'keyword.lua55', foreground: '569CD6' },
    { token: 'keyword.declaration.lua55', foreground: '569CD6' },
    { token: 'keyword.control.lua55', foreground: 'C586C0' },
    { token: 'keyword.operator.lua55', foreground: '569CD6' },
    { token: 'keyword.vararg.lua55', foreground: '569CD6' },
    { token: 'constant.language.lua55', foreground: '569CD6' },
    { token: 'constant.predefined.lua55', foreground: '4FC1FF' },
    { token: 'type.attribute.lua55', foreground: '4EC9B0', fontStyle: 'italic' },
    { token: 'type.lua55', foreground: '4EC9B0' },
    { token: 'annotation.lua55', foreground: 'C586C0' },
    { token: 'identifier.lua55', foreground: 'D4D4D4' },
    { token: 'function.lua55', foreground: 'DCDCAA' },
    { token: 'support.function.lua55', foreground: 'DCDCAA' },
    { token: 'function', foreground: 'DCDCAA' },
    { token: 'function.declaration', foreground: 'DCDCAA' },
    { token: 'method', foreground: 'DCDCAA' },
    { token: 'method.declaration', foreground: 'DCDCAA' },
    { token: 'parameter', foreground: '9CDCFE' },
    { token: 'variable', foreground: '9CDCFE' },
    { token: 'variable.readonly', foreground: '4FC1FF' },
    { token: 'variable.language.lua55', foreground: '9CDCFE', fontStyle: 'italic' },
    { token: 'property', foreground: '9CDCFE' },
    { token: 'property.declaration.lua55', foreground: '9CDCFE' },
    { token: 'namespace', foreground: '4EC9B0' },
    { token: 'property.lua55', foreground: '9CDCFE' },
    { token: 'operator.lua55', foreground: 'D4D4D4' },
    { token: 'number.lua55', foreground: 'B5CEA8' },
    { token: 'number.hex.lua55', foreground: 'B5CEA8' },
    { token: 'string.lua55', foreground: 'CE9178' },
    { token: 'string.escape.lua55', foreground: 'D7BA7D' },
    { token: 'comment.lua55', foreground: '6A9955' },
    { token: 'comment.doc.lua55', foreground: '6A9955' },
    { token: 'tag.lua55', foreground: 'C586C0' }
  ],
  colors: {
    'editor.background': '#1E1E1E',
    'editor.foreground': '#D4D4D4',
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#C6C6C6',
    'editor.selectionBackground': '#264F78',
    'editor.inactiveSelectionBackground': '#3A3D41',
    'editor.selectionHighlightBackground': '#ADD6FF26',
    'editor.wordHighlightBackground': '#575757B8',
    'editor.wordHighlightStrongBackground': '#004972B8',
    'editorCursor.foreground': '#AEAFAD',
    'editorIndentGuide.background1': '#404040',
    'editorIndentGuide.activeBackground1': '#707070',
    'editorBracketHighlight.foreground1': '#FFD700',
    'editorBracketHighlight.foreground2': '#DA70D6',
    'editorBracketHighlight.foreground3': '#179FFF',
    'editorWhitespace.foreground': '#3B3A32'
  }
};

// Keep the old public theme id as a compatibility alias.
monaco.editor.defineTheme('lua55-vscode-dark', VSCODE_DARK_PLUS_LUA);
monaco.editor.defineTheme('lua55-dark', VSCODE_DARK_PLUS_LUA);

function offset(model, position) { return model.getOffsetAt(position); }

function asRange(value) {
  return new monaco.Range(
    value.startLineNumber, value.startColumn,
    value.endLineNumber, value.endColumn
  );
}

function completionKind(kind) {
  if (kind === 'function') return monaco.languages.CompletionItemKind.Function;
  if (kind === 'method') return monaco.languages.CompletionItemKind.Method;
  if (kind === 'field') return monaco.languages.CompletionItemKind.Field;
  if (kind === 'module') return monaco.languages.CompletionItemKind.Module;
  if (kind === 'parameter') return monaco.languages.CompletionItemKind.TypeParameter;
  if (kind === 'snippet') return monaco.languages.CompletionItemKind.Snippet;
  if (kind === 'keyword') return monaco.languages.CompletionItemKind.Keyword;
  return monaco.languages.CompletionItemKind.Variable;
}

function signatureParameters(signature) {
  const open = signature.indexOf('(');
  const close = signature.lastIndexOf(')');
  if (open < 0 || close <= open) return [];
  return (signature.slice(open + 1, close).match(
    /(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*|\.\.\./gu) ?? [])
    .map(label => ({ label }));
}

monaco.languages.registerCompletionItemProvider('lua55', {
  triggerCharacters: ['.', ':', '(', ','],
  async provideCompletionItems(model, position) {
    const word = model.getWordUntilPosition(position);
    const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
    const items = await client.completions(
      model.uri.toString(), offset(model, position), model.getValue());
    return {
      suggestions: items.map(item => ({
        label: item.label,
        kind: completionKind(item.kind),
        detail: item.detail,
        documentation: item.documentation,
        insertText: item.insertText ?? item.label,
        insertTextRules: item.snippet
          ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
          : undefined,
        preselect: item.preselect,
        filterText: item.filterText,
        sortText: item.sortText,
        range
      }))
    };
  }
});

monaco.languages.registerHoverProvider('lua55', {
  async provideHover(model, position) {
    const result = await client.hover(
      model.uri.toString(), offset(model, position), model.getValue());
    if (!result) return null;
    const start = model.getPositionAt(result.range.start);
    const end = model.getPositionAt(result.range.end);
    return {
      range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
      contents: [{ value: result.signature }, { value: result.doc }]
    };
  }
});

monaco.languages.registerSignatureHelpProvider('lua55', {
  signatureHelpTriggerCharacters: ['(', ','],
  async provideSignatureHelp(model, position) {
    const result = await client.signature(
      model.uri.toString(), offset(model, position), model.getValue());
    if (!result) return null;
    return {
      value: {
        signatures: [{
          label: result.signature,
          documentation: result.doc,
          parameters: signatureParameters(result.signature)
        }],
        activeSignature: 0,
        activeParameter: result.activeParameter ?? 0
      },
      dispose() {}
    };
  }
});

monaco.languages.registerDefinitionProvider('lua55', {
  async provideDefinition(model, position) {
    const result = await client.definition(
      model.uri.toString(), offset(model, position), model.getValue());
    return result ? { uri: monaco.Uri.parse(result.uri), range: asRange(result.range) } : null;
  }
});

monaco.languages.registerReferenceProvider('lua55', {
  async provideReferences(model, position) {
    return (await client.references(
      model.uri.toString(), offset(model, position), model.getValue()))
      .map(item => ({ uri: monaco.Uri.parse(item.uri), range: asRange(item.range) }));
  }
});

monaco.languages.registerDocumentHighlightProvider('lua55', {
  async provideDocumentHighlights(model, position) {
    return (await client.references(
      model.uri.toString(), offset(model, position), model.getValue()))
      .filter(item => item.uri === model.uri.toString())
      .map(item => ({ range: asRange(item.range), kind: monaco.languages.DocumentHighlightKind.Text }));
  }
});

monaco.languages.registerRenameProvider('lua55', {
  async provideRenameEdits(model, position, newName) {
    if (isReadonlyModel(model.uri)) throw new Error('只读定义文件不能重命名。');
    if (!/^(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*$/u.test(newName) ||
        LUA_KEYWORDS.includes(newName))
      throw new Error('新名称不是合法的 Lua 5.5 标识符。');
    const references = await client.references(
      model.uri.toString(), offset(model, position), model.getValue());
    return {
      edits: references
        .filter(item => item.uri === model.uri.toString())
        .map(item => ({
          resource: model.uri,
          versionId: model.getVersionId(),
          textEdit: { range: asRange(item.range), text: newName }
        }))
    };
  },
  resolveRenameLocation(model, position) {
    const word = model.getWordAtPosition(position);
    return word ? {
      text: word.word,
      range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)
    } : {
      text: '',
      range: new monaco.Range(position.lineNumber, position.column,
        position.lineNumber, position.column),
      rejectReason: '光标处不是可重命名的 Lua 标识符。'
    };
  }
});

monaco.languages.registerDocumentSymbolProvider('lua55', {
  async provideDocumentSymbols(model) {
    return (await client.symbols(model.uri.toString(), model.getValue())).map(item => ({
      name: item.name,
      detail: item.detail,
      kind: item.kind === 'function' ? monaco.languages.SymbolKind.Function : monaco.languages.SymbolKind.Variable,
      range: asRange(item.range),
      selectionRange: asRange(item.range),
      children: []
    }));
  }
});

monaco.languages.registerFoldingRangeProvider('lua55', {
  provideFoldingRanges(model) {
    return computeLuaFoldingRanges(model.getValue()).map(range => ({
      start: range.start,
      end: range.end,
      kind: range.kind === 'comment'
        ? monaco.languages.FoldingRangeKind.Comment
        : range.kind === 'region'
          ? monaco.languages.FoldingRangeKind.Region
          : undefined
    }));
  }
});

monaco.languages.registerDocumentFormattingEditProvider('lua55', {
  provideDocumentFormattingEdits(model, options) {
    const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    const formatted = formatLua(model.getValue(), indent);
    if (formatted === model.getValue()) return [];
    return [{ range: model.getFullModelRange(), text: formatted }];
  }
});

const semanticLegend = {
  tokenTypes: ['function', 'method', 'variable', 'parameter', 'property', 'namespace'],
  tokenModifiers: ['declaration', 'readonly', 'local', 'global']
};

monaco.languages.registerDocumentSemanticTokensProvider('lua55', {
  getLegend: () => semanticLegend,
  provideDocumentSemanticTokens(model) {
    const tokenMap = new Map();
    const analysis = analyze(model.getValue(), model.uri.toString());
    for (const symbol of analysis.symbols) {
      const name = symbol.name.split(/[.:]/u).at(-1);
      const type = symbol.kind === 'function'
        ? (symbol.containerName ? 1 : 0)
        : symbol.kind === 'parameter' ? 3
          : symbol.containerName || symbol.kind === 'field' ? 4 : 2;
      const priority = type === 3 ? 6 : type <= 1 ? 5 : type === 4 ? 4 : 2;
      const declarationOffset = symbol.offset + symbol.name.length - name.length;
      for (const occurrence of analysis.occurrences.get(name) ?? []) {
        if (occurrence.offset < symbol.visibilityStart ||
            occurrence.offset > symbol.visibilityEnd) continue;
        const position = model.getPositionAt(occurrence.offset);
        let modifiers = occurrence.offset === declarationOffset ? 1 : 0;
        if (modifiers && /<const>/u.test(model.getLineContent(position.lineNumber)))
          modifiers |= 2;
        if (['local', 'parameter', 'for'].includes(symbol.scope)) modifiers |= 4;
        if (symbol.scope === 'global') modifiers |= 8;
        const key = `${position.lineNumber}:${position.column}`;
        const existing = tokenMap.get(key);
        if (!existing || existing.priority < priority)
          tokenMap.set(key, {
            line: position.lineNumber - 1, column: position.column - 1,
            length: name.length, type, modifiers, priority
          });
      }
    }
    const tokens = [...tokenMap.values()];
    tokens.sort((a, b) => a.line - b.line || a.column - b.column);
    const data = [];
    let previousLine = 0;
    let previousColumn = 0;
    for (const token of tokens) {
      const lineDelta = token.line - previousLine;
      const columnDelta = lineDelta ? token.column : token.column - previousColumn;
      data.push(lineDelta, columnDelta, token.length, token.type, token.modifiers);
      previousLine = token.line;
      previousColumn = token.column;
    }
    return { data: new Uint32Array(data), resultId: String(model.getVersionId()) };
  },
  releaseDocumentSemanticTokens() {}
});

monaco.languages.registerCodeActionProvider('lua55', {
  provideCodeActions(model, _range, context) {
    const actions = [];
    for (const marker of context.markers) {
      const name = /(?:variable|全局变量) '([^']+)' (?:not declared|未声明)/.exec(marker.message)?.[1];
      if (!name) continue;
      actions.push({
        title: `声明全局变量 ${name}`,
        kind: 'quickfix',
        diagnostics: [marker],
        isPreferred: true,
        edit: {
          edits: [{
            resource: model.uri,
            versionId: model.getVersionId(),
            textEdit: {
              range: new monaco.Range(1, 1, 1, 1),
              text: `global ${name}\n`
            }
          }]
        }
      });
    }
    return { actions, dispose() {} };
  }
});

export { monaco, client as luaLanguageClient };

export async function createLuaModel(source, uri = 'file:///main.lua', readonly = false) {
  const parsed = monaco.Uri.parse(uri);
  let model = monaco.editor.getModel(parsed);
  if (!model) model = monaco.editor.createModel(source, 'lua55', parsed);
  else if (model.getValue() !== source) model.setValue(source);
  let entry = models.get(uri);
  if (!entry) {
    entry = { model, readonly, definitionRefs: 0, timer: undefined,
      contentDisposable: undefined };
    models.set(uri, entry);
  } else entry.readonly ||= readonly;
  const diagnostics = await client.update(uri, source);
  monaco.editor.setModelMarkers(model, 'lua55', diagnostics);
  if (!readonly && !entry.contentDisposable) {
    entry.contentDisposable = model.onDidChangeContent(() => {
      clearTimeout(entry.timer);
      entry.timer = setTimeout(async () => {
        const markers = await client.update(uri, model.getValue());
        if (!model.isDisposed()) monaco.editor.setModelMarkers(model, 'lua55', markers);
      }, 180);
    });
  }
  return model;
}

export async function registerDefinition(definition) {
  const model = await createLuaModel(definition.source, definition.uri, true);
  const entry = models.get(definition.uri);
  entry.definitionRefs++;
  let disposed = false;
  return {
    model,
    dispose() {
      if (disposed) return;
      disposed = true;
      entry.definitionRefs = Math.max(0, entry.definitionRefs - 1);
      if (!entry.definitionRefs) forgetLuaModel(definition.uri);
    }
  };
}

export function isReadonlyModel(uri) {
  return models.get(typeof uri === 'string' ? uri : uri.toString())?.readonly ?? false;
}

export function forgetLuaModel(uri) {
  const key = typeof uri === 'string' ? uri : uri.toString();
  const entry = models.get(key);
  if (!entry) return false;
  models.delete(key);
  clearTimeout(entry.timer);
  entry.contentDisposable?.dispose();
  client.remove(key);
  entry.model.dispose();
  return true;
}
