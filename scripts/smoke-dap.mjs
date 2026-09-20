import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';

const child = spawn(process.execPath, [path.join(root, 'adapters', 'dap', 'cli.mjs')], {
  cwd: root,
  stdio: ['pipe', 'pipe', 'pipe']
});
let sequence = 0;
let buffer = Buffer.alloc(0);
const pending = new Map();
let sawOutput = false;
let sawLogPoint = false;
let stderr = '';
let exitDescription = '';
const queuedEvents = [];
const eventWaiters = [];

child.stderr.setEncoding('utf8');
child.stderr.on('data', chunk => { stderr += chunk; });
child.on('exit', (code, signal) => {
  exitDescription = `DAP adapter exited (code ${code}, signal ${signal ?? 'none'})`;
  for (const waiter of pending.values())
    waiter.reject(new Error(`${exitDescription}\n${stderr}`));
  for (const waiter of eventWaiters)
    waiter.reject(new Error(`${exitDescription}\n${stderr}`));
});

function dispatch(message) {
  if (process.env.WLUA_DAP_SMOKE_TRACE)
    console.error(JSON.stringify(message));
  if (message.type === 'response') {
    const waiter = pending.get(message.request_seq);
    if (waiter) {
      pending.delete(message.request_seq);
      message.success ? waiter.resolve(message) : waiter.reject(
        new Error(message.message ?? 'DAP request failed'));
    }
  } else if (message.type === 'event') {
    if (message.event === 'output' && message.body?.output?.includes('DAP 中文冒烟'))
      sawOutput = true;
    if (message.event === 'output' && message.body?.output?.includes('日志 i=2'))
      sawLogPoint = true;
    const index = eventWaiters.findIndex(waiter => waiter.event === message.event);
    if (index >= 0) eventWaiters.splice(index, 1)[0].resolve(message);
    else queuedEvents.push(message);
  }
}

function waitForEvent(event) {
  const index = queuedEvents.findIndex(message => message.event === event);
  if (index >= 0) return Promise.resolve(queuedEvents.splice(index, 1)[0]);
  return new Promise((resolve, reject) =>
    eventWaiters.push({ event, resolve, reject }));
}

child.stdout.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd < 0) return;
    const header = buffer.subarray(0, headerEnd).toString('ascii');
    const length = Number(/Content-Length:\s*(\d+)/i.exec(header)?.[1]);
    if (!Number.isFinite(length) || buffer.length < headerEnd + 4 + length) return;
    const start = headerEnd + 4;
    dispatch(JSON.parse(buffer.subarray(start, start + length).toString('utf8')));
    buffer = buffer.subarray(start + length);
  }
});

function request(command, args = {}) {
  const seq = ++sequence;
  const message = JSON.stringify({ seq, type: 'request', command, arguments: args });
  child.stdin.write(`Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`);
  return new Promise((resolve, reject) => pending.set(seq, { resolve, reject }));
}

const timeout = setTimeout(() => {
  child.kill();
  const details = [exitDescription, stderr].filter(Boolean).join('\n');
  for (const waiter of pending.values()) waiter.reject(
    new Error(`DAP smoke timeout${details ? `\n${details}` : ''}`));
  for (const waiter of eventWaiters) waiter.reject(
    new Error(`DAP smoke timeout${details ? `\n${details}` : ''}`));
}, 15_000);

try {
  await request('initialize', {
    adapterID: 'wasm-lua',
    linesStartAt1: true,
    columnsStartAt1: true,
    pathFormat: 'path'
  });
  const program = path.join(root, 'tests', 'fixtures', 'dap.lua');
  const source = await readFile(program, 'utf8');
  const lines = Object.fromEntries([
    'relocate-deep-call', 'deep-call', 'os-time', 'async-capability',
    'after-capability'
  ].map(marker => {
    const line = source.split(/\r?\n/).findIndex(value =>
      value.includes(`@${marker}`)) + 1;
    if (!line) throw new Error(`DAP fixture is missing @${marker}.`);
    return [marker, line];
  }));
  const loopMutationLine = source.split(/\r?\n/).findIndex(value =>
    value.includes('中文变量 = 中文变量 + 21')) + 1;
  const loopPrintLine = source.split(/\r?\n/).findIndex(value =>
    value.includes('DAP 中文冒烟')) + 1;
  await request('launch', { program });
  const configured = await request('setBreakpoints', {
    source: { path: program },
    breakpoints: [
      { line: lines['relocate-deep-call'] },
      { line: loopMutationLine, condition: 'i == 2', hitCondition: '2' },
      { line: loopPrintLine, logMessage: '日志 i={i}' }
    ]
  });
  const relocated = configured.body.breakpoints[0];
  if (!relocated.verified || relocated.line !== lines['deep-call'])
    throw new Error(`DAP breakpoint relocation failed: ${JSON.stringify(relocated)}`);
  await request('configurationDone');
  let stopped = await waitForEvent('stopped');
  if (stopped.body?.reason !== 'breakpoint')
    throw new Error('Initial deep-call breakpoint did not stop the adapter.');

  async function expectNextLine(expectedLine, label) {
    await request('next', { threadId: 1 });
    const event = await waitForEvent('stopped');
    if (event.body?.reason !== 'step')
      throw new Error(`${label}: expected a step stop, got ${event.body?.reason}.`);
    const trace = await request('stackTrace', { threadId: 1 });
    const actualLine = trace.body.stackFrames[0]?.line;
    if (actualLine !== expectedLine)
      throw new Error(`${label}: expected line ${expectedLine}, got ${actualLine}.`);
  }

  await expectNextLine(lines['os-time'],
    'Step-over entered a function that yielded through os.time');
  await expectNextLine(lines['async-capability'],
    'Step-over os.time lost its step plan during capability resume');
  await expectNextLine(lines['after-capability'],
    'Step-over async js.call lost its step plan during Promise resume');

  await request('continue', { threadId: 1 });
  stopped = await waitForEvent('stopped');
  if (stopped.body?.reason !== 'breakpoint')
    throw new Error('Conditional breakpoint did not stop the adapter.');
  const stack = await request('stackTrace', { threadId: 1 });
  const frameId = stack.body.stackFrames[0].id;
  const scopes = await request('scopes', { frameId });
  const localsReference = scopes.body.scopes[0].variablesReference;
  const locals = await request('variables', { variablesReference: localsReference });
  if (!locals.body.variables.some(variable => variable.name === '中文变量'))
    throw new Error('DAP did not expose UTF-8 locals.');
  let rejectedUnknownReference = false;
  try { await request('variables', { variablesReference: 999999 }); }
  catch (error) {
    rejectedUnknownReference = /未知|失效/.test(error.message);
  }
  if (!rejectedUnknownReference)
    throw new Error('DAP accepted an unknown variablesReference.');
  const changed = await request('setVariable', {
    variablesReference: localsReference,
    name: '中文变量',
    value: '100'
  });
  if (changed.body.value !== '100') throw new Error('DAP setVariable failed.');
  const evaluated = await request('evaluate', {
    expression: '中文变量',
    frameId,
    context: 'watch'
  });
  if (evaluated.body.result !== '100') throw new Error('DAP evaluate failed.');
  await request('continue', { threadId: 1 });
  await waitForEvent('terminated');
  if (!sawOutput) throw new Error('DAP adapter did not forward Lua output.');
  if (!sawLogPoint) throw new Error('DAP log point did not interpolate locals.');
  await request('disconnect');
  console.log('Node stdio DAP 1.68 smoke test passed.');
} finally {
  clearTimeout(timeout);
  child.stdin.end();
}
