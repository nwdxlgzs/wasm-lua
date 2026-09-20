import { createLuaDebugger, LuaRuntime } from './runtime.js';
import { resolveLuaBreakpoints } from './breakpoints.js';

/**
 * @typedef {{seq: number, type: 'request', command: string,
 *   arguments?: Record<string, any>}} DapRequest
 * @typedef {'continue'|'stepIn'|'stepOver'|'stepOut'} ResumeMethod
 */

/**
 * DAP 1.68 adapter transported as structured-clone messages over MessagePort.
 * Requests and responses use the standard Debug Adapter Protocol message
 * objects without stdio's Content-Length envelope.
 */
export class LuaDapAdapter {
  /** @param {LuaRuntime|import('./runtime.js').LuaRuntimeOptions} [runtimeOrOptions] */
  constructor(runtimeOrOptions = {}) {
    this.ownsRuntime = !(runtimeOrOptions instanceof LuaRuntime);
    this.runtime = this.ownsRuntime
      ? createLuaDebugger(/** @type {import('./runtime.js').LuaRuntimeOptions} */ (
          runtimeOrOptions))
      : /** @type {LuaRuntime} */ (runtimeOrOptions);
    const channel = new MessageChannel();
    this.port = channel.port2;
    this.adapterPort = channel.port1;
    this.adapterPort.onmessage = event => this.handle(event.data);
    this.adapterPort.start();
    this.controller = new AbortController();
    const signal = this.controller.signal;
    this.runtime.addEventListener('output', event => this.sendEvent('output', {
      category: event.detail.category ?? 'stdout',
      output: event.detail.output
    }), { signal });
    this.runtime.addEventListener('stopped', event => this.sendEvent('stopped', {
      reason: event.detail.reason,
      threadId: 1,
      allThreadsStopped: true,
      line: event.detail.line
    }), { signal });
    this.runtime.addEventListener('breakpointchange', event => {
      for (const point of event.detail.breakpoints ?? [])
        this.sendEvent('breakpoint', { reason: 'changed', breakpoint: {
          verified: point.verified !== false,
          line: point.line,
          message: point.message || undefined
        }});
    }, { signal });
    this.runtime.addEventListener('terminated', () =>
      this.sendEvent('terminated', {}), { signal });
  }

  /** @type {LuaRuntime} */ runtime;
  /** Client-facing DAP transport. */
  /** @type {MessagePort} */ port;
  /** @type {MessagePort} */ adapterPort;
  /** @type {boolean} */ ownsRuntime;
  /** @type {AbortController} */ controller;
  sequence = 0;
  source = '';
  chunkName = '@main.lua';
  lastException = '未捕获的 Lua 异常';
  /** @type {Map<string, import('./runtime.js').LuaBreakpoint[]>} */
  breakpointsBySource = new Map();
  /** @type {Map<number, number>} */ variableReferences = new Map();
  /** @type {Map<number, number>} */ reverseVariableReferences = new Map();
  /** @type {Map<number, {frame: number, scope: number}>} */ scopeReferences = new Map();
  nextVariableReference = 100000;

  /** @param {Record<string, any>} message */
  send(message) { this.adapterPort.postMessage({ seq: ++this.sequence, ...message }); }
  /** @param {string} event @param {Record<string, any>} body */
  sendEvent(event, body) { this.send({ type: 'event', event, body }); }
  /** @param {DapRequest} request @param {Record<string, any>} [body] */
  respond(request, body = {}) {
    this.send({
      type: 'response', request_seq: request.seq, command: request.command,
      success: true, body
    });
  }
  /** @param {DapRequest} request @param {unknown} error */
  fail(request, error) {
    this.send({
      type: 'response', request_seq: request.seq, command: request.command,
      success: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  /** @param {number} nativeReference @returns {number} */
  mapReference(nativeReference) {
    if (!nativeReference) return 0;
    let reference = this.reverseVariableReferences.get(nativeReference);
    if (!reference) {
      reference = this.nextVariableReference++;
      this.reverseVariableReferences.set(nativeReference, reference);
      this.variableReferences.set(reference, nativeReference);
    }
    return reference;
  }

  /** @param {import('./runtime.js').LuaDebugVariable[]} variables */
  mapVariables(variables) {
    return variables.map(variable => ({
      ...variable,
      variablesReference: this.mapReference(variable.variablesReference)
    }));
  }

  /** @param {DapRequest} request @param {ResumeMethod} method */
  async resume(request, method) {
    this.respond(request, method === 'continue'
      ? { allThreadsContinued: true } : {});
    this.variableReferences.clear();
    this.reverseVariableReferences.clear();
    this.scopeReferences.clear();
    try { await this.runtime[method](); }
    catch (error) { this.lastException = error.message; }
  }

  /** @param {DapRequest} request */
  async handle(request) {
    if (!request || request.type !== 'request') return;
    const args = request.arguments ?? {};
    try {
      switch (request.command) {
        case 'initialize':
          this.respond(request, {
            supportsConfigurationDoneRequest: true,
            supportsConditionalBreakpoints: true,
            supportsHitConditionalBreakpoints: true,
            supportsLogPoints: true,
            supportsEvaluateForHovers: true,
            supportsSetVariable: true,
            supportsGotoTargetsRequest: true,
            supportsExceptionInfoRequest: true,
            wasmLuaProtocolVersion: 'DAP 1.68 / ABI 1.0'
          });
          this.sendEvent('initialized', {});
          return;
        case 'launch':
          this.source = args.source ?? args.sourceText ?? '';
          this.chunkName = args.chunkName ?? '@main.lua';
          this.respond(request);
          return;
        case 'setBreakpoints': {
          const source = args.source?.path ?? args.source?.name ??
            this.chunkName.replace(/^@/u, '');
          const breakpoints = resolveLuaBreakpoints(this.source,
            (args.breakpoints ?? []).map(point => ({
            line: point.line,
            source,
            condition: point.condition,
            hitCondition: point.hitCondition,
            logMessage: point.logMessage
          })));
          this.breakpointsBySource.set(source, breakpoints);
          await this.runtime.setBreakpoints(
            [...this.breakpointsBySource.values()].flat());
          this.respond(request, {
            breakpoints: breakpoints.map(point => ({
              verified: point.verified,
              line: point.line,
              message: point.message || undefined
            }))
          });
          return;
        }
        case 'configurationDone':
          this.respond(request);
          this.runtime.run(this.source, { chunkName: this.chunkName })
            .catch(error => { this.lastException = error.message; });
          return;
        case 'threads':
          this.respond(request, { threads: [{ id: 1, name: 'Lua 主协程' }] });
          return;
        case 'stackTrace': {
          const frames = await this.runtime.stackTrace();
          this.respond(request, {
            stackFrames: frames.map(frame => {
              const sourcePath = frame.source.replace(/^[@=]/u, '') ||
                this.chunkName.replace(/^@/u, '');
              return {
                id: frame.id,
                name: frame.name,
                source: {
                  name: sourcePath.split(/[\\/]/u).at(-1), path: sourcePath
                },
                line: frame.line,
                column: frame.column
              };
            }),
            totalFrames: frames.length
          });
          return;
        }
        case 'scopes':
          if (!Number.isInteger(args.frameId) || args.frameId < 0)
            throw new Error('无效的 DAP 栈帧引用。');
          {
            const references = [1, 2, 3].map(offset => args.frameId * 10 + offset);
            references.forEach((reference, index) =>
              this.scopeReferences.set(reference, { frame: args.frameId, scope: index }));
            this.respond(request, { scopes: [
              { name: '局部变量', variablesReference: references[0], expensive: false },
              { name: 'Upvalue', variablesReference: references[1], expensive: false },
              { name: '全局变量', variablesReference: references[2], expensive: true }
            ]});
          }
          return;
        case 'variables': {
          const nativeReference = this.variableReferences.get(args.variablesReference);
          const scopeReference = this.scopeReferences.get(args.variablesReference);
          if (nativeReference === undefined && !scopeReference)
            throw new Error('未知或已失效的 DAP 变量引用。');
          const frame = scopeReference?.frame ?? 0;
          const scope = scopeReference?.scope ?? nativeReference;
          this.respond(request, {
            variables: this.mapVariables(await this.runtime.variables(frame, scope))
          });
          return;
        }
        case 'evaluate': {
          const result = await this.runtime.evaluate(args.expression, args.frameId ?? 0);
          if (!Array.isArray(result)) throw new Error(result.error);
          this.respond(request, {
            result: result[0]?.value ?? 'nil',
            type: result[0]?.type,
            variablesReference: this.mapReference(result[0]?.variablesReference ?? 0)
          });
          return;
        }
        case 'setVariable': {
          const nativeReference = this.variableReferences.get(args.variablesReference);
          const scopeReference = this.scopeReferences.get(args.variablesReference);
          if (nativeReference === undefined && !scopeReference)
            throw new Error('未知或已失效的 DAP 变量引用。');
          const frame = scopeReference?.frame ?? 0;
          const scope = scopeReference?.scope ?? nativeReference;
          const result = await this.runtime.setVariable(frame, scope, args.name, args.value);
          if (!result[0]) throw new Error('变量赋值没有返回结果。');
          this.respond(request, {
            value: result[0].value,
            type: result[0].type,
            variablesReference: this.mapReference(result[0].variablesReference)
          });
          return;
        }
        case 'continue': return this.resume(request, 'continue');
        case 'next': return this.resume(request, 'stepOver');
        case 'stepIn': return this.resume(request, 'stepIn');
        case 'stepOut': return this.resume(request, 'stepOut');
        case 'pause':
          await this.runtime.pause();
          this.respond(request);
          return;
        case 'gotoTargets':
          this.respond(request, { targets: [{
            id: args.line,
            label: `第 ${args.line} 行`,
            line: args.line,
            column: args.column ?? 1
          }]});
          return;
        case 'goto':
          this.respond(request);
          this.runtime.runToCursor(args.targetId, this.chunkName.replace(/^@/u, ''))
            .catch(error => { this.lastException = error.message; });
          return;
        case 'exceptionInfo':
          this.respond(request, {
            exceptionId: 'lua.uncaught',
            description: this.lastException,
            breakMode: 'unhandled'
          });
          return;
        case 'disconnect':
          this.respond(request);
          this.dispose();
          return;
        default:
          throw new Error(`不支持的 DAP 请求：${request.command}`);
      }
    } catch (error) {
      this.fail(request, error);
    }
  }

  /** Close the transport and, when owned, dispose the Lua runtime. */
  dispose() {
    this.controller.abort();
    this.adapterPort.close();
    if (this.ownsRuntime) this.runtime.dispose();
  }
}

/** @param {LuaRuntime|import('./runtime.js').LuaRuntimeOptions} [runtimeOrOptions] */
export function createLuaDapAdapter(runtimeOrOptions = {}) {
  return new LuaDapAdapter(runtimeOrOptions);
}
