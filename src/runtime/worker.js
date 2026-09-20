import { decodeWire, encodeWire } from '../sdk/wire.js';
import { resolveLuaBreakpoints } from '../sdk/breakpoints.js';
import { heap, loadBackend } from './backend.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
let backend;
let handle = 0;
let activeId = 0;
let outputOffset = 0;
let breakpointSpecs = [];
let temporaryBreakpoint = null;
let pauseRequested = false;
let lastResumeMode = 0;
let executionActive = false;
let inspectable = false;
let resumeAllowed = false;
let runtimeConfig;

const stateNames = {
  [-1]: 'error',
  0: 'complete',
  1: 'paused',
  2: 'capability',
  3: 'slice',
  4: 'yield'
};

function copyIn(bytes) {
  const pointer = Number(backend.alloc(bytes.length));
  heap(backend).set(bytes, pointer);
  return pointer;
}

function copyOut(pointer, length) {
  return heap(backend).slice(Number(pointer), Number(pointer) + Number(length));
}

function resultWire() {
  return copyOut(backend.resultPtr(handle), backend.resultLen(handle));
}

function flushOutput() {
  const length = Number(backend.outputLen(handle));
  if (length > outputOffset) {
    const pointer = Number(backend.outputPtr(handle));
    postMessage({
      type: 'event',
      event: 'output',
      body: {
        category: 'stdout',
        output: textDecoder.decode(copyOut(pointer + outputOffset, length - outputOffset))
      }
    });
    outputOffset = length;
  }
}

function debugJson(fn, ...args) {
  const pointer = fn(handle, ...args);
  const bytes = copyOut(pointer, backend.jsonLen(handle));
  return JSON.parse(textDecoder.decode(bytes));
}

function postOutput(output, category = 'console') {
  postMessage({ type: 'event', event: 'output', body: { category, output } });
}

function requireIdle() {
  if (executionActive) throw new Error('Lua VM 正在执行或等待能力返回。');
}

function requireInspectable() {
  requireIdle();
  if (!inspectable) throw new Error('Lua VM 当前没有可检查的暂停栈。');
}

function requireResumable() {
  requireIdle();
  if (!resumeAllowed)
    throw new Error('Lua 程序当前未在断点或协作式暂停处，不能继续执行。');
}

async function execute(id, start) {
  requireIdle();
  executionActive = true;
  inspectable = false;
  resumeAllowed = false;
  activeId = id;
  try {
    await advance(start(), id);
  } catch (error) {
    if (activeId === id) {
      activeId = 0;
      executionActive = false;
      inspectable = false;
      resumeAllowed = false;
      pauseRequested = false;
      lastResumeMode = 0;
      temporaryBreakpoint = null;
    }
    throw error;
  }
}

function installBreakpoints() {
  // Run-to-cursor is a temporary execution plan, not an extra regular
  // breakpoint. Suppressing ordinary lines prevents WASI line hooks from
  // immediately stopping again at the breakpoint we are leaving.
  const ranges = temporaryBreakpoint
    ? [temporaryBreakpoint.line, temporaryBreakpoint.line]
    : breakpointSpecs.flatMap(point => [
        point.line, Math.max(point.line, point.endLine ?? point.line)
      ]);
  const values = Int32Array.from(backend.setBreakpointRanges ? ranges :
    (temporaryBreakpoint
      ? [temporaryBreakpoint.line]
      : breakpointSpecs.map(point => point.line)));
  const pointer = copyIn(new Uint8Array(values.buffer));
  if (backend.setBreakpointRanges)
    backend.setBreakpointRanges(handle, pointer, values.length / 2);
  else backend.setBreakpoints(handle, pointer, values.length);
  backend.free(pointer);
}

function clearTemporaryBreakpoint() {
  if (!temporaryBreakpoint) return;
  temporaryBreakpoint = null;
  installBreakpoints();
}

function normalizeSource(value) {
  return String(value ?? '').replace(/^[@=]/u, '').replaceAll('\\', '/');
}

function sourceMatches(point, source) {
  const expected = normalizeSource(point.source ?? point.file);
  return !expected || expected === normalizeSource(source);
}

function currentSource() {
  return debugJson(backend.stack)?.[0]?.source ?? '';
}

function evaluateNow(expression, frame = 0) {
  const bytes = textEncoder.encode(expression);
  const pointer = copyIn(bytes);
  const result = debugJson(backend.evaluate, frame, pointer, bytes.length);
  backend.free(pointer);
  return result;
}

function evaluationTruthy(result) {
  const value = result?.[0];
  if (!value || value.type === 'nil') return false;
  return value.type !== 'boolean' || value.value === 'true';
}

function hitConditionMatches(condition, hits) {
  if (!condition?.trim()) return true;
  const match = /^\s*(?:(>=|<=|>|<|==|=|%)\s*)?(\d+)\s*$/.exec(condition);
  if (!match) return false;
  const expected = Number(match[2]);
  switch (match[1] ?? '=') {
    case '>=': return hits >= expected;
    case '<=': return hits <= expected;
    case '>': return hits > expected;
    case '<': return hits < expected;
    case '%': return expected > 0 && hits % expected === 0;
    default: return hits === expected;
  }
}

function formatLogMessage(template) {
  return template.replace(/\{([^{}]+)\}/g, (_whole, expression) => {
    const result = evaluateNow(expression);
    return result.error ? `<错误: ${result.error}>` : (result[0]?.value ?? 'nil');
  });
}

function processBreakpoint(line, source, pauseReason) {
  const stoppedForStep = (pauseReason & 2) !== 0;
  const ignoredBreakpoint = () => stoppedForStep
    ? { stop: true, reason: 'step' }
    : { stop: false };
  if (temporaryBreakpoint?.line === line &&
      sourceMatches(temporaryBreakpoint, source)) {
    temporaryBreakpoint = null;
    installBreakpoints();
    return { stop: true, reason: 'goto' };
  }
  const point = breakpointSpecs
    .filter(item => item.line <= line &&
      line <= (item.endLine ?? item.line) && sourceMatches(item, source))
    .sort((left, right) => right.line - left.line)[0];
  if (!point) return ignoredBreakpoint();
  if (point.line !== line || point.endLine !== line || point.verified === false) {
    const requested = point.requestedLine ?? point.line;
    point.line = line;
    point.endLine = line;
    point.verified = true;
    point.message = requested === line ? '' :
      `第 ${requested} 行不可执行，断点已下移到第 ${line} 行。`;
    installBreakpoints();
    postMessage({
      type: 'event', event: 'breakpointchange',
      body: { breakpoints: breakpointSpecs.map(item => ({ ...item })) }
    });
  }
  point.hits = (point.hits ?? 0) + 1;
  // A filtered breakpoint must not mask an independently active step plan.
  // The C hook pauses for either reason before JavaScript can evaluate the
  // condition/log point, so preserve the step stop when the breakpoint itself
  // elects not to stop.
  if (!hitConditionMatches(point.hitCondition, point.hits))
    return ignoredBreakpoint();
  if (point.condition) {
    const result = evaluateNow(point.condition);
    if (result.error) {
      postOutput(`[条件断点 ${line}] ${result.error}\n`, 'stderr');
      return { stop: true, reason: 'breakpoint' };
    }
    if (!evaluationTruthy(result)) return ignoredBreakpoint();
  }
  if (point.logMessage) {
    postOutput(formatLogMessage(point.logMessage) + '\n');
    return ignoredBreakpoint();
  }
  return { stop: true, reason: 'breakpoint' };
}

async function advance(state, id) {
  for (;;) {
    flushOutput();
    const name = stateNames[state] ?? 'error';
    if (state === 3) {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (id !== activeId) return;
      if (pauseRequested) {
        pauseRequested = false;
        clearTemporaryBreakpoint();
        executionActive = false;
        inspectable = true;
        resumeAllowed = true;
        postMessage({ type: 'event', event: 'stopped', body: {
          reason: 'pause', line: Number(backend.currentLine(handle)), resumable: true
        }});
        postMessage({ type: 'response', id, ok: true, result: { state: 'paused' } });
        return;
      }
      // Slices are an internal scheduling yield. They must be transparent to
      // the user's step-in/over/out plan.
      state = backend.resume(handle, lastResumeMode);
      continue;
    }
    if (state === 2) {
      const payload = resultWire();
      postMessage({
        type: 'capability',
        id,
        token: Number(backend.capabilityToken(handle)),
        payload
      }, [payload.buffer]);
      return;
    }
    if (state === 1) {
      const line = Number(backend.currentLine(handle));
      const source = currentSource();
      const pauseReason = Number(backend.pauseReason(handle));
      const decision = processBreakpoint(line, source, pauseReason);
      if (!decision.stop) {
        // A source-filtered/conditional/log breakpoint was an internal pause,
        // not a user-visible step boundary. Keep the original step line/depth
        // instead of anchoring a new step plan at this ignored breakpoint.
        state = backend.resumeFiltered(handle, lastResumeMode);
        continue;
      }
      postMessage({ type: 'event', event: 'stopped', body: {
        reason: decision.reason, line, source, resumable: true
      }});
      executionActive = false;
      inspectable = true;
      resumeAllowed = true;
      postMessage({ type: 'response', id, ok: true, result: { state: name } });
      return;
    }
    if (state === 4) {
      const decoded = decodeWire(resultWire());
      executionActive = false;
      inspectable = false;
      resumeAllowed = true;
      pauseRequested = false;
      lastResumeMode = 0;
      activeId = 0;
      postMessage({ type: 'response', id, ok: true,
        result: { state: name, values: decoded } });
      return;
    }
    const decoded = decodeWire(resultWire());
    executionActive = false;
    inspectable = state === -1;
    resumeAllowed = false;
    pauseRequested = false;
    lastResumeMode = 0;
    clearTemporaryBreakpoint();
    if (state === -1) {
      postMessage({ type: 'event', event: 'stopped', body: {
        reason: 'exception', line: Number(backend.currentLine(handle)), resumable: false
      }});
      postMessage({ type: 'response', id, ok: false, error: decoded.message });
    } else {
      postMessage({ type: 'event', event: 'terminated', body: {} });
      postMessage({ type: 'response', id, ok: true, result: { state: name, values: decoded } });
    }
    activeId = 0;
    return;
  }
}

function createHandle() {
  const config = runtimeConfig;
  const profile = config.profile === 'full-access' ? 2
    : config.profile === 'trusted' ? 1 : 0;
  const unlimited = profile === 2;
  const memoryValue = config.memoryLimit ??
    (unlimited ? 0 : (profile === 1 ? 256 : 64) * 1024 * 1024);
  const instructionValue = config.instructionLimit ??
    (unlimited ? 0 : profile === 1 ? 100000000 : 10000000);
  const memory = BigInt(memoryValue);
  const instructions = BigInt(instructionValue);
  if (memory < 0n || memory > 512n * 1024n * 1024n ||
      (memory === 0n && !unlimited))
    throw new RangeError('Lua 堆配额必须在 1 到 512 MiB 之间；full-access 可使用 0 取消人工配额。');
  if (instructions < 0n || instructions > 0xffffffffffffffffn ||
      (instructions === 0n && !unlimited))
    throw new RangeError('Lua 指令配额超出 ABI v1 支持范围。');
  handle = backend.create(profile, memory, instructions);
  if (!handle) throw new Error('Unable to create Lua VM.');
  outputOffset = 0;
  temporaryBreakpoint = null;
  pauseRequested = false;
  lastResumeMode = 0;
  inspectable = false;
  resumeAllowed = false;
  installBreakpoints();
}

function recreateHandle() {
  if (handle) backend.destroy(handle);
  handle = 0;
  breakpointSpecs = breakpointSpecs.map(point => ({ ...point, hits: 0 }));
  createHandle();
  postMessage({ type: 'generation' });
}

function setBreakpointSpecs(points, source, chunkName) {
  breakpointSpecs = points.map(point => ({ ...point, hits: 0 }));
  if (typeof source === 'string') {
    breakpointSpecs = breakpointSpecs.map(point => sourceMatches(point, chunkName)
      ? resolveLuaBreakpoints(source, [point])[0]
      : point);
    postMessage({
      type: 'event', event: 'breakpointchange',
      body: { breakpoints: breakpointSpecs.map(point => ({ ...point })) }
    });
  }
  installBreakpoints();
}

async function initialize(config) {
  runtimeConfig = { ...config };
  backend = await loadBackend(config.backend, config.debug, config.assetBaseUrl);
  if (Number(backend.abiVersion()) !== 0x00010000)
    throw new Error('WASM ABI version mismatch.');
  createHandle();
}

self.onmessage = async event => {
  const message = event.data;
  try {
    if (message.type === 'initialize') {
      await initialize(message.options);
      postMessage({ type: 'ready', ok: true, abiVersion: 1, protocolVersion: '1.68' });
      return;
    }
    if (message.type === 'run') {
      await execute(message.id, () => {
        // A top-level run is a fresh program generation. This keeps Lua 5.5
        // global declarations repeatable and invalidates references from the
        // previous program without rebuilding the Worker or backend module.
        recreateHandle();
        if (Array.isArray(message.breakpoints))
          setBreakpointSpecs(message.breakpoints, message.source,
            message.chunkName ?? '@main.lua');
        const source = textEncoder.encode(message.source);
        const name = textEncoder.encode(message.chunkName ?? '@main.lua');
        const sourcePointer = copyIn(source);
        const namePointer = copyIn(name);
        const state = backend.run(handle, sourcePointer, source.length,
          namePointer, name.length);
        backend.free(sourcePointer);
        backend.free(namePointer);
        return state;
      });
      return;
    }
    if (message.type === 'check') {
      requireIdle();
      const source = textEncoder.encode(message.source);
      const name = textEncoder.encode(message.chunkName ?? '@main.lua');
      const sourcePointer = copyIn(source);
      const namePointer = copyIn(name);
      const state = backend.check(handle, sourcePointer, source.length,
        namePointer, name.length);
      backend.free(sourcePointer);
      backend.free(namePointer);
      if (state !== 0) {
        const decoded = decodeWire(resultWire());
        throw decoded instanceof Error ? decoded : new Error(String(decoded));
      }
      postMessage({ type: 'response', id: message.id, ok: true, result: true });
      return;
    }
    if (message.type === 'resume') {
      requireResumable();
      lastResumeMode = message.mode ?? 0;
      await execute(message.id, () => backend.resume(handle, lastResumeMode));
      return;
    }
    if (message.type === 'call') {
      await execute(message.id, () => {
        outputOffset = 0;
        const bytes = new Uint8Array(message.payload);
        const pointer = copyIn(bytes);
        const state = backend.call(handle, message.reference, pointer, bytes.length);
        backend.free(pointer);
        return state;
      });
      return;
    }
    if (message.type === 'get') {
      requireIdle();
      const bytes = new Uint8Array(message.payload);
      const pointer = copyIn(bytes);
      const ok = backend.get(handle, message.reference, pointer, bytes.length);
      backend.free(pointer);
      if (!ok) throw new Error('LuaRef 不是有效表引用。');
      postMessage({ type: 'response', id: message.id, ok: true, result: decodeWire(resultWire()) });
      return;
    }
    if (message.type === 'set') {
      requireIdle();
      const bytes = new Uint8Array(message.payload);
      const pointer = copyIn(bytes);
      const ok = backend.set(handle, message.reference, pointer, bytes.length);
      backend.free(pointer);
      if (!ok) throw new Error('LuaRef 不是有效表引用，或键值无效。');
      postMessage({ type: 'response', id: message.id, ok: true, result: true });
      return;
    }
    if (message.type === 'capabilityResult') {
      if (message.id !== activeId ||
          Number(message.token) !== Number(backend.capabilityToken(handle)))
        throw new Error('过期或伪造的能力恢复令牌。');
      const bytes = new Uint8Array(message.payload);
      const pointer = copyIn(bytes);
      // Capabilities (including the browser-backed os table) yield the Lua
      // coroutine. Resuming with CONTINUE here used to erase step-over and run
      // the rest of the program. Carry the active step mode across the async
      // boundary instead.
      const state = backend.resumeValue(handle, pointer, bytes.length,
        message.rejected ? 1 : 0, lastResumeMode);
      backend.free(pointer);
      try {
        await advance(state, message.id);
      } catch (error) {
        executionActive = false;
        throw error;
      }
      return;
    }
    if (message.type === 'setBreakpoints') {
      setBreakpointSpecs(message.breakpoints);
      postMessage({ type: 'response', id: message.id, ok: true, result: breakpointSpecs });
      return;
    }
    if (message.type === 'stack') {
      requireInspectable();
      postMessage({ type: 'response', id: message.id, ok: true, result: debugJson(backend.stack) });
      return;
    }
    if (message.type === 'variables') {
      requireInspectable();
      postMessage({
        type: 'response',
        id: message.id,
        ok: true,
        result: debugJson(backend.variables, message.frame ?? 0, message.reference ?? 0)
      });
      return;
    }
    if (message.type === 'evaluate') {
      requireInspectable();
      const result = evaluateNow(message.expression, message.frame ?? 0);
      postMessage({ type: 'response', id: message.id, ok: true, result });
      return;
    }
    if (message.type === 'setVariable') {
      requireInspectable();
      const name = textEncoder.encode(message.name);
      const expression = textEncoder.encode(message.value);
      const namePointer = copyIn(name);
      const expressionPointer = copyIn(expression);
      const result = debugJson(backend.setVariable, message.frame ?? 0,
        message.reference ?? 0, namePointer, name.length,
        expressionPointer, expression.length);
      backend.free(namePointer);
      backend.free(expressionPointer);
      if (result.error) throw new Error(result.error);
      postMessage({ type: 'response', id: message.id, ok: true, result });
      return;
    }
    if (message.type === 'pause') {
      pauseRequested = executionActive;
      postMessage({ type: 'response', id: message.id, ok: true, result: executionActive });
      return;
    }
    if (message.type === 'runToCursor') {
      requireResumable();
      temporaryBreakpoint = {
        line: Number(message.line), source: message.source
      };
      installBreakpoints();
      lastResumeMode = 0;
      await execute(message.id, () => backend.resume(handle, 0));
      return;
    }
    if (message.type === 'release') {
      backend.releaseRef(handle, message.reference);
    }
  } catch (error) {
    if (message.type === 'initialize') {
      postMessage({
        type: 'ready',
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
      return;
    }
    postMessage({
      type: 'response',
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
