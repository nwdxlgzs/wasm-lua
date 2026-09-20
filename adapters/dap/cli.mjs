import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { WASI } from 'node:wasi';
import {
  BreakpointEvent, DebugSession, InitializedEvent, OutputEvent,
  Scope, Source, StackFrame, StoppedEvent, TerminatedEvent, Thread
} from '@vscode/debugadapter';
import { decodeWire, encodeWire } from '../../src/sdk/wire.js';
import { createOsBridge } from '../../src/sdk/os-bridge.js';
import { resolveLuaBreakpoints } from '../../src/sdk/breakpoints.js';

const root = path.resolve(import.meta.dirname, '..', '..');

class WasmLuaDebugSession extends DebugSession {
  constructor() {
    super();
    this.variableReferences = new Map();
    this.reverseVariableReferences = new Map();
    this.scopeReferences = new Map();
    this.nextVariableReference = 100000;
    this.breakpoints = [];
    this.temporaryBreakpoint = null;
    this.pauseRequested = false;
    this.lastResumeMode = 0;
    this.lastException = null;
    this.executionClockElapsed = 0;
    this.executionClockStarted = null;
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerColumnsStartAt1(true);
  }

  initializeRequest(response) {
    response.body = {
      supportsConfigurationDoneRequest: true,
      supportsConditionalBreakpoints: true,
      supportsHitConditionalBreakpoints: true,
      supportsLogPoints: true,
      supportsEvaluateForHovers: true,
      supportsSetVariable: true,
      supportsGotoTargetsRequest: true,
      supportsExceptionInfoRequest: true
    };
    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  async launchRequest(response, args) {
    try {
      const wasm = await readFile(path.join(
        root, 'public', 'wasm', 'wasi-lua-debug.wasm'));
      const wasi = new WASI({
        version: 'preview1',
        args: ['wasm-lua'],
        env: {}
      });
      const module = await WebAssembly.compile(wasm);
      this.instance = await WebAssembly.instantiate(module, {
        wasi_snapshot_preview1: wasi.wasiImport
      });
      wasi.initialize(this.instance);
      this.exports = /** @type {Record<string, Function> & {memory: WebAssembly.Memory}} */ (
        /** @type {unknown} */ (this.instance.exports));
      this.memory = this.exports.memory;
      this.handle = this.exports.wlua_create(
        1, 256n * 1024n * 1024n, 100000000n);
      this.osBridge = createOsBridge({
        environment: args.environment ?? {},
        clock: () => this.executionClockSeconds()
      });
      this.sourcePath = args.program;
      this.source = await readFile(args.program, 'utf8');
      this.sendResponse(response);
    } catch (error) {
      response.success = false;
      response.message = error.message;
      this.sendResponse(response);
    }
  }

  setBreakPointsRequest(response, args) {
    this.breakpoints = resolveLuaBreakpoints(this.source,
      (args.breakpoints ?? []).map(item => ({
      line: item.line,
      source: args.source?.path ?? this.sourcePath,
      condition: item.condition,
      hitCondition: item.hitCondition,
      logMessage: item.logMessage,
      hits: 0
    })));
    this.installBreakpoints();
    response.body = {
      breakpoints: this.breakpoints.map(point => ({
        verified: point.verified,
        line: point.line,
        message: point.message || undefined
      }))
    };
    this.sendResponse(response);
  }

  installBreakpoints() {
    const ranges = this.temporaryBreakpoint
      ? [this.temporaryBreakpoint.line, this.temporaryBreakpoint.line]
      : this.breakpoints.flatMap(item => [
          item.line, Math.max(item.line, item.endLine ?? item.line)
        ]);
    const lines = Int32Array.from(ranges);
    const pointer = Number(this.exports.wlua_alloc(lines.byteLength));
    new Uint8Array(this.memory.buffer).set(
      new Uint8Array(lines.buffer), pointer);
    this.exports.wlua_debug_set_breakpoint_ranges(
      this.handle, pointer, lines.length / 2);
    this.exports.wlua_free(pointer);
  }

  configurationDoneRequest(response) {
    this.sendResponse(response);
    void this.startProgram();
  }

  threadsRequest(response) {
    response.body = { threads: [new Thread(1, 'Lua 主协程')] };
    this.sendResponse(response);
  }

  continueRequest(response) {
    response.body = { allThreadsContinued: true };
    this.sendResponse(response);
    this.lastResumeMode = 0;
    this.clearVariableReferences();
    this.startExecutionClock();
    void this.advance(this.exports.wlua_resume(this.handle, 0));
  }
  nextRequest(response) {
    this.sendResponse(response);
    this.lastResumeMode = 2;
    this.clearVariableReferences();
    this.startExecutionClock();
    void this.advance(this.exports.wlua_resume(this.handle, 2));
  }
  stepInRequest(response) {
    this.sendResponse(response);
    this.lastResumeMode = 1;
    this.clearVariableReferences();
    this.startExecutionClock();
    void this.advance(this.exports.wlua_resume(this.handle, 1));
  }
  stepOutRequest(response) {
    this.sendResponse(response);
    this.lastResumeMode = 3;
    this.clearVariableReferences();
    this.startExecutionClock();
    void this.advance(this.exports.wlua_resume(this.handle, 3));
  }

  pauseRequest(response) {
    this.pauseRequested = true;
    this.sendResponse(response);
  }

  gotoTargetsRequest(response, args) {
    const line = Number(args.line);
    response.body = {
      targets: [{ id: line, label: `第 ${line} 行`, line, column: args.column ?? 1 }]
    };
    this.sendResponse(response);
  }

  gotoRequest(response, args) {
    this.temporaryBreakpoint = {
      line: Number(args.targetId),
      source: this.sourcePath
    };
    this.installBreakpoints();
    this.sendResponse(response);
    this.lastResumeMode = 0;
    this.clearVariableReferences();
    this.startExecutionClock();
    void this.advance(this.exports.wlua_resume(this.handle, 0));
  }

  stackTraceRequest(response) {
    const frames = this.debugJson('wlua_debug_stack').map(frame =>
      new StackFrame(
        frame.id,
        frame.name,
        new Source(path.basename(this.sourcePath), this.sourcePath),
        frame.line,
        frame.column
      ));
    response.body = { stackFrames: frames, totalFrames: frames.length };
    this.sendResponse(response);
  }

  scopesRequest(response, args) {
    if (!Number.isInteger(args.frameId) || args.frameId < 0) {
      response.success = false;
      response.message = '无效的 DAP 栈帧引用。';
      this.sendResponse(response);
      return;
    }
    const references = [1, 2, 3].map(offset => args.frameId * 10 + offset);
    references.forEach((reference, index) =>
      this.scopeReferences.set(reference, { frame: args.frameId, scope: index }));
    response.body = {
      scopes: [
        new Scope('局部变量', references[0], false),
        new Scope('Upvalue', references[1], false),
        new Scope('全局变量', references[2], true)
      ]
    };
    this.sendResponse(response);
  }

  variablesRequest(response, args) {
    const nativeReference = this.variableReferences.get(args.variablesReference);
    if (nativeReference !== undefined) {
      response.body = {
        variables: this.mapVariables(this.debugJson(
          'wlua_debug_variables', 0, nativeReference))
      };
      this.sendResponse(response);
      return;
    }
    const scopeReference = this.scopeReferences.get(args.variablesReference);
    if (!scopeReference) {
      response.success = false;
      response.message = '未知或已失效的 DAP 变量引用。';
      this.sendResponse(response);
      return;
    }
    response.body = {
      variables: this.mapVariables(this.debugJson(
        'wlua_debug_variables', scopeReference.frame, scopeReference.scope))
    };
    this.sendResponse(response);
  }

  evaluateRequest(response, args) {
    const result = this.evaluateNow(args.expression, args.frameId ?? 0);
    response.body = {
      result: result[0]?.value ?? result.error ?? 'nil',
      variablesReference: this.mapVariableReference(
        result[0]?.variablesReference ?? 0)
    };
    this.sendResponse(response);
  }

  setVariableRequest(response, args) {
    const mappedReference = this.variableReferences.get(args.variablesReference);
    const scopeReference = this.scopeReferences.get(args.variablesReference);
    if (mappedReference === undefined && !scopeReference) {
      response.success = false;
      response.message = '未知或已失效的 DAP 变量引用。';
      this.sendResponse(response);
      return;
    }
    const frame = scopeReference?.frame ?? 0;
    const scope = scopeReference?.scope ?? mappedReference;
    const name = new TextEncoder().encode(args.name);
    const value = new TextEncoder().encode(args.value);
    const namePointer = this.copyIn(name);
    const valuePointer = this.copyIn(value);
    const result = this.debugJson('wlua_debug_set_variable', frame, scope,
      namePointer, name.length, valuePointer, value.length);
    this.exports.wlua_free(namePointer);
    this.exports.wlua_free(valuePointer);
    if (result.error) {
      response.success = false;
      response.message = result.error;
    } else {
      const variable = result[0];
      response.body = {
        value: variable.value,
        type: variable.type,
        variablesReference: this.mapVariableReference(variable.variablesReference)
      };
    }
    this.sendResponse(response);
  }

  exceptionInfoRequest(response) {
    response.body = {
      exceptionId: 'lua.uncaught',
      description: this.lastException ?? '未捕获的 Lua 异常',
      breakMode: 'unhandled'
    };
    this.sendResponse(response);
  }

  disconnectRequest(response) {
    if (this.handle) this.exports.wlua_destroy(this.handle);
    this.sendResponse(response);
  }

  async startProgram() {
    this.clearVariableReferences();
    this.startExecutionClock(true);
    const source = new TextEncoder().encode(this.source);
    const name = new TextEncoder().encode(
      '@' + this.sourcePath.replaceAll('\\', '/'));
    const sourcePointer = this.copyIn(source);
    const namePointer = this.copyIn(name);
    const state = this.exports.wlua_run(
      this.handle,
      sourcePointer,
      source.length,
      namePointer,
      name.length
    );
    this.exports.wlua_free(sourcePointer);
    this.exports.wlua_free(namePointer);
    await this.advance(state);
  }

  async advance(state) {
    for (;;) {
      this.flushOutput();
      if (state === 3) {
        await new Promise(resolve => setImmediate(resolve));
        if (this.pauseRequested) {
          this.pauseRequested = false;
          this.pauseExecutionClock();
          this.sendEvent(new StoppedEvent('pause', 1));
          return;
        }
        // An internal scheduler slice must be transparent to the active
        // debugger command. Resuming with CONTINUE here used to erase a
        // step-over plan before the next source line was reached.
        state = this.exports.wlua_resume(this.handle, this.lastResumeMode);
        continue;
      }
      if (state === 1) {
        const line = Number(this.exports.wlua_current_line(this.handle));
        const source = this.currentSource();
        const pauseReason = Number(
          this.exports.wlua_debug_pause_reason(this.handle));
        const decision = this.processBreakpoint(line, source, pauseReason);
        if (!decision.stop) {
          // Conditional breakpoints and log points are evaluated after the C
          // hook has paused. Keep the original step line/depth when that
          // breakpoint is filtered instead of anchoring a new step plan here.
          state = this.exports.wlua_debug_resume_filtered(
            this.handle, this.lastResumeMode);
          continue;
        }
        this.pauseExecutionClock();
        this.sendEvent(new StoppedEvent(decision.reason, 1));
      } else if (state === 2) {
        this.pauseExecutionClock();
        state = await this.resumeCapability();
        continue;
      } else if (state === -1) {
        this.pauseExecutionClock();
        const error = decodeWire(this.resultWire());
        this.lastException = error.message;
        this.sendEvent(new OutputEvent(error.message + '\n', 'stderr'));
        this.sendEvent(new StoppedEvent('exception', 1));
      } else if (state === 0) {
        this.pauseExecutionClock();
        this.sendEvent(new TerminatedEvent());
      } else {
        this.pauseExecutionClock();
        this.sendEvent(new StoppedEvent('pause', 1));
      }
      return;
    }
  }

  async resumeCapability() {
    const [name, ...args] = decodeWire(this.resultWire());
    let rejected = 0;
    let value;
    try {
      const builtin = this.osBridge.invoke(name, args);
      if (builtin.handled) {
        value = await builtin.value;
      } else if (name === 'clock.now') {
        value = Date.now();
      } else if (name === 'timer.sleep') {
        const milliseconds = Number(args[0] ?? 0);
        if (!Number.isFinite(milliseconds) || milliseconds < 0 ||
            milliseconds > 60_000)
          throw new RangeError('timer.sleep 延迟必须是 0 到 60000 毫秒。');
        await new Promise(resolve => setTimeout(resolve, milliseconds));
        value = null;
      } else {
        throw new Error(`Node DAP 未注册能力：${name}`);
      }
    } catch (error) {
      rejected = 1;
      value = error instanceof Error ? error.message : String(error);
    }
    const wire = encodeWire(value);
    const pointer = this.copyIn(wire);
    this.startExecutionClock();
    const state = this.exports.wlua_resume_value(
      this.handle, pointer, wire.length, rejected, this.lastResumeMode);
    this.exports.wlua_free(pointer);
    return state;
  }

  clockNow() {
    return globalThis.performance?.now?.() ?? Date.now();
  }

  executionClockSeconds() {
    const active = this.executionClockStarted == null
      ? 0 : this.clockNow() - this.executionClockStarted;
    return (this.executionClockElapsed + active) / 1000;
  }

  startExecutionClock(reset = false) {
    if (reset) this.executionClockElapsed = 0;
    if (this.executionClockStarted == null)
      this.executionClockStarted = this.clockNow();
  }

  pauseExecutionClock() {
    if (this.executionClockStarted == null) return;
    this.executionClockElapsed += this.clockNow() - this.executionClockStarted;
    this.executionClockStarted = null;
  }

  evaluateNow(expression, frame = 0) {
    const bytes = new TextEncoder().encode(expression);
    const pointer = this.copyIn(bytes);
    const result = this.debugJson('wlua_debug_evaluate', frame,
      pointer, bytes.length);
    this.exports.wlua_free(pointer);
    return result;
  }

  normalizeSource(value) {
    return String(value ?? '').replace(/^[@=]/u, '').replaceAll('\\', '/');
  }

  sourceMatches(point, source) {
    const expected = this.normalizeSource(point.source);
    return !expected || expected === this.normalizeSource(source);
  }

  currentSource() {
    return this.debugJson('wlua_debug_stack')[0]?.source ?? '';
  }

  processBreakpoint(line, source, pauseReason) {
    const stoppedForStep = (pauseReason & 2) !== 0;
    const ignoredBreakpoint = () => stoppedForStep
      ? { stop: true, reason: 'step' }
      : { stop: false };
    if (this.temporaryBreakpoint?.line === line &&
        this.sourceMatches(this.temporaryBreakpoint, source)) {
      this.temporaryBreakpoint = null;
      this.installBreakpoints();
      return { stop: true, reason: 'goto' };
    }
    const point = this.breakpoints
      .filter(item => item.line <= line &&
        line <= (item.endLine ?? item.line) && this.sourceMatches(item, source))
      .sort((left, right) => right.line - left.line)[0];
    if (!point) return ignoredBreakpoint();
    if (point.line !== line || point.endLine !== line || point.verified === false) {
      const requested = point.requestedLine ?? point.line;
      point.line = line;
      point.endLine = line;
      point.verified = true;
      point.message = requested === line ? '' :
        `第 ${requested} 行不可执行，断点已下移到第 ${line} 行。`;
      this.installBreakpoints();
      this.sendEvent(new BreakpointEvent('changed', {
        verified: true, line, message: point.message
      }));
    }
    point.hits++;
    if (!this.hitConditionMatches(point.hitCondition, point.hits))
      return ignoredBreakpoint();
    if (point.condition) {
      const result = this.evaluateNow(point.condition);
      if (result.error) {
        this.sendEvent(new OutputEvent(
          `[条件断点 ${line}] ${result.error}\n`, 'stderr'));
        return { stop: true, reason: 'breakpoint' };
      }
      const value = result[0];
      if (!value || value.type === 'nil' ||
          (value.type === 'boolean' && value.value !== 'true'))
        return ignoredBreakpoint();
    }
    if (point.logMessage) {
      const output = point.logMessage.replace(/\{([^{}]+)\}/g,
        (_whole, expression) => {
          const result = this.evaluateNow(expression);
          return result.error ? `<错误: ${result.error}>` :
            (result[0]?.value ?? 'nil');
        });
      this.sendEvent(new OutputEvent(output + '\n', 'console'));
      return ignoredBreakpoint();
    }
    return { stop: true, reason: 'breakpoint' };
  }

  hitConditionMatches(condition, hits) {
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

  copyIn(bytes) {
    const pointer = Number(this.exports.wlua_alloc(bytes.length));
    new Uint8Array(this.memory.buffer).set(bytes, pointer);
    return pointer;
  }

  resultWire() {
    const pointer = Number(
      this.exports.wlua_result_ptr(this.handle));
    const length = Number(
      this.exports.wlua_result_len(this.handle));
    return new Uint8Array(this.memory.buffer).slice(
      pointer, pointer + length);
  }

  flushOutput() {
    const pointer = Number(
      this.exports.wlua_output_ptr(this.handle));
    const length = Number(
      this.exports.wlua_output_len(this.handle));
    if (length) {
      const text = new TextDecoder().decode(
        new Uint8Array(this.memory.buffer).slice(
          pointer, pointer + length));
      this.sendEvent(new OutputEvent(text, 'stdout'));
      this.exports.wlua_output_clear(this.handle);
    }
  }

  debugJson(name, ...args) {
    const pointer = Number(
      this.exports[name](this.handle, ...args));
    const length = Number(
      this.exports.wlua_debug_json_len(this.handle));
    return JSON.parse(new TextDecoder().decode(
      new Uint8Array(this.memory.buffer).slice(
        pointer, pointer + length)));
  }

  mapVariableReference(nativeReference) {
    if (!nativeReference) return 0;
    let reference = this.reverseVariableReferences.get(nativeReference);
    if (!reference) {
      reference = this.nextVariableReference++;
      this.reverseVariableReferences.set(nativeReference, reference);
      this.variableReferences.set(reference, nativeReference);
    }
    return reference;
  }

  clearVariableReferences() {
    this.variableReferences.clear();
    this.reverseVariableReferences.clear();
    this.scopeReferences.clear();
  }

  mapVariables(variables) {
    return variables.map(variable => ({
      ...variable,
      variablesReference: this.mapVariableReference(
        variable.variablesReference)
    }));
  }
}

DebugSession.run(WasmLuaDebugSession);
