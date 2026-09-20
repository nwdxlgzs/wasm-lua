import { analyze, completions, identifierAt, resolveAlias } from './analyzer.js';
import { LUA_STDLIB } from './stdlib.js';
import { Language, Parser } from 'web-tree-sitter';

const documents = new Map();
const trees = new Map();

const parserReady = (async () => {
  await Parser.init({
    locateFile: () => new URL('../grammar/tree-sitter.wasm', self.location.href).href
  });
  const parser = new Parser();
  parser.setLanguage(await Language.load(
    new URL('../grammar/tree-sitter-lua.wasm', self.location.href).href));
  return parser;
})();

function reply(id, result) {
  postMessage({ id, result });
}

function shortName(symbol) {
  return symbol.name.split(/[.:]/).at(-1);
}

function resolveSymbol(document, selected, offset) {
  const exact = selected.word;
  const short = exact.split('.').at(-1);
  const local = document.symbols
    .filter(symbol => (symbol.name === exact || shortName(symbol) === short) &&
      symbol.visibilityStart <= offset && offset <= symbol.visibilityEnd &&
      (symbol.offset <= offset || symbol.scope === 'global'))
    .sort((left, right) =>
      Number(right.name === exact) - Number(left.name === exact) ||
      right.visibilityStart - left.visibilityStart || right.offset - left.offset);
  if (local.length) return local[0];
  const resolved = resolveAlias(documents, document, exact);
  const imported = [...documents.values()].flatMap(doc => doc.symbols)
    .filter(symbol => symbol.name === resolved.name &&
      (!resolved.uri || symbol.uri === resolved.uri));
  if (imported.length) return imported[0];
  return [...documents.values()].flatMap(doc => doc.symbols)
    .filter(symbol => symbol.name === exact || shortName(symbol) === short)
    .sort((left, right) => Number(right.name === exact) - Number(left.name === exact))[0];
}

function signatureTarget(source, offset) {
  const before = source.slice(0, offset);
  const match = /((?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*(?:[.:](?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*)*)\s*\(([^()]*)$/u.exec(before);
  if (!match) return null;
  return {
    word: match[1].replace(':', '.'),
    activeParameter: (match[2].match(/,/g) ?? []).length,
    start: before.lastIndexOf(match[1]),
    end: before.lastIndexOf(match[1]) + match[1].length
  };
}

function synchronizeDocument(uri, source) {
  if (typeof source !== 'string') return documents.get(uri);
  const current = documents.get(uri);
  if (!current || current.source !== source) {
    const document = analyze(source, uri);
    documents.set(uri, document);
    return document;
  }
  return current;
}

self.onmessage = async event => {
  const { id, method, params = {} } = event.data;
  try {
    if (method === 'update') {
      const document = analyze(params.source, params.uri);
      const parser = await parserReady;
      trees.get(params.uri)?.delete();
      trees.set(params.uri, parser.parse(params.source));
      documents.set(params.uri, document);
      reply(id, document.diagnostics);
      return;
    }
    if (method === 'remove') {
      documents.delete(params.uri);
      reply(id, true);
      return;
    }
    if (method === 'completions') {
      synchronizeDocument(params.uri, params.source);
      reply(id, completions(documents, params.uri, params.offset));
      return;
    }
    const document = synchronizeDocument(params.uri, params.source);
    if (!document) { reply(id, null); return; }
    const selected = identifierAt(document.source, params.offset);
    if (method === 'signature') {
      const call = signatureTarget(document.source, params.offset);
      if (!call) { reply(id, null); return; }
      const aliased = resolveAlias(documents, document, call.word);
      const item = LUA_STDLIB[call.word] ?? LUA_STDLIB[aliased.name];
      const symbol = item ? null : resolveSymbol(document, call, params.offset);
      reply(id, item ? { ...item, ...call } : symbol ? {
        signature: symbol.detail,
        doc: symbol.documentation || `${symbol.scope} ${symbol.kind}`,
        activeParameter: call.activeParameter,
        range: { start: call.start, end: call.end }
      } : null);
      return;
    }
    if (method === 'hover') {
      const aliased = resolveAlias(documents, document, selected.word);
      const item = LUA_STDLIB[selected.word] ?? LUA_STDLIB[aliased.name];
      if (item) reply(id, { ...item, range: { start: selected.start, end: selected.end } });
      else {
        const symbol = resolveSymbol(document, selected, params.offset);
        reply(id, symbol ? {
          signature: symbol.detail,
          doc: symbol.documentation || `${symbol.scope} ${symbol.kind}`,
          range: { start: selected.start, end: selected.end }
        } : null);
      }
      return;
    }
    if (method === 'definition') {
      const symbol = resolveSymbol(document, selected, params.offset);
      reply(id, symbol ?? null);
      return;
    }
    if (method === 'references') {
      const refs = [];
      const symbol = resolveSymbol(document, selected, params.offset);
      const selectedShort = selected.word.split('.').at(-1);
      const isScoped = symbol && ['local', 'parameter', 'for'].includes(symbol.scope);
      for (const doc of documents.values()) {
        if (isScoped && doc.uri !== symbol.uri) continue;
        for (const occurrence of doc.occurrences.get(selectedShort) ?? []) {
          if (isScoped && (occurrence.offset < symbol.visibilityStart ||
              occurrence.offset > symbol.visibilityEnd)) continue;
          refs.push({ uri: doc.uri, range: occurrence.range });
        }
      }
      reply(id, refs);
      return;
    }
    if (method === 'symbols') {
      reply(id, document.symbols);
      return;
    }
    reply(id, null);
  } catch (error) {
    postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
