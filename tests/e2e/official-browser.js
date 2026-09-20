import { ConsoleStdout, File, OpenFile, PreopenDirectory, WASI } from
  '@bjorn3/browser_wasi_shim';
import createOfficialLua from '/build/official/emscripten/lua-official.mjs';

const names = [
  'all.lua', 'api.lua', 'attrib.lua', 'big.lua', 'bitwise.lua',
  'bwcoercion.lua', 'calls.lua', 'closure.lua', 'code.lua',
  'constructs.lua', 'coroutine.lua', 'cstack.lua', 'db.lua', 'errors.lua',
  'events.lua', 'files.lua', 'gc.lua', 'gengc.lua', 'goto.lua', 'heavy.lua',
  'literals.lua', 'locals.lua', 'main.lua', 'math.lua', 'memerr.lua',
  'nextvar.lua', 'pm.lua', 'sort.lua', 'strings.lua', 'tpack.lua',
  'tracegc.lua', 'utf8.lua', 'vararg.lua', 'verybig.lua'
];
const results = globalThis.officialResults = {
  emscripten: { state: 'running', output: '' },
  wasi: { state: 'running', output: '' }
};
const status = document.querySelector('#status');
const render = () => {
  status.textContent = JSON.stringify({
    emscripten: results.emscripten.state,
    wasi: results.wasi.state
  }, null, 2);
};

async function runEmscripten() {
  const output = [];
  const options = {
    arguments: ['-e', '_U=true;_WASM=true', 'all.lua'],
    locateFile: name => `/build/official/emscripten/${name}`,
    print: line => output.push(line),
    printErr: line => output.push(line)
  };
  options.preInit = [() => options.preRun.push(
    module => module.FS.chdir('/tests'))];
  try {
    await createOfficialLua(options);
  } catch (error) {
    if (error?.status !== 0) throw error;
  }
  results.emscripten.output = output.join('\n');
  if (!results.emscripten.output.includes('final OK !!!'))
    throw new Error('Emscripten did not reach final OK.');
  results.emscripten.state = 'passed';
  render();
}

async function runWasi() {
  const entries = await Promise.all(names.map(async name => {
    const response = await fetch(`/vendor/lua-5.5.1-tests/${name}`);
    if (!response.ok) throw new Error(`Cannot load ${name}: ${response.status}`);
    return [name, new File(new Uint8Array(await response.arrayBuffer()))];
  }));
  const output = [];
  const line = value => output.push(value);
  const wasi = new WASI(
    ['lua-official', '-e', '_U=true;_WASM=true', 'all.lua'],
    ['PATH=/'],
    [
      new OpenFile(new File([])),
      ConsoleStdout.lineBuffered(line),
      ConsoleStdout.lineBuffered(line),
      new PreopenDirectory('.', entries)
    ]
  );
  const response = await fetch('/build/official/wasi/lua-official.wasm');
  const module = await WebAssembly.compileStreaming(response);
  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasi.wasiImport
  });
  wasi.start(instance);
  results.wasi.output = output.join('\n');
  if (!results.wasi.output.includes('final OK !!!'))
    throw new Error('Browser WASI shim did not reach final OK.');
  results.wasi.state = 'passed';
  render();
}

try {
  await runEmscripten();
} catch (error) {
  results.emscripten.state = 'failed';
  results.emscripten.error = error.message;
  render();
}
try {
  await runWasi();
} catch (error) {
  results.wasi.state = 'failed';
  results.wasi.error = error.message;
  render();
}
