export class LuaLanguageClient extends EventTarget {
  constructor() {
    super();
    this.worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
      name: 'lua-language-service'
    });
    this.worker.onmessage = event => {
      const pending = this.pending.get(event.data.id);
      if (!pending) return;
      this.pending.delete(event.data.id);
      if (event.data.error) pending.reject(new Error(event.data.error));
      else pending.resolve(event.data.result);
    };
  }
  worker;
  sequence = 0;
  pending = new Map();

  request(method, params = {}) {
    const id = ++this.sequence;
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.worker.postMessage({ id, method, params });
    return promise;
  }

  update(uri, source) { return this.request('update', { uri, source }); }
  remove(uri) { return this.request('remove', { uri }); }
  completions(uri, offset, source) {
    return this.request('completions', { uri, offset, source });
  }
  hover(uri, offset, source) {
    return this.request('hover', { uri, offset, source });
  }
  signature(uri, offset, source) {
    return this.request('signature', { uri, offset, source });
  }
  definition(uri, offset, source) {
    return this.request('definition', { uri, offset, source });
  }
  references(uri, offset, source) {
    return this.request('references', { uri, offset, source });
  }
  symbols(uri, source) { return this.request('symbols', { uri, source }); }
  dispose() { this.worker.terminate(); }
}
