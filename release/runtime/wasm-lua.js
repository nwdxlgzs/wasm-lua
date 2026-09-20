const J = new TextEncoder(), C = new TextDecoder(), _ = [87, 76, 85, 1];
class T {
  /** @readonly @type {number} */
  id;
  /** @readonly @type {string|number} */
  type;
  /** @param {number} id @param {string|number} [type]
   * @param {((id: number) => void)|null} [release] @param {object|null} [owner] */
  constructor(e, t = "value", n = null, r = null) {
    Object.defineProperties(this, {
      id: { value: e, enumerable: !0, writable: !1, configurable: !1 },
      type: { value: t, enumerable: !0, writable: !1, configurable: !1 }
    }), this.#e = n, this.#o = r;
  }
  #e;
  #o;
  /** @param {object} owner */
  isOwnedBy(e) {
    return this.#o === e;
  }
  release() {
    this.#e?.(this.id), this.#e = null, this.#o = null;
  }
  toJSON() {
    return { $luaRef: this.id, type: this.type };
  }
}
class Z {
  chunks = [];
  length = 0;
  push(e) {
    this.chunks.push(e), this.length += e.length;
  }
  byte(e) {
    this.push(Uint8Array.of(e));
  }
  u32(e) {
    const t = new Uint8Array(4);
    new DataView(t.buffer).setUint32(0, e, !0), this.push(t);
  }
  i64(e) {
    const t = new Uint8Array(8);
    new DataView(t.buffer).setBigInt64(0, BigInt(e), !0), this.push(t);
  }
  f64(e) {
    const t = new Uint8Array(8);
    new DataView(t.buffer).setFloat64(0, e, !0), this.push(t);
  }
  finish() {
    const e = new Uint8Array(this.length);
    let t = 0;
    for (const n of this.chunks)
      e.set(n, t), t += n.length;
    return e;
  }
}
function $(i, e, t, n) {
  if (n > 64) throw new TypeError("Value nesting exceeds 64 levels.");
  if (e == null) {
    i.byte(0);
    return;
  }
  if (e === !1) {
    i.byte(1);
    return;
  }
  if (e === !0) {
    i.byte(2);
    return;
  }
  if (typeof e == "number") {
    i.byte(3), i.f64(e);
    return;
  }
  if (typeof e == "bigint") {
    i.byte(4), i.i64(e);
    return;
  }
  if (e instanceof Uint8Array) {
    i.byte(5), i.u32(e.length), i.push(e);
    return;
  }
  if (typeof e == "string") {
    const r = J.encode(e);
    i.byte(6), i.u32(r.length), i.push(r);
    return;
  }
  if (e instanceof T) {
    i.byte(9), i.u32(e.id), i.byte(0);
    return;
  }
  if (e && Number.isInteger(e.$luaRef))
    throw new TypeError("Raw Lua reference objects cannot cross the ABI boundary.");
  if (typeof e != "object") throw new TypeError("Unsupported value: " + typeof e);
  if (t.has(e)) throw new TypeError("Cyclic values cannot cross the Lua boundary.");
  if (t.add(e), Array.isArray(e)) {
    i.byte(7), i.u32(e.length);
    for (const r of e) $(i, r, t, n + 1);
  } else {
    const r = Object.entries(e);
    i.byte(8), i.u32(r.length);
    for (const [s, o] of r)
      $(i, s, t, n + 1), $(i, o, t, n + 1);
  }
  t.delete(e);
}
function S(i) {
  const e = new Z();
  return e.push(Uint8Array.from(_)), $(e, i, /* @__PURE__ */ new WeakSet(), 0), e.finish();
}
class K {
  constructor(e) {
    this.bytes = e, this.view = new DataView(e.buffer, e.byteOffset, e.byteLength);
  }
  bytes;
  view;
  offset = 0;
  byte() {
    if (this.offset >= this.bytes.length) throw new RangeError("Truncated wire value.");
    return this.bytes[this.offset++];
  }
  u32() {
    const e = this.view.getUint32(this.offset, !0);
    return this.offset += 4, e;
  }
  i64() {
    const e = this.view.getBigInt64(this.offset, !0);
    return this.offset += 8, e;
  }
  f64() {
    const e = this.view.getFloat64(this.offset, !0);
    return this.offset += 8, e;
  }
  take(e) {
    const t = this.bytes.subarray(this.offset, this.offset + e);
    if (t.length !== e) throw new RangeError("Truncated wire value.");
    return this.offset += e, t;
  }
}
function L(i, e) {
  if (e > 64) throw new RangeError("Wire value nesting exceeds 64 levels.");
  const t = i.byte();
  switch (t) {
    case 0:
      return null;
    case 1:
      return !1;
    case 2:
      return !0;
    case 3:
      return i.f64();
    case 4:
      return i.i64();
    case 5:
      return i.take(i.u32()).slice();
    case 6:
      return C.decode(i.take(i.u32()));
    case 7: {
      const n = [], r = i.u32();
      for (let s = 0; s < r; s++) n.push(L(i, e + 1));
      return n;
    }
    case 8: {
      const n = {}, r = i.u32();
      for (let s = 0; s < r; s++) {
        const o = L(i, e + 1);
        n[String(o)] = L(i, e + 1);
      }
      return n;
    }
    case 9: {
      const n = i.u32(), r = i.byte();
      return { $luaRef: n, luaType: r };
    }
    case 10:
      return { $jsRef: i.u32() };
    case 11: {
      const n = new Error(C.decode(i.take(i.u32())));
      return n.name = "LuaError", n;
    }
    default:
      throw new RangeError("Unknown wire tag " + t + ".");
  }
}
function X(i) {
  const e = i instanceof Uint8Array ? i : new Uint8Array(i);
  if (e.length < 5 || _.some((n, r) => e[r] !== n))
    throw new TypeError("Unsupported wasm-lua wire format.");
  const t = new K(e);
  return t.offset = 4, L(t, 0);
}
const Q = /^[\p{L}_][\p{L}\p{N}_.:/-]*$/u, P = /^[\p{L}_][\p{L}\p{N}_]*$/u, j = /* @__PURE__ */ new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "global",
  "goto",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while"
]);
function A(i) {
  if (typeof i != "string" || !Q.test(i) || i.includes(".."))
    throw new TypeError(`无效的能力名称：${String(i)}`);
  return i;
}
function M(i, e, t, n, r = !1) {
  if (i === void 0) return e;
  if (r && i === Number.POSITIVE_INFINITY) return i;
  if (!Number.isInteger(i) || i < n)
    throw new TypeError(`${t} 必须是大于等于 ${n} 的整数。`);
  return i;
}
function D(i) {
  const e = typeof i == "function" ? { handler: i } : i && typeof i == "object" ? { ...i } : null;
  if (!e || typeof e.handler != "function")
    throw new TypeError("能力必须是函数或包含 handler 函数的描述符。");
  const t = e.parameters ?? [];
  if (!Array.isArray(t) || t.some((r) => !r || typeof r.name != "string" || !P.test(r.name) || j.has(r.name)))
    throw new TypeError("能力 parameters 必须使用非关键字的 Lua 标识符 name。");
  if (new Set(t.map((r) => r.name)).size !== t.length)
    throw new TypeError("能力 parameters 不能包含重复名称。");
  const n = e.returns == null ? [] : Array.isArray(e.returns) ? e.returns : [e.returns];
  if (n.some((r) => !r || typeof r != "object"))
    throw new TypeError("能力 returns 必须是对象或对象数组。");
  return Object.freeze({
    description: String(e.description ?? ""),
    parameters: Object.freeze(t.map((r) => Object.freeze({
      name: r.name,
      type: String(r.type ?? "any"),
      description: String(r.description ?? ""),
      optional: !!r.optional
    }))),
    returns: Object.freeze(n.map((r) => Object.freeze({
      type: String(r.type ?? "any"),
      description: String(r.description ?? "")
    }))),
    timeoutMs: M(e.timeoutMs, 0, "timeoutMs", 0),
    maxConcurrency: e.maxConcurrency === void 0 ? Number.POSITIVE_INFINITY : M(e.maxConcurrency, 1, "maxConcurrency", 1, !0),
    queueLimit: e.queueLimit === void 0 ? Number.POSITIVE_INFINITY : M(e.queueLimit, 0, "queueLimit", 0, !0),
    tags: Object.freeze((e.tags ?? []).map(String)),
    internal: !!e.internal,
    handler: e.handler
  });
}
function R(i, e) {
  const { handler: t, ...n } = e.descriptor;
  return Object.freeze({
    name: i,
    ...n,
    activeCount: e.active,
    queuedCount: e.queue.length
  });
}
function k(i, e, t) {
  i.dispatchEvent(new CustomEvent(e, { detail: t }));
}
function W(i, e = "", t = []) {
  if (typeof i == "function" || i?.handler instanceof Function) {
    if (!e) throw new TypeError("能力组中的能力必须拥有名称。");
    return t.push([e, i]), t;
  }
  if (!i || typeof i != "object" || Array.isArray(i))
    throw new TypeError(`能力组 ${e || "<root>"} 必须是能力或嵌套对象。`);
  for (const [n, r] of Object.entries(i)) {
    if (!P.test(n))
      throw new TypeError(`能力组成员不是合法 Lua 标识符：${n}`);
    if (j.has(n))
      throw new TypeError(`能力组成员不能使用 Lua 关键字：${n}`);
    W(r, e ? `${e}.${n}` : n, t);
  }
  return t;
}
function ee(i) {
  return JSON.stringify(i).replace(/\u2028|\u2029/gu, (e) => `\\u{${e.codePointAt(0).toString(16)}}`);
}
function te(i) {
  const e = [];
  i.description && e.push(`--- ${i.description}`);
  for (const t of i.parameters)
    e.push(`---@param ${t.name}${t.optional ? "?" : ""} ${t.type}${t.description ? ` ${t.description}` : ""}`);
  for (const t of i.returns)
    e.push(`---@return ${t.type}${t.description ? ` ${t.description}` : ""}`);
  return e;
}
function ne(i, e, t) {
  if (A(i), typeof t != "string" || !t || !/^[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)*$/u.test(t))
    throw new TypeError("moduleName 必须是安全的点分 Lua 标识符。");
  const n = ["local M = {}"], r = ["---@meta", `---@module ${t}`, "local M = {}"], s = /* @__PURE__ */ new Set();
  for (const o of e) {
    const a = o.relativeName.split(".");
    let c = "M";
    for (const h of a.slice(0, -1))
      c += "." + h, s.has(c) || (s.add(c), n.push(`${c} = {}`), r.push(`${c} = {}`));
    const u = a.at(-1), l = o.descriptor.parameters.map((h) => h.name), f = l.length ? l.join(", ") : "...";
    n.push(
      `function ${c}.${u}(${f})`,
      `  return js.call(${ee(o.name)}${l.length ? ", " + l.join(", ") : ", ..."})`,
      "end"
    ), r.push(
      ...te(o.descriptor),
      `function ${c}.${u}(${f}) end`
    );
  }
  return n.push("return M"), r.push("return M"), Object.freeze({
    moduleName: t,
    source: n.join(`
`) + `
`,
    definition: r.join(`
`) + `
`,
    uri: `file:///definitions/capabilities/${encodeURIComponent(t)}.lua`
  });
}
class Y {
  /** @param {ReadonlyArray<string>} names @param {() => void} dispose
   * @param {Readonly<CapabilityModule>|null} [module] */
  constructor(e, t, n = null) {
    this.names = Object.freeze([...e]), this.module = n, this.#e = t;
  }
  /** @type {ReadonlyArray<string>} */
  names;
  /** @type {Readonly<CapabilityModule>|null} */
  module;
  #e;
  disposed = !1;
  dispose() {
    this.disposed || (this.disposed = !0, this.#e());
  }
  [Symbol.dispose]() {
    this.dispose();
  }
}
class H extends EventTarget {
  #e = /* @__PURE__ */ new Map();
  #o = [];
  #f = /* @__PURE__ */ new Map();
  #a = 0;
  #u = !1;
  /** @param {string} name @param {CapabilityRegistration} registration
   * @param {{replace?: boolean}} [options] */
  register(e, t, n = {}) {
    if (this.#u) throw new Error("能力注册表已销毁。");
    A(e);
    const r = D(t);
    if (this.#e.has(e) && !n.replace)
      throw new Error(`能力已注册：${e}`);
    this.#e.has(e) && this.#i(e, this.#e.get(e).token);
    const s = Symbol(e), o = { descriptor: r, token: s, active: 0, queue: [] };
    this.#e.set(e, o), k(this, "registered", { capability: R(e, o) });
    let a = !1;
    return () => {
      a || (a = !0, this.#i(e, s));
    };
  }
  /** @param {string} namespace @param {CapabilityGroupMap} registrations
   * @param {{replace?: boolean}} [options]
   * @returns {{capabilities: Array<{relativeName: string, name: string,
   *   descriptor: CapabilityDescriptor}>, handle: CapabilityGroupHandle}} */
  registerGroup(e, t, n = {}) {
    A(e);
    const r = W(t).map(([o, a]) => ({
      relativeName: o,
      name: `${e}.${o}`,
      descriptor: D(a)
    }));
    if (!r.length) throw new Error("能力组不能为空。");
    for (const o of r)
      if (A(o.name), this.#e.has(o.name) && !n.replace)
        throw new Error(`能力已注册：${o.name}`);
    const s = [];
    try {
      for (const o of r)
        s.push(this.register(o.name, o.descriptor, n));
    } catch (o) {
      for (const a of s.reverse()) a();
      throw o;
    }
    return {
      capabilities: r,
      handle: new Y(r.map((o) => o.name), () => {
        for (const o of s.reverse()) o();
      })
    };
  }
  /** Install invocation middleware: `(context, next) => value`.
   * @param {CapabilityMiddleware} middleware */
  use(e) {
    if (typeof e != "function") throw new TypeError("中间件必须是函数。");
    this.#o.push(e);
    let t = !1;
    return () => {
      if (t) return;
      t = !0;
      const n = this.#o.indexOf(e);
      n >= 0 && this.#o.splice(n, 1);
    };
  }
  /** @param {{prefix?: string, includeInternal?: boolean}} [options]
   * @returns {CapabilityInfo[]} */
  list(e = {}) {
    const t = String(e.prefix ?? "");
    return [...this.#e].filter(([n, r]) => n.startsWith(t) && (e.includeInternal || !r.descriptor.internal)).map(([n, r]) => R(n, r));
  }
  /** @param {string} name */
  has(e) {
    return this.#e.has(e);
  }
  async #t(e, t) {
    if (t.active < t.descriptor.maxConcurrency) {
      t.active++;
      return;
    }
    if (t.queue.length >= t.descriptor.queueLimit)
      throw new Error(`能力调用队列已满：${e}`);
    await new Promise((n, r) => t.queue.push({ resolve: n, reject: r })), t.active++;
  }
  #l(e) {
    e.active = Math.max(0, e.active - 1), e.queue.shift()?.resolve();
  }
  /** @param {string} name @param {any[]} [args] @param {object} [extra] */
  async invoke(e, t = [], n = {}) {
    const r = this.#e.get(e);
    if (!r) throw new Error("未注册的 JS 能力：" + e);
    await this.#t(e, r);
    const s = ++this.#a, o = new AbortController();
    let a;
    const c = new Promise((w, E) => {
      a = E;
    }), u = Object.freeze({
      ...n,
      id: s,
      name: e,
      signal: o.signal,
      args: Object.freeze([...t]),
      capability: R(e, r),
      startedAt: performance.now()
    }), l = { id: s, name: e, entry: r, controller: o, cancel: a };
    this.#f.set(s, l), k(this, "invocationstart", { context: u, args: t });
    const f = () => r.descriptor.handler.apply(u, t), h = [...this.#o];
    let p = -1;
    const g = (w) => {
      if (w <= p)
        return Promise.reject(new Error("能力中间件 next() 不能重复调用。"));
      p = w;
      const E = h[w];
      return Promise.resolve(E ? E(u, () => g(w + 1)) : f());
    }, b = Promise.resolve().then(() => g(0));
    b.then(() => this.#c(l), () => this.#c(l));
    let m, y;
    r.descriptor.timeoutMs && (y = new Promise((w, E) => {
      m = setTimeout(() => {
        o.abort(new Error(`能力调用超时：${e}`)), this.#c(l), E(new Error(`能力调用超时：${e}`));
      }, r.descriptor.timeoutMs);
    }));
    try {
      const w = await Promise.race([
        b,
        c,
        ...y ? [y] : []
      ]);
      return k(this, "invocationend", {
        context: u,
        result: w,
        durationMs: performance.now() - u.startedAt
      }), w;
    } catch (w) {
      throw k(this, "invocationerror", {
        context: u,
        error: w,
        durationMs: performance.now() - u.startedAt
      }), w;
    } finally {
      clearTimeout(m);
    }
  }
  #c(e) {
    this.#f.has(e.id) && (this.#f.delete(e.id), this.#l(e.entry));
  }
  cancelActive(e = new Error("能力调用已取消。")) {
    const t = e instanceof Error ? e : new Error(String(e));
    for (const n of this.#e.values())
      for (const r of n.queue.splice(0)) r.reject(t);
    for (const n of this.#f.values())
      n.controller.abort(t), n.cancel(t), this.#c(n);
  }
  #i(e, t) {
    const n = this.#e.get(e);
    if (!n || n.token !== t) return !1;
    this.#e.delete(e);
    for (const r of n.queue.splice(0))
      r.reject(new Error(`能力已撤销：${e}`));
    for (const r of this.#f.values()) if (r.entry === n) {
      const s = new Error(`能力已撤销：${e}`);
      r.controller.abort(s), r.cancel(s), this.#c(r);
    }
    return k(this, "unregistered", { name: e }), !0;
  }
  dispose() {
    if (!this.#u) {
      this.#u = !0, this.cancelActive(new Error("能力注册表已销毁。"));
      for (const [e, t] of [...this.#e]) this.#i(e, t.token);
      this.#o.length = 0;
    }
  }
}
function Se() {
  return new H();
}
const N = "__wlua.os.", O = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], re = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
], F = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
], ie = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
function d(i, e = 2, t = "0") {
  return String(i).padStart(e, t);
}
function v(i, e, t) {
  if (i == null && t !== void 0) return t;
  const n = Number(i);
  if (!Number.isFinite(n) || !Number.isInteger(n))
    throw new TypeError(`${e} 必须是整数。`);
  return n;
}
function I(i, e) {
  const t = e ? i.getUTCFullYear() : i.getFullYear(), n = e ? i.getUTCMonth() : i.getMonth(), r = e ? i.getUTCDate() : i.getDate();
  return Math.floor((Date.UTC(t, n, r) - Date.UTC(t, 0, 1)) / 864e5) + 1;
}
function se(i) {
  const e = i.getFullYear(), t = new Date(e, 0, 1).getTimezoneOffset(), n = new Date(e, 6, 1).getTimezoneOffset();
  return i.getTimezoneOffset() < Math.max(t, n);
}
function q(i, e) {
  const t = (n) => i[`${e ? "getUTC" : "get"}${n}`]();
  return {
    year: BigInt(t("FullYear")),
    month: BigInt(t("Month") + 1),
    day: BigInt(t("Date")),
    hour: BigInt(t("Hours")),
    min: BigInt(t("Minutes")),
    sec: BigInt(t("Seconds")),
    wday: BigInt(t("Day") + 1),
    yday: BigInt(I(i, e)),
    isdst: e ? !1 : se(i)
  };
}
function V(i, e, t) {
  const n = t ? i.getUTCFullYear() : i.getFullYear(), r = I(i, t) - 1, s = new Date(Date.UTC(n, 0, 1)).getUTCDay(), o = e ? (s + 6) % 7 : s;
  return Math.floor((r + 7 - o) / 7);
}
function oe(i, e) {
  const t = e ? i.getUTCFullYear() : i.getFullYear(), n = e ? i.getUTCMonth() : i.getMonth(), r = e ? i.getUTCDate() : i.getDate(), s = new Date(Date.UTC(t, n, r)), o = s.getUTCDay() || 7;
  s.setUTCDate(s.getUTCDate() + 4 - o);
  const a = s.getUTCFullYear(), c = new Date(Date.UTC(a, 0, 1)), u = Math.ceil(((s.getTime() - c.getTime()) / 864e5 + 1) / 7);
  return { year: a, week: u };
}
function ae(i, e) {
  if (e) return "+0000";
  const t = -i.getTimezoneOffset();
  return `${t >= 0 ? "+" : "-"}${d(Math.floor(Math.abs(t) / 60))}` + d(Math.abs(t) % 60);
}
function ce(i, e) {
  if (e) return "UTC";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(i).find((t) => t.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}
function ue(i, e) {
  let t = !1;
  i.startsWith("!") && (t = !0, i = i.slice(1));
  const n = Number(e) * 1e3, r = new Date(n);
  if (!Number.isFinite(n) || Number.isNaN(r.getTime()))
    throw new RangeError("日期超出浏览器可表示范围。");
  if (i === "*t") return q(r, t);
  const s = (m) => r[`${t ? "getUTC" : "get"}${m}`](), o = s("FullYear"), a = s("Month"), c = s("Date"), u = s("Hours"), l = s("Minutes"), f = s("Seconds"), h = s("Day"), p = oe(r, t), g = {
    a: () => O[h],
    A: () => re[h],
    b: () => F[a],
    B: () => ie[a],
    c: () => `${O[h]} ${F[a]} ${d(c, 2, " ")} ${d(u)}:${d(l)}:${d(f)} ${o}`,
    C: () => d(Math.floor(o / 100)),
    d: () => d(c),
    D: () => `${d(a + 1)}/${d(c)}/${d(o % 100)}`,
    e: () => d(c, 2, " "),
    F: () => `${o}-${d(a + 1)}-${d(c)}`,
    g: () => d(p.year % 100),
    G: () => String(p.year),
    h: () => F[a],
    H: () => d(u),
    I: () => d(u % 12 || 12),
    j: () => d(I(r, t), 3),
    m: () => d(a + 1),
    M: () => d(l),
    n: () => `
`,
    p: () => u < 12 ? "AM" : "PM",
    r: () => `${d(u % 12 || 12)}:${d(l)}:${d(f)} ` + (u < 12 ? "AM" : "PM"),
    R: () => `${d(u)}:${d(l)}`,
    S: () => d(f),
    t: () => "	",
    T: () => `${d(u)}:${d(l)}:${d(f)}`,
    U: () => d(V(r, !1, t)),
    u: () => String(h || 7),
    V: () => d(p.week),
    w: () => String(h),
    W: () => d(V(r, !0, t)),
    x: () => `${d(a + 1)}/${d(c)}/${d(o % 100)}`,
    X: () => `${d(u)}:${d(l)}:${d(f)}`,
    y: () => d(o % 100),
    Y: () => String(o),
    z: () => ae(r, t),
    Z: () => ce(r, t),
    "%": () => "%"
  };
  let b = "";
  for (let m = 0; m < i.length; m++) {
    if (i[m] !== "%") {
      b += i[m];
      continue;
    }
    let y = i[++m];
    if ((y === "E" || y === "O") && (y = i[++m]), !y || !g[y])
      throw new TypeError(`无效的 os.date 转换符：%${y ?? ""}`);
    b += g[y]();
  }
  return b;
}
function le(i, e, t, n, r, s) {
  const o = /* @__PURE__ */ new Date(0);
  if (o.setFullYear(i, e - 1, t), o.setHours(n, r, s, 0), Number.isNaN(o.getTime())) throw new RangeError("日期无法表示。");
  return o;
}
function he() {
  const i = new Uint8Array(12);
  return globalThis.crypto?.getRandomValues?.(i), `/tmp/lua-${[...i].map((t) => t.toString(16).padStart(2, "0")).join("")}`;
}
function U(i = {}) {
  const e = new Map(Object.entries(i.environment ?? {}).map(([s, o]) => [String(s), String(o)])), t = () => globalThis.performance?.now?.() ?? Date.now(), n = t(), r = i.clock ?? (() => (t() - n) / 1e3);
  return {
    /** @param {string} name @param {any[]} args */
    invoke(s, o) {
      if (!s.startsWith(N)) return { handled: !1 };
      switch (s.slice(N.length)) {
        case "clock":
          return { handled: !0, value: Number(r()) };
        case "time": {
          if (o.every((c) => c == null))
            return { handled: !0, value: BigInt(Math.floor(Date.now() / 1e3)) };
          const a = le(
            v(o[0], "year"),
            v(o[1], "month"),
            v(o[2], "day"),
            v(o[3], "hour", 12),
            v(o[4], "min", 0),
            v(o[5], "sec", 0)
          );
          return { handled: !0, value: {
            timestamp: BigInt(Math.floor(a.getTime() / 1e3)),
            ...q(a, !1)
          } };
        }
        case "date": {
          const a = o[0] == null ? "%c" : String(o[0]), c = o[1] == null ? Math.floor(Date.now() / 1e3) : Number(o[1]);
          return { handled: !0, value: ue(a, c) };
        }
        case "getenv":
          return { handled: !0, value: e.get(String(o[0])) ?? null };
        case "tmpname":
          return { handled: !0, value: he() };
        default:
          return { handled: !1 };
      }
    }
  };
}
function fe(i) {
  const e = i.split(""), t = (r, s) => {
    for (let o = r; o < s; o++)
      e[o] !== `
` && e[o] !== "\r" && (e[o] = " ");
  };
  let n = 0;
  for (; n < i.length; ) {
    if (i.startsWith("--", n)) {
      const s = /^--\[(=*)\[/.exec(i.slice(n));
      if (s) {
        const o = `]${s[1]}]`, a = i.indexOf(o, n + s[0].length), c = a < 0 ? i.length : a + o.length;
        t(n, c), n = c;
      } else {
        const o = i.indexOf(`
`, n), a = o < 0 ? i.length : o;
        t(n, a), n = a;
      }
      continue;
    }
    const r = /^\[(=*)\[/.exec(i.slice(n));
    if (r) {
      const s = `]${r[1]}]`, o = i.indexOf(s, n + r[0].length), a = o < 0 ? i.length : o + s.length;
      t(n, a), n = a;
      continue;
    }
    if (i[n] === '"' || i[n] === "'") {
      const s = i[n];
      let o = n + 1;
      for (; o < i.length; )
        if (i[o] === "\\") o += 2;
        else if (i[o++] === s) break;
      t(n, o), n = o;
      continue;
    }
    n++;
  }
  return e.join("");
}
function de(i, e) {
  let t = 0, n = e.length;
  for (; t + 1 < n; ) {
    const r = t + n >>> 1;
    e[r] <= i ? t = r : n = r;
  }
  return t + 1;
}
const pe = /* @__PURE__ */ new Set([
  "function",
  "if",
  "then",
  "elseif",
  "else",
  "for",
  "while",
  "do",
  "repeat",
  "until",
  "end"
]), we = /* @__PURE__ */ new Set(["elseif", "else", "until", "end"]);
function me(i) {
  const e = [0];
  for (let n = 0; n < i.length; n++)
    i[n] === `
` && e.push(n + 1);
  const t = /(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*/gu;
  return [...i.matchAll(t)].filter((n) => pe.has(n[0])).map((n) => {
    const r = de(n.index, e);
    return {
      value: n[0],
      offset: n.index,
      line: r,
      column: n.index - e[r - 1] + 1
    };
  });
}
function ye(i) {
  const e = i.trim();
  return !e || /^(?:end|else)\s*;?$/u.test(e) || /^::(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*::\s*;?$/u.test(e) ? !1 : !/^[()\[\]{},.;:=]*$/u.test(e);
}
function B(i, e, t) {
  const n = e.length, s = [{
    type: "chunk",
    start: 1,
    end: n,
    searchEnd: n,
    openOffset: -1
  }], o = [], a = (u, l, f = !1) => {
    const h = {
      type: u,
      start: l.line,
      end: n,
      searchEnd: n,
      openOffset: l.offset,
      awaitingDo: u === "for" || u === "while",
      branch: null
    };
    f && (h.branch = {
      type: "branch",
      start: l.line,
      end: n,
      searchEnd: n,
      openOffset: l.offset
    }, s.push(h.branch)), s.push(h), o.push(h);
  }, c = (u, l) => {
    for (let f = o.length - 1; f >= 0; f--) {
      const h = o[f];
      if (!(l && h.type !== "repeat" || !l && h.type === "repeat")) {
        o.splice(f, 1), h.end = u.line, h.closeOffset = u.offset, h.searchEnd = Math.max(h.start, u.line - 1), h.branch && (h.branch.end = u.line, h.branch.closeOffset = u.offset, h.branch.searchEnd = Math.max(
          h.branch.start,
          u.line - 1
        ));
        return;
      }
    }
  };
  for (const u of t) {
    const l = u.value;
    if (l === "function") a(l, u);
    else if (l === "if") a(l, u, !0);
    else if (l === "for" || l === "while" || l === "repeat")
      a(l, u);
    else if (l === "do") {
      const f = o.at(-1);
      f?.awaitingDo ? f.awaitingDo = !1 : a(l, u);
    } else if (l === "elseif" || l === "else") {
      const f = o.at(-1);
      f?.type === "if" && (f.branch && (f.branch.end = Math.max(f.branch.start, u.line - 1), f.branch.searchEnd = f.branch.end, f.branch.closeOffset = u.offset), f.branch = {
        type: "branch",
        start: u.line,
        end: n,
        searchEnd: n,
        openOffset: u.offset
      }, s.push(f.branch));
    } else l === "end" ? c(u, !1) : l === "until" && c(u, !0);
  }
  return s;
}
function ge(i, e) {
  const t = String(i ?? ""), n = fe(t), r = n.split(/\r?\n/u), s = me(n), o = Math.trunc(Number(e));
  if (!Number.isFinite(o) || o < 1 || o > r.length)
    return {
      requestedLine: o,
      line: o,
      endLine: o,
      verified: !1,
      message: "断点行超出源码范围。"
    };
  const a = B(n, r, s).filter((h) => h.start <= o && o <= h.end).sort((h, p) => h.end - h.start - (p.end - p.start) || p.start - h.start || p.openOffset - h.openOffset)[0], c = s.find((h) => h.value === "function" && h.line === o);
  if (c) {
    const h = B(n, r, s).find((p) => p.type === "function" && p.openOffset === c.offset && p.closeOffset !== void 0 && p.end > o);
    if (h) return {
      requestedLine: o,
      line: h.end,
      endLine: h.end,
      verified: !0,
      message: `第 ${o} 行的函数声明在第 ${h.end} 行创建闭包。`
    };
  }
  const u = s.find((h) => h.line > o && we.has(h.value)), l = u ? u.line - 1 : r.length, f = Math.max(
    o,
    Math.min(a?.searchEnd ?? r.length, l)
  );
  for (let h = o; h <= f; h++)
    if (ye(r[h - 1]))
      return {
        requestedLine: o,
        line: h,
        endLine: f,
        verified: !0,
        message: h === o ? "" : `第 ${o} 行不可执行，断点已下移到同一作用域的第 ${h} 行。`
      };
  return {
    requestedLine: o,
    line: o,
    endLine: f,
    verified: !1,
    message: `第 ${o} 行到当前作用域末尾没有可执行语句。`
  };
}
function G(i, e) {
  return e.map((t) => {
    const n = Number(t.requestedLine ?? t.line);
    return { ...t, ...ge(i, n) };
  });
}
const be = new TextEncoder(), z = new TextDecoder("utf-8", { fatal: !0 }), Ee = /* @__PURE__ */ new Set([
  "r",
  "rb",
  "r+",
  "r+b",
  "rb+",
  "w",
  "wb",
  "w+",
  "w+b",
  "wb+",
  "a",
  "ab",
  "a+",
  "a+b",
  "ab+"
]), ve = {
  backend: "emscripten",
  profile: "safe",
  debug: !1,
  timeout: 5e3,
  assetBaseUrl: new URL("./wasm/", import.meta.url).href
};
class x extends EventTarget {
  /** @param {LuaRuntimeOptions} [options] */
  constructor(e = {}) {
    super();
    const t = e.profile === "trusted" || e.profile === "full-access" ? e.profile : "safe";
    if (this.options = {
      ...ve,
      ...e,
      profile: t,
      timeout: e.timeout ?? (t === "full-access" ? 0 : t === "trusted" ? 6e4 : 5e3),
      vfsLimit: e.vfsLimit ?? (t === "full-access" ? 1 / 0 : (t === "trusted" ? 64 : 16) * 1024 * 1024)
    }, (this.options.vfsLimit !== 1 / 0 || t !== "full-access") && (!Number.isSafeInteger(this.options.vfsLimit) || this.options.vfsLimit < 0 || this.options.vfsLimit > 512 * 1024 * 1024))
      throw new RangeError("VFS 配额必须是 0 到 512 MiB 的安全整数。");
    if (!Number.isFinite(this.options.timeout) || this.options.timeout < 0)
      throw new RangeError("活动执行超时必须是非负有限毫秒数；0 表示不限制。");
    this.#k = U({
      environment: this.options.environment,
      clock: () => this.#M()
    }), this.registerCapability("vfs.read", {
      internal: !0,
      description: "读取显式注册到当前运行时的内存文件。",
      parameters: [{ name: "path", type: "string", description: "VFS 绝对路径" }],
      returns: { type: "string|binary" },
      handler: async (n) => {
        const r = this.#n(n);
        return (await this.#m(r)).slice();
      }
    }), this.registerCapability("__wlua.os.remove", {
      internal: !0,
      description: "删除当前运行时显式注册的内存 VFS 文件。",
      handler: async (n) => {
        const r = this.#n(n), s = this.#s(r);
        if (s) {
          this.#w(s);
          const { directory: o, name: a } = await this.#L(s, r);
          return await o.removeEntry(a), !0;
        }
        if (!this.#T(r))
          throw new Error("VFS 文件不存在：" + r);
        return !0;
      }
    }), this.registerCapability("__wlua.os.rename", {
      internal: !0,
      description: "重命名当前运行时显式注册的内存 VFS 文件。",
      handler: (n, r) => {
        const s = this.#n(n), o = this.#n(r);
        if (this.#s(s) || this.#s(o))
          throw new Error("宿主挂载文件不支持原子重命名，请由宿主显式操作。");
        if (!this.#t.has(s)) throw new Error("VFS 文件不存在：" + s);
        if (this.#t.has(o)) throw new Error("VFS 目标已存在：" + o);
        const a = this.#t.get(s);
        return this.#t.delete(s), this.#t.set(o, a), !0;
      }
    }), this.registerCapability("__wlua.vfs.open", {
      internal: !0,
      description: "在当前运行时的内存 VFS 中打开文件。",
      handler: (n, r = "r") => this.#N(n, r)
    }), this.registerCapability("__wlua.vfs.read", {
      internal: !0,
      description: "从内存 VFS 文件的指定字节位置读取。",
      handler: (n, r, s) => this.#O(n, r, s)
    }), this.registerCapability("__wlua.vfs.write", {
      internal: !0,
      description: "原子写入内存 VFS 文件并执行配额检查。",
      handler: (n, r, s, o) => this.#V(n, r, s, o)
    }), this.registerCapability("__wlua.vfs.size", {
      internal: !0,
      description: "返回内存 VFS 文件的字节数。",
      handler: async (n) => {
        const r = this.#n(n), s = await this.#m(r);
        return BigInt(s.length);
      }
    }), this.#I();
  }
  options;
  /** Structured host API registry. Prefer grouped registration for large APIs. */
  capabilities = new H();
  #e;
  #o;
  #f = 0;
  #a = /* @__PURE__ */ new Map();
  #u = /* @__PURE__ */ new Map();
  #t = /* @__PURE__ */ new Map();
  #l = /* @__PURE__ */ new Map();
  #c = 0;
  #i = {};
  #k;
  #y = [];
  #g = 0;
  #h = null;
  #S = 0;
  #$() {
    return globalThis.performance?.now?.() ?? Date.now();
  }
  #M() {
    const e = this.#h == null ? 0 : this.#$() - this.#h;
    return (this.#g + e) / 1e3;
  }
  #R(e, t = !1) {
    t && (this.#g = 0), this.#S = e, this.#h == null && (this.#h = this.#$());
  }
  #F(e) {
    e !== this.#S || this.#h == null || (this.#g += this.#$() - this.#h, this.#h = null);
  }
  #I() {
    this.#i = {}, this.#e = new Worker(new URL(
      /* @vite-ignore */
      "" + new URL("assets/worker-CDnan9EX.js", import.meta.url).href,
      import.meta.url
    ), {
      type: "module",
      name: "wasm-lua"
    }), this.#o = new Promise((e, t) => {
      const n = (r) => t(r.error ?? new Error(r.message));
      this.#e.addEventListener("error", n, { once: !0 }), this.#e.onmessage = (r) => this.#C(r.data, e, t);
    }), this.#e.postMessage({ type: "initialize", options: this.options });
  }
  #C(e, t, n) {
    if (e.type === "ready") {
      if (e.ok === !1) {
        n(new Error(e.error ?? "Lua Worker 初始化失败。"));
        return;
      }
      t(e), this.dispatchEvent(new CustomEvent("ready", { detail: e }));
      return;
    }
    if (e.type === "generation") {
      this.#i = {}, this.#k = U({
        environment: this.options.environment,
        clock: () => this.#M()
      }), this.dispatchEvent(new CustomEvent("generation"));
      return;
    }
    if (e.type === "event") {
      e.event === "breakpointchange" && Array.isArray(e.body?.breakpoints) && (this.#y = e.body.breakpoints.map((r) => ({ ...r }))), this.dispatchEvent(new CustomEvent(e.event, { detail: e.body }));
      return;
    }
    if (e.type === "capability") {
      this.#D(e);
      return;
    }
    if (e.type === "response") {
      const r = this.#a.get(e.id);
      if (!r) return;
      this.#F(e.id), this.#a.delete(e.id), clearTimeout(r.timer), e.ok ? r.resolve(this.#b(e.result)) : r.reject(new Error(e.error));
    }
  }
  async #D(e) {
    const t = this.#a.get(e.id);
    this.#F(e.id), clearTimeout(t?.timer), t && (t.timer = null);
    let n = !1, r;
    const s = this.#e, o = this.#i;
    try {
      const [c, ...u] = X(new Uint8Array(e.payload)), l = u.map((h) => this.#b(h)), f = this.#k.invoke(c, l);
      r = f.handled ? f.value : await this.capabilities.invoke(
        c,
        l,
        { runtime: this }
      ), this.#d(r);
    } catch (c) {
      n = !0, r = c instanceof Error ? c.message : String(c);
    }
    if (s !== this.#e || o !== this.#i) return;
    const a = S(r);
    this.#R(e.id), s.postMessage({
      type: "capabilityResult",
      id: e.id,
      token: e.token,
      rejected: n,
      payload: a
    }, [a.buffer]), t?.timed && this.#x(e.id);
  }
  #b(e) {
    if (Array.isArray(e)) return e.map((t) => this.#b(t));
    if (e && typeof e == "object" && Number.isInteger(e.$luaRef)) {
      const t = this.#i, n = this.#e;
      return new T(
        e.$luaRef,
        e.luaType,
        (r) => {
          this.#i === t && n.postMessage({ type: "release", reference: r });
        },
        t
      );
    }
    if (e && typeof e == "object")
      for (const [t, n] of Object.entries(e))
        e[t] = this.#b(n);
    return e;
  }
  async #r(e, t = {}, n = !1) {
    await this.#o;
    const r = ++this.#f, s = new Promise((o, a) => {
      this.#a.set(r, { resolve: o, reject: a, timed: n });
    });
    return ["run", "call", "resume", "runToCursor"].includes(e) && this.#R(r, e === "run"), this.#e.postMessage({ type: e, id: r, ...t }), n && this.#x(r), s;
  }
  #x(e) {
    const t = this.#a.get(e);
    t && (clearTimeout(t.timer), this.options.timeout !== 0 && (t.timer = setTimeout(() => {
      t && (t.reject(new Error("Lua 执行已超过活动时间限制，Worker 已重建。")), this.#a.delete(e), this.interrupt());
    }, this.options.timeout)));
  }
  /** @param {string} source @param {{chunkName?: string}} [options]
   * @returns {Promise<LuaExecutionResult>} */
  run(e, t = {}) {
    return this.#r("run", {
      source: e,
      chunkName: t.chunkName ?? "@main.lua",
      breakpoints: this.options.debug ? this.#y.map((n) => ({ ...n })) : void 0
    }, !0);
  }
  /** Compile a text chunk with the official Lua compiler without executing it.
   * @param {string} source @param {{chunkName?: string}} [options]
   * @returns {Promise<boolean>} */
  check(e, t = {}) {
    return this.#r("check", {
      source: e,
      chunkName: t.chunkName ?? "@main.lua"
    });
  }
  /** @returns {Promise<LuaExecutionResult>} */
  continue() {
    return this.#r("resume", { mode: 0 }, !0);
  }
  /** @returns {Promise<LuaExecutionResult>} */
  stepIn() {
    return this.#r("resume", { mode: 1 }, !0);
  }
  /** @returns {Promise<LuaExecutionResult>} */
  stepOver() {
    return this.#r("resume", { mode: 2 }, !0);
  }
  /** @returns {Promise<LuaExecutionResult>} */
  stepOut() {
    return this.#r("resume", { mode: 3 }, !0);
  }
  /** @param {Array<number|LuaBreakpoint>} breakpoints
   * @param {{source?: string}} [options]
   * @returns {Promise<LuaBreakpoint[]>} */
  async setBreakpoints(e, t = {}) {
    let n = e.map((s) => typeof s == "number" ? { line: s } : { ...s, line: Number(s.line) });
    typeof t.source == "string" && (n = G(t.source, n)), this.#y = n;
    const r = await this.#r("setBreakpoints", {
      breakpoints: n.map((s) => ({ ...s }))
    });
    return this.#y = r.map((s) => ({ ...s })), r;
  }
  /** @returns {Promise<LuaStackFrame[]>} */
  stackTrace() {
    return this.#r("stack");
  }
  /** @returns {Promise<LuaDebugVariable[]>} */
  variables(e = 0, t = 0) {
    return this.#r("variables", { frame: e, reference: t }, !0);
  }
  /** @param {string} expression @param {number} [frame]
   * @returns {Promise<LuaDebugVariable[]|{error: string}>} */
  evaluate(e, t = 0) {
    return this.#r("evaluate", { expression: e, frame: t }, !0);
  }
  /** Request a cooperative pause at the next execution slice. */
  pause() {
    return this.#r("pause");
  }
  /** @param {number} line @param {string} [source]
   * @returns {Promise<LuaExecutionResult>} */
  runToCursor(e, t) {
    return this.#r("runToCursor", { line: Number(e), source: t }, !0);
  }
  /** @param {number} frame @param {number} reference @param {string} name
   * @param {string} value @returns {Promise<LuaDebugVariable[]>} */
  setVariable(e, t, n, r) {
    return this.#r("setVariable", { frame: e, reference: t, name: n, value: r }, !0);
  }
  /** @param {string} name
   * @param {CapabilityRegistration} registration
   * @returns {() => void} */
  registerCapability(e, t) {
    return this.capabilities.register(e, t, { replace: !0 });
  }
  /**
   * Atomically register a hierarchical host API and optionally expose it as a
   * typed Lua module (default: `host.<namespace>` for dot-safe namespaces).
   * @param {string} namespace
   * @param {import('./capability-registry.js').CapabilityGroupMap} registrations
   * @param {{moduleName?: string|false, replace?: boolean}} [options]
   * @returns {CapabilityGroupHandle}
   */
  registerCapabilityGroup(e, t, n = {}) {
    const r = this.capabilities.registerGroup(e, t, n), s = /^[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)*$/u.test(e), o = n.moduleName === !1 ? null : n.moduleName ?? (s ? `host.${e}` : null), a = [() => r.handle.dispose()];
    let c = null;
    try {
      return o && (c = ne(e, r.capabilities, o), a.push(this.registerModule(o, c.source)), a.push(this.registerDefinition({
        uri: c.uri,
        source: c.definition
      }))), new Y(r.handle.names, () => {
        for (const u of a.reverse()) u();
      }, c);
    } catch (u) {
      for (const l of a.reverse()) l();
      throw u;
    }
  }
  /** @param {{prefix?: string, includeInternal?: boolean}} [options] */
  listCapabilities(e = {}) {
    return this.capabilities.list(e);
  }
  /** @param {import('./capability-registry.js').CapabilityMiddleware} middleware */
  useCapabilityMiddleware(e) {
    return this.capabilities.use(e);
  }
  /** @param {string} name
   * @param {string|((...args: any[]) => any|Promise<any>)} factory
   * @returns {() => void} */
  registerModule(e, t) {
    if (!/^[\p{L}_][\p{L}\p{N}_.-]*$/u.test(e) || e.includes(".."))
      throw new TypeError("模块名必须是安全的点分标识符。");
    if (typeof t == "string") {
      const n = t;
      return this.registerCapability("module:" + e, {
        internal: !0,
        description: `加载 Lua 模块 ${e}`,
        handler: () => ({ source: n })
      });
    }
    if (typeof t != "function")
      throw new TypeError("模块必须是 Lua 源码字符串或工厂函数。");
    return this.registerCapability("module:" + e, {
      internal: !0,
      description: `加载宿主模块 ${e}`,
      handler: async (...n) => {
        const r = await t(...n);
        return typeof r == "string" ? { source: r } : r;
      }
    });
  }
  #n(e) {
    if (typeof e != "string" || e.includes("\\") || e.includes("\0"))
      throw new TypeError("VFS 路径必须是使用 / 的 UTF-8 字符串。");
    const t = e.split("/").filter(Boolean);
    if (!t.length || t.some((n) => n === "." || n === ".."))
      throw new TypeError("VFS 路径不允许为空、. 或 ..。");
    return "/" + t.join("/");
  }
  #s(e) {
    if (this.#l.has(e))
      throw new Error("挂载点是目录，不是文件：" + e);
    return [...this.#l.values()].filter((t) => e.startsWith(t.mountPoint + "/")).sort((t, n) => n.mountPoint.length - t.mountPoint.length)[0] ?? null;
  }
  #w(e) {
    if (e.mode !== "readwrite")
      throw new Error("宿主文件夹以只读方式挂载。");
  }
  async #L(e, t) {
    const r = t.slice(e.mountPoint.length + 1).split("/"), s = r.pop();
    let o = e.handle;
    for (const a of r)
      o = await o.getDirectoryHandle(a);
    return { directory: o, name: s };
  }
  async #E(e, t, n = !1) {
    const { directory: r, name: s } = await this.#L(e, t);
    return r.getFileHandle(s, { create: n });
  }
  async #m(e) {
    const t = this.#s(e);
    if (!t) {
      const s = this.#t.get(e);
      if (!s) throw new Error("VFS 文件不存在：" + e);
      return s;
    }
    const r = await (await this.#E(t, e)).getFile();
    if (r.size > this.options.vfsLimit)
      throw new RangeError("宿主文件超出当前 VFS 单文件读取配额。");
    return new Uint8Array(await r.arrayBuffer());
  }
  /** Mount only a directory handle explicitly granted by the browser/user.
   * Lua never sees the handle, and a separate namespace prevents VFS paths
   * from accidentally aliasing host files.
   * @param {FileSystemDirectoryHandle} handle
   * @param {{mountPoint?: string, mode?: 'read'|'readwrite'}} [options] */
  async mountDirectory(e, t = {}) {
    if (this.options.profile === "safe")
      throw new Error("宿主文件夹挂载仅限可信档或 full-access。");
    if (!e || e.kind !== "directory" || typeof e.getFileHandle != "function")
      throw new TypeError("必须传入浏览器授权的 FileSystemDirectoryHandle。");
    const n = this.#n(t.mountPoint ?? "/host"), r = t.mode ?? "readwrite";
    if (r !== "read" && r !== "readwrite")
      throw new TypeError("挂载模式只能为 read 或 readwrite。");
    if ([...this.#l.keys()].some((c) => c === n || c.startsWith(n + "/") || n.startsWith(c + "/")) || [...this.#t.keys()].some((c) => c === n || c.startsWith(n + "/")))
      throw new Error("挂载点与现有文件或挂载重叠。");
    const s = { mode: r }, o = e;
    if (typeof o.queryPermission == "function" && await o.queryPermission(s) !== "granted" && (typeof o.requestPermission != "function" || await o.requestPermission(s) !== "granted"))
      throw new Error("浏览器未授权访问选中的宿主文件夹。");
    const a = { mountPoint: n, mode: r, handle: e };
    return this.#l.set(n, a), () => {
      this.#l.get(n) === a && this.#l.delete(n);
    };
  }
  /** Must be called directly from a user gesture in Chromium on HTTPS/localhost.
   * @param {{mountPoint?: string, mode?: 'read'|'readwrite'}} [options] */
  async pickDirectory(e = {}) {
    if (this.options.profile === "safe")
      throw new Error("宿主文件夹选择仅限可信档或 full-access。");
    if (typeof globalThis.showDirectoryPicker != "function")
      throw new Error("浏览器不支持文件夹选择；请使用 Chromium 的安全上下文。");
    const t = e.mode ?? "readwrite", n = await globalThis.showDirectoryPicker({ mode: t }), r = await this.mountDirectory(n, e);
    return { handle: n, unmount: r };
  }
  #v(e) {
    if (typeof e == "string") return be.encode(e);
    if (e instanceof Uint8Array) return e.slice();
    throw new TypeError("VFS 文件必须是字符串或 Uint8Array。");
  }
  #A(e) {
    const t = Number(e);
    if (!Number.isSafeInteger(t) || t < 0)
      throw new RangeError("VFS 文件位置必须是非负安全整数。");
    return t;
  }
  #p(e, t) {
    const n = this.#t.get(e), r = this.#c - (n?.length ?? 0) + t.length;
    if (r > this.options.vfsLimit)
      throw new RangeError(`VFS 配额不足：需要 ${r} 字节，限制为 ${this.options.vfsLimit} 字节。`);
    this.#t.set(e, t), this.#c = r;
  }
  #T(e) {
    const t = this.#t.get(e);
    return t ? (this.#t.delete(e), this.#c -= t.length, !0) : !1;
  }
  async #N(e, t) {
    const n = this.#n(e), r = String(t ?? "r");
    if (!Ee.has(r)) throw new TypeError("无效的 VFS 打开模式：" + r);
    const s = r[0], o = this.#s(n);
    if (o) {
      (s !== "r" || r.includes("+")) && this.#w(o);
      const c = await this.#E(
        o,
        n,
        s !== "r"
      ), u = await c.getFile();
      if (u.size > this.options.vfsLimit)
        throw new RangeError("宿主文件超出当前 VFS 单文件配额。");
      return s === "w" && await (await c.createWritable()).close(), {
        path: n,
        readable: s === "r" || r.includes("+"),
        writable: s !== "r" || r.includes("+"),
        append: s === "a",
        position: BigInt(s === "a" ? u.size : 0)
      };
    }
    if (s === "r" && !this.#t.has(n))
      throw new Error("VFS 文件不存在：" + n);
    s === "w" && this.#p(n, new Uint8Array()), s === "a" && !this.#t.has(n) && this.#p(n, new Uint8Array());
    const a = this.#t.get(n)?.length ?? 0;
    return {
      path: n,
      readable: s === "r" || r.includes("+"),
      writable: s !== "r" || r.includes("+"),
      append: s === "a",
      position: BigInt(s === "a" ? a : 0)
    };
  }
  async #O(e, t, n) {
    const r = this.#n(e), s = await this.#m(r), o = this.#A(t);
    if (typeof n == "bigint" || typeof n == "number") {
      const c = this.#A(n);
      if (o >= s.length)
        return {
          value: c === 0 ? new Uint8Array() : null,
          position: BigInt(o)
        };
      const u = Math.min(s.length, o + c);
      return { value: s.slice(o, u), position: BigInt(u) };
    }
    const a = n == null ? "*l" : String(n);
    if (a === "*a")
      return {
        value: s.slice(Math.min(o, s.length)),
        position: BigInt(s.length)
      };
    if (a === "*l" || a === "*L") {
      if (o >= s.length)
        return { value: null, position: BigInt(o) };
      let c = s.indexOf(10, o);
      c < 0 && (c = s.length);
      const u = c < s.length ? c + 1 : c, l = a === "*L" ? u : c > o && s[c - 1] === 13 ? c - 1 : c;
      return { value: s.slice(o, l), position: BigInt(u) };
    }
    if (a === "*n") {
      const c = new TextDecoder("latin1").decode(s.subarray(o)), u = /^[\t\n\v\f\r ]*([+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?))/u.exec(c);
      if (!u) return { value: null, position: BigInt(o) };
      const l = u[1], f = Number(l);
      return { value: Number.isSafeInteger(f) && !/[.eE]/u.test(l) ? BigInt(f) : f, position: BigInt(o + u[0].length) };
    }
    throw new TypeError("不支持的 VFS 读取格式：" + a);
  }
  async #V(e, t, n, r) {
    const s = this.#n(e), o = this.#s(s);
    o && this.#w(o);
    const a = await this.#m(s), c = this.#v(r), u = n ? a.length : this.#A(t);
    if (u > this.options.vfsLimit || c.length > this.options.vfsLimit - u)
      throw new RangeError("VFS 写入超出文件配额。");
    const l = Math.max(a.length, u + c.length), f = new Uint8Array(l);
    if (f.set(a), f.set(c, u), o) {
      const p = await (await this.#E(o, s)).createWritable();
      try {
        await p.write(f), await p.close();
      } catch (g) {
        throw await p.abort?.(), g;
      }
    } else this.#p(s, f);
    return BigInt(u + c.length);
  }
  /** @param {string} path @param {string|Uint8Array} value
   * @returns {() => void} */
  registerFile(e, t) {
    const n = this.#n(e);
    if (this.#s(n))
      throw new Error("宿主挂载文件请使用 writeFileAsync()。");
    const r = this.#v(t);
    return this.#p(n, r), () => {
      this.#t.get(n) === r && this.#T(n);
    };
  }
  /** Read a host-visible copy of a memory VFS file.
   * @param {string} path @param {{encoding?: 'binary'|'utf8'}} [options]
   * @returns {Uint8Array|string} */
  readFile(e, t = {}) {
    const n = this.#n(e);
    if (this.#s(n))
      throw new Error("宿主挂载文件请使用 readFileAsync()。");
    const r = this.#t.get(n);
    if (!r) throw new Error("VFS 文件不存在：" + n);
    if ((t.encoding ?? "binary") === "binary") return r.slice();
    if (t.encoding === "utf8") return z.decode(r);
    throw new TypeError("VFS encoding 只能是 binary 或 utf8。");
  }
  /** Read an in-memory or explicitly mounted host file asynchronously.
   * @param {string} path @param {{encoding?: 'binary'|'utf8'}} [options] */
  async readFileAsync(e, t = {}) {
    const n = (await this.#m(this.#n(e))).slice();
    if ((t.encoding ?? "binary") === "binary") return n;
    if (t.encoding === "utf8") return z.decode(n);
    throw new TypeError("VFS encoding 只能是 binary 或 utf8。");
  }
  /** Create or replace a host-visible memory VFS file.
   * @param {string} path @param {string|Uint8Array} value
   * @param {{append?: boolean}} [options] */
  writeFile(e, t, n = {}) {
    const r = this.#n(e);
    if (this.#s(r))
      throw new Error("宿主挂载文件请使用 writeFileAsync()。");
    const s = this.#v(t);
    if (!n.append) {
      this.#p(r, s);
      return;
    }
    const o = this.#t.get(r) ?? new Uint8Array();
    if (s.length > this.options.vfsLimit - o.length)
      throw new RangeError("VFS 追加写入超出文件配额。");
    const a = new Uint8Array(o.length + s.length);
    a.set(o), a.set(s, o.length), this.#p(r, a);
  }
  /** @param {string} path @param {string|Uint8Array} value
   * @param {{append?: boolean}} [options] */
  async writeFileAsync(e, t, n = {}) {
    const r = this.#n(e), s = this.#s(r);
    if (!s) return this.writeFile(r, t, n);
    this.#w(s);
    const o = this.#v(t);
    if (o.length > this.options.vfsLimit)
      throw new RangeError("宿主文件写入超出当前 VFS 单文件配额。");
    const a = await this.#E(s, r, !0);
    let c = o;
    if (n.append) {
      const l = await a.getFile();
      if (l.size > this.options.vfsLimit - o.length)
        throw new RangeError("宿主文件追加超出当前 VFS 单文件配额。");
      c = new Uint8Array(l.size + o.length), c.set(new Uint8Array(await l.arrayBuffer())), c.set(o, l.size);
    }
    const u = await a.createWritable();
    try {
      await u.write(c), await u.close();
    } catch (l) {
      throw await u.abort?.(), l;
    }
  }
  /** @param {string} path @returns {boolean} */
  removeFile(e) {
    const t = this.#n(e);
    if (this.#s(t))
      throw new Error("宿主挂载文件请使用 removeFileAsync()。");
    return this.#T(t);
  }
  /** @param {string} path */
  async removeFileAsync(e) {
    const t = this.#n(e), n = this.#s(t);
    if (!n) return this.#T(t);
    this.#w(n);
    const { directory: r, name: s } = await this.#L(n, t);
    return await r.removeEntry(s), !0;
  }
  /** @param {string} from @param {string} to @returns {boolean} */
  renameFile(e, t) {
    const n = this.#n(e), r = this.#n(t);
    if (this.#s(n) || this.#s(r))
      throw new Error("宿主挂载文件不支持原子重命名。");
    if (!this.#t.has(n) || this.#t.has(r)) return !1;
    const s = this.#t.get(n);
    return this.#t.delete(n), this.#t.set(r, s), !0;
  }
  /** @param {string} [prefix] @returns {string[]} */
  listFiles(e = "/") {
    const t = e === "/" ? "/" : this.#n(e);
    return [...this.#t.keys()].filter((n) => t === "/" || n === t || n.startsWith(t + "/")).sort();
  }
  /** @param {{uri: string, source: string}} definition
   * @returns {() => void} */
  registerDefinition({ uri: e, source: t }) {
    if (!e || typeof t != "string")
      throw new TypeError("Definition requires uri and source.");
    const n = Symbol(e);
    return this.#u.set(e, { source: t, token: n }), this.dispatchEvent(new CustomEvent("definitionchange", {
      detail: { uri: e, source: t }
    })), () => {
      this.#u.get(e)?.token === n && (this.#u.delete(e), this.dispatchEvent(new CustomEvent("definitionchange", {
        detail: { uri: e, source: null }
      })));
    };
  }
  get definitions() {
    return new Map([...this.#u].map(([e, t]) => [e, t.source]));
  }
  #d(e, t = /* @__PURE__ */ new WeakSet()) {
    if (e instanceof T) {
      if (!e.isOwnedBy(this.#i))
        throw new TypeError("LuaRef 已失效，或属于另一个 Lua VM。");
      return;
    }
    if (!(!e || typeof e != "object" || e instanceof Uint8Array || t.has(e)))
      if (t.add(e), Array.isArray(e))
        for (const n of e) this.#d(n, t);
      else
        for (const n of Object.values(e)) this.#d(n, t);
  }
  async interrupt() {
    this.capabilities.cancelActive(new Error("Lua VM 已中止。"));
    for (const { reject: e, timer: t } of this.#a.values())
      clearTimeout(t), e(new Error("Lua VM 已中止。"));
    this.#a.clear(), this.#g = 0, this.#h = null, this.#S = 0, this.#e.terminate(), this.#I(), await this.#o, this.dispatchEvent(new CustomEvent("reset"));
  }
  dispose() {
    this.capabilities.dispose(), this.#e.terminate();
    for (const { reject: e, timer: t } of this.#a.values())
      clearTimeout(t), e(new Error("Lua VM 已销毁。"));
    this.#a.clear();
  }
  /** @param {LuaRef} reference @param {...any} args
   * @returns {Promise<any[]>} */
  async call(e, ...t) {
    if (!(e instanceof T) || !e.isOwnedBy(this.#i))
      throw new TypeError("call() 需要当前 Lua VM 的有效 LuaRef。");
    return this.#d(t), (await this.#r("call", {
      reference: e.id,
      payload: S(t)
    }, !0)).values;
  }
  /** @param {LuaRef} reference @param {any} key @returns {Promise<any>} */
  async get(e, t) {
    if (!(e instanceof T) || !e.isOwnedBy(this.#i))
      throw new TypeError("get() 需要当前 Lua VM 的有效 LuaRef。");
    return this.#d(t), (await this.#r("get", {
      reference: e.id,
      payload: S(t)
    }, !0))[0];
  }
  /** @param {LuaRef} reference @param {any} key @param {any} value
   * @returns {Promise<boolean>} */
  set(e, t, n) {
    if (!(e instanceof T) || !e.isOwnedBy(this.#i))
      throw new TypeError("set() 需要当前 Lua VM 的有效 LuaRef。");
    return this.#d(t), this.#d(n), this.#r("set", {
      reference: e.id,
      payload: S([t, n])
    }, !0);
  }
}
function $e(i = {}) {
  return new x({ ...i, debug: !1 });
}
function Te(i = {}) {
  return new x({ ...i, debug: !0 });
}
class ke {
  /** @param {LuaRuntime|import('./runtime.js').LuaRuntimeOptions} [runtimeOrOptions] */
  constructor(e = {}) {
    this.ownsRuntime = !(e instanceof x), this.runtime = this.ownsRuntime ? Te(
      /** @type {import('./runtime.js').LuaRuntimeOptions} */
      e
    ) : (
      /** @type {LuaRuntime} */
      e
    );
    const t = new MessageChannel();
    this.port = t.port2, this.adapterPort = t.port1, this.adapterPort.onmessage = (r) => this.handle(r.data), this.adapterPort.start(), this.controller = new AbortController();
    const n = this.controller.signal;
    this.runtime.addEventListener("output", (r) => this.sendEvent("output", {
      category: r.detail.category ?? "stdout",
      output: r.detail.output
    }), { signal: n }), this.runtime.addEventListener("stopped", (r) => this.sendEvent("stopped", {
      reason: r.detail.reason,
      threadId: 1,
      allThreadsStopped: !0,
      line: r.detail.line
    }), { signal: n }), this.runtime.addEventListener("breakpointchange", (r) => {
      for (const s of r.detail.breakpoints ?? [])
        this.sendEvent("breakpoint", { reason: "changed", breakpoint: {
          verified: s.verified !== !1,
          line: s.line,
          message: s.message || void 0
        } });
    }, { signal: n }), this.runtime.addEventListener("terminated", () => this.sendEvent("terminated", {}), { signal: n });
  }
  /** @type {LuaRuntime} */
  runtime;
  /** Client-facing DAP transport. */
  /** @type {MessagePort} */
  port;
  /** @type {MessagePort} */
  adapterPort;
  /** @type {boolean} */
  ownsRuntime;
  /** @type {AbortController} */
  controller;
  sequence = 0;
  source = "";
  chunkName = "@main.lua";
  lastException = "未捕获的 Lua 异常";
  /** @type {Map<string, import('./runtime.js').LuaBreakpoint[]>} */
  breakpointsBySource = /* @__PURE__ */ new Map();
  /** @type {Map<number, number>} */
  variableReferences = /* @__PURE__ */ new Map();
  /** @type {Map<number, number>} */
  reverseVariableReferences = /* @__PURE__ */ new Map();
  /** @type {Map<number, {frame: number, scope: number}>} */
  scopeReferences = /* @__PURE__ */ new Map();
  nextVariableReference = 1e5;
  /** @param {Record<string, any>} message */
  send(e) {
    this.adapterPort.postMessage({ seq: ++this.sequence, ...e });
  }
  /** @param {string} event @param {Record<string, any>} body */
  sendEvent(e, t) {
    this.send({ type: "event", event: e, body: t });
  }
  /** @param {DapRequest} request @param {Record<string, any>} [body] */
  respond(e, t = {}) {
    this.send({
      type: "response",
      request_seq: e.seq,
      command: e.command,
      success: !0,
      body: t
    });
  }
  /** @param {DapRequest} request @param {unknown} error */
  fail(e, t) {
    this.send({
      type: "response",
      request_seq: e.seq,
      command: e.command,
      success: !1,
      message: t instanceof Error ? t.message : String(t)
    });
  }
  /** @param {number} nativeReference @returns {number} */
  mapReference(e) {
    if (!e) return 0;
    let t = this.reverseVariableReferences.get(e);
    return t || (t = this.nextVariableReference++, this.reverseVariableReferences.set(e, t), this.variableReferences.set(t, e)), t;
  }
  /** @param {import('./runtime.js').LuaDebugVariable[]} variables */
  mapVariables(e) {
    return e.map((t) => ({
      ...t,
      variablesReference: this.mapReference(t.variablesReference)
    }));
  }
  /** @param {DapRequest} request @param {ResumeMethod} method */
  async resume(e, t) {
    this.respond(e, t === "continue" ? { allThreadsContinued: !0 } : {}), this.variableReferences.clear(), this.reverseVariableReferences.clear(), this.scopeReferences.clear();
    try {
      await this.runtime[t]();
    } catch (n) {
      this.lastException = n.message;
    }
  }
  /** @param {DapRequest} request */
  async handle(e) {
    if (!e || e.type !== "request") return;
    const t = e.arguments ?? {};
    try {
      switch (e.command) {
        case "initialize":
          this.respond(e, {
            supportsConfigurationDoneRequest: !0,
            supportsConditionalBreakpoints: !0,
            supportsHitConditionalBreakpoints: !0,
            supportsLogPoints: !0,
            supportsEvaluateForHovers: !0,
            supportsSetVariable: !0,
            supportsGotoTargetsRequest: !0,
            supportsExceptionInfoRequest: !0,
            wasmLuaProtocolVersion: "DAP 1.68 / ABI 1.0"
          }), this.sendEvent("initialized", {});
          return;
        case "launch":
          this.source = t.source ?? t.sourceText ?? "", this.chunkName = t.chunkName ?? "@main.lua", this.respond(e);
          return;
        case "setBreakpoints": {
          const n = t.source?.path ?? t.source?.name ?? this.chunkName.replace(/^@/u, ""), r = G(
            this.source,
            (t.breakpoints ?? []).map((s) => ({
              line: s.line,
              source: n,
              condition: s.condition,
              hitCondition: s.hitCondition,
              logMessage: s.logMessage
            }))
          );
          this.breakpointsBySource.set(n, r), await this.runtime.setBreakpoints(
            [...this.breakpointsBySource.values()].flat()
          ), this.respond(e, {
            breakpoints: r.map((s) => ({
              verified: s.verified,
              line: s.line,
              message: s.message || void 0
            }))
          });
          return;
        }
        case "configurationDone":
          this.respond(e), this.runtime.run(this.source, { chunkName: this.chunkName }).catch((n) => {
            this.lastException = n.message;
          });
          return;
        case "threads":
          this.respond(e, { threads: [{ id: 1, name: "Lua 主协程" }] });
          return;
        case "stackTrace": {
          const n = await this.runtime.stackTrace();
          this.respond(e, {
            stackFrames: n.map((r) => {
              const s = r.source.replace(/^[@=]/u, "") || this.chunkName.replace(/^@/u, "");
              return {
                id: r.id,
                name: r.name,
                source: {
                  name: s.split(/[\\/]/u).at(-1),
                  path: s
                },
                line: r.line,
                column: r.column
              };
            }),
            totalFrames: n.length
          });
          return;
        }
        case "scopes":
          if (!Number.isInteger(t.frameId) || t.frameId < 0)
            throw new Error("无效的 DAP 栈帧引用。");
          {
            const n = [1, 2, 3].map((r) => t.frameId * 10 + r);
            n.forEach((r, s) => this.scopeReferences.set(r, { frame: t.frameId, scope: s })), this.respond(e, { scopes: [
              { name: "局部变量", variablesReference: n[0], expensive: !1 },
              { name: "Upvalue", variablesReference: n[1], expensive: !1 },
              { name: "全局变量", variablesReference: n[2], expensive: !0 }
            ] });
          }
          return;
        case "variables": {
          const n = this.variableReferences.get(t.variablesReference), r = this.scopeReferences.get(t.variablesReference);
          if (n === void 0 && !r)
            throw new Error("未知或已失效的 DAP 变量引用。");
          const s = r?.frame ?? 0, o = r?.scope ?? n;
          this.respond(e, {
            variables: this.mapVariables(await this.runtime.variables(s, o))
          });
          return;
        }
        case "evaluate": {
          const n = await this.runtime.evaluate(t.expression, t.frameId ?? 0);
          if (!Array.isArray(n)) throw new Error(n.error);
          this.respond(e, {
            result: n[0]?.value ?? "nil",
            type: n[0]?.type,
            variablesReference: this.mapReference(n[0]?.variablesReference ?? 0)
          });
          return;
        }
        case "setVariable": {
          const n = this.variableReferences.get(t.variablesReference), r = this.scopeReferences.get(t.variablesReference);
          if (n === void 0 && !r)
            throw new Error("未知或已失效的 DAP 变量引用。");
          const s = r?.frame ?? 0, o = r?.scope ?? n, a = await this.runtime.setVariable(s, o, t.name, t.value);
          if (!a[0]) throw new Error("变量赋值没有返回结果。");
          this.respond(e, {
            value: a[0].value,
            type: a[0].type,
            variablesReference: this.mapReference(a[0].variablesReference)
          });
          return;
        }
        case "continue":
          return this.resume(e, "continue");
        case "next":
          return this.resume(e, "stepOver");
        case "stepIn":
          return this.resume(e, "stepIn");
        case "stepOut":
          return this.resume(e, "stepOut");
        case "pause":
          await this.runtime.pause(), this.respond(e);
          return;
        case "gotoTargets":
          this.respond(e, { targets: [{
            id: t.line,
            label: `第 ${t.line} 行`,
            line: t.line,
            column: t.column ?? 1
          }] });
          return;
        case "goto":
          this.respond(e), this.runtime.runToCursor(t.targetId, this.chunkName.replace(/^@/u, "")).catch((n) => {
            this.lastException = n.message;
          });
          return;
        case "exceptionInfo":
          this.respond(e, {
            exceptionId: "lua.uncaught",
            description: this.lastException,
            breakMode: "unhandled"
          });
          return;
        case "disconnect":
          this.respond(e), this.dispose();
          return;
        default:
          throw new Error(`不支持的 DAP 请求：${e.command}`);
      }
    } catch (n) {
      this.fail(e, n);
    }
  }
  /** Close the transport and, when owned, dispose the Lua runtime. */
  dispose() {
    this.controller.abort(), this.adapterPort.close(), this.ownsRuntime && this.runtime.dispose();
  }
}
function Le(i = {}) {
  return new ke(i);
}
export {
  Y as CapabilityGroupHandle,
  H as CapabilityRegistry,
  ke as LuaDapAdapter,
  T as LuaRef,
  x as LuaRuntime,
  ne as createCapabilityModule,
  Se as createCapabilityRegistry,
  Le as createLuaDapAdapter,
  Te as createLuaDebugger,
  $e as createLuaRuntime,
  X as decodeWire,
  S as encodeWire,
  ge as resolveLuaBreakpoint,
  G as resolveLuaBreakpoints
};
