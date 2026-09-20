new TextEncoder();
const Q = new TextDecoder(), he = [87, 76, 85, 1];
class me {
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
    const o = this.bytes.subarray(this.offset, this.offset + e);
    if (o.length !== e) throw new RangeError("Truncated wire value.");
    return this.offset += e, o;
  }
}
function j(s, e) {
  if (e > 64) throw new RangeError("Wire value nesting exceeds 64 levels.");
  const o = s.byte();
  switch (o) {
    case 0:
      return null;
    case 1:
      return !1;
    case 2:
      return !0;
    case 3:
      return s.f64();
    case 4:
      return s.i64();
    case 5:
      return s.take(s.u32()).slice();
    case 6:
      return Q.decode(s.take(s.u32()));
    case 7: {
      const r = [], l = s.u32();
      for (let n = 0; n < l; n++) r.push(j(s, e + 1));
      return r;
    }
    case 8: {
      const r = {}, l = s.u32();
      for (let n = 0; n < l; n++) {
        const t = j(s, e + 1);
        r[String(t)] = j(s, e + 1);
      }
      return r;
    }
    case 9: {
      const r = s.u32(), l = s.byte();
      return { $luaRef: r, luaType: l };
    }
    case 10:
      return { $jsRef: s.u32() };
    case 11: {
      const r = new Error(Q.decode(s.take(s.u32())));
      return r.name = "LuaError", r;
    }
    default:
      throw new RangeError("Unknown wire tag " + o + ".");
  }
}
function W(s) {
  const e = s instanceof Uint8Array ? s : new Uint8Array(s);
  if (e.length < 5 || he.some((r, l) => e[l] !== r))
    throw new TypeError("Unsupported wasm-lua wire format.");
  const o = new me(e);
  return o.offset = 4, j(o, 0);
}
function ye(s) {
  const e = s.split(""), o = (l, n) => {
    for (let t = l; t < n; t++)
      e[t] !== `
` && e[t] !== "\r" && (e[t] = " ");
  };
  let r = 0;
  for (; r < s.length; ) {
    if (s.startsWith("--", r)) {
      const n = /^--\[(=*)\[/.exec(s.slice(r));
      if (n) {
        const t = `]${n[1]}]`, i = s.indexOf(t, r + n[0].length), u = i < 0 ? s.length : i + t.length;
        o(r, u), r = u;
      } else {
        const t = s.indexOf(`
`, r), i = t < 0 ? s.length : t;
        o(r, i), r = i;
      }
      continue;
    }
    const l = /^\[(=*)\[/.exec(s.slice(r));
    if (l) {
      const n = `]${l[1]}]`, t = s.indexOf(n, r + l[0].length), i = t < 0 ? s.length : t + n.length;
      o(r, i), r = i;
      continue;
    }
    if (s[r] === '"' || s[r] === "'") {
      const n = s[r];
      let t = r + 1;
      for (; t < s.length; )
        if (s[t] === "\\") t += 2;
        else if (s[t++] === n) break;
      o(r, t), r = t;
      continue;
    }
    r++;
  }
  return e.join("");
}
function be(s, e) {
  let o = 0, r = e.length;
  for (; o + 1 < r; ) {
    const l = o + r >>> 1;
    e[l] <= s ? o = l : r = l;
  }
  return o + 1;
}
const ge = /* @__PURE__ */ new Set([
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
]), _e = /* @__PURE__ */ new Set(["elseif", "else", "until", "end"]);
function xe(s) {
  const e = [0];
  for (let r = 0; r < s.length; r++)
    s[r] === `
` && e.push(r + 1);
  const o = /(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*/gu;
  return [...s.matchAll(o)].filter((r) => ge.has(r[0])).map((r) => {
    const l = be(r.index, e);
    return {
      value: r[0],
      offset: r.index,
      line: l,
      column: r.index - e[l - 1] + 1
    };
  });
}
function ke(s) {
  const e = s.trim();
  return !e || /^(?:end|else)\s*;?$/u.test(e) || /^::(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*::\s*;?$/u.test(e) ? !1 : !/^[()\[\]{},.;:=]*$/u.test(e);
}
function X(s, e, o) {
  const r = e.length, n = [{
    type: "chunk",
    start: 1,
    end: r,
    searchEnd: r,
    openOffset: -1
  }], t = [], i = (a, f, d = !1) => {
    const c = {
      type: a,
      start: f.line,
      end: r,
      searchEnd: r,
      openOffset: f.offset,
      awaitingDo: a === "for" || a === "while",
      branch: null
    };
    d && (c.branch = {
      type: "branch",
      start: f.line,
      end: r,
      searchEnd: r,
      openOffset: f.offset
    }, n.push(c.branch)), n.push(c), t.push(c);
  }, u = (a, f) => {
    for (let d = t.length - 1; d >= 0; d--) {
      const c = t[d];
      if (!(f && c.type !== "repeat" || !f && c.type === "repeat")) {
        t.splice(d, 1), c.end = a.line, c.closeOffset = a.offset, c.searchEnd = Math.max(c.start, a.line - 1), c.branch && (c.branch.end = a.line, c.branch.closeOffset = a.offset, c.branch.searchEnd = Math.max(
          c.branch.start,
          a.line - 1
        ));
        return;
      }
    }
  };
  for (const a of o) {
    const f = a.value;
    if (f === "function") i(f, a);
    else if (f === "if") i(f, a, !0);
    else if (f === "for" || f === "while" || f === "repeat")
      i(f, a);
    else if (f === "do") {
      const d = t.at(-1);
      d?.awaitingDo ? d.awaitingDo = !1 : i(f, a);
    } else if (f === "elseif" || f === "else") {
      const d = t.at(-1);
      d?.type === "if" && (d.branch && (d.branch.end = Math.max(d.branch.start, a.line - 1), d.branch.searchEnd = d.branch.end, d.branch.closeOffset = a.offset), d.branch = {
        type: "branch",
        start: a.line,
        end: r,
        searchEnd: r,
        openOffset: a.offset
      }, n.push(d.branch));
    } else f === "end" ? u(a, !1) : f === "until" && u(a, !0);
  }
  return n;
}
function Ue(s, e) {
  const o = String(s ?? ""), r = ye(o), l = r.split(/\r?\n/u), n = xe(r), t = Math.trunc(Number(e));
  if (!Number.isFinite(t) || t < 1 || t > l.length)
    return {
      requestedLine: t,
      line: t,
      endLine: t,
      verified: !1,
      message: "断点行超出源码范围。"
    };
  const i = X(r, l, n).filter((c) => c.start <= t && t <= c.end).sort((c, p) => c.end - c.start - (p.end - p.start) || p.start - c.start || p.openOffset - c.openOffset)[0], u = n.find((c) => c.value === "function" && c.line === t);
  if (u) {
    const c = X(r, l, n).find((p) => p.type === "function" && p.openOffset === u.offset && p.closeOffset !== void 0 && p.end > t);
    if (c) return {
      requestedLine: t,
      line: c.end,
      endLine: c.end,
      verified: !0,
      message: `第 ${t} 行的函数声明在第 ${c.end} 行创建闭包。`
    };
  }
  const a = n.find((c) => c.line > t && _e.has(c.value)), f = a ? a.line - 1 : l.length, d = Math.max(
    t,
    Math.min(i?.searchEnd ?? l.length, f)
  );
  for (let c = t; c <= d; c++)
    if (ke(l[c - 1]))
      return {
        requestedLine: t,
        line: c,
        endLine: d,
        verified: !0,
        message: c === t ? "" : `第 ${t} 行不可执行，断点已下移到同一作用域的第 ${c} 行。`
      };
  return {
    requestedLine: t,
    line: t,
    endLine: d,
    verified: !1,
    message: `第 ${t} 行到当前作用域末尾没有可执行语句。`
  };
}
function ve(s, e) {
  return e.map((o) => {
    const r = Number(o.requestedLine ?? o.line);
    return { ...o, ...Ue(s, r) };
  });
}
const F = 0, K = 1, x = 0, y = 8, ee = 28, Ae = 37, Ee = 52, H = 58;
class C {
  static read_bytes(e, o) {
    const r = new C();
    return r.buf = e.getUint32(o, !0), r.buf_len = e.getUint32(o + 4, !0), r;
  }
  static read_bytes_array(e, o, r) {
    const l = [];
    for (let n = 0; n < r; n++)
      l.push(C.read_bytes(e, o + 8 * n));
    return l;
  }
}
class z {
  static read_bytes(e, o) {
    const r = new z();
    return r.buf = e.getUint32(o, !0), r.buf_len = e.getUint32(o + 4, !0), r;
  }
  static read_bytes_array(e, o, r) {
    const l = [];
    for (let n = 0; n < r; n++)
      l.push(z.read_bytes(e, o + 8 * n));
    return l;
  }
}
const Le = 0, Me = 1;
class G {
  static read_bytes(e, o) {
    return new G(e.getBigUint64(o, !0), e.getUint8(o + 8), e.getUint32(o + 16, !0), e.getBigUint64(o + 24, !0), e.getUint16(o + 36, !0));
  }
  constructor(e, o, r, l, n) {
    this.userdata = e, this.eventtype = o, this.clockid = r, this.timeout = l, this.flags = n;
  }
}
class De {
  write_bytes(e, o) {
    e.setBigUint64(o, this.userdata, !0), e.setUint16(o + 8, this.error, !0), e.setUint8(o + 10, this.eventtype);
  }
  constructor(e, o, r) {
    this.userdata = e, this.error = o, this.eventtype = r;
  }
}
let Re = class {
  enable(e) {
    this.log = Te(e === void 0 ? !0 : e, this.prefix);
  }
  get enabled() {
    return this.isEnabled;
  }
  constructor(e) {
    this.isEnabled = e, this.prefix = "wasi:", this.enable(e);
  }
};
function Te(s, e) {
  return s ? console.log.bind(console, "%c%s", "color: #265BA0", e) : () => {
  };
}
const v = new Re(!1);
class te extends Error {
  constructor(e) {
    super("exit with exit code " + e), this.code = e;
  }
}
let Be = class {
  start(e) {
    this.inst = e;
    try {
      return e.exports._start(), 0;
    } catch (o) {
      if (o instanceof te)
        return o.code;
      throw o;
    }
  }
  initialize(e) {
    this.inst = e, e.exports._initialize && e.exports._initialize();
  }
  constructor(e, o, r, l = {}) {
    this.args = [], this.env = [], this.fds = [], v.enable(l.debug), this.args = e, this.env = o, this.fds = r;
    const n = this;
    this.wasiImport = { args_sizes_get(t, i) {
      const u = new DataView(n.inst.exports.memory.buffer);
      u.setUint32(t, n.args.length, !0);
      let a = 0;
      for (const f of n.args)
        a += f.length + 1;
      return u.setUint32(i, a, !0), v.log(u.getUint32(t, !0), u.getUint32(i, !0)), 0;
    }, args_get(t, i) {
      const u = new DataView(n.inst.exports.memory.buffer), a = new Uint8Array(n.inst.exports.memory.buffer), f = i;
      for (let d = 0; d < n.args.length; d++) {
        u.setUint32(t, i, !0), t += 4;
        const c = new TextEncoder().encode(n.args[d]);
        a.set(c, i), u.setUint8(i + c.length, 0), i += c.length + 1;
      }
      return v.enabled && v.log(new TextDecoder("utf-8").decode(a.slice(f, i))), 0;
    }, environ_sizes_get(t, i) {
      const u = new DataView(n.inst.exports.memory.buffer);
      u.setUint32(t, n.env.length, !0);
      let a = 0;
      for (const f of n.env)
        a += new TextEncoder().encode(f).length + 1;
      return u.setUint32(i, a, !0), v.log(u.getUint32(t, !0), u.getUint32(i, !0)), 0;
    }, environ_get(t, i) {
      const u = new DataView(n.inst.exports.memory.buffer), a = new Uint8Array(n.inst.exports.memory.buffer), f = i;
      for (let d = 0; d < n.env.length; d++) {
        u.setUint32(t, i, !0), t += 4;
        const c = new TextEncoder().encode(n.env[d]);
        a.set(c, i), u.setUint8(i + c.length, 0), i += c.length + 1;
      }
      return v.enabled && v.log(new TextDecoder("utf-8").decode(a.slice(f, i))), 0;
    }, clock_res_get(t, i) {
      let u;
      switch (t) {
        case K: {
          u = 5000n;
          break;
        }
        case F: {
          u = 1000000n;
          break;
        }
        default:
          return Ee;
      }
      return new DataView(n.inst.exports.memory.buffer).setBigUint64(i, u, !0), x;
    }, clock_time_get(t, i, u) {
      const a = new DataView(n.inst.exports.memory.buffer);
      if (t === F)
        a.setBigUint64(u, BigInt((/* @__PURE__ */ new Date()).getTime()) * 1000000n, !0);
      else if (t == K) {
        let f;
        try {
          f = BigInt(Math.round(performance.now() * 1e6));
        } catch {
          f = 0n;
        }
        a.setBigUint64(u, f, !0);
      } else
        a.setBigUint64(u, 0n, !0);
      return 0;
    }, fd_advise(t, i, u, a) {
      return n.fds[t] != null ? x : y;
    }, fd_allocate(t, i, u) {
      return n.fds[t] != null ? n.fds[t].fd_allocate(i, u) : y;
    }, fd_close(t) {
      if (n.fds[t] != null) {
        const i = n.fds[t].fd_close();
        return n.fds[t] = void 0, i;
      } else
        return y;
    }, fd_datasync(t) {
      return n.fds[t] != null ? n.fds[t].fd_sync() : y;
    }, fd_fdstat_get(t, i) {
      if (n.fds[t] != null) {
        const { ret: u, fdstat: a } = n.fds[t].fd_fdstat_get();
        return a?.write_bytes(new DataView(n.inst.exports.memory.buffer), i), u;
      } else
        return y;
    }, fd_fdstat_set_flags(t, i) {
      return n.fds[t] != null ? n.fds[t].fd_fdstat_set_flags(i) : y;
    }, fd_fdstat_set_rights(t, i, u) {
      return n.fds[t] != null ? n.fds[t].fd_fdstat_set_rights(i, u) : y;
    }, fd_filestat_get(t, i) {
      if (n.fds[t] != null) {
        const { ret: u, filestat: a } = n.fds[t].fd_filestat_get();
        return a?.write_bytes(new DataView(n.inst.exports.memory.buffer), i), u;
      } else
        return y;
    }, fd_filestat_set_size(t, i) {
      return n.fds[t] != null ? n.fds[t].fd_filestat_set_size(i) : y;
    }, fd_filestat_set_times(t, i, u, a) {
      return n.fds[t] != null ? n.fds[t].fd_filestat_set_times(i, u, a) : y;
    }, fd_pread(t, i, u, a, f) {
      const d = new DataView(n.inst.exports.memory.buffer), c = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const p = C.read_bytes_array(d, i, u);
        let h = 0;
        for (const m of p) {
          const { ret: g, data: _ } = n.fds[t].fd_pread(m.buf_len, a);
          if (g != x)
            return d.setUint32(f, h, !0), g;
          if (c.set(_, m.buf), h += _.length, a += BigInt(_.length), _.length != m.buf_len)
            break;
        }
        return d.setUint32(f, h, !0), x;
      } else
        return y;
    }, fd_prestat_get(t, i) {
      const u = new DataView(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const { ret: a, prestat: f } = n.fds[t].fd_prestat_get();
        return f?.write_bytes(u, i), a;
      } else
        return y;
    }, fd_prestat_dir_name(t, i, u) {
      if (n.fds[t] != null) {
        const { ret: a, prestat: f } = n.fds[t].fd_prestat_get();
        if (f == null)
          return a;
        const d = f.inner.pr_name;
        return new Uint8Array(n.inst.exports.memory.buffer).set(d.slice(0, u), i), d.byteLength > u ? Ae : x;
      } else
        return y;
    }, fd_pwrite(t, i, u, a, f) {
      const d = new DataView(n.inst.exports.memory.buffer), c = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const p = z.read_bytes_array(d, i, u);
        let h = 0;
        for (const m of p) {
          const g = c.slice(m.buf, m.buf + m.buf_len), { ret: _, nwritten: O } = n.fds[t].fd_pwrite(g, a);
          if (_ != x)
            return d.setUint32(f, h, !0), _;
          if (h += O, a += BigInt(O), O != g.byteLength)
            break;
        }
        return d.setUint32(f, h, !0), x;
      } else
        return y;
    }, fd_read(t, i, u, a) {
      const f = new DataView(n.inst.exports.memory.buffer), d = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const c = C.read_bytes_array(f, i, u);
        let p = 0;
        for (const h of c) {
          const { ret: m, data: g } = n.fds[t].fd_read(h.buf_len);
          if (m != x)
            return f.setUint32(a, p, !0), m;
          if (d.set(g, h.buf), p += g.length, g.length != h.buf_len)
            break;
        }
        return f.setUint32(a, p, !0), x;
      } else
        return y;
    }, fd_readdir(t, i, u, a, f) {
      const d = new DataView(n.inst.exports.memory.buffer), c = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        let p = 0;
        for (; ; ) {
          const { ret: h, dirent: m } = n.fds[t].fd_readdir_single(a);
          if (h != 0)
            return d.setUint32(f, p, !0), h;
          if (m == null)
            break;
          if (u - p < m.head_length()) {
            p = u;
            break;
          }
          const g = new ArrayBuffer(m.head_length());
          if (m.write_head_bytes(new DataView(g), 0), c.set(new Uint8Array(g).slice(0, Math.min(g.byteLength, u - p)), i), i += m.head_length(), p += m.head_length(), u - p < m.name_length()) {
            p = u;
            break;
          }
          m.write_name_bytes(c, i, u - p), i += m.name_length(), p += m.name_length(), a = m.d_next;
        }
        return d.setUint32(f, p, !0), 0;
      } else
        return y;
    }, fd_renumber(t, i) {
      if (n.fds[t] != null && n.fds[i] != null) {
        const u = n.fds[i].fd_close();
        return u != 0 ? u : (n.fds[i] = n.fds[t], n.fds[t] = void 0, 0);
      } else
        return y;
    }, fd_seek(t, i, u, a) {
      const f = new DataView(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const { ret: d, offset: c } = n.fds[t].fd_seek(i, u);
        return f.setBigInt64(a, c, !0), d;
      } else
        return y;
    }, fd_sync(t) {
      return n.fds[t] != null ? n.fds[t].fd_sync() : y;
    }, fd_tell(t, i) {
      const u = new DataView(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const { ret: a, offset: f } = n.fds[t].fd_tell();
        return u.setBigUint64(i, f, !0), a;
      } else
        return y;
    }, fd_write(t, i, u, a) {
      const f = new DataView(n.inst.exports.memory.buffer), d = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const c = z.read_bytes_array(f, i, u);
        let p = 0;
        for (const h of c) {
          const m = d.slice(h.buf, h.buf + h.buf_len), { ret: g, nwritten: _ } = n.fds[t].fd_write(m);
          if (g != x)
            return f.setUint32(a, p, !0), g;
          if (p += _, _ != m.byteLength)
            break;
        }
        return f.setUint32(a, p, !0), x;
      } else
        return y;
    }, path_create_directory(t, i, u) {
      const a = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const f = new TextDecoder("utf-8").decode(a.slice(i, i + u));
        return n.fds[t].path_create_directory(f);
      } else
        return y;
    }, path_filestat_get(t, i, u, a, f) {
      const d = new DataView(n.inst.exports.memory.buffer), c = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const p = new TextDecoder("utf-8").decode(c.slice(u, u + a)), { ret: h, filestat: m } = n.fds[t].path_filestat_get(i, p);
        return m?.write_bytes(d, f), h;
      } else
        return y;
    }, path_filestat_set_times(t, i, u, a, f, d, c) {
      const p = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const h = new TextDecoder("utf-8").decode(p.slice(u, u + a));
        return n.fds[t].path_filestat_set_times(i, h, f, d, c);
      } else
        return y;
    }, path_link(t, i, u, a, f, d, c) {
      const p = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null && n.fds[f] != null) {
        const h = new TextDecoder("utf-8").decode(p.slice(u, u + a)), m = new TextDecoder("utf-8").decode(p.slice(d, d + c)), { ret: g, inode_obj: _ } = n.fds[t].path_lookup(h, i);
        return _ == null ? g : n.fds[f].path_link(m, _, !1);
      } else
        return y;
    }, path_open(t, i, u, a, f, d, c, p, h) {
      const m = new DataView(n.inst.exports.memory.buffer), g = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const _ = new TextDecoder("utf-8").decode(g.slice(u, u + a));
        v.log(_);
        const { ret: O, fd_obj: pe } = n.fds[t].path_open(i, _, f, d, c, p);
        if (O != 0)
          return O;
        n.fds.push(pe);
        const we = n.fds.length - 1;
        return m.setUint32(h, we, !0), 0;
      } else
        return y;
    }, path_readlink(t, i, u, a, f, d) {
      const c = new DataView(n.inst.exports.memory.buffer), p = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const h = new TextDecoder("utf-8").decode(p.slice(i, i + u));
        v.log(h);
        const { ret: m, data: g } = n.fds[t].path_readlink(h);
        if (g != null) {
          const _ = new TextEncoder().encode(g);
          if (_.length > f)
            return c.setUint32(d, 0, !0), y;
          p.set(_, a), c.setUint32(d, _.length, !0);
        }
        return m;
      } else
        return y;
    }, path_remove_directory(t, i, u) {
      const a = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const f = new TextDecoder("utf-8").decode(a.slice(i, i + u));
        return n.fds[t].path_remove_directory(f);
      } else
        return y;
    }, path_rename(t, i, u, a, f, d) {
      const c = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null && n.fds[a] != null) {
        const p = new TextDecoder("utf-8").decode(c.slice(i, i + u)), h = new TextDecoder("utf-8").decode(c.slice(f, f + d));
        let { ret: m, inode_obj: g } = n.fds[t].path_unlink(p);
        if (g == null)
          return m;
        if (m = n.fds[a].path_link(h, g, !0), m != x && n.fds[t].path_link(p, g, !0) != x)
          throw "path_link should always return success when relinking an inode back to the original place";
        return m;
      } else
        return y;
    }, path_symlink(t, i, u, a, f) {
      const d = new Uint8Array(n.inst.exports.memory.buffer);
      return n.fds[u] != null ? (new TextDecoder("utf-8").decode(d.slice(t, t + i)), new TextDecoder("utf-8").decode(d.slice(a, a + f)), H) : y;
    }, path_unlink_file(t, i, u) {
      const a = new Uint8Array(n.inst.exports.memory.buffer);
      if (n.fds[t] != null) {
        const f = new TextDecoder("utf-8").decode(a.slice(i, i + u));
        return n.fds[t].path_unlink_file(f);
      } else
        return y;
    }, poll_oneoff(t, i, u) {
      if (u === 0)
        return ee;
      if (u > 1)
        return v.log("poll_oneoff: only a single subscription is supported"), H;
      const a = new DataView(n.inst.exports.memory.buffer), f = G.read_bytes(a, t), d = f.eventtype, c = f.clockid, p = f.timeout;
      if (d !== Le)
        return v.log("poll_oneoff: only clock subscriptions are supported"), H;
      let h;
      if (c === K)
        h = () => BigInt(Math.round(performance.now() * 1e6));
      else if (c === F)
        h = () => BigInt((/* @__PURE__ */ new Date()).getTime()) * 1000000n;
      else
        return ee;
      const m = (f.flags & Me) !== 0 ? p : h() + p;
      for (; m > h(); )
        ;
      return new De(f.userdata, x, d).write_bytes(a, i), x;
    }, proc_exit(t) {
      throw new te(t);
    }, proc_raise(t) {
      throw "raised signal " + t;
    }, sched_yield() {
    }, random_get(t, i) {
      const u = new Uint8Array(n.inst.exports.memory.buffer).subarray(t, t + i);
      if ("crypto" in globalThis && (typeof SharedArrayBuffer > "u" || !(n.inst.exports.memory.buffer instanceof SharedArrayBuffer)))
        for (let a = 0; a < i; a += 65536)
          crypto.getRandomValues(u.subarray(a, a + 65536));
      else
        for (let a = 0; a < i; a++)
          u[a] = Math.random() * 256 | 0;
    }, sock_recv(t, i, u) {
      throw "sockets not supported";
    }, sock_send(t, i, u) {
      throw "sockets not supported";
    }, sock_shutdown(t, i) {
      throw "sockets not supported";
    }, sock_accept(t, i) {
      throw "sockets not supported";
    } };
  }
};
function ne(s, e, o = null) {
  const r = (l) => s[l] ?? s["_" + l];
  return {
    memory: e,
    heapView: o,
    abiVersion: r("wlua_abi_version"),
    create: r("wlua_create"),
    destroy: r("wlua_destroy"),
    alloc: r("wlua_alloc"),
    free: r("wlua_free"),
    run: r("wlua_run"),
    call: r("wlua_call"),
    get: r("wlua_get"),
    set: r("wlua_set"),
    check: r("wlua_check"),
    resume: r("wlua_resume"),
    resumeFiltered: r("wlua_debug_resume_filtered"),
    resumeValue: r("wlua_resume_value"),
    outputPtr: r("wlua_output_ptr"),
    outputLen: r("wlua_output_len"),
    outputClear: r("wlua_output_clear"),
    resultPtr: r("wlua_result_ptr"),
    resultLen: r("wlua_result_len"),
    currentLine: r("wlua_current_line"),
    pauseReason: r("wlua_debug_pause_reason"),
    capabilityToken: r("wlua_capability_token"),
    setBreakpoints: r("wlua_debug_set_breakpoints"),
    setBreakpointRanges: r("wlua_debug_set_breakpoint_ranges"),
    stack: r("wlua_debug_stack"),
    variables: r("wlua_debug_variables"),
    evaluate: r("wlua_debug_evaluate"),
    setVariable: r("wlua_debug_set_variable"),
    jsonLen: r("wlua_debug_json_len"),
    releaseRef: r("wlua_ref_release")
  };
}
async function Oe(s, e, o = new URL("../wasm/", import.meta.url).href) {
  const r = e ? "debug" : "runtime", l = new URL(o.endsWith("/") ? o : o + "/", import.meta.url), n = s === "emscripten" ? [`emscripten-lua-${r}.mjs`, `emscripten-lua-${r}.wasm`] : [`wasi-lua-${r}.wasm`];
  try {
    const d = await fetch(new URL("manifest.json", l));
    if (d.ok) {
      const c = await d.json(), p = n.filter((h) => !c.artifacts?.[h]);
      if (p.length)
        throw new Error(`当前 release 未包含 ${s}-${r} 变体（缺少 ${p.join("、")}）。请重新生成 release 或选择已包含的变体。`);
    }
  } catch (d) {
    if (String(d?.message ?? d).includes("当前 release 未包含")) throw d;
  }
  if (s === "emscripten") {
    const c = (await import(
      /* @vite-ignore */
      new URL("emscripten-lua-" + r + ".mjs", l).href
    )).default, p = await c({
      locateFile: (h) => new URL("emscripten-lua-" + r + (h.endsWith(".wasm") ? ".wasm" : "-" + h), l).href
    });
    return ne(p, null, () => p.HEAPU8);
  }
  const t = new Be(["wasm-lua"], [], []), i = await fetch(new URL("wasi-lua-" + r + ".wasm", l)), u = await WebAssembly.compileStreaming(i), a = await WebAssembly.instantiate(u, {
    wasi_snapshot_preview1: t.wasiImport
  });
  t.initialize(
    /** @type {any} */
    a
  );
  const f = (
    /** @type {Record<string, WebAssembly.ExportValue> & {memory: WebAssembly.Memory}} */
    /** @type {unknown} */
    a.exports
  );
  return ne(f, f.memory);
}
function ue(s) {
  if (s.heapView) return s.heapView();
  const e = s.memory instanceof WebAssembly.Memory ? s.memory.buffer : s.memory;
  return new Uint8Array(e);
}
const R = new TextEncoder(), fe = new TextDecoder();
let w, b = 0, B = 0, V = 0, A = [], k = null, T = !1, E = 0, L = !1, M = !1, D = !1, ce;
const Ve = {
  [-1]: "error",
  0: "complete",
  1: "paused",
  2: "capability",
  3: "slice",
  4: "yield"
};
function U(s) {
  const e = Number(w.alloc(s.length));
  return ue(w).set(s, e), e;
}
function Y(s, e) {
  return ue(w).slice(Number(s), Number(s) + Number(e));
}
function I() {
  return Y(w.resultPtr(b), w.resultLen(b));
}
function Ne() {
  const s = Number(w.outputLen(b));
  if (s > V) {
    const e = Number(w.outputPtr(b));
    postMessage({
      type: "event",
      event: "output",
      body: {
        category: "stdout",
        output: fe.decode(Y(e + V, s - V))
      }
    }), V = s;
  }
}
function $(s, ...e) {
  const o = s(b, ...e), r = Y(o, w.jsonLen(b));
  return JSON.parse(fe.decode(r));
}
function re(s, e = "console") {
  postMessage({ type: "event", event: "output", body: { category: e, output: s } });
}
function N() {
  if (L) throw new Error("Lua VM 正在执行或等待能力返回。");
}
function P() {
  if (N(), !M) throw new Error("Lua VM 当前没有可检查的暂停栈。");
}
function se() {
  if (N(), !D)
    throw new Error("Lua 程序当前未在断点或协作式暂停处，不能继续执行。");
}
async function q(s, e) {
  N(), L = !0, M = !1, D = !1, B = s;
  try {
    await le(e(), s);
  } catch (o) {
    throw B === s && (B = 0, L = !1, M = !1, D = !1, T = !1, E = 0, k = null), o;
  }
}
function S() {
  const s = k ? [k.line, k.line] : A.flatMap((r) => [
    r.line,
    Math.max(r.line, r.endLine ?? r.line)
  ]), e = Int32Array.from(w.setBreakpointRanges ? s : k ? [k.line] : A.map((r) => r.line)), o = U(new Uint8Array(e.buffer));
  w.setBreakpointRanges ? w.setBreakpointRanges(b, o, e.length / 2) : w.setBreakpoints(b, o, e.length), w.free(o);
}
function oe() {
  k && (k = null, S());
}
function ie(s) {
  return String(s ?? "").replace(/^[@=]/u, "").replaceAll("\\", "/");
}
function Z(s, e) {
  const o = ie(s.source ?? s.file);
  return !o || o === ie(e);
}
function Se() {
  return $(w.stack)?.[0]?.source ?? "";
}
function J(s, e = 0) {
  const o = R.encode(s), r = U(o), l = $(w.evaluate, e, r, o.length);
  return w.free(r), l;
}
function Ie(s) {
  const e = s?.[0];
  return !e || e.type === "nil" ? !1 : e.type !== "boolean" || e.value === "true";
}
function $e(s, e) {
  if (!s?.trim()) return !0;
  const o = /^\s*(?:(>=|<=|>|<|==|=|%)\s*)?(\d+)\s*$/.exec(s);
  if (!o) return !1;
  const r = Number(o[2]);
  switch (o[1] ?? "=") {
    case ">=":
      return e >= r;
    case "<=":
      return e <= r;
    case ">":
      return e > r;
    case "<":
      return e < r;
    case "%":
      return r > 0 && e % r === 0;
    default:
      return e === r;
  }
}
function Ce(s) {
  return s.replace(/\{([^{}]+)\}/g, (e, o) => {
    const r = J(o);
    return r.error ? `<错误: ${r.error}>` : r[0]?.value ?? "nil";
  });
}
function ze(s, e, o) {
  const r = (o & 2) !== 0, l = () => r ? { stop: !0, reason: "step" } : { stop: !1 };
  if (k?.line === s && Z(k, e))
    return k = null, S(), { stop: !0, reason: "goto" };
  const n = A.filter((t) => t.line <= s && s <= (t.endLine ?? t.line) && Z(t, e)).sort((t, i) => i.line - t.line)[0];
  if (!n) return l();
  if (n.line !== s || n.endLine !== s || n.verified === !1) {
    const t = n.requestedLine ?? n.line;
    n.line = s, n.endLine = s, n.verified = !0, n.message = t === s ? "" : `第 ${t} 行不可执行，断点已下移到第 ${s} 行。`, S(), postMessage({
      type: "event",
      event: "breakpointchange",
      body: { breakpoints: A.map((i) => ({ ...i })) }
    });
  }
  if (n.hits = (n.hits ?? 0) + 1, !$e(n.hitCondition, n.hits))
    return l();
  if (n.condition) {
    const t = J(n.condition);
    if (t.error)
      return re(`[条件断点 ${s}] ${t.error}
`, "stderr"), { stop: !0, reason: "breakpoint" };
    if (!Ie(t)) return l();
  }
  return n.logMessage ? (re(Ce(n.logMessage) + `
`), l()) : { stop: !0, reason: "breakpoint" };
}
async function le(s, e) {
  for (; ; ) {
    Ne();
    const o = Ve[s] ?? "error";
    if (s === 3) {
      if (await new Promise((l) => setTimeout(l, 0)), e !== B) return;
      if (T) {
        T = !1, oe(), L = !1, M = !0, D = !0, postMessage({ type: "event", event: "stopped", body: {
          reason: "pause",
          line: Number(w.currentLine(b)),
          resumable: !0
        } }), postMessage({ type: "response", id: e, ok: !0, result: { state: "paused" } });
        return;
      }
      s = w.resume(b, E);
      continue;
    }
    if (s === 2) {
      const l = I();
      postMessage({
        type: "capability",
        id: e,
        token: Number(w.capabilityToken(b)),
        payload: l
      }, [l.buffer]);
      return;
    }
    if (s === 1) {
      const l = Number(w.currentLine(b)), n = Se(), t = Number(w.pauseReason(b)), i = ze(l, n, t);
      if (!i.stop) {
        s = w.resumeFiltered(b, E);
        continue;
      }
      postMessage({ type: "event", event: "stopped", body: {
        reason: i.reason,
        line: l,
        source: n,
        resumable: !0
      } }), L = !1, M = !0, D = !0, postMessage({ type: "response", id: e, ok: !0, result: { state: o } });
      return;
    }
    if (s === 4) {
      const l = W(I());
      L = !1, M = !1, D = !0, T = !1, E = 0, B = 0, postMessage({
        type: "response",
        id: e,
        ok: !0,
        result: { state: o, values: l }
      });
      return;
    }
    const r = W(I());
    L = !1, M = s === -1, D = !1, T = !1, E = 0, oe(), s === -1 ? (postMessage({ type: "event", event: "stopped", body: {
      reason: "exception",
      line: Number(w.currentLine(b)),
      resumable: !1
    } }), postMessage({ type: "response", id: e, ok: !1, error: r.message })) : (postMessage({ type: "event", event: "terminated", body: {} }), postMessage({ type: "response", id: e, ok: !0, result: { state: o, values: r } })), B = 0;
    return;
  }
}
function de() {
  const s = ce, e = s.profile === "full-access" ? 2 : s.profile === "trusted" ? 1 : 0, o = e === 2, r = s.memoryLimit ?? (o ? 0 : (e === 1 ? 256 : 64) * 1024 * 1024), l = s.instructionLimit ?? (o ? 0 : e === 1 ? 1e8 : 1e7), n = BigInt(r), t = BigInt(l);
  if (n < 0n || n > 512n * 1024n * 1024n || n === 0n && !o)
    throw new RangeError("Lua 堆配额必须在 1 到 512 MiB 之间；full-access 可使用 0 取消人工配额。");
  if (t < 0n || t > 0xffffffffffffffffn || t === 0n && !o)
    throw new RangeError("Lua 指令配额超出 ABI v1 支持范围。");
  if (b = w.create(e, n, t), !b) throw new Error("Unable to create Lua VM.");
  V = 0, k = null, T = !1, E = 0, M = !1, D = !1, S();
}
function Pe() {
  b && w.destroy(b), b = 0, A = A.map((s) => ({ ...s, hits: 0 })), de(), postMessage({ type: "generation" });
}
function ae(s, e, o) {
  A = s.map((r) => ({ ...r, hits: 0 })), typeof e == "string" && (A = A.map((r) => Z(r, o) ? ve(e, [r])[0] : r), postMessage({
    type: "event",
    event: "breakpointchange",
    body: { breakpoints: A.map((r) => ({ ...r })) }
  })), S();
}
async function qe(s) {
  if (ce = { ...s }, w = await Oe(s.backend, s.debug, s.assetBaseUrl), Number(w.abiVersion()) !== 65536)
    throw new Error("WASM ABI version mismatch.");
  de();
}
self.onmessage = async (s) => {
  const e = s.data;
  try {
    if (e.type === "initialize") {
      await qe(e.options), postMessage({ type: "ready", ok: !0, abiVersion: 1, protocolVersion: "1.68" });
      return;
    }
    if (e.type === "run") {
      await q(e.id, () => {
        Pe(), Array.isArray(e.breakpoints) && ae(
          e.breakpoints,
          e.source,
          e.chunkName ?? "@main.lua"
        );
        const o = R.encode(e.source), r = R.encode(e.chunkName ?? "@main.lua"), l = U(o), n = U(r), t = w.run(
          b,
          l,
          o.length,
          n,
          r.length
        );
        return w.free(l), w.free(n), t;
      });
      return;
    }
    if (e.type === "check") {
      N();
      const o = R.encode(e.source), r = R.encode(e.chunkName ?? "@main.lua"), l = U(o), n = U(r), t = w.check(
        b,
        l,
        o.length,
        n,
        r.length
      );
      if (w.free(l), w.free(n), t !== 0) {
        const i = W(I());
        throw i instanceof Error ? i : new Error(String(i));
      }
      postMessage({ type: "response", id: e.id, ok: !0, result: !0 });
      return;
    }
    if (e.type === "resume") {
      se(), E = e.mode ?? 0, await q(e.id, () => w.resume(b, E));
      return;
    }
    if (e.type === "call") {
      await q(e.id, () => {
        V = 0;
        const o = new Uint8Array(e.payload), r = U(o), l = w.call(b, e.reference, r, o.length);
        return w.free(r), l;
      });
      return;
    }
    if (e.type === "get") {
      N();
      const o = new Uint8Array(e.payload), r = U(o), l = w.get(b, e.reference, r, o.length);
      if (w.free(r), !l) throw new Error("LuaRef 不是有效表引用。");
      postMessage({ type: "response", id: e.id, ok: !0, result: W(I()) });
      return;
    }
    if (e.type === "set") {
      N();
      const o = new Uint8Array(e.payload), r = U(o), l = w.set(b, e.reference, r, o.length);
      if (w.free(r), !l) throw new Error("LuaRef 不是有效表引用，或键值无效。");
      postMessage({ type: "response", id: e.id, ok: !0, result: !0 });
      return;
    }
    if (e.type === "capabilityResult") {
      if (e.id !== B || Number(e.token) !== Number(w.capabilityToken(b)))
        throw new Error("过期或伪造的能力恢复令牌。");
      const o = new Uint8Array(e.payload), r = U(o), l = w.resumeValue(
        b,
        r,
        o.length,
        e.rejected ? 1 : 0,
        E
      );
      w.free(r);
      try {
        await le(l, e.id);
      } catch (n) {
        throw L = !1, n;
      }
      return;
    }
    if (e.type === "setBreakpoints") {
      ae(e.breakpoints), postMessage({ type: "response", id: e.id, ok: !0, result: A });
      return;
    }
    if (e.type === "stack") {
      P(), postMessage({ type: "response", id: e.id, ok: !0, result: $(w.stack) });
      return;
    }
    if (e.type === "variables") {
      P(), postMessage({
        type: "response",
        id: e.id,
        ok: !0,
        result: $(w.variables, e.frame ?? 0, e.reference ?? 0)
      });
      return;
    }
    if (e.type === "evaluate") {
      P();
      const o = J(e.expression, e.frame ?? 0);
      postMessage({ type: "response", id: e.id, ok: !0, result: o });
      return;
    }
    if (e.type === "setVariable") {
      P();
      const o = R.encode(e.name), r = R.encode(e.value), l = U(o), n = U(r), t = $(
        w.setVariable,
        e.frame ?? 0,
        e.reference ?? 0,
        l,
        o.length,
        n,
        r.length
      );
      if (w.free(l), w.free(n), t.error) throw new Error(t.error);
      postMessage({ type: "response", id: e.id, ok: !0, result: t });
      return;
    }
    if (e.type === "pause") {
      T = L, postMessage({ type: "response", id: e.id, ok: !0, result: L });
      return;
    }
    if (e.type === "runToCursor") {
      se(), k = {
        line: Number(e.line),
        source: e.source
      }, S(), E = 0, await q(e.id, () => w.resume(b, 0));
      return;
    }
    e.type === "release" && w.releaseRef(b, e.reference);
  } catch (o) {
    if (e.type === "initialize") {
      postMessage({
        type: "ready",
        ok: !1,
        error: o instanceof Error ? o.message : String(o)
      });
      return;
    }
    postMessage({
      type: "response",
      id: e.id,
      ok: !1,
      error: o instanceof Error ? o.message : String(o)
    });
  }
};
