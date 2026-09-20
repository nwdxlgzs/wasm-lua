const LUA_STDLIB = {
  assert: { signature: "assert(v [, message])", doc: "当 v 为假时抛出错误，否则返回全部参数。" },
  collectgarbage: { signature: "collectgarbage([opt [, arg]])", doc: "控制垃圾收集器。" },
  error: { signature: "error(message [, level])", doc: "终止最后调用的受保护函数并抛出错误。" },
  getmetatable: { signature: "getmetatable(object)", doc: "返回对象的元表。" },
  ipairs: { signature: "ipairs(t)", doc: "按连续整数键迭代表。" },
  load: { signature: "load(chunk [, chunkname [, mode [, env]]])", doc: "编译 Lua 源码；安全档只接受文本，可信档和 full-access 还可加载 Lua 字节码。" },
  loadfile: { signature: "loadfile(filename [, mode [, env]])", doc: "通过实例 VFS 读取并编译 Lua 文件；可信档和 full-access 经授权挂载点也可读取宿主文件夹。" },
  dofile: { signature: "dofile(filename)", doc: "通过实例 VFS 加载并执行 Lua 文件；可信档和 full-access 可读取授权挂载文件。" },
  next: { signature: "next(table [, index])", doc: "返回表中的下一个键值对。" },
  pairs: { signature: "pairs(t)", doc: "使用 __pairs 元方法迭代表。" },
  pcall: { signature: "pcall(f [, arg1, ...])", doc: "以保护模式调用函数。" },
  print: { signature: "print(...)", doc: "向宿主输出流写入制表符分隔的值。" },
  rawequal: { signature: "rawequal(v1, v2)", doc: "不调用元方法地比较两个值。" },
  rawget: { signature: "rawget(table, index)", doc: "不调用 __index 地读取表。" },
  rawlen: { signature: "rawlen(v)", doc: "不调用元方法地取得长度。" },
  rawset: { signature: "rawset(table, index, value)", doc: "不调用 __newindex 地写入表。" },
  require: { signature: "require(modname)", doc: "加载已注册的 Lua 模块。" },
  select: { signature: "select(index, ...)", doc: "返回可变参数的选定部分。" },
  setmetatable: { signature: "setmetatable(table, metatable)", doc: "设置表的元表。" },
  tonumber: { signature: "tonumber(e [, base])", doc: "把值转换为数字。" },
  tostring: { signature: "tostring(v)", doc: "把值转换为字符串。" },
  type: { signature: "type(v)", doc: "返回值的 Lua 类型名称。" },
  warn: { signature: "warn(msg1, ...)", doc: "发出警告。" },
  xpcall: { signature: "xpcall(f, msgh [, arg1, ...])", doc: "带消息处理器的保护调用。" },
  "js.call": { signature: "js.call(capability, ...)", doc: "异步调用宿主注册的 JavaScript 能力，并在 Promise 完成后恢复 Lua 协程。" },
  "coroutine.create": { signature: "coroutine.create(f)", doc: "创建 Lua 协程；调试和异步暂停会透明传播到宿主。" },
  "coroutine.resume": { signature: "coroutine.resume(co [, val1, ...])", doc: "恢复协程。" },
  "coroutine.close": { signature: "coroutine.close(co)", doc: "关闭挂起或死亡的协程，并关闭其待处理变量。" },
  "coroutine.isyieldable": { signature: "coroutine.isyieldable([co])", doc: "判断指定协程是否可以让出。" },
  "coroutine.running": { signature: "coroutine.running()", doc: "返回正在运行的协程及其是否为主线程。" },
  "coroutine.status": { signature: "coroutine.status(co)", doc: "返回协程状态。" },
  "coroutine.wrap": { signature: "coroutine.wrap(f)", doc: "创建协程并返回负责恢复它的函数。" },
  "coroutine.yield": { signature: "coroutine.yield(...)", doc: "挂起当前协程。" },
  "debug.debug": { signature: "debug.debug()", doc: "进入交互调试模式。可信档和 full-access 提供。" },
  "debug.gethook": { signature: "debug.gethook([thread])", doc: "读取线程的复合调试钩子。可信档和 full-access 提供。" },
  "debug.getinfo": { signature: "debug.getinfo([thread,] f [, what])", doc: "返回函数或栈帧的调试信息。可信档和 full-access 提供。" },
  "debug.getlocal": { signature: "debug.getlocal([thread,] f, local)", doc: "读取局部变量。可信档和 full-access 提供。" },
  "debug.getmetatable": { signature: "debug.getmetatable(value)", doc: "读取对象元表。可信档和 full-access 提供。" },
  "debug.getregistry": { signature: "debug.getregistry()", doc: "返回注册表。可信档和 full-access 提供。" },
  "debug.getupvalue": { signature: "debug.getupvalue(f, up)", doc: "读取函数 upvalue。可信档和 full-access 提供。" },
  "debug.getuservalue": { signature: "debug.getuservalue(u [, n])", doc: "读取完整 userdata 的用户值。可信档和 full-access 提供。" },
  "debug.sethook": { signature: "debug.sethook([thread,] hook, mask [, count])", doc: "设置用户调试钩子；宿主调度与调试钩子仍会保留。可信档和 full-access 提供。" },
  "debug.setlocal": { signature: "debug.setlocal([thread,] level, local, value)", doc: "修改局部变量。可信档和 full-access 提供。" },
  "debug.setmetatable": { signature: "debug.setmetatable(value, table)", doc: "设置对象元表。可信档和 full-access 提供。" },
  "debug.setupvalue": { signature: "debug.setupvalue(f, up, value)", doc: "修改函数 upvalue。可信档和 full-access 提供。" },
  "debug.setuservalue": { signature: "debug.setuservalue(udata, value [, n])", doc: "设置完整 userdata 的用户值。可信档和 full-access 提供。" },
  "debug.traceback": { signature: "debug.traceback([thread,] [message [, level]])", doc: "生成调用栈回溯。可信档和 full-access 提供。" },
  "debug.upvalueid": { signature: "debug.upvalueid(f, n)", doc: "返回 upvalue 的唯一标识。可信档和 full-access 提供。" },
  "debug.upvaluejoin": { signature: "debug.upvaluejoin(f1, n1, f2, n2)", doc: "令两个闭包共享 upvalue。可信档和 full-access 提供。" },
  "io.close": { signature: "io.close([file])", doc: "关闭内存 VFS 文件句柄，三个 profile 均可用。" },
  "io.flush": { signature: "io.flush()", doc: "刷新内存 VFS 默认输出（内存写入已即时提交）。" },
  "io.input": { signature: "io.input([file])", doc: "读取或设置当前实例的内存 VFS 默认输入。" },
  "io.lines": { signature: "io.lines([filename, ...])", doc: "逐行迭代当前实例内存 VFS 的文件。" },
  "io.open": { signature: "io.open(filename [, mode])", doc: "打开实例 VFS 文件；可信档和 full-access 显式授权的目录挂载点也可读写。支持 r/w/a、+ 和 b。" },
  "io.output": { signature: "io.output([file])", doc: "读取或设置当前实例的内存 VFS 默认输出。" },
  "io.read": { signature: "io.read(...)", doc: "从内存 VFS 默认输入读取。" },
  "io.tmpfile": { signature: "io.tmpfile()", doc: "在当前实例的内存 VFS 中创建可读写的临时文件。" },
  "io.type": { signature: "io.type(obj)", doc: "检查对象是否为内存 VFS 文件句柄。" },
  "io.write": { signature: "io.write(...)", doc: "写入内存 VFS 默认输出。" },
  "vfs.read": { signature: "vfs.read(path)", doc: "读取当前实例内存 VFS 文件的全部字节。" },
  "vfs.write": { signature: "vfs.write(path, data [, mode])", doc: "新建或写入内存 VFS 文件；mode 默认 wb，可指定 ab 追加。" },
  "vfs.size": { signature: "vfs.size(path)", doc: "取得内存 VFS 文件的字节数。" },
  "vfs.exists": { signature: "vfs.exists(path)", doc: "检查内存 VFS 文件是否存在。" },
  "math.abs": { signature: "math.abs(x)", doc: "返回绝对值。" },
  "math.acos": { signature: "math.acos(x)", doc: "返回反余弦值（弧度）。" },
  "math.asin": { signature: "math.asin(x)", doc: "返回反正弦值（弧度）。" },
  "math.atan": { signature: "math.atan(y [, x])", doc: "返回 y/x 的反正切值（弧度）。" },
  "math.ceil": { signature: "math.ceil(x)", doc: "返回不小于 x 的最小整数。" },
  "math.cos": { signature: "math.cos(x)", doc: "返回余弦值。" },
  "math.deg": { signature: "math.deg(x)", doc: "把弧度转换为角度。" },
  "math.exp": { signature: "math.exp(x)", doc: "返回 e 的 x 次幂。" },
  "string.format": { signature: "string.format(formatstring, ...)", doc: "按格式字符串返回格式化文本。" },
  "math.fmod": { signature: "math.fmod(x, y)", doc: "返回 x 除以 y 的浮点余数。" },
  "math.log": { signature: "math.log(x [, base])", doc: "返回指定底数的对数。" },
  "math.max": { signature: "math.max(x, ...)", doc: "返回参数中的最大值。" },
  "math.min": { signature: "math.min(x, ...)", doc: "返回参数中的最小值。" },
  "math.modf": { signature: "math.modf(x)", doc: "返回整数部分和小数部分。" },
  "math.rad": { signature: "math.rad(x)", doc: "把角度转换为弧度。" },
  "math.random": { signature: "math.random([m [, n]])", doc: "返回伪随机数。" },
  "math.randomseed": { signature: "math.randomseed([x [, y]])", doc: "设置并返回伪随机种子。" },
  "math.sin": { signature: "math.sin(x)", doc: "返回正弦值。" },
  "math.sqrt": { signature: "math.sqrt(x)", doc: "返回平方根。" },
  "math.tan": { signature: "math.tan(x)", doc: "返回正切值。" },
  "math.tointeger": { signature: "math.tointeger(x)", doc: "可无损转换时返回整数，否则返回 nil。" },
  "math.type": { signature: "math.type(x)", doc: "返回 integer、float 或 nil。" },
  "math.ult": { signature: "math.ult(m, n)", doc: "以无符号整数比较 m 和 n。" },
  "os.clock": { signature: "os.clock()", doc: "返回当前 VM 代际启动后的单调时间（秒），由 JavaScript performance.now 提供。" },
  "os.date": { signature: "os.date([format [, time]])", doc: "通过 JavaScript Date 格式化本地或 UTC 日期；支持 Lua 标准的常用转换符与 *t。" },
  "os.difftime": { signature: "os.difftime(t2, t1)", doc: "返回两个时间戳的秒数差。" },
  "os.time": { signature: "os.time([table])", doc: "通过 JavaScript Date 返回 Unix 时间戳，传表时会规范化日期字段。" },
  "os.getenv": { signature: "os.getenv(varname)", doc: "读取宿主显式通过 environment 注册的变量；不会暴露浏览器或进程环境。" },
  "os.tmpname": { signature: "os.tmpname()", doc: "生成适用于内存 VFS 的不可预测临时路径，不会创建宿主文件。" },
  "os.remove": { signature: "os.remove(filename)", doc: "删除当前运行时中显式注册的内存 VFS 文件。" },
  "os.rename": { signature: "os.rename(oldname, newname)", doc: "重命名当前运行时中的内存 VFS 文件。" },
  "os.setlocale": { signature: "os.setlocale(locale [, category])", doc: "浏览器固定为 C locale；查询或设置 C 返回 C，其余返回 nil。" },
  "os.execute": { signature: "os.execute([command])", doc: "浏览器沙箱明确禁用；不会执行宿主命令。" },
  "os.exit": { signature: "os.exit([code [, close]])", doc: "浏览器沙箱明确禁用；请由宿主调用 interrupt/dispose。" },
  "package.searchpath": { signature: "package.searchpath(name, path [, sep [, rep]])", doc: "在路径模板中查找模块文件名。" },
  "string.byte": { signature: "string.byte(s [, i [, j]])", doc: "返回指定字符的内部数值编码。" },
  "string.char": { signature: "string.char(...)", doc: "从整数编码构造字符串。" },
  "string.dump": { signature: "string.dump(function [, strip])", doc: "导出二进制函数块；安全档禁止重新加载二进制块。" },
  "string.find": { signature: "string.find(s, pattern [, init [, plain]])", doc: "查找模式并返回起止位置及捕获。" },
  "string.gmatch": { signature: "string.gmatch(s, pattern [, init])", doc: "返回遍历全部匹配的迭代器。" },
  "string.gsub": { signature: "string.gsub(s, pattern, repl [, n])", doc: "替换模式匹配并返回结果和替换次数。" },
  "string.len": { signature: "string.len(s)", doc: "返回字符串字节长度。" },
  "string.lower": { signature: "string.lower(s)", doc: "按当前 locale 转为小写。" },
  "string.match": { signature: "string.match(s, pattern [, init])", doc: "返回第一个模式匹配。" },
  "string.pack": { signature: "string.pack(fmt, v1, ...)", doc: "按格式打包二进制字符串。" },
  "string.packsize": { signature: "string.packsize(fmt)", doc: "返回固定格式的打包长度。" },
  "string.rep": { signature: "string.rep(s, n [, sep])", doc: "重复字符串。" },
  "string.reverse": { signature: "string.reverse(s)", doc: "按字节反转字符串。" },
  "string.sub": { signature: "string.sub(s, i [, j])", doc: "返回字符串片段。" },
  "string.unpack": { signature: "string.unpack(fmt, s [, pos])", doc: "从二进制字符串解包值。" },
  "string.upper": { signature: "string.upper(s)", doc: "按当前 locale 转为大写。" },
  "table.concat": { signature: "table.concat(list [, sep [, i [, j]]])", doc: "连接列表元素。" },
  "table.insert": { signature: "table.insert(list, [pos,] value)", doc: "向列表插入元素。" },
  "table.move": { signature: "table.move(a1, f, e, t [, a2])", doc: "复制一段列表元素。" },
  "table.pack": { signature: "table.pack(...)", doc: "把参数打包为带 n 字段的表。" },
  "table.remove": { signature: "table.remove(list [, pos])", doc: "从列表移除元素。" },
  "table.sort": { signature: "table.sort(list [, comp])", doc: "就地排序列表。" },
  "table.unpack": { signature: "table.unpack(list [, i [, j]])", doc: "返回列表指定范围内的元素。" },
  "math.floor": { signature: "math.floor(x)", doc: "返回不大于 x 的最大整数。" },
  "utf8.char": { signature: "utf8.char(...)", doc: "把 Unicode 码点转换为 UTF-8 字符串。" },
  "utf8.charpattern": { signature: "utf8.charpattern", doc: "匹配一个 UTF-8 字节序列的模式。" },
  "utf8.codes": { signature: "utf8.codes(s [, lax])", doc: "迭代 UTF-8 字符位置和码点。" },
  "utf8.codepoint": { signature: "utf8.codepoint(s [, i [, j [, lax]]])", doc: "返回指定范围的 Unicode 码点。" },
  "utf8.len": { signature: "utf8.len(s [, i [, j [, lax]]])", doc: "返回 UTF-8 字符数；非法序列时返回失败位置。" },
  "utf8.offset": { signature: "utf8.offset(s, n [, i])", doc: "返回第 n 个 UTF-8 字符的字节位置。" }
}, LUA_KEYWORDS = [
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
], IDENTIFIER_SOURCE = "(?:[A-Za-z_]|[^\\x00-\\x7F])(?:[A-Za-z0-9_]|[^\\x00-\\x7F])*", IDENTIFIER = new RegExp(`^${IDENTIFIER_SOURCE}$`, "u"), IDENTIFIER_GLOBAL = new RegExp(IDENTIFIER_SOURCE, "gu");
function offsetToPosition(A, I) {
  const g = A.slice(0, I).split(`
`);
  return { lineNumber: g.length, column: g.at(-1).length + 1 };
}
function rangeAt(A, I, g) {
  const Q = offsetToPosition(A, I), B = offsetToPosition(A, I + g);
  return {
    startLineNumber: Q.lineNumber,
    startColumn: Q.column,
    endLineNumber: B.lineNumber,
    endColumn: B.column
  };
}
function maskTrivia(A) {
  const I = A.split(""), g = (B, E) => {
    for (let o = B; o < E; o++)
      I[o] !== `
` && I[o] !== "\r" && (I[o] = " ");
  };
  let Q = 0;
  for (; Q < A.length; ) {
    if (A.startsWith("--", Q)) {
      const E = /^--\[(=*)\[/.exec(A.slice(Q));
      if (E) {
        const o = `]${E[1]}]`, e = A.indexOf(o, Q + E[0].length), s = e < 0 ? A.length : e + o.length;
        g(Q, s), Q = s;
      } else {
        const o = A.indexOf(`
`, Q), e = o < 0 ? A.length : o;
        g(Q, e), Q = e;
      }
      continue;
    }
    const B = /^\[(=*)\[/.exec(A.slice(Q));
    if (B) {
      const E = `]${B[1]}]`, o = A.indexOf(E, Q + B[0].length), e = o < 0 ? A.length : o + E.length;
      g(Q, e), Q = e;
      continue;
    }
    if (A[Q] === '"' || A[Q] === "'") {
      const E = A[Q];
      let o = Q + 1;
      for (; o < A.length; )
        if (A[o] === "\\") o += 2;
        else if (A[o++] === E) break;
      g(Q, o), Q = o;
      continue;
    }
    Q++;
  }
  return I.join("");
}
function documentationInfoBefore(A, I) {
  const g = A.slice(0, I).split(`
`), Q = [];
  for (let r = g.length - 2; r >= 0; r--) {
    const t = /^\s*---?\s?(.*)$/.exec(g[r]);
    if (!t) break;
    Q.unshift(t[1]);
  }
  const B = [], E = {}, o = [], e = [];
  let s = "";
  for (const r of Q) {
    let t;
    if (t = /^@param\s+(\S+)\s+(\S+)(?:\s+(.*))?$/u.exec(r)) {
      const n = t[1].endsWith("?"), y = n ? t[1].slice(0, -1) : t[1];
      E[y] = {
        type: t[2],
        description: t[3] ?? "",
        optional: n
      };
    } else (t = /^@return\s+(\S+)(?:\s+(.*))?$/u.exec(r)) ? o.push({ type: t[1], description: t[2] ?? "" }) : (t = /^@field\s+(\S+)\s+(\S+)(?:\s+(.*))?$/u.exec(r)) ? e.push({ name: t[1], type: t[2], description: t[3] ?? "" }) : (t = /^@(?:class|type)\s+(\S+)/u.exec(r)) ? s = t[1] : r.startsWith("@") || B.push(r);
  }
  const D = [
    ...Object.entries(E).map(([r, t]) => `参数 \`${r}\`：\`${t.type}\`${t.description ? ` — ${t.description}` : ""}`),
    ...o.map((r) => `返回：\`${r.type}\`${r.description ? ` — ${r.description}` : ""}`),
    ...e.map((r) => `字段 \`${r.name}\`：\`${r.type}\`${r.description ? ` — ${r.description}` : ""}`)
  ];
  return {
    documentation: [...B, ...D].filter(Boolean).join(`
`),
    parameters: E,
    returns: o,
    fields: e,
    declaredType: s
  };
}
function documentationBefore(A, I) {
  return documentationInfoBefore(A, I).documentation;
}
function functionDetail(A, I, g) {
  const Q = I.map((E) => {
    const o = g.parameters[E];
    return o ? `${E}${o.optional ? "?" : ""}: ${o.type}` : E;
  }).join(", "), B = g.returns.length ? `: ${g.returns.map((E) => E.type).join(", ")}` : "";
  return `function ${A}(${Q})${B}`;
}
function addOccurrence(A, I, g, Q) {
  const B = A.get(I) ?? [];
  B.push({ range: g, offset: Q }), A.set(I, B);
}
function addSymbol(A, I, g, Q, B, E = {}) {
  IDENTIFIER.test(Q.split(/[.:]/).at(-1)) && A.push({
    name: Q,
    kind: E.kind ?? "variable",
    scope: E.scope ?? "global",
    uri: g,
    range: rangeAt(I, B, Q.length),
    detail: E.detail ?? Q,
    documentation: E.documentation ?? documentationBefore(I, B),
    containerName: E.containerName,
    parameters: E.parameters ?? [],
    offset: B,
    visibilityStart: E.visibilityStart ?? 0,
    visibilityEnd: E.visibilityEnd ?? I.length
  });
}
function createScopes(A) {
  const I = { type: "root", start: 0, end: A.length, parent: null }, g = [I], Q = [I], B = /\b(function|if|for|while|repeat|do|end|until)\b/gu;
  for (const E of A.matchAll(B)) {
    const o = E[1];
    if (o === "end" || o === "until") {
      if (Q.length > 1) {
        const s = Q.pop();
        s.end = E.index + o.length;
      }
      continue;
    }
    if (o === "do") {
      const s = Q.at(-1);
      if ((s.type === "for" || s.type === "while") && !s.bodyStarted) {
        s.bodyStarted = !0;
        continue;
      }
    }
    const e = {
      type: o,
      start: E.index,
      end: A.length,
      parent: Q.at(-1),
      bodyStarted: !1
    };
    g.push(e), Q.push(e);
  }
  return g;
}
function innermostScope(A, I, g) {
  return A.filter((Q) => (!g || Q.type === g) && Q.start <= I && I <= Q.end).sort((Q, B) => B.start - Q.start)[0] ?? A[0];
}
function curlyDepthAt(A, I) {
  let g = 0;
  for (let Q = 0; Q < I; Q++)
    A[Q] === "{" ? g++ : A[Q] === "}" && (g = Math.max(0, g - 1));
  return g;
}
function analyze(A, I = "file:///main.lua") {
  const g = [], Q = /* @__PURE__ */ new Map(), B = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Map(), o = maskTrivia(A), e = createScopes(o), s = /^\s*---@module\s+([^\s]+)\s*$/mu.exec(A)?.[1] ?? "", D = s ? new RegExp(`\breturns+(${IDENTIFIER_SOURCE})\b`, "u").exec(o)?.[1] ?? "M" : "", r = new RegExp(
    `\\b(?:(local|global)\\s+)?function\\s+(${IDENTIFIER_SOURCE}(?:[.:]${IDENTIFIER_SOURCE})*)\\s*\\(([^)]*)\\)`,
    "gu"
  );
  for (const a of o.matchAll(r)) {
    const w = a[2], N = a.index + a[0].indexOf(w), R = a[3].split(",").map((L) => L.trim()).filter((L) => L === "..." || IDENTIFIER.test(L)), F = documentationInfoBefore(A, N), S = Math.max(w.lastIndexOf("."), w.lastIndexOf(":")), k = S >= 0 ? w.slice(0, S) : void 0, H = S >= 0 ? w.slice(S + 1) : w, m = innermostScope(
      e,
      a.index + a[0].indexOf("function"),
      "function"
    ).parent ?? e[0];
    if (addSymbol(g, A, I, w, N, {
      kind: "function",
      scope: a[1] ?? "global",
      containerName: k,
      parameters: R,
      documentation: F.documentation,
      visibilityStart: a[1] === "local" ? N : 0,
      visibilityEnd: a[1] === "local" ? m.end : A.length,
      detail: functionDetail(w, R, F)
    }), k) {
      const L = Q.get(k) ?? [];
      L.push({ name: H, symbol: g.at(-1) }), Q.set(k, L);
    }
    for (const L of R) {
      if (L === "...") continue;
      const d = a.index + a[0].lastIndexOf(L), f = innermostScope(
        e,
        a.index + a[0].indexOf("function"),
        "function"
      );
      addSymbol(g, A, I, L, d, {
        kind: "parameter",
        scope: w,
        detail: `参数 ${L}`,
        visibilityStart: d,
        visibilityEnd: f.end
      });
    }
  }
  const t = new RegExp(
    `\\b(local|global)\\s+(?!function\\b)(${IDENTIFIER_SOURCE}(?:\\s*,\\s*${IDENTIFIER_SOURCE})*)`,
    "gu"
  );
  for (const a of o.matchAll(t)) {
    let w = a.index + a[0].indexOf(a[2]);
    for (const N of a[2].split(",")) {
      const R = N.trim(), F = o.indexOf(R, w), S = innermostScope(e, F);
      addSymbol(g, A, I, R, F, {
        scope: a[1],
        detail: `${a[1]} ${R}`,
        visibilityStart: F,
        visibilityEnd: a[1] === "local" ? S.end : A.length
      });
      const k = documentationInfoBefore(A, a.index);
      k.declaredType && B.set(R, k.declaredType), w = F + R.length;
    }
  }
  const n = new RegExp(
    `\\bglobal\\s+<const>\\s+(${IDENTIFIER_SOURCE}(?:\\s*,\\s*${IDENTIFIER_SOURCE}(?:\\s*<const>)?)*)`,
    "gu"
  );
  for (const a of o.matchAll(n)) {
    let w = a.index + a[0].indexOf(a[1]);
    for (const N of a[1].split(",")) {
      const R = N.replace(/\s*<const>\s*$/u, "").trim(), F = o.indexOf(R, w);
      g.some((S) => S.name === R && S.offset === F) || addSymbol(g, A, I, R, F, {
        scope: "global",
        detail: `global <const> ${R}`,
        visibilityStart: 0,
        visibilityEnd: A.length
      }), w = F + R.length;
    }
  }
  const y = new RegExp(
    `\\b(?:(local|global)\\s+)?(${IDENTIFIER_SOURCE}(?:[.:]${IDENTIFIER_SOURCE})*)\\s*=\\s*function\\s*\\(([^)]*)\\)`,
    "gu"
  );
  for (const a of o.matchAll(y)) {
    if (curlyDepthAt(o, a.index) > 0) continue;
    const w = a[2], N = a.index + a[0].indexOf(w), R = a[3].split(",").map((d) => d.trim()).filter((d) => d === "..." || IDENTIFIER.test(d)), F = documentationInfoBefore(A, N), S = Math.max(w.lastIndexOf("."), w.lastIndexOf(":")), k = S >= 0 ? w.slice(0, S) : void 0, H = S >= 0 ? w.slice(S + 1) : w;
    let G = g.find((d) => d.name === w && d.offset === N);
    if (G ? (G.kind = "function", G.parameters = R, G.detail = functionDetail(w, R, F), G.documentation = F.documentation, G.containerName = k) : (addSymbol(g, A, I, w, N, {
      kind: "function",
      scope: a[1] ?? (k ? "member" : "global"),
      containerName: k,
      parameters: R,
      documentation: F.documentation,
      detail: functionDetail(w, R, F)
    }), G = g.at(-1)), k) {
      const d = Q.get(k) ?? [];
      d.some((f) => f.name === H) || d.push({ name: H, symbol: G }), Q.set(k, d);
    }
    const m = a.index + a[0].indexOf("function"), L = innermostScope(e, m, "function");
    for (const d of R) {
      if (d === "...") continue;
      const f = a.index + a[0].lastIndexOf(d);
      addSymbol(g, A, I, d, f, {
        kind: "parameter",
        scope: w,
        detail: `参数 ${d}`,
        visibilityStart: f,
        visibilityEnd: L.end
      });
    }
  }
  const M = new RegExp(
    `\\b(?:(?:local|global)\\s+)?(${IDENTIFIER_SOURCE})\\s*=\\s*\\{`,
    "gu"
  );
  for (const a of o.matchAll(M)) {
    const w = a[1], N = documentationInfoBefore(A, a.index);
    N.declaredType && (B.delete(w), B.set(N.declaredType, w));
    const R = a.index + a[0].lastIndexOf("{");
    let F = R + 1, S = 1;
    for (; F < o.length && S > 0; )
      o[F] === "{" ? S++ : o[F] === "}" && S--, F++;
    if (S !== 0) continue;
    const k = o.slice(R + 1, F - 1), H = new RegExp(
      `(?:^|[,;])\\s*(${IDENTIFIER_SOURCE})\\s*=`,
      "gu"
    );
    for (const G of k.matchAll(H)) {
      if ([...k.slice(0, G.index)].reduce((u, X) => X === "{" ? u + 1 : X === "}" ? u - 1 : u, 0) !== 0) continue;
      const d = G[1], f = R + 1 + G.index + G[0].lastIndexOf(d), v = o.slice(f + d.length).replace(/^\s*=\s*/u, ""), q = /^function\s*\(([^)]*)\)/u.exec(v), T = q ? q[1].split(",").map((u) => u.trim()).filter((u) => u === "..." || IDENTIFIER.test(u)) : [], x = Q.get(w) ?? [];
      x.some((u) => u.name === d) || (addSymbol(g, A, I, `${w}.${d}`, f, {
        kind: q ? "function" : "field",
        scope: "member",
        containerName: w,
        parameters: T,
        detail: q ? `function ${w}.${d}(${T.join(", ")})` : `${w}.${d}`
      }), x.push({ name: d, symbol: g.at(-1) }), Q.set(w, x));
    }
    for (const G of N.fields) {
      const m = Q.get(w) ?? [];
      m.some((L) => L.name === G.name) || (addSymbol(
        g,
        A,
        I,
        `${w}.${G.name}`,
        a.index + a[0].indexOf(w),
        {
          kind: "field",
          scope: "member",
          containerName: w,
          documentation: G.description,
          detail: `${w}.${G.name}: ${G.type}`
        }
      ), m.push({ name: G.name, symbol: g.at(-1) }), Q.set(w, m));
    }
  }
  const U = new RegExp(
    `\\bfor\\s+(${IDENTIFIER_SOURCE}(?:\\s*,\\s*${IDENTIFIER_SOURCE})*)\\s*(?:=|\\bin\\b)`,
    "gu"
  );
  for (const a of o.matchAll(U)) {
    const w = innermostScope(e, a.index, "for");
    let N = a.index + a[0].indexOf(a[1]);
    for (const R of a[1].split(",")) {
      const F = R.trim(), S = o.indexOf(F, N);
      addSymbol(g, A, I, F, S, {
        kind: "variable",
        scope: "for",
        detail: `循环变量 ${F}`,
        visibilityStart: S,
        visibilityEnd: w.end
      }), N = S + F.length;
    }
  }
  const c = new RegExp(
    `\\b(${IDENTIFIER_SOURCE}(?:\\.${IDENTIFIER_SOURCE})*)[.:](${IDENTIFIER_SOURCE})\\s*=`,
    "gu"
  );
  for (const a of o.matchAll(c)) {
    const w = a[1], N = a[2], R = a.index + a[0].lastIndexOf(N), F = Q.get(w) ?? [];
    F.some((S) => S.name === N) || (addSymbol(g, A, I, `${w}.${N}`, R, {
      kind: "field",
      scope: "member",
      containerName: w,
      detail: `${w}.${N}`
    }), F.push({ name: N, symbol: g.at(-1) }), Q.set(w, F));
  }
  const l = new RegExp(
    `\\b(?:(?:local|global)\\s+)?(${IDENTIFIER_SOURCE})\\s*=\\s*(${IDENTIFIER_SOURCE}(?:\\.${IDENTIFIER_SOURCE})*)\\b`,
    "gu"
  );
  for (const a of o.matchAll(l))
    /^\s*\(/u.test(o.slice(a.index + a[0].length)) || a[1] !== a[2] && !LUA_KEYWORDS.includes(a[2]) && B.set(a[1], a[2]);
  const h = new RegExp(
    `\\b(?:local\\s+|global\\s+)?(${IDENTIFIER_SOURCE})\\s*=\\s*require\\s*\\(\\s*(['"])([^'"]+)\\2\\s*\\)`,
    "gu"
  );
  for (const a of A.matchAll(h)) {
    const w = a.index + a[0].indexOf("require");
    o.slice(w, w + 7) === "require" && B.set(a[1], `@module:${a[3]}::`);
  }
  for (const a of o.matchAll(IDENTIFIER_GLOBAL))
    addOccurrence(
      E,
      a[0],
      rangeAt(A, a.index, a[0].length),
      a.index
    );
  const _ = [];
  o.split(`
`).forEach((a, w) => {
    const N = /(?:^|[^A-Za-z0-9_])(?:0[bB][01]+|\d+(?:ULL|LL|i)\b)/.exec(a);
    N && _.push({
      startLineNumber: w + 1,
      startColumn: N.index + 1,
      endLineNumber: w + 1,
      endColumn: N.index + N[0].length + 1,
      severity: 8,
      source: "Lua 5.5.1 语义分析",
      message: "Lua 5.5.1 不支持 LuaJIT 数字后缀或二进制数字。"
    });
  });
  const Y = /* @__PURE__ */ new Set([
    ...LUA_KEYWORDS,
    ...Object.keys(LUA_STDLIB).map((a) => a.split(".")[0]),
    "_G",
    "_VERSION",
    "coroutine",
    "debug",
    "io",
    "math",
    "os",
    "package",
    "string",
    "table",
    "utf8",
    "js",
    "vfs"
  ]), J = new RegExp(
    `^(\\s*)(${IDENTIFIER_SOURCE})\\s*=(?!=)`,
    "gmu"
  );
  for (const a of o.matchAll(J)) {
    const w = a[2], N = a.index + a[0].indexOf(w);
    !g.some((F) => F.name.split(/[.:]/).at(-1) === w && F.visibilityStart <= N && N <= F.visibilityEnd) && !Y.has(w) && _.push({
      startLineNumber: rangeAt(A, N, w.length).startLineNumber,
      startColumn: rangeAt(A, N, w.length).startColumn,
      endLineNumber: rangeAt(A, N, w.length).endLineNumber,
      endColumn: rangeAt(A, N, w.length).endColumn,
      severity: 4,
      source: "Lua 5.5.1 语义分析",
      code: "undeclared-global",
      message: `全局变量 '${w}' 未声明；Lua 5.5 可使用 global 声明。`
    });
  }
  return {
    uri: I,
    source: A,
    masked: o,
    symbols: g,
    members: Q,
    aliases: B,
    occurrences: E,
    diagnostics: _,
    scopes: e,
    moduleName: s,
    moduleRoot: D
  };
}
const SNIPPETS = [
  {
    label: "local function",
    kind: "snippet",
    detail: "局部函数",
    insertText: "local function ${1:name}(${2:args})\n	${0}\nend",
    snippet: !0
  },
  {
    label: "function",
    kind: "snippet",
    detail: "函数声明",
    insertText: "function ${1:name}(${2:args})\n	${0}\nend",
    snippet: !0
  },
  {
    label: "if",
    kind: "snippet",
    detail: "条件分支",
    insertText: "if ${1:condition} then\n	${0}\nend",
    snippet: !0
  },
  {
    label: "fori",
    kind: "snippet",
    detail: "数值 for 循环",
    insertText: "for ${1:i} = ${2:1}, ${3:10} do\n	${0}\nend",
    snippet: !0
  },
  {
    label: "forp",
    kind: "snippet",
    detail: "pairs 遍历",
    insertText: "for ${1:key}, ${2:value} in pairs(${3:table}) do\n	${0}\nend",
    snippet: !0
  },
  {
    label: "while",
    kind: "snippet",
    detail: "while 循环",
    insertText: "while ${1:condition} do\n	${0}\nend",
    snippet: !0
  }
];
function stdlibCompletion(A, I, g = !1) {
  const Q = g ? A.split(".").at(-1) : A, B = I.signature.indexOf("("), E = I.signature.lastIndexOf(")"), o = B >= 0 && E > B ? I.signature.slice(B + 1, E).match(
    /(?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*|\.\.\./gu
  ) ?? [] : null, e = o ? `${Q}(${o.map((D, r) => `\${${r + 1}:${D === "..." ? "…" : D}}`).join(", ")})` : null, s = {
    label: Q,
    filterText: Q,
    sortText: g ? "1-" + A : "2-" + A,
    kind: A.includes(".") ? "method" : "function",
    detail: I.signature,
    documentation: I.doc,
    insertText: Q,
    snippet: !1,
    preselect: !0
  };
  return e ? [s, {
    label: `${Q}(…)`,
    filterText: `调用完整函数 ${Q}`,
    sortText: s.sortText + "-call",
    kind: "snippet",
    detail: `调用 · ${I.signature}`,
    documentation: I.doc,
    insertText: e,
    snippet: !0
  }] : [s];
}
function symbolCompletion(A, I, g, Q) {
  const B = A.kind === "function" ? A.parameters ?? [] : null, E = {
    label: I,
    kind: A.kind,
    detail: A.detail,
    documentation: g,
    insertText: I,
    snippet: !1,
    preselect: A.kind === "function",
    sortText: Q
  };
  return B ? [E, {
    label: `${I}(…)`,
    filterText: `调用完整函数 ${I}`,
    kind: "snippet",
    detail: `调用 · ${A.detail}`,
    documentation: g,
    insertText: `${I}(${B.map((o, e) => `\${${e + 1}:${o === "..." ? "…" : o}}`).join(", ")})`,
    snippet: !0,
    sortText: Q + "-call"
  }] : [E];
}
function resolveAlias(A, I, g) {
  let Q = g;
  const B = /* @__PURE__ */ new Set();
  for (; !B.has(Q); ) {
    B.add(Q);
    const s = [...I?.aliases?.entries() ?? []].filter(([D]) => Q === D || Q.startsWith(D + ".")).sort((D, r) => r[0].length - D[0].length);
    if (!s.length) break;
    Q = s[0][1] + Q.slice(s[0][0].length);
  }
  const E = /^@module:(.+?)::(.*)$/u.exec(Q);
  if (!E) return { name: Q };
  const o = [...A.values()].find((s) => s.moduleName === E[1]);
  if (!o) return { name: Q };
  const e = E[2].replace(/^\./u, "");
  return {
    name: o.moduleRoot + (e ? "." + e : ""),
    uri: o.uri
  };
}
function completions(A, I, g) {
  const Q = A.get(I), B = Q?.source.slice(0, g) ?? "", E = new RegExp(
    `(${IDENTIFIER_SOURCE}(?:\\.${IDENTIFIER_SOURCE})*)[.:](${IDENTIFIER_SOURCE})?$`,
    "u"
  ).exec(B), o = [], e = /* @__PURE__ */ new Set(), s = (t) => {
    const n = `${t.label}:${t.kind}`;
    e.has(n) || (e.add(n), o.push(t));
  }, D = (t) => {
    for (const n of t) s(n);
  };
  if (E) {
    const t = E[1], n = resolveAlias(A, Q, t), y = n.name;
    for (const [M, U] of Object.entries(LUA_STDLIB))
      M.startsWith(y + ".") && D(stdlibCompletion(M, U, !0));
    for (const M of A.values())
      if (!(n.uri && M.uri !== n.uri))
        for (const U of M.members.get(y) ?? [])
          D(symbolCompletion(
            U.symbol,
            U.name,
            U.symbol.documentation || (M.uri === I ? "当前工作区成员" : "只读定义：" + M.uri),
            "0-" + U.name
          ));
    return o;
  }
  for (const t of SNIPPETS) s(t);
  for (const t of LUA_KEYWORDS)
    s({ label: t, kind: "keyword", detail: "Lua 5.5.1 关键字", sortText: "3-" + t });
  for (const [t, n] of Object.entries(LUA_STDLIB))
    t.includes(".") || D(stdlibCompletion(t, n));
  const r = new Set(Object.keys(LUA_STDLIB).filter((t) => t.includes(".")).map((t) => t.split(".")[0]));
  for (const t of r)
    s({ label: t, kind: "module", detail: "Lua 5.5 标准库", sortText: "1-" + t });
  for (const t of A.values())
    for (const n of t.symbols) {
      if (n.containerName || n.kind === "parameter" && t.uri !== I || t.uri === I && (g < n.visibilityStart || g > n.visibilityEnd)) continue;
      const y = n.name.split(/[.:]/).at(-1);
      D(symbolCompletion(
        n,
        y,
        n.documentation || (t.uri === I ? "当前文档符号" : "只读虚拟定义：" + t.uri),
        t.uri === I ? "0-" + y : "1-" + y
      ));
    }
  return o;
}
function identifierAt(A, I) {
  let g = I, Q = I;
  const B = (E) => /[A-Za-z0-9_.:\u0080-\uFFFF]/u.test(E);
  for (; g > 0 && B(A[g - 1]); ) g--;
  for (; Q < A.length && B(A[Q]); ) Q++;
  return { word: A.slice(g, Q).replace(":", "."), start: g, end: Q };
}
var __defProp = Object.defineProperty, __name = (A, I) => __defProp(A, "name", { value: I, configurable: !0 });
(class {
  static {
    __name(this, "Edit");
  }
  /** The start position of the change. */
  startPosition;
  /** The end position of the change before the edit. */
  oldEndPosition;
  /** The end position of the change after the edit. */
  newEndPosition;
  /** The start index of the change. */
  startIndex;
  /** The end index of the change before the edit. */
  oldEndIndex;
  /** The end index of the change after the edit. */
  newEndIndex;
  constructor({
    startIndex: A,
    oldEndIndex: I,
    newEndIndex: g,
    startPosition: Q,
    oldEndPosition: B,
    newEndPosition: E
  }) {
    this.startIndex = A >>> 0, this.oldEndIndex = I >>> 0, this.newEndIndex = g >>> 0, this.startPosition = Q, this.oldEndPosition = B, this.newEndPosition = E;
  }
  /**
   * Edit a point and index to keep it in-sync with source code that has been edited.
   *
   * This function updates a single point's byte offset and row/column position
   * based on an edit operation. This is useful for editing points without
   * requiring a tree or node instance.
   */
  editPoint(A, I) {
    let g = I;
    const Q = { ...A };
    if (I >= this.oldEndIndex) {
      g = this.newEndIndex + (I - this.oldEndIndex);
      const B = A.row;
      Q.row = this.newEndPosition.row + (A.row - this.oldEndPosition.row), Q.column = B === this.oldEndPosition.row ? this.newEndPosition.column + (A.column - this.oldEndPosition.column) : A.column;
    } else I > this.startIndex && (g = this.newEndIndex, Q.row = this.newEndPosition.row, Q.column = this.newEndPosition.column);
    return { point: Q, index: g };
  }
  /**
   * Edit a range to keep it in-sync with source code that has been edited.
   *
   * This function updates a range's start and end positions based on an edit
   * operation. This is useful for editing ranges without requiring a tree
   * or node instance.
   */
  editRange(A) {
    const I = {
      startIndex: A.startIndex,
      startPosition: { ...A.startPosition },
      endIndex: A.endIndex,
      endPosition: { ...A.endPosition }
    };
    return A.endIndex >= this.oldEndIndex ? A.endIndex !== Number.MAX_SAFE_INTEGER && (I.endIndex = this.newEndIndex + (A.endIndex - this.oldEndIndex), I.endPosition = {
      row: this.newEndPosition.row + (A.endPosition.row - this.oldEndPosition.row),
      column: A.endPosition.row === this.oldEndPosition.row ? this.newEndPosition.column + (A.endPosition.column - this.oldEndPosition.column) : A.endPosition.column
    }, I.endIndex < this.newEndIndex && (I.endIndex = Number.MAX_SAFE_INTEGER, I.endPosition = { row: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER })) : A.endIndex > this.startIndex && (I.endIndex = this.startIndex, I.endPosition = { ...this.startPosition }), A.startIndex >= this.oldEndIndex ? (I.startIndex = this.newEndIndex + (A.startIndex - this.oldEndIndex), I.startPosition = {
      row: this.newEndPosition.row + (A.startPosition.row - this.oldEndPosition.row),
      column: A.startPosition.row === this.oldEndPosition.row ? this.newEndPosition.column + (A.startPosition.column - this.oldEndPosition.column) : A.startPosition.column
    }, I.startIndex < this.newEndIndex && (I.startIndex = Number.MAX_SAFE_INTEGER, I.startPosition = { row: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER })) : A.startIndex > this.startIndex && (I.startIndex = this.startIndex, I.startPosition = { ...this.startPosition }), I;
  }
});
var SIZE_OF_SHORT = 2, SIZE_OF_INT = 4, SIZE_OF_CURSOR = 4 * SIZE_OF_INT, SIZE_OF_NODE = 5 * SIZE_OF_INT, SIZE_OF_POINT = 2 * SIZE_OF_INT, SIZE_OF_RANGE = 2 * SIZE_OF_INT + 2 * SIZE_OF_POINT, ZERO_POINT = { row: 0, column: 0 }, INTERNAL = /* @__PURE__ */ Symbol("INTERNAL");
function assertInternal(A) {
  if (A !== INTERNAL) throw new Error("Illegal constructor");
}
__name(assertInternal, "assertInternal");
function isPoint(A) {
  return !!A && typeof A.row == "number" && typeof A.column == "number";
}
__name(isPoint, "isPoint");
function setModule(A) {
  C = A;
}
__name(setModule, "setModule");
var C;
function newFinalizer(A) {
  try {
    return new FinalizationRegistry(A);
  } catch (I) {
    console.error("Unsupported FinalizationRegistry:", I);
    return;
  }
}
__name(newFinalizer, "newFinalizer");
var finalizer = newFinalizer((A) => {
  C._ts_lookahead_iterator_delete(A);
}), LookaheadIterator = class {
  static {
    __name(this, "LookaheadIterator");
  }
  /** @internal */
  0 = 0;
  // Internal handle for Wasm
  /** @internal */
  language;
  /** @internal */
  positioned = !1;
  /** @internal */
  constructor(A, I, g) {
    assertInternal(A), this[0] = I, this.language = g, finalizer?.register(this, I, this);
  }
  /**
   * Get the current symbol of the lookahead iterator.
   *
   * Returns `null` if the iterator is not positioned on a symbol:
   *
   * - Before the first iteration step
   * - After the iterator is exhausted
   * - After a {@link reset} or {@link resetState} call
   */
  get currentTypeId() {
    return this.positioned ? C._ts_lookahead_iterator_current_symbol(this[0]) : null;
  }
  /**
   * Get the current symbol name of the lookahead iterator.
   *
   * Returns `null` if the iterator is not positioned on a symbol.
   */
  get currentType() {
    const A = this.currentTypeId;
    return A === null ? null : this.language.types[A] ?? C.UTF8ToString(C._ts_language_symbol_name(this.language[0], A));
  }
  /** Delete the lookahead iterator, freeing its resources. */
  delete() {
    finalizer?.unregister(this), C._ts_lookahead_iterator_delete(this[0]), this[0] = 0;
  }
  /**
   * Reset the lookahead iterator.
   *
   * This returns `true` if the language was set successfully and `false`
   * otherwise.
   */
  reset(A, I) {
    return C._ts_lookahead_iterator_reset(this[0], A[0], I) ? (this.language = A, this.positioned = !1, !0) : !1;
  }
  /**
   * Reset the lookahead iterator to another state.
   *
   * This returns `true` if the iterator was reset to the given state and
   * `false` otherwise.
   */
  resetState(A) {
    return C._ts_lookahead_iterator_reset_state(this[0], A) ? (this.positioned = !1, !0) : !1;
  }
  /**
   * Returns an iterator that iterates over the symbols of the lookahead iterator.
   *
   * The iterator will yield the current symbol name as a string for each step
   * until there are no more symbols to iterate over.
   */
  [Symbol.iterator]() {
    return {
      next: /* @__PURE__ */ __name(() => {
        this.positioned = !!C._ts_lookahead_iterator_next(this[0]);
        const A = this.currentType;
        return A === null ? { done: !0, value: "" } : { done: !1, value: A };
      }, "next")
    };
  }
};
function getText(A, I, g, Q) {
  const B = g - I;
  let E = A.textCallback(I, Q);
  if (E) {
    for (I += E.length; I < g; ) {
      const o = A.textCallback(I, Q);
      if (o && o.length > 0)
        I += o.length, E += o;
      else
        break;
    }
    I > g && (E = E.slice(0, B));
  }
  return E ?? "";
}
__name(getText, "getText");
var finalizer2 = newFinalizer((A) => {
  C._ts_tree_delete(A);
}), Tree = class b {
  static {
    __name(this, "Tree");
  }
  /** @internal */
  0 = 0;
  // Internal handle for Wasm
  /** @internal */
  textCallback;
  /** The language that was used to parse the syntax tree. */
  language;
  /** @internal */
  constructor(I, g, Q, B) {
    assertInternal(I), this[0] = g, this.language = Q, this.textCallback = B, finalizer2?.register(this, g, this);
  }
  /** Create a shallow copy of the syntax tree. This is very fast. */
  copy() {
    const I = C._ts_tree_copy(this[0]);
    return new b(INTERNAL, I, this.language, this.textCallback);
  }
  /** Delete the syntax tree, freeing its resources. */
  delete() {
    finalizer2?.unregister(this), C._ts_tree_delete(this[0]), this[0] = 0;
  }
  /** Get the root node of the syntax tree. */
  get rootNode() {
    return C._ts_tree_root_node_wasm(this[0]), unmarshalNode(this);
  }
  /**
   * Get the root node of the syntax tree, but with its position shifted
   * forward by the given offset.
   */
  rootNodeWithOffset(I, g) {
    const Q = TRANSFER_BUFFER + SIZE_OF_NODE;
    return C.setValue(Q, I, "i32"), marshalPoint(Q + SIZE_OF_INT, g), C._ts_tree_root_node_with_offset_wasm(this[0]), unmarshalNode(this);
  }
  /**
   * Edit the syntax tree to keep it in sync with source code that has been
   * edited.
   *
   * You must describe the edit both in terms of byte offsets and in terms of
   * row/column coordinates.
   */
  edit(I) {
    marshalEdit(I), C._ts_tree_edit_wasm(this[0]);
  }
  /** Create a new {@link TreeCursor} starting from the root of the tree. */
  walk() {
    return this.rootNode.walk();
  }
  /**
   * Compare this old edited syntax tree to a new syntax tree representing
   * the same document, returning a sequence of ranges whose syntactic
   * structure has changed.
   *
   * For this to work correctly, this syntax tree must have been edited such
   * that its ranges match up to the new tree. Generally, you'll want to
   * call this method right after calling one of the [`Parser::parse`]
   * functions. Call it on the old tree that was passed to parse, and
   * pass the new tree that was returned from `parse`.
   */
  getChangedRanges(I) {
    if (!(I instanceof b))
      throw new TypeError("Argument must be a Tree");
    C._ts_tree_get_changed_ranges_wasm(this[0], I[0]);
    const g = C.getValue(TRANSFER_BUFFER, "i32"), Q = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), B = new Array(g);
    if (g > 0) {
      let E = Q;
      for (let o = 0; o < g; o++)
        B[o] = unmarshalRange(E), E += SIZE_OF_RANGE;
      C._free(Q);
    }
    return B;
  }
  /** Get the included ranges that were used to parse the syntax tree. */
  getIncludedRanges() {
    C._ts_tree_included_ranges_wasm(this[0]);
    const I = C.getValue(TRANSFER_BUFFER, "i32"), g = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), Q = new Array(I);
    if (I > 0) {
      let B = g;
      for (let E = 0; E < I; E++)
        Q[E] = unmarshalRange(B), B += SIZE_OF_RANGE;
      C._free(g);
    }
    return Q;
  }
}, finalizer3 = newFinalizer((A) => {
  C._ts_tree_cursor_delete_wasm(A);
}), TreeCursor = class j {
  static {
    __name(this, "TreeCursor");
  }
  /** @internal */
  // @ts-expect-error: never read
  0 = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  1 = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  2 = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  3 = 0;
  // Internal handle for Wasm
  /** @internal */
  tree;
  /** @internal */
  constructor(I, g) {
    assertInternal(I), this.tree = g, unmarshalTreeCursor(this), finalizer3?.register(this, this.tree[0], this);
  }
  /** Creates a deep copy of the tree cursor. This allocates new memory. */
  copy() {
    const I = new j(INTERNAL, this.tree);
    return C._ts_tree_cursor_copy_wasm(this.tree[0]), unmarshalTreeCursor(I), I;
  }
  /** Delete the tree cursor, freeing its resources. */
  delete() {
    finalizer3?.unregister(this), marshalTreeCursor(this), C._ts_tree_cursor_delete_wasm(this.tree[0]), this[0] = this[1] = this[2] = 0;
  }
  /** Get the tree cursor's current {@link Node}. */
  get currentNode() {
    return marshalTreeCursor(this), C._ts_tree_cursor_current_node_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /**
   * Get the numerical field id of this tree cursor's current node.
   *
   * See also {@link TreeCursor#currentFieldName}.
   */
  get currentFieldId() {
    return marshalTreeCursor(this), C._ts_tree_cursor_current_field_id_wasm(this.tree[0]);
  }
  /** Get the field name of this tree cursor's current node. */
  get currentFieldName() {
    return this.tree.language.fields[this.currentFieldId];
  }
  /**
   * Get the depth of the cursor's current node relative to the original
   * node that the cursor was constructed with.
   */
  get currentDepth() {
    return marshalTreeCursor(this), C._ts_tree_cursor_current_depth_wasm(this.tree[0]);
  }
  /**
   * Get the index of the cursor's current node out of all of the
   * descendants of the original node that the cursor was constructed with.
   */
  get currentDescendantIndex() {
    return marshalTreeCursor(this), C._ts_tree_cursor_current_descendant_index_wasm(this.tree[0]);
  }
  /** Get the type of the cursor's current node. */
  get nodeType() {
    return this.tree.language.types[this.nodeTypeId] || "ERROR";
  }
  /** Get the type id of the cursor's current node. */
  get nodeTypeId() {
    return marshalTreeCursor(this), C._ts_tree_cursor_current_node_type_id_wasm(this.tree[0]);
  }
  /** Get the state id of the cursor's current node. */
  get nodeStateId() {
    return marshalTreeCursor(this), C._ts_tree_cursor_current_node_state_id_wasm(this.tree[0]);
  }
  /** Get the id of the cursor's current node. */
  get nodeId() {
    return marshalTreeCursor(this), C._ts_tree_cursor_current_node_id_wasm(this.tree[0]);
  }
  /**
   * Check if the cursor's current node is *named*.
   *
   * Named nodes correspond to named rules in the grammar, whereas
   * *anonymous* nodes correspond to string literals in the grammar.
   */
  get nodeIsNamed() {
    return marshalTreeCursor(this), C._ts_tree_cursor_current_node_is_named_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if the cursor's current node is *missing*.
   *
   * Missing nodes are inserted by the parser in order to recover from
   * certain kinds of syntax errors.
   */
  get nodeIsMissing() {
    return marshalTreeCursor(this), C._ts_tree_cursor_current_node_is_missing_wasm(this.tree[0]) === 1;
  }
  /** Get the string content of the cursor's current node. */
  get nodeText() {
    marshalTreeCursor(this);
    const I = C._ts_tree_cursor_start_index_wasm(this.tree[0]), g = C._ts_tree_cursor_end_index_wasm(this.tree[0]);
    C._ts_tree_cursor_start_position_wasm(this.tree[0]);
    const Q = unmarshalPoint(TRANSFER_BUFFER);
    return getText(this.tree, I, g, Q);
  }
  /** Get the start position of the cursor's current node. */
  get startPosition() {
    return marshalTreeCursor(this), C._ts_tree_cursor_start_position_wasm(this.tree[0]), unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the end position of the cursor's current node. */
  get endPosition() {
    return marshalTreeCursor(this), C._ts_tree_cursor_end_position_wasm(this.tree[0]), unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the start index of the cursor's current node. */
  get startIndex() {
    return marshalTreeCursor(this), C._ts_tree_cursor_start_index_wasm(this.tree[0]);
  }
  /** Get the end index of the cursor's current node. */
  get endIndex() {
    return marshalTreeCursor(this), C._ts_tree_cursor_end_index_wasm(this.tree[0]);
  }
  /**
   * Move this cursor to the first child of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there were no children.
   */
  gotoFirstChild() {
    marshalTreeCursor(this);
    const I = C._ts_tree_cursor_goto_first_child_wasm(this.tree[0]);
    return unmarshalTreeCursor(this), I === 1;
  }
  /**
   * Move this cursor to the last child of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there were no children.
   *
   * Note that this function may be slower than
   * {@link TreeCursor#gotoFirstChild} because it needs to
   * iterate through all the children to compute the child's position.
   */
  gotoLastChild() {
    marshalTreeCursor(this);
    const I = C._ts_tree_cursor_goto_last_child_wasm(this.tree[0]);
    return unmarshalTreeCursor(this), I === 1;
  }
  /**
   * Move this cursor to the parent of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no parent node (the cursor was already on the
   * root node).
   *
   * Note that the node the cursor was constructed with is considered the root
   * of the cursor, and the cursor cannot walk outside this node.
   */
  gotoParent() {
    marshalTreeCursor(this);
    const I = C._ts_tree_cursor_goto_parent_wasm(this.tree[0]);
    return unmarshalTreeCursor(this), I === 1;
  }
  /**
   * Move this cursor to the next sibling of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no next sibling node.
   *
   * Note that the node the cursor was constructed with is considered the root
   * of the cursor, and the cursor cannot walk outside this node.
   */
  gotoNextSibling() {
    marshalTreeCursor(this);
    const I = C._ts_tree_cursor_goto_next_sibling_wasm(this.tree[0]);
    return unmarshalTreeCursor(this), I === 1;
  }
  /**
   * Move this cursor to the previous sibling of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no previous sibling node.
   *
   * Note that this function may be slower than
   * {@link TreeCursor#gotoNextSibling} due to how node
   * positions are stored. In the worst case, this will need to iterate
   * through all the children up to the previous sibling node to recalculate
   * its position. Also note that the node the cursor was constructed with is
   * considered the root of the cursor, and the cursor cannot walk outside this node.
   */
  gotoPreviousSibling() {
    marshalTreeCursor(this);
    const I = C._ts_tree_cursor_goto_previous_sibling_wasm(this.tree[0]);
    return unmarshalTreeCursor(this), I === 1;
  }
  /**
   * Move the cursor to the node that is the nth descendant of
   * the original node that the cursor was constructed with, where
   * zero represents the original node itself.
   */
  gotoDescendant(I) {
    marshalTreeCursor(this), C._ts_tree_cursor_goto_descendant_wasm(this.tree[0], I), unmarshalTreeCursor(this);
  }
  /**
   * Move this cursor to the first child of its current node that contains or
   * starts after the given byte offset.
   *
   * This returns `true` if the cursor successfully moved to a child node, and returns
   * `false` if no such child was found.
   */
  gotoFirstChildForIndex(I) {
    marshalTreeCursor(this), C.setValue(TRANSFER_BUFFER + SIZE_OF_CURSOR, I, "i32");
    const g = C._ts_tree_cursor_goto_first_child_for_index_wasm(this.tree[0]);
    return unmarshalTreeCursor(this), g === 1;
  }
  /**
   * Move this cursor to the first child of its current node that contains or
   * starts after the given byte offset.
   *
   * This returns the index of the child node if one was found, and returns
   * `null` if no such child was found.
   */
  gotoFirstChildForPosition(I) {
    marshalTreeCursor(this), marshalPoint(TRANSFER_BUFFER + SIZE_OF_CURSOR, I);
    const g = C._ts_tree_cursor_goto_first_child_for_position_wasm(this.tree[0]);
    return unmarshalTreeCursor(this), g === 1;
  }
  /**
   * Re-initialize this tree cursor to start at the original node that the
   * cursor was constructed with.
   */
  reset(I) {
    marshalNode(I), marshalTreeCursor(this, TRANSFER_BUFFER + SIZE_OF_NODE), C._ts_tree_cursor_reset_wasm(this.tree[0]), unmarshalTreeCursor(this);
  }
  /**
   * Re-initialize a tree cursor to the same position as another cursor.
   *
   * Unlike {@link TreeCursor#reset}, this will not lose parent
   * information and allows reusing already created cursors.
   */
  resetTo(I) {
    marshalTreeCursor(this, TRANSFER_BUFFER), marshalTreeCursor(I, TRANSFER_BUFFER + SIZE_OF_CURSOR), C._ts_tree_cursor_reset_to_wasm(this.tree[0], I.tree[0]), unmarshalTreeCursor(this);
  }
}, Node = class {
  static {
    __name(this, "Node");
  }
  /** @internal */
  // @ts-expect-error: never read
  0 = 0;
  // Internal handle for Wasm
  /** @internal */
  _children;
  /** @internal */
  _namedChildren;
  /** @internal */
  constructor(A, {
    id: I,
    tree: g,
    startIndex: Q,
    startPosition: B,
    other: E
  }) {
    assertInternal(A), this[0] = E, this.id = I, this.tree = g, this.startIndex = Q, this.startPosition = B;
  }
  /**
   * The numeric id for this node that is unique.
   *
   * Within a given syntax tree, no two nodes have the same id. However:
   *
   * * If a new tree is created based on an older tree, and a node from the old tree is reused in
   *   the process, then that node will have the same id in both trees.
   *
   * * A node not marked as having changes does not guarantee it was reused.
   *
   * * If a node is marked as having changed in the old tree, it will not be reused.
   */
  id;
  /** The byte index where this node starts. */
  startIndex;
  /** The position where this node starts. */
  startPosition;
  /** The tree that this node belongs to. */
  tree;
  /** Get this node's type as a numerical id. */
  get typeId() {
    return marshalNode(this), C._ts_node_symbol_wasm(this.tree[0]);
  }
  /**
   * Get the node's type as a numerical id as it appears in the grammar,
   * ignoring aliases.
   */
  get grammarId() {
    return marshalNode(this), C._ts_node_grammar_symbol_wasm(this.tree[0]);
  }
  /** Get this node's type as a string. */
  get type() {
    return this.tree.language.types[this.typeId] || "ERROR";
  }
  /**
   * Get this node's symbol name as it appears in the grammar, ignoring
   * aliases as a string.
   */
  get grammarType() {
    return this.tree.language.types[this.grammarId] || "ERROR";
  }
  /**
   * Check if this node is *named*.
   *
   * Named nodes correspond to named rules in the grammar, whereas
   * *anonymous* nodes correspond to string literals in the grammar.
   */
  get isNamed() {
    return marshalNode(this), C._ts_node_is_named_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node is *extra*.
   *
   * Extra nodes represent things like comments, which are not required
   * by the grammar, but can appear anywhere.
   */
  get isExtra() {
    return marshalNode(this), C._ts_node_is_extra_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node represents a syntax error.
   *
   * Syntax errors represent parts of the code that could not be incorporated
   * into a valid syntax tree.
   */
  get isError() {
    return marshalNode(this), C._ts_node_is_error_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node is *missing*.
   *
   * Missing nodes are inserted by the parser in order to recover from
   * certain kinds of syntax errors.
   */
  get isMissing() {
    return marshalNode(this), C._ts_node_is_missing_wasm(this.tree[0]) === 1;
  }
  /** Check if this node has been edited. */
  get hasChanges() {
    return marshalNode(this), C._ts_node_has_changes_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node represents a syntax error or contains any syntax
   * errors anywhere within it.
   */
  get hasError() {
    return marshalNode(this), C._ts_node_has_error_wasm(this.tree[0]) === 1;
  }
  /** Get the byte index where this node ends. */
  get endIndex() {
    return marshalNode(this), C._ts_node_end_index_wasm(this.tree[0]);
  }
  /** Get the position where this node ends. */
  get endPosition() {
    return marshalNode(this), C._ts_node_end_point_wasm(this.tree[0]), unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the string content of this node. */
  get text() {
    return getText(this.tree, this.startIndex, this.endIndex, this.startPosition);
  }
  /** Get this node's parse state. */
  get parseState() {
    return marshalNode(this), C._ts_node_parse_state_wasm(this.tree[0]);
  }
  /** Get the parse state after this node. */
  get nextParseState() {
    return marshalNode(this), C._ts_node_next_parse_state_wasm(this.tree[0]);
  }
  /** Check if this node is equal to another node. */
  equals(A) {
    return this.tree === A.tree && this.id === A.id;
  }
  /**
   * Get the node's child at the given index, where zero represents the first child.
   *
   * This method is fairly fast, but its cost is technically log(n), so if
   * you might be iterating over a long list of children, you should use
   * {@link Node#children} instead.
   */
  child(A) {
    return marshalNode(this), C._ts_node_child_wasm(this.tree[0], A), unmarshalNode(this.tree);
  }
  /**
   * Get this node's *named* child at the given index.
   *
   * See also {@link Node#isNamed}.
   * This method is fairly fast, but its cost is technically log(n), so if
   * you might be iterating over a long list of children, you should use
   * {@link Node#namedChildren} instead.
   */
  namedChild(A) {
    return marshalNode(this), C._ts_node_named_child_wasm(this.tree[0], A), unmarshalNode(this.tree);
  }
  /**
   * Get this node's child with the given numerical field id.
   *
   * See also {@link Node#childForFieldName}. You can
   * convert a field name to an id using {@link Language#fieldIdForName}.
   */
  childForFieldId(A) {
    return marshalNode(this), C._ts_node_child_by_field_id_wasm(this.tree[0], A), unmarshalNode(this.tree);
  }
  /**
   * Get the first child with the given field name.
   *
   * If multiple children may have the same field name, access them using
   * {@link Node#childrenForFieldName}.
   */
  childForFieldName(A) {
    const I = this.tree.language.fields.indexOf(A);
    return I !== -1 ? this.childForFieldId(I) : null;
  }
  /** Get the field name of this node's child at the given index. */
  fieldNameForChild(A) {
    marshalNode(this);
    const I = C._ts_node_field_name_for_child_wasm(this.tree[0], A);
    return I ? C.AsciiToString(I) : null;
  }
  /** Get the field name of this node's named child at the given index. */
  fieldNameForNamedChild(A) {
    marshalNode(this);
    const I = C._ts_node_field_name_for_named_child_wasm(this.tree[0], A);
    return I ? C.AsciiToString(I) : null;
  }
  /**
   * Get an array of this node's children with a given field name.
   *
   * See also {@link Node#children}.
   */
  childrenForFieldName(A) {
    const I = this.tree.language.fields.indexOf(A);
    return I !== -1 && I !== 0 ? this.childrenForFieldId(I) : [];
  }
  /**
    * Get an array of this node's children with a given field id.
    *
    * See also {@link Node#childrenForFieldName}.
    */
  childrenForFieldId(A) {
    marshalNode(this), C._ts_node_children_by_field_id_wasm(this.tree[0], A);
    const I = C.getValue(TRANSFER_BUFFER, "i32"), g = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), Q = new Array(I);
    if (I > 0) {
      let B = g;
      for (let E = 0; E < I; E++)
        Q[E] = unmarshalNode(this.tree, B), B += SIZE_OF_NODE;
      C._free(g);
    }
    return Q;
  }
  /** Get the node's first child that contains or starts after the given byte offset. */
  firstChildForIndex(A) {
    marshalNode(this);
    const I = TRANSFER_BUFFER + SIZE_OF_NODE;
    return C.setValue(I, A, "i32"), C._ts_node_first_child_for_byte_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /** Get the node's first named child that contains or starts after the given byte offset. */
  firstNamedChildForIndex(A) {
    marshalNode(this);
    const I = TRANSFER_BUFFER + SIZE_OF_NODE;
    return C.setValue(I, A, "i32"), C._ts_node_first_named_child_for_byte_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /** Get this node's number of children. */
  get childCount() {
    return marshalNode(this), C._ts_node_child_count_wasm(this.tree[0]);
  }
  /**
   * Get this node's number of *named* children.
   *
   * See also {@link Node#isNamed}.
   */
  get namedChildCount() {
    return marshalNode(this), C._ts_node_named_child_count_wasm(this.tree[0]);
  }
  /** Get this node's first child. */
  get firstChild() {
    return this.child(0);
  }
  /**
   * Get this node's first named child.
   *
   * See also {@link Node#isNamed}.
   */
  get firstNamedChild() {
    return this.namedChild(0);
  }
  /** Get this node's last child. */
  get lastChild() {
    return this.child(this.childCount - 1);
  }
  /**
   * Get this node's last named child.
   *
   * See also {@link Node#isNamed}.
   */
  get lastNamedChild() {
    return this.namedChild(this.namedChildCount - 1);
  }
  /**
   * Iterate over this node's children.
   *
   * If you're walking the tree recursively, you may want to use the
   * {@link TreeCursor} APIs directly instead.
   */
  get children() {
    if (!this._children) {
      marshalNode(this), C._ts_node_children_wasm(this.tree[0]);
      const A = C.getValue(TRANSFER_BUFFER, "i32"), I = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      if (this._children = new Array(A), A > 0) {
        let g = I;
        for (let Q = 0; Q < A; Q++)
          this._children[Q] = unmarshalNode(this.tree, g), g += SIZE_OF_NODE;
        C._free(I);
      }
    }
    return this._children;
  }
  /**
   * Iterate over this node's named children.
   *
   * See also {@link Node#children}.
   */
  get namedChildren() {
    if (!this._namedChildren) {
      marshalNode(this), C._ts_node_named_children_wasm(this.tree[0]);
      const A = C.getValue(TRANSFER_BUFFER, "i32"), I = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      if (this._namedChildren = new Array(A), A > 0) {
        let g = I;
        for (let Q = 0; Q < A; Q++)
          this._namedChildren[Q] = unmarshalNode(this.tree, g), g += SIZE_OF_NODE;
        C._free(I);
      }
    }
    return this._namedChildren;
  }
  /**
   * Get the descendants of this node that are the given type, or in the given types array.
   *
   * The types array should contain node type strings, which can be retrieved from {@link Language#types}.
   *
   * Additionally, a `startPosition` and `endPosition` can be passed in to restrict the search to a byte range.
   */
  descendantsOfType(A, I = ZERO_POINT, g = ZERO_POINT) {
    Array.isArray(A) || (A = [A]);
    const Q = [], B = this.tree.language.types;
    for (const D of A)
      D == "ERROR" && Q.push(65535);
    for (let D = 0, r = B.length; D < r; D++)
      A.includes(B[D]) && Q.push(D);
    const E = C._malloc(SIZE_OF_INT * Q.length);
    for (let D = 0, r = Q.length; D < r; D++)
      C.setValue(E + D * SIZE_OF_INT, Q[D], "i32");
    marshalNode(this), C._ts_node_descendants_of_type_wasm(
      this.tree[0],
      E,
      Q.length,
      I.row,
      I.column,
      g.row,
      g.column
    );
    const o = C.getValue(TRANSFER_BUFFER, "i32"), e = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), s = new Array(o);
    if (o > 0) {
      let D = e;
      for (let r = 0; r < o; r++)
        s[r] = unmarshalNode(this.tree, D), D += SIZE_OF_NODE;
    }
    return C._free(e), C._free(E), s;
  }
  /** Get this node's next sibling. */
  get nextSibling() {
    return marshalNode(this), C._ts_node_next_sibling_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /** Get this node's previous sibling. */
  get previousSibling() {
    return marshalNode(this), C._ts_node_prev_sibling_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /**
   * Get this node's next *named* sibling.
   *
   * See also {@link Node#isNamed}.
   */
  get nextNamedSibling() {
    return marshalNode(this), C._ts_node_next_named_sibling_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /**
   * Get this node's previous *named* sibling.
   *
   * See also {@link Node#isNamed}.
   */
  get previousNamedSibling() {
    return marshalNode(this), C._ts_node_prev_named_sibling_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /** Get the node's number of descendants, including one for the node itself. */
  get descendantCount() {
    return marshalNode(this), C._ts_node_descendant_count_wasm(this.tree[0]);
  }
  /**
   * Get this node's immediate parent.
   * Prefer {@link Node#childWithDescendant} for iterating over this node's ancestors.
   */
  get parent() {
    return marshalNode(this), C._ts_node_parent_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /**
   * Get the node that contains `descendant`.
   *
   * Note that this can return `descendant` itself.
   */
  childWithDescendant(A) {
    return marshalNode(this), marshalNode(A, 1), C._ts_node_child_with_descendant_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /** Get the smallest node within this node that spans the given byte range. */
  descendantForIndex(A, I = A) {
    if (typeof A != "number" || typeof I != "number")
      throw new Error("Arguments must be numbers");
    marshalNode(this);
    const g = TRANSFER_BUFFER + SIZE_OF_NODE;
    return C.setValue(g, A, "i32"), C.setValue(g + SIZE_OF_INT, I, "i32"), C._ts_node_descendant_for_index_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /** Get the smallest named node within this node that spans the given byte range. */
  namedDescendantForIndex(A, I = A) {
    if (typeof A != "number" || typeof I != "number")
      throw new Error("Arguments must be numbers");
    marshalNode(this);
    const g = TRANSFER_BUFFER + SIZE_OF_NODE;
    return C.setValue(g, A, "i32"), C.setValue(g + SIZE_OF_INT, I, "i32"), C._ts_node_named_descendant_for_index_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /** Get the smallest node within this node that spans the given point range. */
  descendantForPosition(A, I = A) {
    if (!isPoint(A) || !isPoint(I))
      throw new Error("Arguments must be {row, column} objects");
    marshalNode(this);
    const g = TRANSFER_BUFFER + SIZE_OF_NODE;
    return marshalPoint(g, A), marshalPoint(g + SIZE_OF_POINT, I), C._ts_node_descendant_for_position_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /** Get the smallest named node within this node that spans the given point range. */
  namedDescendantForPosition(A, I = A) {
    if (!isPoint(A) || !isPoint(I))
      throw new Error("Arguments must be {row, column} objects");
    marshalNode(this);
    const g = TRANSFER_BUFFER + SIZE_OF_NODE;
    return marshalPoint(g, A), marshalPoint(g + SIZE_OF_POINT, I), C._ts_node_named_descendant_for_position_wasm(this.tree[0]), unmarshalNode(this.tree);
  }
  /**
   * Create a new {@link TreeCursor} starting from this node.
   *
   * Note that the given node is considered the root of the cursor,
   * and the cursor cannot walk outside this node.
   */
  walk() {
    return marshalNode(this), C._ts_tree_cursor_new_wasm(this.tree[0]), new TreeCursor(INTERNAL, this.tree);
  }
  /**
   * Edit this node to keep it in-sync with source code that has been edited.
   *
   * This function is only rarely needed. When you edit a syntax tree with
   * the {@link Tree#edit} method, all of the nodes that you retrieve from
   * the tree afterward will already reflect the edit. You only need to
   * use {@link Node#edit} when you have a specific {@link Node} instance that
   * you want to keep and continue to use after an edit.
   */
  edit(A) {
    if (this.startIndex >= A.oldEndIndex) {
      this.startIndex = A.newEndIndex + (this.startIndex - A.oldEndIndex);
      let I, g;
      this.startPosition.row > A.oldEndPosition.row ? (I = this.startPosition.row - A.oldEndPosition.row, g = this.startPosition.column) : (I = 0, g = this.startPosition.column, this.startPosition.column >= A.oldEndPosition.column && (g = this.startPosition.column - A.oldEndPosition.column)), I > 0 ? (this.startPosition.row += I, this.startPosition.column = g) : this.startPosition.column += g;
    } else this.startIndex > A.startIndex && (this.startIndex = A.newEndIndex, this.startPosition.row = A.newEndPosition.row, this.startPosition.column = A.newEndPosition.column);
  }
  /** Get the S-expression representation of this node. */
  toString() {
    marshalNode(this);
    const A = C._ts_node_to_string_wasm(this.tree[0]), I = C.AsciiToString(A);
    return C._free(A), I;
  }
};
function unmarshalCaptures(A, I, g, Q, B) {
  for (let E = 0, o = B.length; E < o; E++) {
    const e = C.getValue(g, "i32");
    g += SIZE_OF_INT;
    const s = unmarshalNode(I, g);
    g += SIZE_OF_NODE, B[E] = { patternIndex: Q, name: A.captureNames[e], node: s };
  }
  return g;
}
__name(unmarshalCaptures, "unmarshalCaptures");
function marshalNode(A, I = 0) {
  let g = TRANSFER_BUFFER + I * SIZE_OF_NODE;
  C.setValue(g, A.id, "i32"), g += SIZE_OF_INT, C.setValue(g, A.startIndex, "i32"), g += SIZE_OF_INT, C.setValue(g, A.startPosition.row, "i32"), g += SIZE_OF_INT, C.setValue(g, A.startPosition.column, "i32"), g += SIZE_OF_INT, C.setValue(g, A[0], "i32");
}
__name(marshalNode, "marshalNode");
function unmarshalNode(A, I = TRANSFER_BUFFER) {
  const g = C.getValue(I, "i32");
  if (I += SIZE_OF_INT, g === 0) return null;
  const Q = C.getValue(I, "i32");
  I += SIZE_OF_INT;
  const B = C.getValue(I, "i32");
  I += SIZE_OF_INT;
  const E = C.getValue(I, "i32");
  I += SIZE_OF_INT;
  const o = C.getValue(I, "i32");
  return new Node(INTERNAL, {
    id: g,
    tree: A,
    startIndex: Q,
    startPosition: { row: B, column: E },
    other: o
  });
}
__name(unmarshalNode, "unmarshalNode");
function marshalTreeCursor(A, I = TRANSFER_BUFFER) {
  C.setValue(I + 0 * SIZE_OF_INT, A[0], "i32"), C.setValue(I + 1 * SIZE_OF_INT, A[1], "i32"), C.setValue(I + 2 * SIZE_OF_INT, A[2], "i32"), C.setValue(I + 3 * SIZE_OF_INT, A[3], "i32");
}
__name(marshalTreeCursor, "marshalTreeCursor");
function unmarshalTreeCursor(A) {
  A[0] = C.getValue(TRANSFER_BUFFER + 0 * SIZE_OF_INT, "i32"), A[1] = C.getValue(TRANSFER_BUFFER + 1 * SIZE_OF_INT, "i32"), A[2] = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32"), A[3] = C.getValue(TRANSFER_BUFFER + 3 * SIZE_OF_INT, "i32");
}
__name(unmarshalTreeCursor, "unmarshalTreeCursor");
function marshalPoint(A, I) {
  C.setValue(A, I.row, "i32"), C.setValue(A + SIZE_OF_INT, I.column, "i32");
}
__name(marshalPoint, "marshalPoint");
function unmarshalPoint(A) {
  return {
    row: C.getValue(A, "i32") >>> 0,
    column: C.getValue(A + SIZE_OF_INT, "i32") >>> 0
  };
}
__name(unmarshalPoint, "unmarshalPoint");
function marshalRange(A, I) {
  marshalPoint(A, I.startPosition), A += SIZE_OF_POINT, marshalPoint(A, I.endPosition), A += SIZE_OF_POINT, C.setValue(A, I.startIndex, "i32"), A += SIZE_OF_INT, C.setValue(A, I.endIndex, "i32"), A += SIZE_OF_INT;
}
__name(marshalRange, "marshalRange");
function unmarshalRange(A) {
  const I = {};
  return I.startPosition = unmarshalPoint(A), A += SIZE_OF_POINT, I.endPosition = unmarshalPoint(A), A += SIZE_OF_POINT, I.startIndex = C.getValue(A, "i32") >>> 0, A += SIZE_OF_INT, I.endIndex = C.getValue(A, "i32") >>> 0, I;
}
__name(unmarshalRange, "unmarshalRange");
function marshalEdit(A, I = TRANSFER_BUFFER) {
  marshalPoint(I, A.startPosition), I += SIZE_OF_POINT, marshalPoint(I, A.oldEndPosition), I += SIZE_OF_POINT, marshalPoint(I, A.newEndPosition), I += SIZE_OF_POINT, C.setValue(I, A.startIndex, "i32"), I += SIZE_OF_INT, C.setValue(I, A.oldEndIndex, "i32"), I += SIZE_OF_INT, C.setValue(I, A.newEndIndex, "i32"), I += SIZE_OF_INT;
}
__name(marshalEdit, "marshalEdit");
function unmarshalLanguageMetadata(A) {
  const I = C.getValue(A, "i32"), g = C.getValue(A += SIZE_OF_INT, "i32"), Q = C.getValue(A += SIZE_OF_INT, "i32");
  return { major_version: I, minor_version: g, patch_version: Q };
}
__name(unmarshalLanguageMetadata, "unmarshalLanguageMetadata");
var LANGUAGE_FUNCTION_REGEX = /^tree_sitter_\w+$/, Language = class p {
  static {
    __name(this, "Language");
  }
  /** @internal */
  0 = 0;
  // Internal handle for Wasm
  /**
   * A list of all node types in the language. The index of each type in this
   * array is its node type id.
   */
  types;
  /**
   * A list of all field names in the language. The index of each field name in
   * this array is its field id.
   */
  fields;
  /** @internal */
  constructor(I, g) {
    assertInternal(I), this[0] = g, this.types = new Array(C._ts_language_symbol_count(this[0]));
    for (let Q = 0, B = this.types.length; Q < B; Q++)
      C._ts_language_symbol_type(this[0], Q) < 2 && (this.types[Q] = C.UTF8ToString(C._ts_language_symbol_name(this[0], Q)));
    this.fields = new Array(C._ts_language_field_count(this[0]) + 1);
    for (let Q = 0, B = this.fields.length; Q < B; Q++) {
      const E = C._ts_language_field_name_for_id(this[0], Q);
      E !== 0 ? this.fields[Q] = C.UTF8ToString(E) : this.fields[Q] = null;
    }
  }
  /**
   * Gets the name of the language.
   */
  get name() {
    const I = C._ts_language_name(this[0]);
    return I === 0 ? null : C.UTF8ToString(I);
  }
  /**
   * Gets the ABI version of the language.
   */
  get abiVersion() {
    return C._ts_language_abi_version(this[0]);
  }
  /**
  * Get the metadata for this language. This information is generated by the
  * CLI, and relies on the language author providing the correct metadata in
  * the language's `tree-sitter.json` file.
  */
  get metadata() {
    return C._ts_language_metadata_wasm(this[0]), C.getValue(TRANSFER_BUFFER, "i32") === 0 ? null : unmarshalLanguageMetadata(TRANSFER_BUFFER + SIZE_OF_INT);
  }
  /**
   * Gets the number of fields in the language.
   */
  get fieldCount() {
    return this.fields.length - 1;
  }
  /**
   * Gets the number of states in the language.
   */
  get stateCount() {
    return C._ts_language_state_count(this[0]);
  }
  /**
   * Get the field id for a field name.
   */
  fieldIdForName(I) {
    const g = this.fields.indexOf(I);
    return g !== -1 ? g : null;
  }
  /**
   * Get the field name for a field id.
   */
  fieldNameForId(I) {
    return this.fields[I] ?? null;
  }
  /**
   * Get the node type id for a node type name.
   */
  idForNodeType(I, g) {
    const Q = C.lengthBytesUTF8(I), B = C._malloc(Q + 1);
    C.stringToUTF8(I, B, Q + 1);
    const E = C._ts_language_symbol_for_name(this[0], B, Q, g ? 1 : 0);
    return C._free(B), E || null;
  }
  /**
   * Gets the number of node types in the language.
   */
  get nodeTypeCount() {
    return C._ts_language_symbol_count(this[0]);
  }
  /**
   * Get the node type name for a node type id.
   */
  nodeTypeForId(I) {
    const g = C._ts_language_symbol_name(this[0], I);
    return g ? C.UTF8ToString(g) : null;
  }
  /**
   * Check if a node type is named.
   *
   * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/2-basic-parsing.html#named-vs-anonymous-nodes}
   */
  nodeTypeIsNamed(I) {
    return !!C._ts_language_type_is_named_wasm(this[0], I);
  }
  /**
   * Check if a node type is visible.
   */
  nodeTypeIsVisible(I) {
    return !!C._ts_language_type_is_visible_wasm(this[0], I);
  }
  /**
   * Get the supertypes ids of this language.
   *
   * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types.html?highlight=supertype#supertype-nodes}
   */
  get supertypes() {
    C._ts_language_supertypes_wasm(this[0]);
    const I = C.getValue(TRANSFER_BUFFER, "i32"), g = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), Q = new Array(I);
    if (I > 0) {
      let B = g;
      for (let E = 0; E < I; E++)
        Q[E] = C.getValue(B, "i16"), B += SIZE_OF_SHORT;
    }
    return Q;
  }
  /**
   * Get the subtype ids for a given supertype node id.
   */
  subtypes(I) {
    C._ts_language_subtypes_wasm(this[0], I);
    const g = C.getValue(TRANSFER_BUFFER, "i32"), Q = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), B = new Array(g);
    if (g > 0) {
      let E = Q;
      for (let o = 0; o < g; o++)
        B[o] = C.getValue(E, "i16"), E += SIZE_OF_SHORT;
    }
    return B;
  }
  /**
   * Get the next state id for a given state id and node type id.
   */
  nextState(I, g) {
    return C._ts_language_next_state(this[0], I, g);
  }
  /**
   * Create a new lookahead iterator for this language and parse state.
   *
   * This returns `null` if state is invalid for this language.
   *
   * Iterating {@link LookaheadIterator} will yield valid symbols in the given
   * parse state. A newly created iterator is not positioned on a symbol, so
   * {@link LookaheadIterator#currentType} returns `null` until the first
   * iteration step.
   *
   * Lookahead iterators can be useful for generating suggestions and improving
   * syntax error diagnostics. To get symbols valid in an `ERROR` node, use the
   * lookahead iterator on its first leaf node state. For `MISSING` nodes, a
   * lookahead iterator created on the previous non-extra leaf node may be
   * appropriate.
   */
  lookaheadIterator(I) {
    const g = C._ts_lookahead_iterator_new(this[0], I);
    return g ? new LookaheadIterator(INTERNAL, g, this) : null;
  }
  /**
   * Load a language from a WebAssembly module.
   * The module can be provided as a path to a file, a `URL` to a file, or as a
   * buffer.
   */
  static async load(I) {
    let g;
    if (I instanceof Uint8Array)
      g = I;
    else if (globalThis.process?.versions.node)
      g = await (await import("./__vite-browser-external-CPvbk0mb.js")).readFile(I);
    else {
      const B = await fetch(I);
      if (!B.ok) {
        const o = await B.text();
        throw new Error(`Language.load failed with status ${B.status}.

${o}`);
      }
      const E = B.clone();
      try {
        g = await WebAssembly.compileStreaming(B);
      } catch (o) {
        console.error("wasm streaming compile failed:", o), console.error("falling back to ArrayBuffer instantiation"), g = new Uint8Array(await E.arrayBuffer());
      }
    }
    const Q = await C.loadWebAssemblyModule(g, { loadAsync: !0 });
    return p.loadFromWasmExports(Q, { sync: !1 });
  }
  static loadFromWasmExports(I, { sync: g }) {
    const Q = Object.keys(I), B = Q.find((o) => LANGUAGE_FUNCTION_REGEX.test(o) && !o.includes("external_scanner_"));
    if (!B)
      throw console.log(`Couldn't find language function in Wasm file. Symbols:
${JSON.stringify(Q, null, 2)}`), new Error(`Language.${g ? "loadSync" : "load"} failed: no language function found in Wasm file`);
    const E = I[B]();
    return new p(INTERNAL, E);
  }
  /**
   * Load a language synchronously from a pre-compiled WebAssembly module.
   * Use this when the host environment provides a `WebAssembly.Module` directly.
   */
  static loadSync(I) {
    const g = C.loadWebAssemblyModule(I, { loadAsync: !1 });
    return p.loadFromWasmExports(g, { sync: !0 });
  }
};
async function Module2(moduleArg = {}) {
  var moduleRtn, Module = moduleArg, ENVIRONMENT_IS_WEB = typeof window == "object", ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope < "u", ENVIRONMENT_IS_NODE = typeof process == "object" && process.versions?.node && process.type != "renderer";
  if (ENVIRONMENT_IS_NODE) {
    const { createRequire: A } = await import("./__vite-browser-external-CPvbk0mb.js");
    var require = A(import.meta.url);
  }
  Module.currentQueryProgressCallback = null, Module.currentProgressCallback = null, Module.currentLogCallback = null, Module.currentParseCallback = null;
  var arguments_ = [], thisProgram = "./this.program", quit_ = /* @__PURE__ */ __name((A, I) => {
    throw I;
  }, "quit_"), _scriptName = import.meta.url, scriptDirectory = "";
  function locateFile(A) {
    return Module.locateFile ? Module.locateFile(A, scriptDirectory) : scriptDirectory + A;
  }
  __name(locateFile, "locateFile");
  var readAsync, readBinary;
  if (ENVIRONMENT_IS_NODE) {
    var fs = require("fs");
    _scriptName.startsWith("file:") && (scriptDirectory = require("path").dirname(require("url").fileURLToPath(_scriptName)) + "/"), readBinary = /* @__PURE__ */ __name((A) => {
      A = isFileURI(A) ? new URL(A) : A;
      var I = fs.readFileSync(A);
      return I;
    }, "readBinary"), readAsync = /* @__PURE__ */ __name(async (A, I = !0) => {
      A = isFileURI(A) ? new URL(A) : A;
      var g = fs.readFileSync(A, I ? void 0 : "utf8");
      return g;
    }, "readAsync"), process.argv.length > 1 && (thisProgram = process.argv[1].replace(/\\/g, "/")), arguments_ = process.argv.slice(2), quit_ = /* @__PURE__ */ __name((A, I) => {
      throw process.exitCode = A, I;
    }, "quit_");
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
      scriptDirectory = new URL(".", _scriptName).href;
    } catch {
    }
    ENVIRONMENT_IS_WORKER && (readBinary = /* @__PURE__ */ __name((A) => {
      var I = new XMLHttpRequest();
      return I.open("GET", A, !1), I.responseType = "arraybuffer", I.send(null), new Uint8Array(
        /** @type{!ArrayBuffer} */
        I.response
      );
    }, "readBinary")), readAsync = /* @__PURE__ */ __name(async (A) => {
      if (isFileURI(A))
        return new Promise((g, Q) => {
          var B = new XMLHttpRequest();
          B.open("GET", A, !0), B.responseType = "arraybuffer", B.onload = () => {
            if (B.status == 200 || B.status == 0 && B.response) {
              g(B.response);
              return;
            }
            Q(B.status);
          }, B.onerror = Q, B.send(null);
        });
      var I = await fetch(A, {
        credentials: "same-origin"
      });
      if (I.ok)
        return I.arrayBuffer();
      throw new Error(I.status + " : " + I.url);
    }, "readAsync");
  }
  var out = console.log.bind(console), err = console.error.bind(console), dynamicLibraries = [], wasmBinary, ABORT = !1, EXITSTATUS, isFileURI = /* @__PURE__ */ __name((A) => A.startsWith("file://"), "isFileURI"), readyPromiseResolve, readyPromiseReject, wasmMemory, HEAP8, HEAPU8, HEAPU16, HEAPU32, HEAP_DATA_VIEW, runtimeInitialized = !1;
  function updateMemoryViews() {
    var A = wasmMemory.buffer;
    Module.HEAP8 = HEAP8 = new Int8Array(A), Module.HEAP16 = new Int16Array(A), Module.HEAPU8 = HEAPU8 = new Uint8Array(A), Module.HEAPU16 = HEAPU16 = new Uint16Array(A), Module.HEAP32 = new Int32Array(A), Module.HEAPU32 = HEAPU32 = new Uint32Array(A), Module.HEAPF32 = new Float32Array(A), Module.HEAPF64 = new Float64Array(A), Module.HEAP64 = new BigInt64Array(A), Module.HEAPU64 = new BigUint64Array(A), Module.HEAP_DATA_VIEW = HEAP_DATA_VIEW = new DataView(A), LE_HEAP_UPDATE();
  }
  __name(updateMemoryViews, "updateMemoryViews");
  function initMemory() {
    if (Module.wasmMemory)
      wasmMemory = Module.wasmMemory;
    else {
      var A = Module.INITIAL_MEMORY || 33554432;
      wasmMemory = new WebAssembly.Memory({
        initial: A / 65536,
        // In theory we should not need to emit the maximum if we want "unlimited"
        // or 4GB of memory, but VMs error on that atm, see
        // https://github.com/emscripten-core/emscripten/issues/14130
        // And in the pthreads case we definitely need to emit a maximum. So
        // always emit one.
        maximum: 32768
      });
    }
    updateMemoryViews();
  }
  __name(initMemory, "initMemory");
  var __RELOC_FUNCS__ = [];
  function preRun() {
    if (Module.preRun)
      for (typeof Module.preRun == "function" && (Module.preRun = [Module.preRun]); Module.preRun.length; )
        addOnPreRun(Module.preRun.shift());
    callRuntimeCallbacks(onPreRuns);
  }
  __name(preRun, "preRun");
  function initRuntime() {
    runtimeInitialized = !0, callRuntimeCallbacks(__RELOC_FUNCS__), wasmExports.__wasm_call_ctors(), callRuntimeCallbacks(onPostCtors);
  }
  __name(initRuntime, "initRuntime");
  function preMain() {
  }
  __name(preMain, "preMain");
  function postRun() {
    if (Module.postRun)
      for (typeof Module.postRun == "function" && (Module.postRun = [Module.postRun]); Module.postRun.length; )
        addOnPostRun(Module.postRun.shift());
    callRuntimeCallbacks(onPostRuns);
  }
  __name(postRun, "postRun");
  function abort(A) {
    Module.onAbort?.(A), A = "Aborted(" + A + ")", err(A), ABORT = !0, A += ". Build with -sASSERTIONS for more info.";
    var I = new WebAssembly.RuntimeError(A);
    throw readyPromiseReject?.(I), I;
  }
  __name(abort, "abort");
  var wasmBinaryFile;
  function findWasmBinary() {
    return Module.locateFile ? locateFile("web-tree-sitter.wasm") : new URL("data:application/wasm;base64,AGFzbQEAAAAAEAhkeWxpbmsuMAEFvHoEHgABxwEZYAF/AX9gAn9/AX9gAX8AYAN/f38AYAN/f38Bf2ACf38AYAR/f39/AX9gBX9/f39/AGAEf39/fwBgAABgAAF/YAV/f39/fwF/YAd/f39/f39/AGAGf3x/f39/AX9gEH9/f39/f39/f39/f39/f38AYAZ/f39/f38AYAZ/f39/f38Bf2ACfn8Bf2AIf39/f39/f38Bf2AGfn9/f39/AX9gB39/f39/f38Bf2ACfH8BfGAEf39/fwF+YAR/fn9/AX9gA39+fwF+AtsDERZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxCGZkX3dyaXRlAAYDZW52FmVtc2NyaXB0ZW5fcmVzaXplX2hlYXAAABZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxB2ZkX3NlZWsAFwNlbnYJX2Fib3J0X2pzAAkWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQhmZF9jbG9zZQAAA2VudiN0cmVlX3NpdHRlcl9xdWVyeV9wcm9ncmVzc19jYWxsYmFjawAAA2Vudh10cmVlX3NpdHRlcl9wcm9ncmVzc19jYWxsYmFjawABA2Vudhp0cmVlX3NpdHRlcl9wYXJzZV9jYWxsYmFjawAHA2Vudhh0cmVlX3NpdHRlcl9sb2dfY2FsbGJhY2sABQNlbnYPX19zdGFja19wb2ludGVyA38BA2Vudg1fX21lbW9yeV9iYXNlA38AA2VudgxfX3RhYmxlX2Jhc2UDfwAHR09ULm1lbQtfX3N0YWNrX2xvdwN/AQdHT1QubWVtDF9fc3RhY2tfaGlnaAN/AQdHT1QubWVtC19faGVhcF9iYXNlA38BA2VudgZtZW1vcnkCAYAEgIACA2VudhlfX2luZGlyZWN0X2Z1bmN0aW9uX3RhYmxlAXAAHgOcApoCBQUGAAIDBwUFBAAFBQcCAw8DBAADBhADAAARBAQDAgICAQQABQQBAQUBAgQABQMIBwQCAQMIAAAFAAkBAwQBAAICCBIDAQYFBAcMBwgDAwATAAUFAQEGCAAUFQQAAAAEBQQEBAQAFgAFBwUECwQDCAEFAgEBAwMKAQEBAQQEBAQAAAAACwEBAgMBAQQEBAIAAAAAAQADBAQAAAQAAAoAAgAAAAAFAAQFDQQBBAIYAA4ADgAAAAAAAQAAAAwCAgAAAAICAgICAgICAAICAQkCAgUFBQAAAAICBQEBAAIAAAAAAAICAAAAAAAABQABAAAAAAAFAgICAgUCAgICBQICAQEAAgAGCwMFCQoAAgAEAAEBAQEABQMBAAkJBj4JfwFBAAt/AUHo8gALfwFB4PIAC38BQezyAAt/AUHk8gALfwFBmPQAC38BQbD0AAt/AUG0+gALfwFBuPoACweoIZoBEV9fd2FzbV9jYWxsX2N0b3JzAKICBm1hbGxvYwAiBmNhbGxvYwAqB3JlYWxsb2MAXQRmcmVlADMNdHNfcmFuZ2VfZWRpdABQBm1lbWNtcAASGHRzX2xhbmd1YWdlX3N5bWJvbF9jb3VudACgAhd0c19sYW5ndWFnZV9zdGF0ZV9jb3VudACcAhd0c19sYW5ndWFnZV9hYmlfdmVyc2lvbgCXAhB0c19sYW5ndWFnZV9uYW1lAJMCF3RzX2xhbmd1YWdlX2ZpZWxkX2NvdW50AIoCFnRzX2xhbmd1YWdlX25leHRfc3RhdGUAKxd0c19sYW5ndWFnZV9zeW1ib2xfbmFtZQD1ARt0c19sYW5ndWFnZV9zeW1ib2xfZm9yX25hbWUAHgdzdHJuY21wABsXdHNfbGFuZ3VhZ2Vfc3ltYm9sX3R5cGUARB10c19sYW5ndWFnZV9maWVsZF9uYW1lX2Zvcl9pZADVARl0c19sb29rYWhlYWRfaXRlcmF0b3JfbmV3AMABHHRzX2xvb2thaGVhZF9pdGVyYXRvcl9kZWxldGUAtQEhdHNfbG9va2FoZWFkX2l0ZXJhdG9yX3Jlc2V0X3N0YXRlALMBG3RzX2xvb2thaGVhZF9pdGVyYXRvcl9yZXNldACyARp0c19sb29rYWhlYWRfaXRlcmF0b3JfbmV4dACuASR0c19sb29rYWhlYWRfaXRlcmF0b3JfY3VycmVudF9zeW1ib2wAqQENdHNfcG9pbnRfZWRpdACRARB0c19wYXJzZXJfZGVsZXRlAJABD3RzX3BhcnNlcl9yZXNldAAoFnRzX3BhcnNlcl9zZXRfbGFuZ3VhZ2UAjwEddHNfcGFyc2VyX3NldF9pbmNsdWRlZF9yYW5nZXMAOgx0c19xdWVyeV9uZXcAjQEPdHNfcXVlcnlfZGVsZXRlAEoIaXN3c3BhY2UAZghpc3dhbG51bQATDXRzX3F1ZXJ5X2NvcHkAjAEWdHNfcXVlcnlfcGF0dGVybl9jb3VudACLARZ0c19xdWVyeV9jYXB0dXJlX2NvdW50AIoBFXRzX3F1ZXJ5X3N0cmluZ19jb3VudACJARx0c19xdWVyeV9jYXB0dXJlX25hbWVfZm9yX2lkAIgBInRzX3F1ZXJ5X2NhcHR1cmVfcXVhbnRpZmllcl9mb3JfaWQAhwEcdHNfcXVlcnlfc3RyaW5nX3ZhbHVlX2Zvcl9pZACGAR90c19xdWVyeV9wcmVkaWNhdGVzX2Zvcl9wYXR0ZXJuAIUBH3RzX3F1ZXJ5X3N0YXJ0X2J5dGVfZm9yX3BhdHRlcm4AhAEddHNfcXVlcnlfZW5kX2J5dGVfZm9yX3BhdHRlcm4AgwEadHNfcXVlcnlfaXNfcGF0dGVybl9yb290ZWQAggEddHNfcXVlcnlfaXNfcGF0dGVybl9ub25fbG9jYWwAgQEmdHNfcXVlcnlfaXNfcGF0dGVybl9ndWFyYW50ZWVkX2F0X3N0ZXAAnwIYdHNfcXVlcnlfZGlzYWJsZV9jYXB0dXJlAJ4CGHRzX3F1ZXJ5X2Rpc2FibGVfcGF0dGVybgCdAgx0c190cmVlX2NvcHkAlQIOdHNfdHJlZV9kZWxldGUAlAIHdHNfaW5pdACSAhJ0c19wYXJzZXJfbmV3X3dhc20AkQIcdHNfcGFyc2VyX2VuYWJsZV9sb2dnZXJfd2FzbQCQAhR0c19wYXJzZXJfcGFyc2Vfd2FzbQCOAh50c19wYXJzZXJfaW5jbHVkZWRfcmFuZ2VzX3dhc20AiwIedHNfbGFuZ3VhZ2VfdHlwZV9pc19uYW1lZF93YXNtAIkCIHRzX2xhbmd1YWdlX3R5cGVfaXNfdmlzaWJsZV93YXNtAIgCGXRzX2xhbmd1YWdlX21ldGFkYXRhX3dhc20AhwIbdHNfbGFuZ3VhZ2Vfc3VwZXJ0eXBlc193YXNtAIYCGXRzX2xhbmd1YWdlX3N1YnR5cGVzX3dhc20AhQIWdHNfdHJlZV9yb290X25vZGVfd2FzbQCEAiJ0c190cmVlX3Jvb3Rfbm9kZV93aXRoX29mZnNldF93YXNtAIMCEXRzX3RyZWVfZWRpdF93YXNtAIICHHRzX3RyZWVfaW5jbHVkZWRfcmFuZ2VzX3dhc20AgQIfdHNfdHJlZV9nZXRfY2hhbmdlZF9yYW5nZXNfd2FzbQCAAhd0c190cmVlX2N1cnNvcl9uZXdfd2FzbQD/ARh0c190cmVlX2N1cnNvcl9jb3B5X3dhc20A/gEadHNfdHJlZV9jdXJzb3JfZGVsZXRlX3dhc20A/QEZdHNfdHJlZV9jdXJzb3JfcmVzZXRfd2FzbQD8ARx0c190cmVlX2N1cnNvcl9yZXNldF90b193YXNtAPsBJHRzX3RyZWVfY3Vyc29yX2dvdG9fZmlyc3RfY2hpbGRfd2FzbQD6ASN0c190cmVlX2N1cnNvcl9nb3RvX2xhc3RfY2hpbGRfd2FzbQD5AS50c190cmVlX2N1cnNvcl9nb3RvX2ZpcnN0X2NoaWxkX2Zvcl9pbmRleF93YXNtAPgBMXRzX3RyZWVfY3Vyc29yX2dvdG9fZmlyc3RfY2hpbGRfZm9yX3Bvc2l0aW9uX3dhc20A9wEldHNfdHJlZV9jdXJzb3JfZ290b19uZXh0X3NpYmxpbmdfd2FzbQD2ASl0c190cmVlX2N1cnNvcl9nb3RvX3ByZXZpb3VzX3NpYmxpbmdfd2FzbQD0ASN0c190cmVlX2N1cnNvcl9nb3RvX2Rlc2NlbmRhbnRfd2FzbQDzAR90c190cmVlX2N1cnNvcl9nb3RvX3BhcmVudF93YXNtAPIBKHRzX3RyZWVfY3Vyc29yX2N1cnJlbnRfbm9kZV90eXBlX2lkX3dhc20A8QEpdHNfdHJlZV9jdXJzb3JfY3VycmVudF9ub2RlX3N0YXRlX2lkX3dhc20A8AEpdHNfdHJlZV9jdXJzb3JfY3VycmVudF9ub2RlX2lzX25hbWVkX3dhc20A7wErdHNfdHJlZV9jdXJzb3JfY3VycmVudF9ub2RlX2lzX21pc3Npbmdfd2FzbQDuASN0c190cmVlX2N1cnNvcl9jdXJyZW50X25vZGVfaWRfd2FzbQDtASJ0c190cmVlX2N1cnNvcl9zdGFydF9wb3NpdGlvbl93YXNtAOwBIHRzX3RyZWVfY3Vyc29yX2VuZF9wb3NpdGlvbl93YXNtAOsBH3RzX3RyZWVfY3Vyc29yX3N0YXJ0X2luZGV4X3dhc20A6gEddHNfdHJlZV9jdXJzb3JfZW5kX2luZGV4X3dhc20A6QEkdHNfdHJlZV9jdXJzb3JfY3VycmVudF9maWVsZF9pZF93YXNtAOgBIXRzX3RyZWVfY3Vyc29yX2N1cnJlbnRfZGVwdGhfd2FzbQDnASx0c190cmVlX2N1cnNvcl9jdXJyZW50X2Rlc2NlbmRhbnRfaW5kZXhfd2FzbQDmASB0c190cmVlX2N1cnNvcl9jdXJyZW50X25vZGVfd2FzbQDlARN0c19ub2RlX3N5bWJvbF93YXNtAOQBIXRzX25vZGVfZmllbGRfbmFtZV9mb3JfY2hpbGRfd2FzbQDjASd0c19ub2RlX2ZpZWxkX25hbWVfZm9yX25hbWVkX2NoaWxkX3dhc20A4gEhdHNfbm9kZV9jaGlsZHJlbl9ieV9maWVsZF9pZF93YXNtAOEBIXRzX25vZGVfZmlyc3RfY2hpbGRfZm9yX2J5dGVfd2FzbQDgASd0c19ub2RlX2ZpcnN0X25hbWVkX2NoaWxkX2Zvcl9ieXRlX3dhc20A3wEbdHNfbm9kZV9ncmFtbWFyX3N5bWJvbF93YXNtAN4BGHRzX25vZGVfY2hpbGRfY291bnRfd2FzbQDdAR50c19ub2RlX25hbWVkX2NoaWxkX2NvdW50X3dhc20A3AESdHNfbm9kZV9jaGlsZF93YXNtANsBGHRzX25vZGVfbmFtZWRfY2hpbGRfd2FzbQDaAR50c19ub2RlX2NoaWxkX2J5X2ZpZWxkX2lkX3dhc20A2QEZdHNfbm9kZV9uZXh0X3NpYmxpbmdfd2FzbQDYARl0c19ub2RlX3ByZXZfc2libGluZ193YXNtANcBH3RzX25vZGVfbmV4dF9uYW1lZF9zaWJsaW5nX3dhc20A1AEfdHNfbm9kZV9wcmV2X25hbWVkX3NpYmxpbmdfd2FzbQDTAR10c19ub2RlX2Rlc2NlbmRhbnRfY291bnRfd2FzbQDSARN0c19ub2RlX3BhcmVudF93YXNtANEBInRzX25vZGVfY2hpbGRfd2l0aF9kZXNjZW5kYW50X3dhc20A0AEhdHNfbm9kZV9kZXNjZW5kYW50X2Zvcl9pbmRleF93YXNtAM8BJ3RzX25vZGVfbmFtZWRfZGVzY2VuZGFudF9mb3JfaW5kZXhfd2FzbQDOASR0c19ub2RlX2Rlc2NlbmRhbnRfZm9yX3Bvc2l0aW9uX3dhc20AzQEqdHNfbm9kZV9uYW1lZF9kZXNjZW5kYW50X2Zvcl9wb3NpdGlvbl93YXNtAMwBGHRzX25vZGVfc3RhcnRfcG9pbnRfd2FzbQDLARZ0c19ub2RlX2VuZF9wb2ludF93YXNtAMoBGHRzX25vZGVfc3RhcnRfaW5kZXhfd2FzbQDJARZ0c19ub2RlX2VuZF9pbmRleF93YXNtAMgBFnRzX25vZGVfdG9fc3RyaW5nX3dhc20AxwEVdHNfbm9kZV9jaGlsZHJlbl93YXNtAMYBG3RzX25vZGVfbmFtZWRfY2hpbGRyZW5fd2FzbQDFASB0c19ub2RlX2Rlc2NlbmRhbnRzX29mX3R5cGVfd2FzbQDEARV0c19ub2RlX2lzX25hbWVkX3dhc20AwwEYdHNfbm9kZV9oYXNfY2hhbmdlc193YXNtAMIBFnRzX25vZGVfaGFzX2Vycm9yX3dhc20AwQEVdHNfbm9kZV9pc19lcnJvcl93YXNtAL8BF3RzX25vZGVfaXNfbWlzc2luZ193YXNtAL4BFXRzX25vZGVfaXNfZXh0cmFfd2FzbQC9ARh0c19ub2RlX3BhcnNlX3N0YXRlX3dhc20AvAEddHNfbm9kZV9uZXh0X3BhcnNlX3N0YXRlX3dhc20AuwEVdHNfcXVlcnlfbWF0Y2hlc193YXNtALoBFnRzX3F1ZXJ5X2NhcHR1cmVzX3dhc20AuAEGbWVtc2V0ADQGbWVtY3B5ACQHbWVtbW92ZQCgAQhpc3dhbHBoYQBnCGlzd2JsYW5rAKQBCGlzd2RpZ2l0AKoBCGlzd2xvd2VyAKUBCGlzd3B1bmN0AKIBCGlzd3VwcGVyAKEBCWlzd3hkaWdpdACdAQZtZW1jaHIAZAZzdHJsZW4AZQZzdHJjbXAAnAEHc3RybmNhdACjAQdzdHJuY3B5AJ8BCHRvd2xvd2VyAKwBCHRvd3VwcGVyAKsBCHNldFRocmV3AK0BGV9lbXNjcmlwdGVuX3N0YWNrX3Jlc3RvcmUAqAEXX2Vtc2NyaXB0ZW5fc3RhY2tfYWxsb2MApwEcZW1zY3JpcHRlbl9zdGFja19nZXRfY3VycmVudACmARhfX3dhc21fYXBwbHlfZGF0YV9yZWxvY3MAoQIIAtYBCT8BACMCCx6WAZUBlAGeAZsBmQGYAZcBMY4BmwKZApoCmAIllgKaAZMBkgEzjwKNAowCuQG3AbQBtgGxAbABrwEMAQEK38YL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IQMLIAwhBCAJIAgoAgQiCksEQCACKAIAIApBDGxqIQQLIAcoARJB/x9xIgkgAygCBE8NAAJAIAgoARJB/x9xIgogBCgCBE8NACADKAIAIAlBHGxqKAIAIgMgBCgCACAKQRxsaigCACIERwRAIAMgBEkNAQwCCyAHLwEQIgMgCC8BECIERwRAIAMgBEkNAQwCCyAHKAIIIAgoAghPDQELIAYhBQsgASAFRwRAIAsgACgCACIGIAFBGGxqIgFBEGopAgA3AxggCyABKQIINwMQIAsgASkCADcDCCABIAYgBUEYbCIDaiIGKQIANwIAIAEgBikCCDcCCCABIAYpAhA3AhAgACgCACADaiIBIAspAwg3AgAgASALKQMYNwIQIAEgCykDEDcCCCAFIQEMAQsLC/0EAgR/An4CQAJAIAEtABNBwABxDQAgACABQX8QayIARQ0BIAIvAQYiBkH//wNGDQAgACgCACEBIAAgACgCBCIFQQFqIgQgACgCCCIHSwR/QQggB0EBdCIFIAQgBCAFSRsiBCAEQQhNGyIFQRxsIQQCfyABBEAgASAEIwcoAgARAQAMAQsgBCMIKAIAEQAACyEBIAAgBTYCCCAAKAIEIgVBAWoFIAQLNgIEIAAgATYCACADKQIIIQggAykCECEJIAEgBUEcbGoiASADKQIANwIAIAEgBjYCGCABIAk3AhAgASAINwIIIAIvAQgiBkH//wNGDQAgACgCACEBIAAgACgCBCIFQQFqIgQgACgCCCIHSwR/QQggB0EBdCIFIAQgBCAFSRsiBCAEQQhNGyIFQRxsIQQCfyABBEAgASAEIwcoAgARAQAMAQsgBCMIKAIAEQAACyEBIAAgBTYCCCAAKAIEIgVBAWoFIAQLNgIEIAAgATYCACADKQIIIQggAykCECEJIAEgBUEcbGoiASADKQIANwIAIAEgBjYCGCABIAk3AhAgASAINwIIIAIvAQoiBUH//wNGDQAgACgCACEBIAAgACgCBCIEQQFqIgIgACgCCCIGSwR/QQggBkEBdCIEIAIgAiAESRsiAiACQQhNGyIEQRxsIQICfyABBEAgASACIwcoAgARAQAMAQsgAiMIKAIAEQAACyEBIAAgBDYCCCAAKAIEIgRBAWoFIAILNgIEIAAgATYCACADKQIIIQggAykCECEJIAEgBEEcbGoiACADKQIA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BEAgASACIwcoAgARAQAMAQsgAiMIKAIAEQAACyEBIAMgBDYCdAsgAyAENgJwIAIEQCABIAUgAvwKAAALIAMgATYCbCADKAJ4IQEgACgCeCEFAkAgACgCfCIEIAMoAoABTQRAIARBAXQhAgwBCyAEQQF0IQICfyABBEAgASACIwcoAgARAQAMAQsgAiMIKAIAEQAACyEBIAMgBDYCgAELIAMgBDYCfCACBEAgASAFIAL8CgAACyADIAE2AnggAygChAEhASAAKAKEASEEIAAoAogBIgIgAygCjAFLBEACfyABBEAgASACIwcoAgARAQAMAQsgAiMIKAIAEQAACyEBIAMgAjYCjAELIAMgAjYCiAEgAgRAIAEgBCAC/AoAAAsgAyABNgKEASADKAKQASEBIAAoApABIQUCQCAAKAKUASIEIAMoApgBTQRAIARBAXQhAgwBCyAEQQF0IQICfyABBEAgASACIwcoAgARAQAMAQsgAiMIKAIAEQAACyEBIAMgBDYCmAELIAMgBDYClAEgAgRAIAEgBSAC/AoAAAsgAyABNgKQASADKAIAIQEgACgCACEEIAAoAgQiAiADKAIISwRAAn8gAQRAIAEgAiMHKAIAEQEADAELIAIjCCgCABEAAAshASADIAI2AggLIAMgAjYCBCACBEAgASAEIAL8CgAACyADIAE2AgAgAygCDCEBIAAoAgwhBQJAIAAoAhAiBCADKAIUTQRAIARBA3QhAgwBCyAEQQN0IQICfyABBEAgASACIwcoAgARAQAMAQsgAiMIKAIAEQAACyEBIAMgBDYCFAsgAyAENgIQIAIEQCABIAUgAvwKAAALIAMgATYCDCADKAIYIQEgACgCGCEEIAAoAhwiAiADKAIgSwRAAn8gAQRAIAEgAiMHKAIAEQEADAELIAIjCCgCABEAAAshASADIAI2AiALIAMgAjYCHCACBEAgASAEIAL8CgAACyADIAE2AhggAygCJCEBIAAoAiQhBQJAIAAoAigiBCADKAIsTQRAIARBA3QhAgwBCyAEQQN0IQICfyABBEAgASACIwcoAgARAQAMAQsgAiMIKAIAEQAACyEBIAMgBDYCLAsgAyAENgIoIAIEQCABIAUgAvwKAAALIAMgATYCJCADKAIwIQEgACgCMCEFAkAgACgCNCIEIAMoAjhNBEAgBEEMbCECDAEL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IAMoAgQgBygCABECACADKAIIIAcoAgARAgAgAygCDCAHKAIAEQIAIABBBGohACAOQQRqIg4gCEcNAAsLIAJBA3EiAkUNAQNAIAEgAEECdGooAgAjCSgCABECACAAQQFqIQAgCUEBaiIJIAJHDQALDAELIAFFDQELIAEjCSgCABECAAtBACEAIAVBADYCYCAFKAJsIQICQAJAIAUoAnAiAQRAIAFBBE8EQCABQXxxIQhBACEKA0AgAiAAQQJ0aiIDKAIAIwkiBygCABECACADKAIEIAcoAgARAgAgAygCCCAHKAIAEQIAIAMoAgwgBygCABECACAAQQRqIQAgCkEEaiIKIAhHDQALCyABQQNxIgNFDQFBACEBA0AgAiAAQQJ0aigCACMJKAIAEQIAIABBAWohACABQQFqIgEgA0cNAAsMAQsgAkUNAQsgAiMJKAIAEQIAC0EAIQAgBUEANgJsIAUoAnghAgJAAkAgBSgCfCIBBEAgAUEETwRAIAFBfHEhCEEAIQoDQCACIABBAnRqIgMoAgAjCSIHKAIAEQIAIAMoAgQgBygCABECACADKAIIIAcoAgARAgAgAygCDCAHKAIAEQIAIABBBGohACAKQQRqIgogCEcNAAsLIAFBA3EiA0UNAUEAIQEDQCACIABBAnRqKAIAIwkoAgARAgAgAEEBaiEAIAFBAWoiASADRw0ACwwBCyACRQ0BCyACIwkoAgARAgALQQAhACAFQQA2AnggBSgChAEhAgJAAkAgBSgCiAEiAQRAIAFBBE8EQCABQXxxIQhBACEKA0AgAiAAQQJ0aiIDKAIAIwkiBygCABECACADKAIEIAcoAgARAgAgAygCCCAHKAIAEQIAIAMoAgwgBygCABECACAAQQRqIQAgCkEEaiIKIAhHDQALCyABQQNxIgNFDQFBACEBA0AgAiAAQQJ0aigCACMJKAIAEQIAIABBAWohACABQQFqIgEgA0cNAAsMAQsgAkUNAQsgAiMJKAIAEQIACyAFKAKQASIABEAgACMJKAIAEQIACyAFKAKcASIABEAgACMJKAIAEQIACyAQBEAgECMJKAIAEQIACyAPBEAgDyMJKAIAEQIACyAdIwkoAgARAgALIBYEQCAWIwkoAgARAgALIBMEQCATIwkoAgARAgALIBFFBEAgBEEFNgIADAELIAYoAoQBIgAEQCAAIwkoAgARAgALIAZBADYCjAEgBkIANwKEAQwBCyAGEEpBACEGCyAFQbABaiQAIAYLqAIBCX8gASgCECIGIAAoAgRLBEBBAQ8LIAEoAgAiAy8BACEJIAAoAgAiBCgCACEFIAQoAgQiByECAkADQCACRQ0BIAUgAkEBayICQRRsaiIIKAIMIgogBkkNASAGIApHDQAgCC8BECAJRw0AC0EADwsgB0EBaiICIAQoAggiCEsEQEEIIAhBAXQiAyACIAIgA0kbIgIgAkEITRsiA0EUbCECAn8gBQRAIAUgAiMHKAIAEQEADAELIAIjCCgCABEAAAshBSAEIAM2AgggASgCACEDIAAoAgAiBCgCBCIHQQFqIQILIAQgAjYCBCAEIAU2AgAgAygCDCEBIAUgB0EUbGoiACADKQIENwIAIABBADsBEiAAIAk7ARAgACAGNgIMIAAgATYCCEEAC4ABAQJ/IAAQKAJAIAAoAqAJIgJFDQAgAigCXA0AIAIoAmggAkcNACACIAIoAqgBIgNBAWs2AqgBIANBAUcNACACIwkoAgARAgALQQAhAiAAQQA2AqAJAkAgAQRAIAEoAgBBEGtBfUkNASABKAJcRQ0BCyAAIAE2AqAJQQEhAgsgAguxCAEJfyMAQSBrIgMkACAABEAgABAoAkAgACgCoAkiAUUNACABKAJcDQAgASgCaCABRw0AIAEgASgCqAEiAkEBazYCqAEgAkEBRw0AIAEjCSgCABECAAsgAEEANgKgCSAAKAKECSEBIwBBEGsiBiQAIAEoAgwiAgRAIAIjCSgCABECACABQQA2AhQgAUIANwIMCyABKAIYIgIEQCACIwkoAgARAgAgAUEANgIgIAFCADcCGAsgASgCMCABQSRqIgggASgCNBAaIAEoAgQiAgRAA0AgASgCACAFQQV0aiIEKAIABEAgASgCNCEHIAQoAgwEQCAGIAQpAgw3AwggByAGQQhqEAoLIAQoAhQEQCAGIAQpAhQ3AwAgByAGEAoLIAQoAgQiAgRAIAIoAgAiCQRAIAkjCSgCABECACAEKAIEIQILIAJBADYCCCACQgA3AgAgAiMJKAIAEQIACyAEKAIAIAggBxAaIAEoAgQhAgsgBUEBaiIFIAJJDQALC0EAIQIgAUEANgIEIAEoAiQiBQRAAkAgASgCKARAA0AgASgCJCACQQJ0aigCACMJKAIAEQIAIAJBAWoiAiABKAIoSQ0ACyAIKAIAIgVFDQELIAUjCSgCABECAAsgAUEANgIsIAFCADcCJAsgASgCACICBEAgAiMJKAIAEQIACyABQQA2AgggAUIANwIAIAEjCSgCABECACAGQRBqJAAgACgCqAkiAQRAIAEjCSgCABECACAAQQA2ArAJIABCADcCqAkLIAAoAqAKIgEEQCABIwkoAgARAgAgAEEANgKoCiAAQgA3AqAKCyAAKAKYCgRAIAMgAEGYCmopAgA3AxggAEGICWogA0EYahAKIABCADcCmAoLIAAoAkQjCSgCABECACAAQeAJaiEBIAAoAuAJBEAgAyABKQIANwMQIABBiAlqIANBEGoQCgsgACgC6AkEQCADIABB6AlqKQIANwMIIABBiAlqIANBCGoQCgsgAUIANwIAQQAhAiABQQA2AhAgAUIANwIIIAAoAogJIgEEQAJAIAAoAowJBEADQCAAKAKICSACQQN0aigCACMJKAIAEQIAIAJBAWoiAiAAKAKMCUkNAAsgACgCiAkiAUUNAQsgASMJKAIAEQIACyAAQQA2ApAJIABCADcCiAkLIAAoApQJIgEEQCABIwkoAgARAgAgAEEANgKcCSAAQgA3ApQJCyAAKAL0CSIBBEAgASMJKAIAEQIACyAAQQA2AvwJIABCADcC9AkgACgCvAkiAQRAIAEjCSgCABECAAsgAEEANgLECSAAQgA3ArwJIAAoAsgJIgEEQCABIwkoAgARAgALIABBADYC0AkgAEIANwLICSAAKALUCSIBBEAgASMJKAIAEQIACyAAQQA2AtwJIABCADcC1AkgACMJKAIAEQIACyADQSBqJAALswECBX8BfiAAKQIAIghCIIinIQMgCKchBAJAIAEoAgAiBSACKAIEIgdPBEAgAyACKAIgIAMgAigCGGsiBkEAIAMgBk8baiAEIAIoAhQiBksbIQMgAigCHCAEIAZrIgZBACAEIAZPG2ohBCACKAIIIAUgB2tqIQUMAQsgBSACKAIATQ0AIAIpAhwiCEIgiKchAyACKAIIIQUgCKchBAsgACAErSADrUIghoQ3AgAgASAFNgIACxsAIAAgARBdIQACQCABRQ0AIAANABBDAAsgAAsbACAAIAEQKiEBAkAgAEUNACABDQAQQwALIAELgAEBA39BAiEEQX8h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IQIgACABNgIUCyACC6gBAQV/IAAoAlQiAygCACEFIAMoAgQiBCAAKAIUIAAoAhwiB2siBiAEIAZJGyIGBEAgBSAHIAYQJBogAyADKAIAIAZqIgU2AgAgAyADKAIEIAZrIgQ2AgQLIAQgAiACIARLGyIEBEAgBSABIAQQJBogAyADKAIAIARqIgU2AgAgAyADKAIEIARrNgIECyAFQQA6AAAgACAAKAIsIgE2AhwgACABNgIUIAILsgUCBn4EfyABIAEoAgBBB2pBeHEiAUEQajYCACAAIAEpAwAhAyABKQMIIQYjAEEgayIAJAAgBkL///////8/gyECAn4gBkIwiEL//wGDIgSnIghBgfgAa0H9D00EQCACQgSGIANCPIiEIQIgCEGA+ABrrSEEAkAgA0L//////////w+DIgNCgYCAgICAgIAIWgRAIAJCAXwhAgwBCyADQoCAgICAgICACFINACACQgGDIAJ8IQILQgAgAiACQv////////8HViIBGyECIAGtIAR8DAELAkAgAiADhFANACAEQv//AVINACACQgSGIANCPIiEQoCAgICAgIAEhCECQv8PDAELIAhB/ocBSwRAQgAhAkL/DwwBC0GA+ABBgfgAIARQIgkbIgogCGsiAUHwAEoEQEIAIQJCAAwBCyACIAJCgICAgICAwACEIAkbIQJBACEJIAggCkcEQCADIQQgAiEFAkBBgAEgAWsiCEHAAHEEQCADIAhBQGqthiEFQgAhBAwBCyAIRQ0AIAUgCK0iB4YgBEHAACAIa62IhCEFIAQgB4YhBAsgACAENwMQIAAgBTcDGCAAKQMQIAApAxiEQgBSIQkLAkAgAUHAAHEEQCACIAFBQGqtiCEDQgAhAgwBCyABRQ0AIAJBwAAgAWuthiADIAGtIgSIhCEDIAIgBIghAgsgACADNwMAIAAgAjcDCCAAKQMIQgSGIAApAwAiA0I8iIQhAgJAIAmtIANC//////////8Pg4QiA0KBgICAgICAgAhaBEAgAkIBfCECDAELIANCgICAgICAgIAIUg0AIAJCAYMgAnwhAgsgAkKAgICAgICACIUgAiACQv////////8HViIBGyECIAGtCyEDIABBIGokACAGQoCAgICAgICAgH+DIANCNIaEIAKEvzkDAAvcFwMSfwF8A34jAEGwBGsiCyQAIAtBADYC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AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwACfyABKAIQKAIAIgBBAXEEQCAAQQV2QQFxDAELIAAvASxBCXZBAXELIAFBMGokAAveAQECfyMAQTBrIgEkACABIwwiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAAn8CQCABKAIMIgBB//8DcUUEQCABKAIQKAIAIgBBAXEEQCAAQYD+A3FBCHYhAAwCCyAALwEoIQALIABB//8DcUH//wNHDQBBAQwBCyABKAIUKAIIKAJMIABB//8DcUEBdGovAQBB//8DRgsgAUEwaiQAC9MBAQV/IAEgACgCFEkEQEEkIwgoAgARAAAhAgJAIAAoAlwNACAAKAJoIABHDQAgACAAKAKoAUEBajYCqAELAn8gACgCGCIEIAFNBEAgACgCLCAAKAIwIAEgBGtBAnRqKAIAQQF0aiIDQQJqIQUgAy8BAAwBCyAAKAIoIAAoAgQgAWxBAXRqIQNBAAshBiACQgA3ABEgAiAGOwEOIAJBADsBDCACIAU2AgggAiADNgIEIAIgADYCACACQv//AzcCHCACIAEgBE86ABAgAkEANgAYCyACC6oBAQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwACfyABKAIQKAIAIgBBAXEEQCAAQRp0QR91QeIEcQwBC0HiBCAALQAtQQJxDQAaIAAoAiALQQBHIAFBMGokAAubAQECfyMAQTBrIgEkACABIwwiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAAn8gASgCECgCACIAQQFxBEAgAEEEdkEBcQwBCyAALwEsQQV2QQFxCyABQTBqJAALdwECfyMAQTBrIgEkACABIwwiAigC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BEcNAAsLIwwiAiAANgIEIAIgBDYCACABQYABaiQAC4ECAgZ/AX4jAEEwayIBJAAgASMMIgIoAgA2AiggASACKAIMQQF0NgIgIAEgADYCLCABIAEpAig3AxAgASACKAIQNgIkIAEgASkCIDcDCCABIAIoAgg2AhwgASACKAIEQQF0NgIYIAEgASkCGDcDACMAQRBrIgQkACABKAIUKAIIIQAgASgCECkCACEHQQEhAgJAAkACQCABLwEMIgNB/v8Daw4CAAIBC0EAIQIMAQsgACgCSCADQQNsai0AACECCyAHIAcgBEEPakEBIAAgAyACQQFxIgIQWUEBaiIFIwgoAgARAAAiBiAFIAAgAyACEFkaIARBEGokACABQTBqJAAgBgt6AQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwAgARBaIAFBMGokAEEBdgt7AQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwAgASgCACABQTBqJABBAXYLlgEBAn8jAEFAaiIBJAAgASMMIgIoAgA2AjggASACKAIMQQF0NgIwIAEgADYCPCABIAEpAjg3AxggASACKAIQNgI0IAEgASkCMDcDECABIAIoAgg2AiwgASACKAIEQQF0NgIoIAEgASkCKDcDCCABQSBqIAFBCGoQQSACIAEoAiA2AgAgAiABKAIkQQF2NgIEIAFBQGskAAueAQECfyMAQUBqIgEkACABIwwiAigCADYCOCABIAIoAgxBAXQ2AjAgASAANgI8IAEgASkCODcDGCABIAIoAhA2AjQgASABKQIwNwMQIAEgAigCCDYCLCABIAIoAgRBAXQ2AiggASABKQIoNwMIIAEgASgCDDYCICABIAEoAhA2AiQgAiABKAIgNgIAIAIgASgCJEEBdjYCBCABQUBrJAAL1wIBBn8jAEHwAGsiASQAIAEjDCICKAIANgJoIAEgAigCDEEBdDYCYCABIAA2AmwgASACKAIINgJcIAEgAigCEDYCZCABIAIoAgRBAXQ2AlggASACKAIYQQF0NgJUIAEgAigCFDYCUCACKAIgIQAgAigCHCEDIAEgASkCaDcDKCABIAEpAmA3AyAgASADNgJIIAEgASkCWDcDGCABIABBAXQ2AkwgASABKQJQNwMQIAEgASkCSDcDCCMAQSBrIgAkACABKAIMIQMgASgCCCEEIAEoAhQhBSABKAIQIQYgACABKQIoNwMYIAAgASkCIDcDECAAIAEpAhg3AwggAUEwaiAAQQhqIAYgBSAEIANBABBTIABBIGokACACIAEoAjw2AhAgAiABKAI0NgIIIAIgASgCQDYCACACIAEoAjhBAXY2AgwgAiABKAIwQQF2NgIEIAFB8ABqJAAL1wIBBn8jAEHwAGsiASQAIAEjDCICKAIANgJoIAEgAigCDEEBdDYCYCABIAA2AmwgASACKAIINgJcIAEgAigCEDYCZCABIAIoAgRBAXQ2AlggASACKAIYQQF0NgJUIAEgAigCFDYCUCACKAIgIQAgAigCHCEDIAEgASkCaDcDKCABIAEpAmA3AyAgASADNgJIIAEgASkCWDcDGCABIABBAXQ2AkwgASABKQJQNwMQIAEgASkCSDcDCCMAQSBrIgAkACABKAIMIQMgASgCCCEEIAEoAhQhBSABKAIQIQYgACABKQIoNwMYIAAgASkCIDcDECAAIAEpAhg3AwggAUEwaiAAQQhqIAYgBSAEIANBARBTIABBIGokACACIAEoAjw2AhAgAiABKAI0NgIIIAIgASgCQDYCACACIAEoAjhBAXY2AgwgAiABKAIwQQF2NgIEIAFB8ABqJAALhgIBBH8jAEHQAGsiASQAIAEjDCICKAIANgJIIAFBQGsiAyACKAIMQQF0NgIAIAEgADYCTCABIAEpAkg3AxggASACKAIQNgJEIAEgAykCADcDECABIAIoAgg2AjwgASACKAIEQQF0NgI4IAEgASkCODcDCCACKAIUQQF0IQMgAigCGEEBdCEEIwBBIGsiACQAIAAgASkCGDcDGCAAIAEpAhA3AxAgACABKQIINwMIIAFBIGogAEEIaiADIARBABBUIABBIGokACACIAEoAiw2AhAgAiABKAIkNgIIIAIgASgCMDYCACACIAEoAihBAXY2AgwgAiABKAIgQQF2NgIEIAFB0ABqJAALhgIBBH8jAEHQAGsiASQAIAEjDCICKAIANgJIIAFBQGsiAyACKAIMQQF0NgIAIAEgADYCTCABIAEpAkg3AxggASACKAIQNgJEIAEgAykCADcDECABIAIoAgg2AjwgASACKAIEQQF0NgI4IAEgASkCODcDCCACKAIUQQF0IQMgAigCGEEBdCEEIwBBIGsiACQAIAAgASkCGDcDGCAAIAEpAhA3AxAgACABKQIINwMIIAFBIGogAEEIaiADIARBARBUIABBIGokACACIAEoAiw2AhAgAiABKAIkNgIIIAIgASgCMDYCACACIAEoAihBAXY2AgwgAiABKAIgQQF2NgIEIAFB0ABqJAALnwIBA38jAEGAAWsiASQAIAEjDCICKAIANgJ4IAEgAigCDEEBdDYCcCABIAA2AnwgASACKAIINgJsIAEgAigCEDYCdCABIAIoAgRBAXQ2AmggASACKAIUNgJgIAEgAigCGEEBdDYCUCABIAIoAhw2AlQgASACKAIgQQF0NgJYIAIoAiQhAyABIAEpAng3AzAgASABKQJwNwMoIAEgADYCZCABIAEpAmg3AyAgASADNgJcIAEgASkCYDcDGCABIAEpAlg3AxAgASABKQJQNwMIIAFBOGogAUEgaiABQQhqEBggAiABKAJENgIQIAIgASgCPDYCCCACIAEoAkg2AgAgAiABKAJAQQF2NgIMIAIgASgCOEEBdjYCBCABQYABaiQAC+AEAgZ/An4jAEHQAGsiASQAIAEjDCIDKAIANgJIIAFBQGsiAiADKAIMQQF0NgIAIAEgADYCTCABIAEpAkg3AxggASADKAIQNgJEIAEgAikCADcDECABIAMoAgg2AjwgASADKAIEQQF0NgI4IAEgASkCODcDCCMAQZABayIAJAACfyABKAIcIgIoAgAiBEEBcQRAIAItAAVBD3EhBSACLQAEIQYgAi0ABgwBCyAEKAIMIQYgBCgCCCEFIAQoAgQLIQQgACACNgKMASAAIAI2AogBIABBADYChAEgACAGNgKAASAAIAU2AnwgACAENgJ4AkAgAiABKAIYIgRHBEAgACAAKQKAATcDUCAAIAApAogBNwNYIAAgACkCeDcDSCAAIAEpAhA3AzggAEFAayABKQIYNwMAIAAgASkCCDcDMCAAQeAAaiAAQcgAaiAAQTBqEBgCQCAAKAJwIgIgBEYNACACRQ0AA0AgACAAKQJwIgc3A4gBIAAgACkCaCIINwOAASAAIAg3AyAgACAHNwMoIAAgACkCYCIHNwN4IAAgBzcDGCAAIAEpAhA3AwggACABKQIYNwMQIAAgASkCCDcDACAAQeAAaiAAQRhqIAAQGCAAKAJwIgIgBEYNASACDQALCyABIAApA3g3AiAgASAAKQOIATcCMCABIAApA4ABNwIoDAELIAFCADcCICABQgA3AjAgAUIANwIoCyAAQZABaiQAIAMgASgCLDYCECADIAEoAiQ2AgggAyABKAIwNgIAIAMgASgCKEEBdjYCDCADIAEoAiBBAXY2AgQgAUHQAGokAAudAQECfyMAQTBrIgEkACABIwwiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAQQEhAAJAIAEoAhAoAgAiAkEBcQ0AIAIoAiRFDQAgAigCOEEBaiEACyABQTBqJAAgAAvuAQEDfyMAQdAAayIBJAAgASMMIgIoAgA2AkggAUFAayIDIAIoAgxBAXQ2AgAgASAANgJMIAEgASkCSDcDGCABIAIoAhA2AkQgASADKQIANwMQIAEgAigCCDYCPCABIAIoAgRBAXQ2AjggASABKQI4NwMIIwBBIGsiACQAIAAgASkCGDcDGCAAIAEpAhA3AxAgACABKQIINwMIIAFBIGogAEEIakEAEFYgAEEgaiQAIAIgASgCLDYCECACIAEoAiQ2AgggAiABKAIwNgIAIAIgASgCKEEBdjYCDCACIAEoAiBBAXY2AgQgAUHQAGokAAvuAQEDfyMAQdAAayIBJAAgASMMIgIoAgA2AkggAUFAayIDIAIoAgxBAXQ2AgAgASAANgJMIAEgASkCSDcDGCABIAIoAhA2AkQgASADKQIANwMQIAEgAigCCDYCPCABIAIoAgRBAXQ2AjggASABKQI4NwMIIwBBIGsiACQAIAAgASkCGDcDGCAAIAEpAhA3AxAgACABKQIINwMIIAFBIGogAEEIakEAEFcgAEEgaiQAIAIgASgCLDYCECACIAEoAiQ2AgggAiABKAIwNgIAIAIgASgCKEEBdjYCDCACIAEoAiBBAXY2AgQgAUHQAGokAAsqAQJ/AkAgACgCICIDRQ0AIAEgA0sNACAAKAI8IAFBAnRqKAIAIQILIAILWQAjAUHo8gBqJAcjAUHg8gBqJAgjAUHs8gBqJAkjAUHk8gBqJAojAUGY9ABqJAsjAUGw9ABqJAwjAUG0+gBqJA0jAUG4+gBqJA4jAUGg9ABqQQBBnAb8CwAL7gEBA38jAEHQAGsiASQAIAEjDCICKAIANgJIIAFBQGsiAyACKAIMQQF0NgIAIAEgADYCTCABIAEpAkg3AxggASACKAIQNgJEIAEgAykCADcDECABIAIoAgg2AjwgASACKAIEQQF0NgI4IAEgASkCODcDCCMAQSBrIgAkACAAIAEpAhg3AxggACABKQIQNwMQIAAgASkCCDcDCCABQSBqIABBCGpBARBWIABBIGokACACIAEoAiw2AhAgAiABKAIkNgIIIAIgASgCMDYCACACIAEoAihBAXY2AgwgAiABKAIgQQF2NgIEIAFB0ABqJAAL7gEBA38jAEHQAGsiASQAIAEjDCICKAIANgJIIAFBQGsiAyACKAIMQQF0NgIAIAEgADYCTCABIAEpAkg3AxggASACKAIQNgJEIAEgAykCADcDECABIAIoAgg2AjwgASACKAIEQQF0NgI4IAEgASkCODcDCCMAQSBrIgAkACAAIAEpAhg3AxggACABKQIQNwMQIAAgASkCCDcDCCABQSBqIABBCGpBARBXIABBIGokACACIAEoAiw2AhAgAiABKAIkNgIIIAIgASgCMDYCACACIAEoAihBAXY2AgwgAiABKAIgQQF2NgIEIAFB0ABqJAALxQEBA38jAEHQAGsiAiQAIAIjDCIDKAIANgJIIAJBQGsiBCADKAIMQQF0NgIAIAIgADYCTCACIAIpAkg3AxggAiADKAIQNgJEIAIgBCkCADcDECACIAMoAgg2AjwgAiADKAIEQQF0NgI4IAIgAikCODcDCCACQSBqIAJBCGogAUH//wNxED0gAyACKAIsNgIQIAMgAigCJDYCCCADIAIoAjA2AgAgAyACKAIoQQF2NgIMIAMgAigCIEEBdjYCBCACQdAAaiQAC/ABAQN/IwBB0ABrIgIkACACIwwiAygCADYCSCACQUBrIgQgAygCDEEBdDYCACACIAA2AkwgAiACKQJINwMYIAIgAygCEDYCRCACIAQpAgA3AxAgAiADKAIINgI8IAIgAygCBEEBdDYCOCACIAIpAjg3AwgjAEEgayIAJAAgACACKQIYNwMYIAAgAikCEDcDECAAIAIpAgg3AwggAkEgaiAAQQhqIAFBABA+IABBIGokACADIAIoAiw2AhAgAyACKAIkNgIIIAMgAigCMDYCACADIAIoAihBAXY2AgwgAyACKAIgQQF2NgIEIAJB0ABqJAAL8AEBA38jAEHQAGsiAiQAIAIjDCIDKAIANgJIIAJBQGsiBCADKAIMQQF0NgIAIAIgADYCTCACIAIpAkg3AxggAiADKAIQNgJEIAIgBCkCADcDECACIAMoAgg2AjwgAiADKAIEQQF0NgI4IAIgAikCODcDCCMAQSBrIgAkACAAIAIpAhg3AxggACACKQIQNwMQIAAgAikCCDcDCCACQSBqIABBCGogAUEBED4gAEEgaiQAIAMgAigCLDYCECADIAIoAiQ2AgggAyACKAIwNgIAIAMgAigCKEEBdjYCDCADIAIoAiBBAXY2AgQgAkHQAGokAAuaAQECfyMAQTBrIgEkACABIwwiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAQQAhAAJAIAEoAhAoAgAiAkEBcQ0AIAIoAiRFDQAgAigCNCEACyABQTBqJAAgAAuaAQECfyMAQTBrIgEkACABIwwiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAQQAhAAJAIAEoAhAoAgAiAkEBcQ0AIAIoAiRFDQAgAigCMCEACyABQTBqJAAgAAucAQECfyMAQTBrIgEkACABIwwiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAAn8gASgCECgCACIAQQFxBEAgAEGA/gNxQQh2DAELIAAvASgLQf//A3EgAUEwaiQAC/oBAQN/IwBB0ABrIgEkACABIwwiAigCADYCSCAB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CDcCGCABQQxqEG4gAUEgaiQAC2cBAX8jAEHQAGsiASQAIAEgADYCPCABIwwiACkDADcCQCABIAApAwg3AkggAUEkaiABQTxqEBAgASABKQI0NwMYIAEgASkCLDcDECABIAEpAiQ3AwggAUEIahBaIAFB0ABqJABBAXYLZQEBfyMAQdAAayIBJAAgASAANgI8IAEjDCIAKQMANwJAIAEgACkDCDcCSCABQSRqIAFBPGoQECABIAEpAjQ3AxggASABKQIsNwMQIAEgASkCJDcDCCABKAIIIAFB0ABqJABBAXYLfQEBfyMAQdAAayIBJAAgASAANgI8IAEjDCIAKQMANwJAIAEgACkDCDcCSCABQSRqIAFBPGoQECABIAEpAjQ3AxAgASABKQIsNwMIIAEgASkCJDcDACABQRxqIAEQQSAAIAEoAhw2AgAgACABKAIgQQF2NgIEIAFB0ABqJAALiAEBAX8jAEHQAGsiASQAIAEgADYCPCABIwwiACkDADcCQCABIAApAwg3AkggAUEkaiABQTxqEBAgASABKQI0NwMQIAEgASkCLDcDCCABIAEpAiQ3AwAgASABKAIENgIcIAEgASgCCDYCICAAIAEoAhw2AgAgACABKAIgQQF2NgIEIAFB0ABqJAALQgEBfyMAQTBrIgEkACABIAA2AhwgASMMIgApAwA3AiAgASAAKQMINwIoIAFBBGogAUEcahAQIAEoAhQgAUEwaiQAC4UBAQF/IwBB0ABrIgEkACABIAA2AjwgASMMIgApAwA3AkAgASAAKQMINwJIIAFBJGogAUE8ahAQIAEgASkCNDcDGCABIAEpAiw3AxAgASABKQIkNwMIAn8gASgCGCgCACIAQQFxBEAgAEEFdkEBcQwBCyAALwEsQQl2QQFxCyABQdAAaiQAC2QBAX8jAEHQAGsiASQAIAEgADYCPCABIwwiACkDADcCQCABIAApAwg3AkggAUEkaiABQTxqEBAgASABKQI0NwMYIAEgASkCLDcDECABIAEpAiQ3AwggAUEIahA/IAFB0ABqJAALZAEBfyMAQdAAayIBJAAgASAANgI8IAEjDCIAKQMANwJAIAEgACkDCDcCSCABQSRqIAFBPGoQECABIAEpAjQ3AxggASABKQIsNwMQIAEgASkCJDcDCCABQQhqEFggAUHQAGokAAtkAQF/IwBB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AgELIwFBqgpqDwtBACECIAAoAgggACgCBGogAU0NACAAKAI4IAFBAnRqKAIAIQILIAILTAECfyMAQSBrIgEkACABIAA2AgwgASMMIgApAwA3AhAgASAAKQMINwIYIAFBDGoQHCAAIAEpAhA3AwAgACABKQIYNwMIIAFBIGokAAuHAQICfwF+IwBBMGsiASQAIAEgADYCHCABIwwiACgCADYCICABIAApAgQ3AiQgASAAKAIMIgI2AiwgASAAKAIQQQF0NgIYIAEgAjYCFCABIAEpAhQ3AwggAUEcakEAIAEoAgggASgCDBBvIAAgASkCIDcDACAAIAEpAig3AwggAUEwaiQAQgBSC2YCAn8BfiMAQSBrIgEkACABIAA2AgwgASMMIgAoAgA2AhAgASAAKQIENwIUIAEgACgCDCICNgIcIAFBDGogAkEBdEEAQQAQbyAAIAEpAhA3AwAgACABKQIYNwMIIAFBIGokAEIAUgtfAQN/IwBBIGsiASQAIAEgADYCDCABIwwiACkDADcCECABIAApAwg3AhggAUEMaiECA0AgAhBwIgNBAUYNAAsgA0ECRiAAIAEpAhA3AwAgACABKQIYNwMIIAFBIGokAAtMAQJ/IwBBIGsiASQAIAEgADYCDCABIwwiACkDADcCECABIAApAwg3AhggAUEMahAsIAAgASkCEDcDACAAIAEpAhg3AwggAUEgaiQAC7oCAQV/IwBBMGsiAiQAIAIgADYCHCACIwwiAykDADcCICACIAMpAwg3AiggAiADKQMQNwIMIAIgAykDGDcCFCACIAE2AgggAiACKAIINgIcIAIvARghACACQQA2AiQgAiAAOwEsIAIoAiAhACACKAIMIQYCQAJAIAIoAhAiBCACKAIoSwRAIARBHGwhAQJ/IAAEQCAAIAEjBygCABEBAAwBCyABIwgoAgARAAALIQAgAiAENgIoIAIoAiQiBUUNASAFQRxsIgVFDQEgACABaiAAIAX8CgAADAELIARFDQEgBEEcbCEBCyAGBEAgAUUNASAAIAYgAfwKAAAMAQsgAUUNACAAQQAgAfwLAAsgAiAANgIgIAIgAigCJCAEajYCJCADIAIpAiA3AwAgAyACKQIoNwMIIAJBMGokAAvZAQIIfwF+IwBB0ABrIgEkACABIwwiAigCADYCSCABQUBrIgMgAigCDEEBdDYCACABIAA2AkwgAigCICEEIAIpAxghCSACKAIUIQUgAigCBCEGIAIoAgghByACKAIQIQggASABKQJINwMYIAEgCDYCRCABIAMpAgA3AxAgASAHNgI8IAEgBkEBdDYCOCABIAU2AiggASAJNwIsIAEgBDYCNCABIAA2AiQgASABKQI4NwMIIAFBJGogAUEIahAtIAIgASkCKDcDACACIAEpAjA3AwggAUHQAGokAAtTAQF/IwBBIGsiASQAIAEgADYCDCABIwwiACkDADcCECABIAApAwg3AhggASgCECIABEAgACMJKAIAEQIACyABQQA2AhggAUIANwIQIAFBIGokAAvKAQEHfyMAQTBrIgEkACABIAA2AhwgASMMIgMpAwA3AiAgASADKQMINwIoQQAhACABLwEsIQYgASgCHCEHAkAgASgCJCIERQ0AIAEoAiAhBSAEQRxsIgIjCCgCABEAACEAIAUEQCACRQ0BIAAgBSAC/AoAAAwBCyACRQ0AIABBACAC/AsACyABQQA7ARogASAGOwEYIAEgBDYCFCABIAQ2AhAgASAANgIMIAEgBzYCCCADIAEpAgw3AwAgAyABKQIUNwMIIAFBMGokAAuaAQEDfyMAQdAAayIBJAAgASMMIgIoAgA2AkggAUFAayIDIAIoAgxBAXQ2AgAgASAANgJMIAEgASkCSDcDGCABIAIoAhA2AkQgASADKQIANwMQIAEgAigCCDYCPCABIAIoAgRBAXQ2AjggASABKQI4NwMIIAFBJGogAUEIahBxIAIgASkCKDcDACACIAEpAjA3AwggAUHQAGokAAvOMAIbfwN+IwBBEGsiGCQAIwBBQGoiByQAIAdBADYCPCAHQgA3AiQgB0IANwIcAn8gACgCACICQQFxBEAgAC0ABCENIAAtAAYhDCAALQAFQQ9xDAELIAIoAgwhDSACKAIEIQwgAigCCAshCCAHQQA7ATwgByAANgIsIAdB4AEjCCgCABEAACICNgIwIAdCgYCAgIABNwI0IAJBADYCGCACQgA3AhAgAiANNgIMIAIgCDYCCCACIAw2AgQgAiAANgIAAn8gASgCACICQQFxBEAgAS0ABCENIAEtAAYhDCABLQAFQQ9xDAELIAIoAgwhDSACKAIEIQwgAigCCAshAiAHQQA7ASggByABNgIYIAcoAhwhCCAHKAIk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AAsLIAtCADcDKCALQgA3AyAgC0IANwMYIAsgFykCADcDCCALQRhqIRgjAEEwayINJABBwAIjCCgCABEAACEIIAIoAgAhACACKQIMISYgAigCBCEDIAIpAhQhJSACKAIIIQEgCCACKQIcNwIgIAggATYCHCAIICU3AhQgCCADNgIQIAggJjcCCCAIIAA2AgQgCCALQQhqNgIAQQEhAEEIIRkDQAJ+IAggAEEBayIDQShsaiICKAIAIhMoAgAiAUEBcSIEBEAgEy0AByIArUIghiEkIBMtAAYhBUEBIRogEy0ABSIPQQ9xrSATMQAEQiCGhAwBCyABLQAtQQFxRSEaIAEoAgQhBSATLQAFIQ8gASkCFCEkIAEoAhAhACABKQIICyEjIAAgBWohBwJAIAIoAgQiCSAHIAQEfyAPQfABcUEEdgUgASgCHAsiD2oiAUsEQCADIQAMAQsgAikCICElIAIoAhwhECACKAIYIREgAigCFCEOIAIpAgghKAJAIAIoAhAiDCAJRw0AIAkgEEcNACABIAlHDQAgAyEADAELICNCIIinIQEgJUIgiKchFiAjpyECAn8gBSAMTwRAICWnIAIgDmsiBEEAIAIgBE8baq0gASABIBFrIgRBACABIARPGyAWaiACIA5LG61CIIaEISMgECAMayAFaiEFIAAMAQsgJKchCiAkQiCIpyEGIAUgCUsEQCAMIAVrIQRCACEkIBAhBSAlISNBACAAIARBACAEIAxNGyIETQ0BGiAGIAYgESARIAFrIgFBACABIBFNGyACIA5JG2siAUEAIAEgBk0bIAogDiACayICQQAgAiAOTRsiAksbrUIghiAKIAJrIgJBACACIApNG62EISQgACAEawwBCwJAIAcgCUsNACAHIAlGIAkgDEZxDQAgAAwBC0EAIQQgECAFayIAQQAgACAQTRshFCAWIBYgAWsiAEEAIAAgFk0bICWnIgAgAksbIRUgACACayICQQAgACACTxshAkIAIScgByAMSwRAQQAgASAKGyAGaiIAIAAgEWsiAUEAIAAgAU8bICMgJHynIgAgDksbrUIghiAAIA5rIgFBACAAIAFPG62EIScgByAMayEECyAnQiCIp0EAIBUgJ6ciABtqrUIghiAAIAJqrYQhJCAEIBRqCyEHIA0gEykCACImNwMQICZCIIinIQACQCAmpyIEQQFxBEAgBCECDAELIAQiAigCAEEBRg0AIAIoAiRBA3RBzABqIgAjCCgCABEAACEKIAAEQCAKIAIgAigCJEEDdGsgAPwKAAALIAogBCgCJCIAQQN0aiECQQAhAQJAIAAEQANAIAogAUEDdGooAgAiBkEBcUUEQCAGIAYoAgBBAWo2AgAgBigCABogBCgCJCEACyABQQFqIgEgAEkNAAwCCwALIAQtACxBwABxRQ0AIAQoAjAhASANIAQpAkQ3AyggDSAEKQI8NwMgIA0gBCkCNDcDGAJAIAQoAkgiAEEZSQ0AIAAjCCgCABEAACEBIAQoAkgiAEUNACABIAQoAjAgAPwKAAALIAIgATYCMCACIA0pAxg3AjQgAiANKQMgNwI8IAIgDSkDKDcCRAsgAkEBNgIAIA0gDSkDEDcDCCAYIA1BCGoQCkEAIQALAkACQCACQQFxBEACQCAPQQ9LDQAgBUH+AUsNACAjQv/////vH1YNACAjQvD///8Pg0IAUg0AIAdB/gFLDQAgJEL/////7x9WDQAgJEL/////D4NCAFINACAjQiCIpyAjp0EIdEGAHnEgAEGA4ANxciAFQRB0cnIgB0EYdHIhAAwCCwJ/IBgoAgQiAQRAIBggAUEBayIBNgIEIBgoAgAgAUEDdGooAgAMAQtBzAAjCCgCABEAAAsiAUIANwIgIAEgDzYCHCABICQ3AhQgASAHNgIQIAEgIzcCCCABIAU2AgQgAUEBNgIAIAEgAkEQdjsBKiABIAJBgP4DcUEIdjsBKCABIAEvASxBgPEDcSACQQF2QQdxIAJB4ABxQQR0cnI7ASwMAgsgAiAkNwIUIAIgBzYCECACICM3AgggAiAFNgIECyACIQELAkAgAUEBcQRAIAFBEHIhAQwBCyABIAEvASxBIHI7ASwLIBMgAa0gAK1CIIaENwIAIAFBAXEEQCADIQAMAQsgASgCJCIiRQRAIAMhAAwBCyAoQiCIpyEbICinIRwgI6chH0IAISNBACECQQAhAQNAIBMoAgAiACAAKAIkQQN0ayACQQN0aiIULQAFIQQCfyAUKAIAIgBBAXEiBQRAIARBD3EhDyAULQAEISAgFC0AByIhIBQtAAZqDAELQQAgACgCDCAAKAIUIgcbISAgByAAKAIIaiEPIAAoAhghISAAKAIQIAAoAgRqCyIKIAFqIQcgI0IgiKchFSAjpyEGAkAgCSAFBH8gBEHwAXFBBHYFIAAoAhwLIAdqSwRAIAMhAAwBCwJAAkAgASAMTQRAIAJFDQIgASAMRw0CIApFDQIgGiAGIB9Lcg0BDAILIBogBiAfS3JFDQELIAUEQCADIQAMBAsgAC0ALUEBcUUEQCADIQAMBAsgESAWRgRAIAMhAAwECyAGIA5NDQAgAyEADAMLQgAhJEEAIQpBACEEQgAhIyABIAlJBEAgCSABayEEIBwgBmsiAEEAIAAgHE0brSAbIBsgFWsiAEEAIAAgG00bIAYgHEkbrUIghoQhIwsgASAMSQRAIAwgAWshCiAOIAZrIgBBACAAIA5NG60gESARIBVrIgBBACAAIBFNGyAGIA5JG61CIIaEISQLAn8gASAQTwRAQgAhJ0EADAELICVCIIinIgAgACAVayIFQQAgACAFTxsgJaciACAGSxutQiCGIAAgBmsiBUEAIAAgBU8brYQhJyAQIAFrCyEFAn8gByAJSwRAICghJiAJDAELICghJiAJIAcgCUYgCSAMRnENABogJSEmIAQiCiEFICMiJCEnIBALIRACQCADQQFqIgAgGU0NAEEIIBlBAXQiASAAIAAgAUkbIgEgAUEITRsiGUEobCEBIAgEQCAIIAEjBygCABEBACEIDAELIAEjCCgCABEAACEICyAIIANBKGxqIgMgJzcCICADIAU2AhwgAyAkNwIUIAMgCjYCECADICM3AgggAyAENgIEIAMgFDYCACAAIQMgJiElCyAGIA9qrSAgICFqQQAgFSAPG2qtQiCGhCEjIAchASACQQFqIgIgIkcNAAsLIAANAAsgCARAIAgjCSgCABECAAsgCyALKQIINwIQIA1BMGokACAXIAspAxA3AgAgCygCGCIABEACQCALKAIcIgJFDQBBACEDIAJBBE8EQCACQXxxIQUDQCAAIANBA3RqIgEoAgAjCSIEKAIAEQIAIAEoAgggBCgCABECACABKAIQIAQoAgARAgAgASgCGCAEKAIAEQIAIANBBGohAyAdQQRqIh0gBUcNAAsLIAJBA3EiAkUNAANAIAAgA0EDdGooAgAjCSgCABECACADQQFqIQMgHkEBaiIeIAJHDQALCyAAIwkoAgARAgALIAsoAiQiAARAIAAjCSgCABECAAsgC0EwaiQAIBJBMGokAAv8AQIGfwF+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ICMgAUEBayIBNgIEICMoAgAgAUEDdGooAgAMAQtBzAAjCCgCABEAAAshASANQQE2AlwgDSAGKALIATYCWCANIAYpAsABNwNQIA0gBigCuAE2AkggBikCsAEhOSANQgA3AxAgDUIANwMYIA1BADYCICANIDk3A0AgDSAANgI8IA1BADYCOCANQQA2AjQgDSASOwEwIA0gETsBLiANQQA7ASogDUIANwMIIA0gCEEBdCAHakH/AXFBgAJBACAMG0HAAEEAIBQbckGACEEAIA4bckEEQQAgCRtycjsBLCABIA0oAlw2AgAgASANKAJYNgIMIAEgDSkDUDcCBCABIA0oAkg2AhggASANKQNANwIQIAEgDSgCPDYCHCABIA0oAjg2AiAgASANKAI0NgIkIAEgDS8BMDsBKCABIA0vAS47ASogASANLwEsOwEsIAEgDS8BKjsBLiABIA0oAiA2AkggAUFAayANKQMYNwIAIAEgDSkDEDcCOCABIA0pAwg3AjAgBkEANgLsAyAGIAE2AugDCyANQeAAaiQAIAYpA+gDIjlCMIinIAYoAuwDIQIgBigC6AMhACA5pyEOIBQEQCAOIBw2AkggDkEwaiEIIBxBGU8EQCAIIBwjCCgCABEAACIINgIACyAcBEAgCCADIBz8CgAACyAOIA4vASxB//4DcUGAAUEAICEbcjsBLAsgOUI4iKchCUH/AXEhBCA5QgiIpwshASAFKAJgRQRAIAUoAowKRQ0CCyAFKAKgCSEIIwFBqwpqIQcCQAJAAkAgDkEBcQR/IAFB/wFxBSAOLwEoC0H//wNxIgFB/v8Daw4CAAIBCyMBQaoKaiEHDAELIAgoAjggAUECdGooAgAhBwsgAyMBQckKaiIBKQAANwAAIAMgASkADTcADSADIAEpAAg3AAhBACEIQRQhAQJAIActAAAiDEUNAANAAn8CQAJAAkACQAJAAkAgDEH/AXEiC0EJaw4FAAECAwQFCyABIANqQdzoATsAACABQQJqDAULIAEgA2pB3NwBOwAAIAFBAmoMBAsgASADakHc7AE7AAAgAUECagwDCyABIANqQdzMATsAACABQQJqDAILIAEgA2pB3OQBOwAAIAFBAmoMAQsgC0HcAEYEQCABIANqQdy4ATsAACABQQJqDAELIAEgA2ogDDoAACABQQFqCyEBIAcgCEEBaiII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KAIAEQAANgKoCSAAQQQ2ArAJQYACIAEoAgARAAAhASAAQgA3ApQJIABCgICAgIAENwKMCSAAIAE2AogJIABBnAlqQQA2AgBBAUE4IwooAgARAQAiAUIANwIAIAFCADcCKCABQgA3AiAgAUIANwIYIAFCADcCECABQgA3AgggAUGAASMIKAIAEQAANgIAIAFBBDYCCCABKAIMIQIgASgCFEEDTQRAAn8gAgRAIAJBwAAjBygCABEBAAwBC0HAACMIKAIAEQAACyECIAFBBDYCFAsgASACNgIMIAEoAhghAiABKAIgQQNNBEACfyACBEAgAkHgACMHKAIAEQEADAELQeAAIwgoAgARAAALIQIgAUEENgIgCyABIAI2AhggASgCJCECIAEoAixBMU0EQAJ/IAIEQCACQcgBIwcoAgARAQAMAQtByAEjCCgCABEAAAshAiABQTI2AiwLIAEgAEGICWoiAzYCNCABIAI2AiQCfyABKAIoIgQEQCABIARBAWsiBDYCKCACIARBAnRqKAIADAELQaQBIwgoAgARAAALIgJBATsBACACQQJqQQBBkgH8CwAgAkIANwIEIAJBATYClAEgAkEANgIMIAJCADcCmAEgAkEANgKgASABIAI2AjAgARA7IABCADcC9AkgAEIANwK0CSAAIAE2AoQJIABB/AlqQgA3AgAgAEGECmpBADYCACAAQgA3ApQKIABCADcCiAogAEEANgKgCSAAQZwKakIANwIAIABBpApqQgA3AgAgAEEANgLACiAAQcMKakEANgAAIABB4AlqIQEgACgC4AkEQCAFIAEpAgA3AwggAyAFQQhqEAoLIAAoAugJBEAgBSAAQegJaikCADcDACADIAUQCgsgAUIANwIAIAFBADYCECABQgA3AgggBUEQaiQAIAZBgNAAQQEQKjYCBCAGIAA2AgALFAEBfyMMIgBCj4CAgNABNwMAIAALGAEBfyAAKAIAQQ9PBH8gACgCiAEFQQALC8EDAQl/IwBBIGsiAiQAIAAEQCACQgA3AxggAkIANwMQIAJCADcDCCACIAApAgA3AwAgAkEIaiACEAogAigCCCIDBEACQCACKAIMIgRFDQAgBEEETwRAIARBfHEhCQNAIAMgAUEDdGoiBSgCACMJIgYoAgARAgAgBSgCCCAGKAIAEQIAIAUoAhAgBigCABECACAF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OiVzAHNlbGVjdF9leGlzdGluZyBzeW1ib2w6JXMsIG92ZXJfc3ltYm9sOiVzAGNhbnRfcmV1c2Vfbm9kZSBzeW1ib2w6JXMsIGZpcnN0X2xlYWZfc3ltYm9sOiVzAHNraXBfdG9rZW4gc3ltYm9sOiVzAGlnbm9yZV9lbXB0eV9leHRlcm5hbF90b2tlbiBzeW1ib2w6JXMAcmV1c2FibGVfbm9kZV9oYXNfZGlmZmVyZW50X2V4dGVybmFsX3NjYW5uZXJfc3RhdGUgc3ltYm9sOiVzAHJldXNlX25vZGUgc3ltYm9sOiVzAHBhc3RfcmV1c2FibGVfbm9kZSBzeW1ib2w6JXMAYmVmb3JlX3JldXNhYmxlX25vZGUgc3ltYm9sOiVzAGNhbnRfcmV1c2Vfbm9kZV8lcyB0cmVlOiVzAGJyZWFrZG93bl90b3Bfb2Zfc3RhY2sgdHJlZTolcwBkZXRlY3RfZXJyb3IgbG9va2FoZWFkOiVzACglcwBpc19lcnJvcgBza2lwX3VucmVjb2duaXplZF9jaGFyYWN0ZXIAbmFuAFxuAGlzX21pc3NpbmcAcmVzdW1lX3BhcnNpbmcAcmVjb3Zlcl9lb2YAaW5mAG5ld19wYXJzZQBjb25kZW5zZQBkb25lAGlzX2ZyYWdpbGUAY29udGFpbnNfZGlmZmVyZW50X2luY2x1ZGVkX3JhbmdlAHNraXAgY2hhcmFjdGVyOiVkAGNvbnN1bWUgY2hhcmFjdGVyOiVkAHNlbGVjdF9oaWdoZXJfcHJlY2VkZW5jZSBzeW1ib2w6JXMsIHByZWM6JWQsIG92ZXJfc3ltYm9sOiVzLCBvdGhlcl9wcmVjOiVkAHNoaWZ0X2V4dHJhAG5vX2xvb2thaGVhZF9hZnRlcl9ub25fdGVybWluYWxfZXh0cmEAX19ST09UX18AX0VSUk9SAE5BTgBNSVNTSU5HAElORgBJTlZBTElEAGxleGVkX2xvb2thaGVhZCBzeW06ACAwMDAwMDAwMDAwMDAQMDAALgAoJXMpAChudWxsKQAoTlVMTCkAKCIlcyIpACdcdCcAJ1xyJwAnXG4nAHNraXAgY2hhcmFjdGVyOiclYycAY29uc3VtZSBjaGFyYWN0ZXI6JyVjJwAnXDAnACIlcyIAKE1JU1NJTkcgAChVTkVYUEVDVEVEIAAlczogAAoKAAAAAAAAAAAAAAABAAAAAAAAAAAAAAD//////////wAAAAD/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHg8PDwAAAAAAAAAAAQAAAAEAAAACAAAAAQAAAAIAAAABAAAAAgAAAAEAAAACAAAAAAAAAAAAAAASERMUFRYXGBkaGxwdHh8gIREiIyQRJSYnKCkqKywRLS4vEBAwEBAQEBAQEDEyMxA0NRAQERERERERERERERERERERERERERERERERETYRERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERE3ERERETgROTo7PD0+ERERERERERERERERERERERERERERERERERERERERERERERERERERERERET8QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBARQEERQkNERUZHSElKEUtMTU5PUFEQUlNUVVZXWFlaW1xdEF5fYBARERFhYmMQEBAQEBAQEBAQEREREWQQEBAQEBAQEBAQEBAQEBAREWUQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAREWZnEBBoaRERERERERERERERERERERERERERERERahERaxAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBARbG0QEBAQEBAQEBBuEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBBvcHFyEBAQEBAQEBBzdHUQEBAQEHZ3EBAQEHgQEHkQEBAQEBAQEBAQEBAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////////////////////////////////////////8AAAAAAAAAAP7//wf+//8HAAAAAAAEIAT//3////9//////////////////////////////////8P/AwAfUAAAAAAAAAAAAAAgAAAAAADfvEDX///7////////////v///////////////////////A/z///////////////////////////7///9/Av//////AQAAAAD/v7YA////hwcAAAD/B//////////+/8P////////////////vH/7h/58AAP///////wDg////////////////AwD//////wcwBP////z/HwAA////Af8HAAAAAAAA///fPwAA8P/4A////////////+//3+H/z//+/++f+f///cXjn1mAsM//AxDuh/n///1tw4cZAl7A/z8A7r/7///97eO/GwEAz/8AHu6f+f///e3jnxnAsM//AgDsxz3WGMf/w8cdgQDA/wAA79/9///9/+PfHWAHz/8AAO/f/f///e/j3x1gQM//BgDv3/3/////599d8IDP/wD87P9//P//+y9/gF//wP8MAP7/////f/8HPyD/AwAAAADW9///r///O18g//MAAAAAAQAAAP8DAAD//v///x/+/wP///7///8fAAAAAAAAAAD///////9/+f8D////////////P/////+/IP//////9////////////z1/Pf//////Pf////89fz3/f/////////89//////////8HAAAAAP//AAD/////////////Pz/+//////////////////////////////////////////////////////////+f///+//8H////////////x/8B/98PAP//DwD//w8A/98NAP///////8///wGAEP8DAAAAAP8D//////////////8B//////8H//////////8/AP///3//D/8BwP////8/HwD//////w////8D/wMAAAAA////D/////////9//v8fAP8D/wOAAAAAAAAAAAAAAAD////////v/+8P/wMAAAAA///////z////////v/8DAP///////38A/+P//////z//Af//////5wAAAAAA3m8E////////////////////////////////AAAAAID/HwD//z8//////z8//6r///8/////////31/cH88P/x/cHwAAAAAAAAAAAAAAAAAAAoAAAP8fAAAAAAAAAAAAAAAAhPwvPlC9//PgQwAA//////8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwP///////wMAAP//////f///////f/////////////////////8feAwA/////78g/////////4AAAP//fwB/f39/f39/f/////8AAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAD+Az4f/v///////////3/g/v/////////////34P///////v////////////9/AAD///8HAAAAAAAA////////////////////////////////PwAAAAAAAAAAAP///////////////////////////////////////wAA//////////////////////8fAAAAAAAAAAD//////z//H////w8AAP//////f/CP//////////////////8AAAAAgP/8////////////////+f///////3wAAAAAAID/v/////8AAAD///////8PAP//////////LwD/AwAA/Oj//////wf/////BwD///8f////////9/8AgP8D////f////////38A/z//A///f/z/////////fwUAADj//zwAfn5+AH9////////3/wD///////////////////8H/wP//////////////////////////w8A//9/+P//////D/////////////////8//////////////////wMAAAAAfwD44P/9f1/b/////////////////wMAAAD4////////////////PwAA///////////8////////AAAAAAD/DwAAAAAAAAAAAAAAAAAA3/////////////////////8fAAD/A/7//wf+//8HwP////////////9//Pz8HAAAAAD/7///f///t/8//z8AAAAA////////////////////BwAAAAAAAAAA////////HwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///x////////8BAAAAAAD/////AOD///8H//////8H////P/////8P/z4AAAAAAP////////////////////////8//wP/////D/////8P//////8A////////DwAAAAAAAAAAAAAAAAAAAAAAAAD///////9/AP//PwD/AAAAAAAAAAAAAAAAAAAAAAAAAD/9/////7+R//8/AP//fwD///9/AAAAAAAAAAD//zcA//8/AP///wMAAAAAAAAAAP/////////AAAAAAAAAAABv8O/+//8/AAAAAAD///8f////HwAAAAD//v//HwAAAP///////z8A//8/AP//BwD//wMAAAAAAAAAAAAAAAAA////////////AQAAAAAAAP///////wcA////////BwD//////wD/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///x+AAP//PwAAAAAAAAAAAAAAAAAAAAAAAAD//38A//////////8/AAAAwP8AAPz///////8BAAD///8B/wP////////H/3AA/////0cA//////////8eAP8XAAAAAP//+////59AAAAAAAAAAAB/vf+//wH/////////Af8D75/5///97eOfGYHgDwAAAAAAAAAAAAAAAAAAAAAAAAD//////////7sH/4MAAAAA//////////+zAP8DAAAAAAAAAAAAAAAAAAAAAAAAAAD///////8/fwAAAD8AAAAA/////////38RAP8DAAAAAP///////z8B/wMAAAAAAAD////n/wf/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////8BAAAAAAAAAAAAAAAA////////////AwCAAAAAAAAAAAAAAAAAAAAAAAAAAAD//P///////BoAAAD////////nfwAA////////////IAAAAAD/////////Af/9/////39/AQD/AwAA/P////z///5/AAAAAAAAAAAAf/v/////f7TLAP8Dv/3///9/ewH/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//9/AP////////////////////////8DAAAAAAAAAAAAAAAA/////////////////38AAP///////////////////////////////w8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////fwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////////9/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////Af///3//AwAAAAAAAAAAAAAAAP///z8AAP///////wAADwD/A/j//+D//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////////wAAAAAAAAAAAAAAAAAAAAD///////////+H/////////4D//wAAAAAAAAAACwAAAP////////////////////////////////////////8A////////////////////////////////////////BwD///9/AAAAAAAABwDwAP////////////////////////////////////////////////////////////////8P/////////////////wf/H/8B/0MAAAAAAAAAAAAAAAD/////////////3///////////32Te/+vv/////////7/n39////97X/z9//////////////////////////////////////////////////////8//////f//9/////f//9/////f//9/////f/////3////9///3z////////3////nbBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////8fgD//QwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////w//A////////////////////////////////x8AAAAAAAAA//////////+PCP8DAAAAAAAAAAAAAAAAAAAAAAAAAADv////lv73CoTqlqqW9/de//v/D+77/w8AAAAAAAAAAAAAAAAAAP///wP///8D////AwAAAAAAAAAAAAAAAAAAIAAAAAkAAAAKAAAADQAAAAsAAAAMAAAAhQAAAAAgAAABIAAAAiAAAAMgAAAEIAAABSAAAAYgAAAIIAAACSAAAAogAAAoIAAAKSAAAF8gAAAAMAAAAAAAAAAAAAAAAAAAGQALABkZGQAAAAAFAAAAAAAACQAAAAALAAAAAAAAAAAZAAoKGRkZAwoHAAEACQsYAAAJBgsAAAsABhkAAAAZGRkAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAGQALDRkZGQANAAACAAkOAAAACQAOAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAABMAAAAAEwAAAAAJDAAAAAAADAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAPAAAABA8AAAAACRAAAAAAABAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgAAAAAAAAAAAAAAEQAAAAARAAAAAAkSAAAAAAASAAASAAAaAAAAGhoaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABoAAAAaGhoAAAAAAAAJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAXAAAAABcAAAAACRQAAAAAABQAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFgAAAAAAAAAAAAAAFQAAAAAVAAAAAAkWAAAAAAAWAAAWAAAwMTIzNDU2Nzg5QUJDREVGAAgAAFYBAAA5AAAAAAAAAAAAAAABIAAAAOD//wC/HQAA5wIAAHkAAAIkAAABAQAAAP///wAAAAABAgAAAP7//wE5//8AGP//AYf//wDU/v8AwwAAAdIAAAHOAAABzQAAAU8AAAHKAAABywAAAc8AAABhAAAB0wAAAdEAAACjAAAB1QAAAIIAAAHWAAAB2gAAAdkAAAHbAAAAOAAAAwAAAACx//8Bn///Acj//wIoJAAAAAAAAQEAAAD///8AM///ACb//wF+//8BKyoAAV3//wEoKgAAPyoAAT3//wFFAAABRwAAAB8qAAAcKgAAHioAAC7//wAy//8ANv//ADX//wBPpQAAS6UAADH//wAopQAARKUAAC///wAt//8A9ykAAEGlAAD9KQAAK///ACr//wDnKQAAQ6UAACqlAAC7//8AJ///ALn//wAl//8AFaUAABKlAAIkTAAAAAAAASAAAADg//8BAQAAAP///wBUAAABdAAAASYAAAElAAABQAAAAT8AAADa//8A2///AOH//wDA//8Awf//AQgAAADC//8Ax///ANH//wDK//8A+P//AKr//wCw//8ABwAAAIz//wHE//8AoP//Afn//wIacAABAQAAAP///wEgAAAA4P//AVAAAAEPAAAA8f//AAAAAAEwAAAA0P//AQEAAAD///8AAAAAAMALAAFgHAAAAAAAAdCXAAEIAAAA+P//AgWKAAAAAAABQPT/AJ7n/wDCiQAA2+f/AJLn/wCT5/8AnOf/AJ3n/wCk5/8AAAAAADiKAAAEigAA5g4AAQEAAAD///8AAAAAAMX//wFB4v8CHY8AAAgAAAH4//8AAAAAAFYAAAGq//8ASgAAAGQAAACAAAAAcAAAAH4AAAAJAAABtv//Aff//wDb4/8BnP//AZD//wGA//8Bgv//AgWsAAAAAAABEAAAAPD//wEcAAABAQAAAaPi/wFB3/8But//AOT//wILsQABAQAAAP///wEwAAAA0P//AAAAAAEJ1v8BGvH/ARnW/wDV1f8A2NX/AeTV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////AEBJAAAAAAAYAP//ANgAAAAAAAAAAQA8AAAAAAAAAAAAAAAAEOABHgBg/78AAAAAAAD/BwAAAAAAAAAAAAAAAAAAAAAAAAD4z+MAAAADACD/fwAAAE4AAAAAAAAAAAAAAAAAAAgAB/wAAAAAAAAAAAAQACAeADAAAQAAAAAAAAAAEAAgAAAAAPxvAAAAAAAAABAAIAAAAABAAAAAAAAAAAAQACAAAAAAA+AAAAAAAAAAEAAgAAAAAP0AAAAAAAAAAAAAIAAAAAD/BxAAAAAAAAAAACAAAAAAgP8QAAAAAAAAEAAgAAAAAAAAAAAAAAAAABgAoAB/AAD/AwAAAAAAAAAAAAQAAAAAEAAAAAAAAIAAgMDfAAwAAAAAAAAAAAAAAAQAHwAAAAAAAP7///8A/P//AAAAAAAAAAD8AAAAAAAAwP/f/wcAAAAAAAAAAAAAgAYA/AAAAAAAAAAAAMAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAOD///8fAAD/AwAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAEAABgAAAAAAAAAAAA4AAAAABAAAABwAAAAAAAAAAAAAAAAAAAAMAAA/n8vAAD/A/9/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4xAAAAAAAAAAAAAAAAAAAAAAAAxP////8AAADAAAAAAAAAAAABAOCfAAAAAH8//38AAAAAAAAAAAAAAAAAABAAEAAA/P///x8AAAAAAAwAAAAAAABAAAzwAAAAAAAAgPgAAAAAAAAAwAAAAAAAAAAA/wD///8hkAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////fwDg+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAPgAOAA4ABggPj////8//////9/3//xf/9/AAD/////AAD/////AQB7A9DBr0IADB+8//8AAAAAAA7///////////////////////9/AAAA/wcAAP////////////8/AAAAAAAA/P/////////////////////P////P/////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4IcD/gAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAA//////9//////wAAAAAAAP////v/////////////DwD//////////////////////////////////z8AAAD/Dx7///8B/MHgAAAAAAAAAAAAAAAeAQAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAA//8AAAAA/////w8AAAD///9//////////////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////////AAAAAAAAAAAAAAAAAAAAAAAA////////fwAAAAAAAMAA4AAAAAAAAAAAAAAAgA9wAAAAAAAAAAAAAAAAAAD/AP//fwADAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAAAAAQAAAAAAP/wMAAAAAAADwAAAAAAAAAAAAEMAAAP//AxcAAAAAAPgAAAAACIAAAAAAAAAAAAAACAD/PwDAAAAAAAAAAAAAAAAAAAAA8AAAgAMAAAAAAAAAgAIAAMAAAEMAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAA4AAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAACAAAAAAAAAAAAAAAAAAAAAPz/AwAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMP///wP////////3/38PAAAAAAAAAAAAAAAAAAAAAACA/v8A/AEAAPgBAAD4PwAAAAAAAAAAAAAAAAAAAH9/ADCH//////+P/wAAAAAAAOD//3//DwEAAAAAAP//////PwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8PAAAAAA8AAAAAAAAAAAAAAAAAAIAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA/wAAgP8AAAAAgP8AAAAAAAAAAAD4AADAjwAAAIAAAAAAAAAAAAAAAAAAAAAw///8//////8AAAAAAAAAh/8B/wEAAADgAAAA4AAAAAAAAQAAYPh/AAAAAAAAAAD+AAAA/wAAAP8AAAAeAP4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwAAAAAAAAAAAAAAAD///9/AAAAAAAAAAAAAAAAAAAAAAAAAOB/AAAAwP//AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAP/z/PwAAgAMAAAAAAAD+AyAAAAAAAAAAAAAAAAAYAA8AAAAAADgAAAAAAAAAAADhPwDo/v8fAAAAAAAAAGA/AAAAAAAAAAAAAAAAAAIAAAAAAAAABgAAAAAAAAAAABgAIAAAwB8fAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAET4AGgAAAAAAAAAAAAAAABMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgP///wAAAAAAAAAAAAAAAIAOAAAA/x8AAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAgA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAA/AcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAYgP8AAAAAAAAAAAAA3wcAAAAAAAAAAAAAAAAAAAAAAACAPgAA/P8fAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0AAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///////wOAAAAAAAAAAAAAAAAAAAAfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAD8AAAAAAAAA//8wAAD4AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAALAPAAAAAAAAAAAAAAD///////////////////////////////////////8/AP////9//v//////////////////////////////AQAA//////////8/AAAAAAAAAAAAAAAAAAAAAAAAAP//DwD/////////////fwD///8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAgAAAAIAAAgAAAAIAAAgAAAAIAAAAACAAAAAgAACAAAAAAAAAD//////////////////////w8A+P7/AAAAAAAAAAAAAAAAAAAAAH8AAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA/38AAAAAAAAAAAAAAAAAcAcAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/////////x8AAAAAAAAAAAD+////////PwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMA//////8P////////////////DwD/f/7//v/+////PwD/H/////8AAAD8AAAAHAAAAPz///8fAAAAAAAAwP///wcA//////8P/wEDAD8AAAAAAAAAAAAAAAAAAAAAAAAA//////////////////////////////////8/AP8f/wf//////////////////w8A//////////////8B/w8AAP8P/////////wD/A///////AP///z8AAAAAAAAAAAAA/+////////////////97/P/////nx////+f/////////////////////DwD/Pw8HBwA/AAAAAAAAAAAAAAAAABAAAAARAAAAEgAAABMAAAAAAAAAFgAAAAAAAAAXAAAAACAAAAAAAAAFAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAAAAGgAAAEQ7AAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAA//////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACIOQAAAAAAAAAqEHNvdXJjZU1hcHBpbmdVUkwYd2ViLXRyZWUtc2l0dGVyLndhc20ubWFw", import.meta.url).href;
  }
  __name(findWasmBinary, "findWasmBinary");
  function getBinarySync(A) {
    if (A == wasmBinaryFile && wasmBinary)
      return new Uint8Array(wasmBinary);
    if (readBinary)
      return readBinary(A);
    throw "both async and sync fetching of the wasm failed";
  }
  __name(getBinarySync, "getBinarySync");
  async function getWasmBinary(A) {
    if (!wasmBinary)
      try {
        var I = await readAsync(A);
        return new Uint8Array(I);
      } catch {
      }
    return getBinarySync(A);
  }
  __name(getWasmBinary, "getWasmBinary");
  async function instantiateArrayBuffer(A, I) {
    try {
      var g = await getWasmBinary(A), Q = await WebAssembly.instantiate(g, I);
      return Q;
    } catch (B) {
      err(`failed to asynchronously prepare wasm: ${B}`), abort(B);
    }
  }
  __name(instantiateArrayBuffer, "instantiateArrayBuffer");
  async function instantiateAsync(A, I, g) {
    if (!A && !isFileURI(I) && !ENVIRONMENT_IS_NODE)
      try {
        var Q = fetch(I, {
          credentials: "same-origin"
        }), B = await WebAssembly.instantiateStreaming(Q, g);
        return B;
      } catch (E) {
        err(`wasm streaming compile failed: ${E}`), err("falling back to ArrayBuffer instantiation");
      }
    return instantiateArrayBuffer(I, g);
  }
  __name(instantiateAsync, "instantiateAsync");
  function getWasmImports() {
    return {
      env: wasmImports,
      wasi_snapshot_preview1: wasmImports,
      "GOT.mem": new Proxy(wasmImports, GOTHandler),
      "GOT.func": new Proxy(wasmImports, GOTHandler)
    };
  }
  __name(getWasmImports, "getWasmImports");
  async function createWasm() {
    function A(E, o) {
      wasmExports = E.exports, wasmExports = relocateExports(wasmExports, 1024);
      var e = getDylinkMetadata(o);
      return e.neededDynlibs && (dynamicLibraries = e.neededDynlibs.concat(dynamicLibraries)), mergeLibSymbols(wasmExports, "main"), LDSO.init(), loadDylibs(), __RELOC_FUNCS__.push(wasmExports.__wasm_apply_data_relocs), assignWasmExports(wasmExports), wasmExports;
    }
    __name(A, "receiveInstance");
    function I(E) {
      return A(E.instance, E.module);
    }
    __name(I, "receiveInstantiationResult");
    var g = getWasmImports();
    if (Module.instantiateWasm)
      return new Promise((E, o) => {
        Module.instantiateWasm(g, (e, s) => {
          E(A(e, s));
        });
      });
    wasmBinaryFile ??= findWasmBinary();
    var Q = await instantiateAsync(wasmBinary, wasmBinaryFile, g), B = I(Q);
    return B;
  }
  __name(createWasm, "createWasm");
  class ExitStatus {
    static {
      __name(this, "ExitStatus");
    }
    name = "ExitStatus";
    constructor(I) {
      this.message = `Program terminated with exit(${I})`, this.status = I;
    }
  }
  var GOT = {}, currentModuleWeakSymbols = /* @__PURE__ */ new Set([]), GOTHandler = {
    get(A, I) {
      var g = GOT[I];
      return g || (g = GOT[I] = new WebAssembly.Global({
        value: "i32",
        mutable: !0
      })), currentModuleWeakSymbols.has(I) || (g.required = !0), g;
    }
  }, LE_HEAP_LOAD_F32 = /* @__PURE__ */ __name((A) => HEAP_DATA_VIEW.getFloat32(A, !0), "LE_HEAP_LOAD_F32"), LE_HEAP_LOAD_F64 = /* @__PURE__ */ __name((A) => HEAP_DATA_VIEW.getFloat64(A, !0), "LE_HEAP_LOAD_F64"), LE_HEAP_LOAD_I16 = /* @__PURE__ */ __name((A) => HEAP_DATA_VIEW.getInt16(A, !0), "LE_HEAP_LOAD_I16"), LE_HEAP_LOAD_I32 = /* @__PURE__ */ __name((A) => HEAP_DATA_VIEW.getInt32(A, !0), "LE_HEAP_LOAD_I32"), LE_HEAP_LOAD_I64 = /* @__PURE__ */ __name((A) => HEAP_DATA_VIEW.getBigInt64(A, !0), "LE_HEAP_LOAD_I64"), LE_HEAP_LOAD_U32 = /* @__PURE__ */ __name((A) => HEAP_DATA_VIEW.getUint32(A, !0), "LE_HEAP_LOAD_U32"), LE_HEAP_STORE_F32 = /* @__PURE__ */ __name((A, I) => HEAP_DATA_VIEW.setFloat32(A, I, !0), "LE_HEAP_STORE_F32"), LE_HEAP_STORE_F64 = /* @__PURE__ */ __name((A, I) => HEAP_DATA_VIEW.setFloat64(A, I, !0), "LE_HEAP_STORE_F64"), LE_HEAP_STORE_I16 = /* @__PURE__ */ __name((A, I) => HEAP_DATA_VIEW.setInt16(A, I, !0), "LE_HEAP_STORE_I16"), LE_HEAP_STORE_I32 = /* @__PURE__ */ __name((A, I) => HEAP_DATA_VIEW.setInt32(A, I, !0), "LE_HEAP_STORE_I32"), LE_HEAP_STORE_I64 = /* @__PURE__ */ __name((A, I) => HEAP_DATA_VIEW.setBigInt64(A, I, !0), "LE_HEAP_STORE_I64"), LE_HEAP_STORE_U32 = /* @__PURE__ */ __name((A, I) => HEAP_DATA_VIEW.setUint32(A, I, !0), "LE_HEAP_STORE_U32"), callRuntimeCallbacks = /* @__PURE__ */ __name((A) => {
    for (; A.length > 0; )
      A.shift()(Module);
  }, "callRuntimeCallbacks"), onPostRuns = [], addOnPostRun = /* @__PURE__ */ __name((A) => onPostRuns.push(A), "addOnPostRun"), onPreRuns = [], addOnPreRun = /* @__PURE__ */ __name((A) => onPreRuns.push(A), "addOnPreRun"), UTF8Decoder = typeof TextDecoder < "u" ? new TextDecoder() : void 0, findStringEnd = /* @__PURE__ */ __name((A, I, g, Q) => {
    var B = I + g;
    if (Q) return B;
    for (; A[I] && !(I >= B); ) ++I;
    return I;
  }, "findStringEnd"), UTF8ArrayToString = /* @__PURE__ */ __name((A, I = 0, g, Q) => {
    var B = findStringEnd(A, I, g, Q);
    if (B - I > 16 && A.buffer && UTF8Decoder)
      return UTF8Decoder.decode(A.subarray(I, B));
    for (var E = ""; I < B; ) {
      var o = A[I++];
      if (!(o & 128)) {
        E += String.fromCharCode(o);
        continue;
      }
      var e = A[I++] & 63;
      if ((o & 224) == 192) {
        E += String.fromCharCode((o & 31) << 6 | e);
        continue;
      }
      var s = A[I++] & 63;
      if ((o & 240) == 224 ? o = (o & 15) << 12 | e << 6 | s : o = (o & 7) << 18 | e << 12 | s << 6 | A[I++] & 63, o < 65536)
        E += String.fromCharCode(o);
      else {
        var D = o - 65536;
        E += String.fromCharCode(55296 | D >> 10, 56320 | D & 1023);
      }
    }
    return E;
  }, "UTF8ArrayToString"), getDylinkMetadata = /* @__PURE__ */ __name((A) => {
    var I = 0, g = 0;
    function Q() {
      return A[I++];
    }
    __name(Q, "getU8");
    function B() {
      for (var F = 0, S = 1; ; ) {
        var k = A[I++];
        if (F += (k & 127) * S, S *= 128, !(k & 128)) break;
      }
      return F;
    }
    __name(B, "getLEB");
    function E() {
      var F = B();
      return I += F, UTF8ArrayToString(A, I - F, F);
    }
    __name(E, "getString");
    function o() {
      for (var F = B(), S = []; F--; ) S.push(E());
      return S;
    }
    __name(o, "getStringList");
    function e(F, S) {
      if (F) throw new Error(S);
    }
    if (__name(e, "failIf"), A instanceof WebAssembly.Module) {
      var s = WebAssembly.Module.customSections(A, "dylink.0");
      e(s.length === 0, "need dylink section"), A = new Uint8Array(s[0]), g = A.length;
    } else {
      var D = new Uint32Array(new Uint8Array(A.subarray(0, 24)).buffer), r = D[0] == 1836278016 || D[0] == 6386541;
      e(!r, "need to see wasm magic number"), e(A[8] !== 0, "need the dylink section to be first"), I = 9;
      var t = B();
      g = I + t;
      var n = E();
      e(n !== "dylink.0");
    }
    for (var y = {
      neededDynlibs: [],
      tlsExports: /* @__PURE__ */ new Set(),
      weakImports: /* @__PURE__ */ new Set(),
      runtimePaths: []
    }, M = 1, U = 2, c = 3, l = 4, h = 5, _ = 256, K = 3, Y = 1; I < g; ) {
      var J = Q(), a = B();
      if (J === M)
        y.memorySize = B(), y.memoryAlign = B(), y.tableSize = B(), y.tableAlign = B();
      else if (J === U)
        y.neededDynlibs = o();
      else if (J === c)
        for (var w = B(); w--; ) {
          var N = E(), R = B();
          R & _ && y.tlsExports.add(N);
        }
      else if (J === l)
        for (var w = B(); w--; ) {
          E();
          var N = E(), R = B();
          (R & K) == Y && y.weakImports.add(N);
        }
      else J === h ? y.runtimePaths = o() : I += a;
    }
    return y;
  }, "getDylinkMetadata");
  function getValue(A, I = "i8") {
    switch (I.endsWith("*") && (I = "*"), I) {
      case "i1":
        return HEAP8[A];
      case "i8":
        return HEAP8[A];
      case "i16":
        return LE_HEAP_LOAD_I16((A >> 1) * 2);
      case "i32":
        return LE_HEAP_LOAD_I32((A >> 2) * 4);
      case "i64":
        return LE_HEAP_LOAD_I64((A >> 3) * 8);
      case "float":
        return LE_HEAP_LOAD_F32((A >> 2) * 4);
      case "double":
        return LE_HEAP_LOAD_F64((A >> 3) * 8);
      case "*":
        return LE_HEAP_LOAD_U32((A >> 2) * 4);
      default:
        abort(`invalid type for getValue: ${I}`);
    }
  }
  __name(getValue, "getValue");
  var newDSO = /* @__PURE__ */ __name((A, I, g) => {
    var Q = {
      refcount: 1 / 0,
      name: A,
      exports: g,
      global: !0
    };
    return LDSO.loadedLibsByName[A] = Q, I != null && (LDSO.loadedLibsByHandle[I] = Q), Q;
  }, "newDSO"), LDSO = {
    loadedLibsByName: {},
    loadedLibsByHandle: {},
    init() {
      newDSO("__main__", 0, wasmImports);
    }
  }, ___heap_base = 82240, alignMemory = /* @__PURE__ */ __name((A, I) => Math.ceil(A / I) * I, "alignMemory"), getMemory = /* @__PURE__ */ __name((A) => {
    if (runtimeInitialized)
      return _calloc(A, 1);
    var I = ___heap_base, g = I + alignMemory(A, 16);
    return ___heap_base = g, GOT.__heap_base.value = g, I;
  }, "getMemory"), isInternalSym = /* @__PURE__ */ __name((A) => ["__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js"].includes(A) || A.startsWith("__em_js__"), "isInternalSym"), uleb128EncodeWithLen = /* @__PURE__ */ __name((A) => {
    const I = A.length;
    return [I % 128 | 128, I >> 7, ...A];
  }, "uleb128EncodeWithLen"), wasmTypeCodes = {
    i: 127,
    // i32
    p: 127,
    // i32
    j: 126,
    // i64
    f: 125,
    // f32
    d: 124,
    // f64
    e: 111
  }, generateTypePack = /* @__PURE__ */ __name((A) => uleb128EncodeWithLen(Array.from(A, (I) => {
    var g = wasmTypeCodes[I];
    return g;
  })), "generateTypePack"), convertJsFunctionToWasm = /* @__PURE__ */ __name((A, I) => {
    var g = Uint8Array.of(
      0,
      97,
      115,
      109,
      // magic ("\0asm")
      1,
      0,
      0,
      0,
      // version: 1
      1,
      ...uleb128EncodeWithLen([
        1,
        // count: 1
        96,
        // param types
        ...generateTypePack(I.slice(1)),
        // return types (for now only supporting [] if `void` and single [T] otherwise)
        ...generateTypePack(I[0] === "v" ? "" : I[0])
      ]),
      // The rest of the module is static
      2,
      7,
      // import section
      // (import "e" "f" (func 0 (type 0)))
      1,
      1,
      101,
      1,
      102,
      0,
      0,
      7,
      5,
      // export section
      // (export "f" (func 0 (type 0)))
      1,
      1,
      102,
      0,
      0
    ), Q = new WebAssembly.Module(g), B = new WebAssembly.Instance(Q, {
      e: {
        f: A
      }
    }), E = B.exports.f;
    return E;
  }, "convertJsFunctionToWasm"), wasmTableMirror = [], wasmTable = new WebAssembly.Table({
    initial: 31,
    element: "anyfunc"
  }), getWasmTableEntry = /* @__PURE__ */ __name((A) => {
    var I = wasmTableMirror[A];
    return I || (wasmTableMirror[A] = I = wasmTable.get(A)), I;
  }, "getWasmTableEntry"), updateTableMap = /* @__PURE__ */ __name((A, I) => {
    if (functionsInTableMap)
      for (var g = A; g < A + I; g++) {
        var Q = getWasmTableEntry(g);
        Q && functionsInTableMap.set(Q, g);
      }
  }, "updateTableMap"), functionsInTableMap, getFunctionAddress = /* @__PURE__ */ __name((A) => (functionsInTableMap || (functionsInTableMap = /* @__PURE__ */ new WeakMap(), updateTableMap(0, wasmTable.length)), functionsInTableMap.get(A) || 0), "getFunctionAddress"), freeTableIndexes = [], getEmptyTableSlot = /* @__PURE__ */ __name(() => freeTableIndexes.length ? freeTableIndexes.pop() : wasmTable.grow(1), "getEmptyTableSlot"), setWasmTableEntry = /* @__PURE__ */ __name((A, I) => {
    wasmTable.set(A, I), wasmTableMirror[A] = wasmTable.get(A);
  }, "setWasmTableEntry"), addFunction = /* @__PURE__ */ __name((A, I) => {
    var g = getFunctionAddress(A);
    if (g)
      return g;
    var Q = getEmptyTableSlot();
    try {
      setWasmTableEntry(Q, A);
    } catch (E) {
      if (!(E instanceof TypeError))
        throw E;
      var B = convertJsFunctionToWasm(A, I);
      setWasmTableEntry(Q, B);
    }
    return functionsInTableMap.set(A, Q), Q;
  }, "addFunction"), updateGOT = /* @__PURE__ */ __name((A, I) => {
    for (var g in A)
      if (!isInternalSym(g)) {
        var Q = A[g];
        GOT[g] ||= new WebAssembly.Global({
          value: "i32",
          mutable: !0
        }), (I || GOT[g].value == 0) && (typeof Q == "function" ? GOT[g].value = addFunction(Q) : typeof Q == "number" ? GOT[g].value = Q : err(`unhandled export type for '${g}': ${typeof Q}`));
      }
  }, "updateGOT"), relocateExports = /* @__PURE__ */ __name((A, I, g) => {
    var Q = {};
    for (var B in A) {
      var E = A[B];
      typeof E == "object" && (E = E.value), typeof E == "number" && (E += I), Q[B] = E;
    }
    return updateGOT(Q, g), Q;
  }, "relocateExports"), isSymbolDefined = /* @__PURE__ */ __name((A) => {
    var I = wasmImports[A];
    return !(!I || I.stub);
  }, "isSymbolDefined"), dynCall = /* @__PURE__ */ __name((A, I, g = [], Q = !1) => {
    var B = getWasmTableEntry(I), E = B(...g);
    function o(e) {
      return e;
    }
    return __name(o, "convert"), E;
  }, "dynCall"), stackSave = /* @__PURE__ */ __name(() => _emscripten_stack_get_current(), "stackSave"), stackRestore = /* @__PURE__ */ __name((A) => __emscripten_stack_restore(A), "stackRestore"), createInvokeFunction = /* @__PURE__ */ __name((A) => (I, ...g) => {
    var Q = stackSave();
    try {
      return dynCall(A, I, g);
    } catch (B) {
      if (stackRestore(Q), B !== B + 0) throw B;
      if (_setThrew(1, 0), A[0] == "j") return 0n;
    }
  }, "createInvokeFunction"), resolveGlobalSymbol = /* @__PURE__ */ __name((A, I = !1) => {
    var g;
    return isSymbolDefined(A) ? g = wasmImports[A] : A.startsWith("invoke_") && (g = wasmImports[A] = createInvokeFunction(A.split("_")[1])), {
      sym: g,
      name: A
    };
  }, "resolveGlobalSymbol"), onPostCtors = [], addOnPostCtor = /* @__PURE__ */ __name((A) => onPostCtors.push(A), "addOnPostCtor"), UTF8ToString = /* @__PURE__ */ __name((A, I, g) => A ? UTF8ArrayToString(HEAPU8, A, I, g) : "", "UTF8ToString"), loadWebAssemblyModule = /* @__PURE__ */ __name((binary, flags, libName, localScope, handle) => {
    var metadata = getDylinkMetadata(binary);
    function loadModule() {
      var memAlign = Math.pow(2, metadata.memoryAlign), memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0, tableBase = metadata.tableSize ? wasmTable.length : 0;
      handle && (HEAP8[handle + 8] = 1, LE_HEAP_STORE_U32((handle + 12 >> 2) * 4, memoryBase), LE_HEAP_STORE_I32((handle + 16 >> 2) * 4, metadata.memorySize), LE_HEAP_STORE_U32((handle + 20 >> 2) * 4, tableBase), LE_HEAP_STORE_I32((handle + 24 >> 2) * 4, metadata.tableSize)), metadata.tableSize && wasmTable.grow(metadata.tableSize);
      var moduleExports;
      function resolveSymbol(A) {
        var I = resolveGlobalSymbol(A).sym;
        return !I && localScope && (I = localScope[A]), I || (I = moduleExports[A]), I;
      }
      __name(resolveSymbol, "resolveSymbol");
      var proxyHandler = {
        get(A, I) {
          switch (I) {
            case "__memory_base":
              return memoryBase;
            case "__table_base":
              return tableBase;
          }
          if (I in wasmImports && !wasmImports[I].stub) {
            var g = wasmImports[I];
            return g;
          }
          if (!(I in A)) {
            var Q;
            A[I] = (...B) => (Q ||= resolveSymbol(I), Q(...B));
          }
          return A[I];
        }
      }, proxy = new Proxy({}, proxyHandler);
      currentModuleWeakSymbols = metadata.weakImports;
      var info = {
        "GOT.mem": new Proxy({}, GOTHandler),
        "GOT.func": new Proxy({}, GOTHandler),
        env: proxy,
        wasi_snapshot_preview1: proxy
      };
      function postInstantiation(module, instance) {
        updateTableMap(tableBase, metadata.tableSize), moduleExports = relocateExports(instance.exports, memoryBase), flags.allowUndefined || reportUndefinedSymbols();
        function addEmAsm(addr, body) {
          for (var args = [], arity = 0; arity < 16 && body.indexOf("$" + arity) != -1; arity++)
            args.push("$" + arity);
          args = args.join(",");
          var func = `(${args}) => { ${body} };`;
          eval(func);
        }
        if (__name(addEmAsm, "addEmAsm"), "__start_em_asm" in moduleExports)
          for (var start = moduleExports.__start_em_asm, stop = moduleExports.__stop_em_asm; start < stop; ) {
            var jsString = UTF8ToString(start);
            addEmAsm(start, jsString), start = HEAPU8.indexOf(0, start) + 1;
          }
        function addEmJs(name, cSig, body) {
          var jsArgs = [];
          if (cSig = cSig.slice(1, -1), cSig != "void") {
            cSig = cSig.split(",");
            for (var i in cSig) {
              var jsArg = cSig[i].split(" ").pop();
              jsArgs.push(jsArg.replace("*", ""));
            }
          }
          var func = `(${jsArgs}) => ${body};`;
          moduleExports[name] = eval(func);
        }
        __name(addEmJs, "addEmJs");
        for (var name in moduleExports)
          if (name.startsWith("__em_js__")) {
            var start = moduleExports[name], jsString = UTF8ToString(start), parts = jsString.split("<::>");
            addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]), delete moduleExports[name];
          }
        var applyRelocs = moduleExports.__wasm_apply_data_relocs;
        applyRelocs && (runtimeInitialized ? applyRelocs() : __RELOC_FUNCS__.push(applyRelocs));
        var init = moduleExports.__wasm_call_ctors;
        return init && (runtimeInitialized ? init() : addOnPostCtor(init)), moduleExports;
      }
      if (__name(postInstantiation, "postInstantiation"), flags.loadAsync)
        return (async () => {
          var A;
          return binary instanceof WebAssembly.Module ? A = new WebAssembly.Instance(binary, info) : { module: binary, instance: A } = await WebAssembly.instantiate(binary, info), postInstantiation(binary, A);
        })();
      var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary), instance = new WebAssembly.Instance(module, info);
      return postInstantiation(module, instance);
    }
    return __name(loadModule, "loadModule"), flags = {
      ...flags,
      rpath: {
        parentLibPath: libName,
        paths: metadata.runtimePaths
      }
    }, flags.loadAsync ? metadata.neededDynlibs.reduce((A, I) => A.then(() => loadDynamicLibrary(I, flags, localScope)), Promise.resolve()).then(loadModule) : (metadata.neededDynlibs.forEach((A) => loadDynamicLibrary(A, flags, localScope)), loadModule());
  }, "loadWebAssemblyModule"), mergeLibSymbols = /* @__PURE__ */ __name((A, I) => {
    for (var [g, Q] of Object.entries(A)) {
      const B = /* @__PURE__ */ __name((o) => {
        isSymbolDefined(o) || (wasmImports[o] = Q);
      }, "setImport");
      B(g);
      const E = "__main_argc_argv";
      g == "main" && B(E), g == E && B("main");
    }
  }, "mergeLibSymbols"), asyncLoad = /* @__PURE__ */ __name(async (A) => {
    var I = await readAsync(A);
    return new Uint8Array(I);
  }, "asyncLoad");
  function loadDynamicLibrary(A, I = {
    global: !0,
    nodelete: !0
  }, g, Q) {
    var B = LDSO.loadedLibsByName[A];
    if (B)
      return I.global ? B.global || (B.global = !0, mergeLibSymbols(B.exports, A)) : g && Object.assign(g, B.exports), I.nodelete && B.refcount !== 1 / 0 && (B.refcount = 1 / 0), B.refcount++, Q && (LDSO.loadedLibsByHandle[Q] = B), I.loadAsync ? Promise.resolve(!0) : !0;
    B = newDSO(A, Q, "loading"), B.refcount = I.nodelete ? 1 / 0 : 1, B.global = I.global;
    function E() {
      if (Q) {
        var s = LE_HEAP_LOAD_U32((Q + 28 >> 2) * 4), D = LE_HEAP_LOAD_U32((Q + 32 >> 2) * 4);
        if (s && D) {
          var r = HEAP8.slice(s, s + D);
          return I.loadAsync ? Promise.resolve(r) : r;
        }
      }
      var t = locateFile(A);
      if (I.loadAsync)
        return asyncLoad(t);
      if (!readBinary)
        throw new Error(`${t}: file not found, and synchronous loading of external files is not available`);
      return readBinary(t);
    }
    __name(E, "loadLibData");
    function o() {
      return I.loadAsync ? E().then((s) => loadWebAssemblyModule(s, I, A, g, Q)) : loadWebAssemblyModule(E(), I, A, g, Q);
    }
    __name(o, "getExports");
    function e(s) {
      B.global ? mergeLibSymbols(s, A) : g && Object.assign(g, s), B.exports = s;
    }
    return __name(e, "moduleLoaded"), I.loadAsync ? o().then((s) => (e(s), !0)) : (e(o()), !0);
  }
  __name(loadDynamicLibrary, "loadDynamicLibrary");
  var reportUndefinedSymbols = /* @__PURE__ */ __name(() => {
    for (var [A, I] of Object.entries(GOT))
      if (I.value == 0) {
        var g = resolveGlobalSymbol(A, !0).sym;
        if (!g && !I.required)
          continue;
        if (typeof g == "function")
          I.value = addFunction(g, g.sig);
        else if (typeof g == "number")
          I.value = g;
        else
          throw new Error(`bad export type for '${A}': ${typeof g}`);
      }
  }, "reportUndefinedSymbols"), runDependencies = 0, dependenciesFulfilled = null, removeRunDependency = /* @__PURE__ */ __name((A) => {
    if (runDependencies--, Module.monitorRunDependencies?.(runDependencies), runDependencies == 0 && dependenciesFulfilled) {
      var I = dependenciesFulfilled;
      dependenciesFulfilled = null, I();
    }
  }, "removeRunDependency"), addRunDependency = /* @__PURE__ */ __name((A) => {
    runDependencies++, Module.monitorRunDependencies?.(runDependencies);
  }, "addRunDependency"), loadDylibs = /* @__PURE__ */ __name(async () => {
    if (!dynamicLibraries.length) {
      reportUndefinedSymbols();
      return;
    }
    addRunDependency("loadDylibs");
    for (var A of dynamicLibraries)
      await loadDynamicLibrary(A, {
        loadAsync: !0,
        global: !0,
        nodelete: !0,
        allowUndefined: !0
      });
    reportUndefinedSymbols(), removeRunDependency("loadDylibs");
  }, "loadDylibs"), noExitRuntime = !0;
  function setValue(A, I, g = "i8") {
    switch (g.endsWith("*") && (g = "*"), g) {
      case "i1":
        HEAP8[A] = I;
        break;
      case "i8":
        HEAP8[A] = I;
        break;
      case "i16":
        LE_HEAP_STORE_I16((A >> 1) * 2, I);
        break;
      case "i32":
        LE_HEAP_STORE_I32((A >> 2) * 4, I);
        break;
      case "i64":
        LE_HEAP_STORE_I64((A >> 3) * 8, BigInt(I));
        break;
      case "float":
        LE_HEAP_STORE_F32((A >> 2) * 4, I);
        break;
      case "double":
        LE_HEAP_STORE_F64((A >> 3) * 8, I);
        break;
      case "*":
        LE_HEAP_STORE_U32((A >> 2) * 4, I);
        break;
      default:
        abort(`invalid type for setValue: ${g}`);
    }
  }
  __name(setValue, "setValue");
  var ___memory_base = new WebAssembly.Global({
    value: "i32",
    mutable: !1
  }, 1024), ___stack_high = 82240, ___stack_low = 16704, ___stack_pointer = new WebAssembly.Global({
    value: "i32",
    mutable: !0
  }, 82240), ___table_base = new WebAssembly.Global({
    value: "i32",
    mutable: !1
  }, 1), __abort_js = /* @__PURE__ */ __name(() => abort(""), "__abort_js");
  __abort_js.sig = "v";
  var getHeapMax = /* @__PURE__ */ __name(() => (
    // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
    // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
    // for any code that deals with heap sizes, which would require special
    // casing all heap size related code to treat 0 specially.
    2147483648
  ), "getHeapMax"), growMemory = /* @__PURE__ */ __name((A) => {
    var I = wasmMemory.buffer.byteLength, g = (A - I + 65535) / 65536 | 0;
    try {
      return wasmMemory.grow(g), updateMemoryViews(), 1;
    } catch {
    }
  }, "growMemory"), _emscripten_resize_heap = /* @__PURE__ */ __name((A) => {
    var I = HEAPU8.length;
    A >>>= 0;
    var g = getHeapMax();
    if (A > g)
      return !1;
    for (var Q = 1; Q <= 4; Q *= 2) {
      var B = I * (1 + 0.2 / Q);
      B = Math.min(B, A + 100663296);
      var E = Math.min(g, alignMemory(Math.max(A, B), 65536)), o = growMemory(E);
      if (o)
        return !0;
    }
    return !1;
  }, "_emscripten_resize_heap");
  _emscripten_resize_heap.sig = "ip";
  var _fd_close = /* @__PURE__ */ __name((A) => 52, "_fd_close");
  _fd_close.sig = "ii";
  var INT53_MAX = 9007199254740992, INT53_MIN = -9007199254740992, bigintToI53Checked = /* @__PURE__ */ __name((A) => A < INT53_MIN || A > INT53_MAX ? NaN : Number(A), "bigintToI53Checked");
  function _fd_seek(A, I, g, Q) {
    return I = bigintToI53Checked(I), 70;
  }
  __name(_fd_seek, "_fd_seek"), _fd_seek.sig = "iijip";
  var printCharBuffers = [null, [], []], printChar = /* @__PURE__ */ __name((A, I) => {
    var g = printCharBuffers[A];
    I === 0 || I === 10 ? ((A === 1 ? out : err)(UTF8ArrayToString(g)), g.length = 0) : g.push(I);
  }, "printChar"), _fd_write = /* @__PURE__ */ __name((A, I, g, Q) => {
    for (var B = 0, E = 0; E < g; E++) {
      var o = LE_HEAP_LOAD_U32((I >> 2) * 4), e = LE_HEAP_LOAD_U32((I + 4 >> 2) * 4);
      I += 8;
      for (var s = 0; s < e; s++)
        printChar(A, HEAPU8[o + s]);
      B += e;
    }
    return LE_HEAP_STORE_U32((Q >> 2) * 4, B), 0;
  }, "_fd_write");
  _fd_write.sig = "iippp";
  function _tree_sitter_log_callback(A, I) {
    if (Module.currentLogCallback) {
      const g = UTF8ToString(I);
      Module.currentLogCallback(g, A !== 0);
    }
  }
  __name(_tree_sitter_log_callback, "_tree_sitter_log_callback");
  function _tree_sitter_parse_callback(A, I, g, Q, B) {
    const o = Module.currentParseCallback(I, {
      row: g,
      column: Q
    });
    typeof o == "string" ? (setValue(B, o.length, "i32"), stringToUTF16(o, A, 10240)) : setValue(B, 0, "i32");
  }
  __name(_tree_sitter_parse_callback, "_tree_sitter_parse_callback");
  function _tree_sitter_progress_callback(A, I) {
    return Module.currentProgressCallback ? Module.currentProgressCallback({
      currentOffset: A,
      hasError: I
    }) : !1;
  }
  __name(_tree_sitter_progress_callback, "_tree_sitter_progress_callback");
  function _tree_sitter_query_progress_callback(A) {
    return Module.currentQueryProgressCallback ? Module.currentQueryProgressCallback({
      currentOffset: A
    }) : !1;
  }
  __name(_tree_sitter_query_progress_callback, "_tree_sitter_query_progress_callback");
  var runtimeKeepaliveCounter = 0, keepRuntimeAlive = /* @__PURE__ */ __name(() => noExitRuntime || runtimeKeepaliveCounter > 0, "keepRuntimeAlive"), _proc_exit = /* @__PURE__ */ __name((A) => {
    EXITSTATUS = A, keepRuntimeAlive() || (Module.onExit?.(A), ABORT = !0), quit_(A, new ExitStatus(A));
  }, "_proc_exit");
  _proc_exit.sig = "vi";
  var exitJS = /* @__PURE__ */ __name((A, I) => {
    EXITSTATUS = A, _proc_exit(A);
  }, "exitJS"), handleException = /* @__PURE__ */ __name((A) => {
    if (A instanceof ExitStatus || A == "unwind")
      return EXITSTATUS;
    quit_(1, A);
  }, "handleException"), lengthBytesUTF8 = /* @__PURE__ */ __name((A) => {
    for (var I = 0, g = 0; g < A.length; ++g) {
      var Q = A.charCodeAt(g);
      Q <= 127 ? I++ : Q <= 2047 ? I += 2 : Q >= 55296 && Q <= 57343 ? (I += 4, ++g) : I += 3;
    }
    return I;
  }, "lengthBytesUTF8"), stringToUTF8Array = /* @__PURE__ */ __name((A, I, g, Q) => {
    if (!(Q > 0)) return 0;
    for (var B = g, E = g + Q - 1, o = 0; o < A.length; ++o) {
      var e = A.codePointAt(o);
      if (e <= 127) {
        if (g >= E) break;
        I[g++] = e;
      } else if (e <= 2047) {
        if (g + 1 >= E) break;
        I[g++] = 192 | e >> 6, I[g++] = 128 | e & 63;
      } else if (e <= 65535) {
        if (g + 2 >= E) break;
        I[g++] = 224 | e >> 12, I[g++] = 128 | e >> 6 & 63, I[g++] = 128 | e & 63;
      } else {
        if (g + 3 >= E) break;
        I[g++] = 240 | e >> 18, I[g++] = 128 | e >> 12 & 63, I[g++] = 128 | e >> 6 & 63, I[g++] = 128 | e & 63, o++;
      }
    }
    return I[g] = 0, g - B;
  }, "stringToUTF8Array"), stringToUTF8 = /* @__PURE__ */ __name((A, I, g) => stringToUTF8Array(A, HEAPU8, I, g), "stringToUTF8"), stackAlloc = /* @__PURE__ */ __name((A) => __emscripten_stack_alloc(A), "stackAlloc"), stringToUTF8OnStack = /* @__PURE__ */ __name((A) => {
    var I = lengthBytesUTF8(A) + 1, g = stackAlloc(I);
    return stringToUTF8(A, g, I), g;
  }, "stringToUTF8OnStack"), AsciiToString = /* @__PURE__ */ __name((A) => {
    for (var I = ""; ; ) {
      var g = HEAPU8[A++];
      if (!g) return I;
      I += String.fromCharCode(g);
    }
  }, "AsciiToString"), stringToUTF16 = /* @__PURE__ */ __name((A, I, g) => {
    if (g ??= 2147483647, g < 2) return 0;
    g -= 2;
    for (var Q = I, B = g < A.length * 2 ? g / 2 : A.length, E = 0; E < B; ++E) {
      var o = A.charCodeAt(E);
      LE_HEAP_STORE_I16((I >> 1) * 2, o), I += 2;
    }
    return LE_HEAP_STORE_I16((I >> 1) * 2, 0), I - Q;
  }, "stringToUTF16");
  new Int8Array(new Int16Array([1]).buffer)[0];
  function LE_HEAP_UPDATE() {
    HEAPU16.unsigned = ((A) => A & 65535), HEAPU32.unsigned = ((A) => A >>> 0);
  }
  if (__name(LE_HEAP_UPDATE, "LE_HEAP_UPDATE"), initMemory(), Module.noExitRuntime && (noExitRuntime = Module.noExitRuntime), Module.print && (out = Module.print), Module.printErr && (err = Module.printErr), Module.dynamicLibraries && (dynamicLibraries = Module.dynamicLibraries), Module.wasmBinary && (wasmBinary = Module.wasmBinary), Module.arguments && (arguments_ = Module.arguments), Module.thisProgram && (thisProgram = Module.thisProgram), Module.preInit)
    for (typeof Module.preInit == "function" && (Module.preInit = [Module.preInit]); Module.preInit.length > 0; )
      Module.preInit.shift()();
  Module.setValue = setValue, Module.getValue = getValue, Module.UTF8ToString = UTF8ToString, Module.stringToUTF8 = stringToUTF8, Module.lengthBytesUTF8 = lengthBytesUTF8, Module.AsciiToString = AsciiToString, Module.stringToUTF16 = stringToUTF16, Module.loadWebAssemblyModule = loadWebAssemblyModule, Module.LE_HEAP_STORE_I64 = LE_HEAP_STORE_I64;
  var _calloc, _setThrew, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current;
  function assignWasmExports(A) {
    Module._malloc = A.malloc, Module._calloc = _calloc = A.calloc, Module._realloc = A.realloc, Module._free = A.free, Module._ts_range_edit = A.ts_range_edit, Module._memcmp = A.memcmp, Module._ts_language_symbol_count = A.ts_language_symbol_count, Module._ts_language_state_count = A.ts_language_state_count, Module._ts_language_abi_version = A.ts_language_abi_version, Module._ts_language_name = A.ts_language_name, Module._ts_language_field_count = A.ts_language_field_count, Module._ts_language_next_state = A.ts_language_next_state, Module._ts_language_symbol_name = A.ts_language_symbol_name, Module._ts_language_symbol_for_name = A.ts_language_symbol_for_name, Module._strncmp = A.strncmp, Module._ts_language_symbol_type = A.ts_language_symbol_type, Module._ts_language_field_name_for_id = A.ts_language_field_name_for_id, Module._ts_lookahead_iterator_new = A.ts_lookahead_iterator_new, Module._ts_lookahead_iterator_delete = A.ts_lookahead_iterator_delete, Module._ts_lookahead_iterator_reset_state = A.ts_lookahead_iterator_reset_state, Module._ts_lookahead_iterator_reset = A.ts_lookahead_iterator_reset, Module._ts_lookahead_iterator_next = A.ts_lookahead_iterator_next, Module._ts_lookahead_iterator_current_symbol = A.ts_lookahead_iterator_current_symbol, Module._ts_point_edit = A.ts_point_edit, Module._ts_parser_delete = A.ts_parser_delete, Module._ts_parser_reset = A.ts_parser_reset, Module._ts_parser_set_language = A.ts_parser_set_language, Module._ts_parser_set_included_ranges = A.ts_parser_set_included_ranges, Module._ts_query_new = A.ts_query_new, Module._ts_query_delete = A.ts_query_delete, Module._iswspace = A.iswspace, Module._iswalnum = A.iswalnum, Module._ts_query_copy = A.ts_query_copy, Module._ts_query_pattern_count = A.ts_query_pattern_count, Module._ts_query_capture_count = A.ts_query_capture_count, Module._ts_query_string_count = A.ts_query_string_count, Module._ts_query_capture_name_for_id = A.ts_query_capture_name_for_id, Module._ts_query_capture_quantifier_for_id = A.ts_query_capture_quantifier_for_id, Module._ts_query_string_value_for_id = A.ts_query_string_value_for_id, Module._ts_query_predicates_for_pattern = A.ts_query_predicates_for_pattern, Module._ts_query_start_byte_for_pattern = A.ts_query_start_byte_for_pattern, Module._ts_query_end_byte_for_pattern = A.ts_query_end_byte_for_pattern, Module._ts_query_is_pattern_rooted = A.ts_query_is_pattern_rooted, Module._ts_query_is_pattern_non_local = A.ts_query_is_pattern_non_local, Module._ts_query_is_pattern_guaranteed_at_step = A.ts_query_is_pattern_guaranteed_at_step, Module._ts_query_disable_capture = A.ts_query_disable_capture, Module._ts_query_disable_pattern = A.ts_query_disable_pattern, Module._ts_tree_copy = A.ts_tree_copy, Module._ts_tree_delete = A.ts_tree_delete, Module._ts_init = A.ts_init, Module._ts_parser_new_wasm = A.ts_parser_new_wasm, Module._ts_parser_enable_logger_wasm = A.ts_parser_enable_logger_wasm, Module._ts_parser_parse_wasm = A.ts_parser_parse_wasm, Module._ts_parser_included_ranges_wasm = A.ts_parser_included_ranges_wasm, Module._ts_language_type_is_named_wasm = A.ts_language_type_is_named_wasm, Module._ts_language_type_is_visible_wasm = A.ts_language_type_is_visible_wasm, Module._ts_language_metadata_wasm = A.ts_language_metadata_wasm, Module._ts_language_supertypes_wasm = A.ts_language_supertypes_wasm, Module._ts_language_subtypes_wasm = A.ts_language_subtypes_wasm, Module._ts_tree_root_node_wasm = A.ts_tree_root_node_wasm, Module._ts_tree_root_node_with_offset_wasm = A.ts_tree_root_node_with_offset_wasm, Module._ts_tree_edit_wasm = A.ts_tree_edit_wasm, Module._ts_tree_included_ranges_wasm = A.ts_tree_included_ranges_wasm, Module._ts_tree_get_changed_ranges_wasm = A.ts_tree_get_changed_ranges_wasm, Module._ts_tree_cursor_new_wasm = A.ts_tree_cursor_new_wasm, Module._ts_tree_cursor_copy_wasm = A.ts_tree_cursor_copy_wasm, Module._ts_tree_cursor_delete_wasm = A.ts_tree_cursor_delete_wasm, Module._ts_tree_cursor_reset_wasm = A.ts_tree_cursor_reset_wasm, Module._ts_tree_cursor_reset_to_wasm = A.ts_tree_cursor_reset_to_wasm, Module._ts_tree_cursor_goto_first_child_wasm = A.ts_tree_cursor_goto_first_child_wasm, Module._ts_tree_cursor_goto_last_child_wasm = A.ts_tree_cursor_goto_last_child_wasm, Module._ts_tree_cursor_goto_first_child_for_index_wasm = A.ts_tree_cursor_goto_first_child_for_index_wasm, Module._ts_tree_cursor_goto_first_child_for_position_wasm = A.ts_tree_cursor_goto_first_child_for_position_wasm, Module._ts_tree_cursor_goto_next_sibling_wasm = A.ts_tree_cursor_goto_next_sibling_wasm, Module._ts_tree_cursor_goto_previous_sibling_wasm = A.ts_tree_cursor_goto_previous_sibling_wasm, Module._ts_tree_cursor_goto_descendant_wasm = A.ts_tree_cursor_goto_descendant_wasm, Module._ts_tree_cursor_goto_parent_wasm = A.ts_tree_cursor_goto_parent_wasm, Module._ts_tree_cursor_current_node_type_id_wasm = A.ts_tree_cursor_current_node_type_id_wasm, Module._ts_tree_cursor_current_node_state_id_wasm = A.ts_tree_cursor_current_node_state_id_wasm, Module._ts_tree_cursor_current_node_is_named_wasm = A.ts_tree_cursor_current_node_is_named_wasm, Module._ts_tree_cursor_current_node_is_missing_wasm = A.ts_tree_cursor_current_node_is_missing_wasm, Module._ts_tree_cursor_current_node_id_wasm = A.ts_tree_cursor_current_node_id_wasm, Module._ts_tree_cursor_start_position_wasm = A.ts_tree_cursor_start_position_wasm, Module._ts_tree_cursor_end_position_wasm = A.ts_tree_cursor_end_position_wasm, Module._ts_tree_cursor_start_index_wasm = A.ts_tree_cursor_start_index_wasm, Module._ts_tree_cursor_end_index_wasm = A.ts_tree_cursor_end_index_wasm, Module._ts_tree_cursor_current_field_id_wasm = A.ts_tree_cursor_current_field_id_wasm, Module._ts_tree_cursor_current_depth_wasm = A.ts_tree_cursor_current_depth_wasm, Module._ts_tree_cursor_current_descendant_index_wasm = A.ts_tree_cursor_current_descendant_index_wasm, Module._ts_tree_cursor_current_node_wasm = A.ts_tree_cursor_current_node_wasm, Module._ts_node_symbol_wasm = A.ts_node_symbol_wasm, Module._ts_node_field_name_for_child_wasm = A.ts_node_field_name_for_child_wasm, Module._ts_node_field_name_for_named_child_wasm = A.ts_node_field_name_for_named_child_wasm, Module._ts_node_children_by_field_id_wasm = A.ts_node_children_by_field_id_wasm, Module._ts_node_first_child_for_byte_wasm = A.ts_node_first_child_for_byte_wasm, Module._ts_node_first_named_child_for_byte_wasm = A.ts_node_first_named_child_for_byte_wasm, Module._ts_node_grammar_symbol_wasm = A.ts_node_grammar_symbol_wasm, Module._ts_node_child_count_wasm = A.ts_node_child_count_wasm, Module._ts_node_named_child_count_wasm = A.ts_node_named_child_count_wasm, Module._ts_node_child_wasm = A.ts_node_child_wasm, Module._ts_node_named_child_wasm = A.ts_node_named_child_wasm, Module._ts_node_child_by_field_id_wasm = A.ts_node_child_by_field_id_wasm, Module._ts_node_next_sibling_wasm = A.ts_node_next_sibling_wasm, Module._ts_node_prev_sibling_wasm = A.ts_node_prev_sibling_wasm, Module._ts_node_next_named_sibling_wasm = A.ts_node_next_named_sibling_wasm, Module._ts_node_prev_named_sibling_wasm = A.ts_node_prev_named_sibling_wasm, Module._ts_node_descendant_count_wasm = A.ts_node_descendant_count_wasm, Module._ts_node_parent_wasm = A.ts_node_parent_wasm, Module._ts_node_child_with_descendant_wasm = A.ts_node_child_with_descendant_wasm, Module._ts_node_descendant_for_index_wasm = A.ts_node_descendant_for_index_wasm, Module._ts_node_named_descendant_for_index_wasm = A.ts_node_named_descendant_for_index_wasm, Module._ts_node_descendant_for_position_wasm = A.ts_node_descendant_for_position_wasm, Module._ts_node_named_descendant_for_position_wasm = A.ts_node_named_descendant_for_position_wasm, Module._ts_node_start_point_wasm = A.ts_node_start_point_wasm, Module._ts_node_end_point_wasm = A.ts_node_end_point_wasm, Module._ts_node_start_index_wasm = A.ts_node_start_index_wasm, Module._ts_node_end_index_wasm = A.ts_node_end_index_wasm, Module._ts_node_to_string_wasm = A.ts_node_to_string_wasm, Module._ts_node_children_wasm = A.ts_node_children_wasm, Module._ts_node_named_children_wasm = A.ts_node_named_children_wasm, Module._ts_node_descendants_of_type_wasm = A.ts_node_descendants_of_type_wasm, Module._ts_node_is_named_wasm = A.ts_node_is_named_wasm, Module._ts_node_has_changes_wasm = A.ts_node_has_changes_wasm, Module._ts_node_has_error_wasm = A.ts_node_has_error_wasm, Module._ts_node_is_error_wasm = A.ts_node_is_error_wasm, Module._ts_node_is_missing_wasm = A.ts_node_is_missing_wasm, Module._ts_node_is_extra_wasm = A.ts_node_is_extra_wasm, Module._ts_node_parse_state_wasm = A.ts_node_parse_state_wasm, Module._ts_node_next_parse_state_wasm = A.ts_node_next_parse_state_wasm, Module._ts_query_matches_wasm = A.ts_query_matches_wasm, Module._ts_query_captures_wasm = A.ts_query_captures_wasm, Module._memset = A.memset, Module._memcpy = A.memcpy, Module._memmove = A.memmove, Module._iswalpha = A.iswalpha, Module._iswblank = A.iswblank, Module._iswdigit = A.iswdigit, Module._iswlower = A.iswlower, Module._iswpunct = A.iswpunct, Module._iswupper = A.iswupper, Module._iswxdigit = A.iswxdigit, Module._memchr = A.memchr, Module._strlen = A.strlen, Module._strcmp = A.strcmp, Module._strncat = A.strncat, Module._strncpy = A.strncpy, Module._towlower = A.towlower, Module._towupper = A.towupper, _setThrew = A.setThrew, __emscripten_stack_restore = A._emscripten_stack_restore, __emscripten_stack_alloc = A._emscripten_stack_alloc, _emscripten_stack_get_current = A.emscripten_stack_get_current, A.__wasm_apply_data_relocs;
  }
  __name(assignWasmExports, "assignWasmExports");
  var wasmImports = {
    /** @export */
    __heap_base: ___heap_base,
    /** @export */
    __indirect_function_table: wasmTable,
    /** @export */
    __memory_base: ___memory_base,
    /** @export */
    __stack_high: ___stack_high,
    /** @export */
    __stack_low: ___stack_low,
    /** @export */
    __stack_pointer: ___stack_pointer,
    /** @export */
    __table_base: ___table_base,
    /** @export */
    _abort_js: __abort_js,
    /** @export */
    emscripten_resize_heap: _emscripten_resize_heap,
    /** @export */
    fd_close: _fd_close,
    /** @export */
    fd_seek: _fd_seek,
    /** @export */
    fd_write: _fd_write,
    /** @export */
    memory: wasmMemory,
    /** @export */
    tree_sitter_log_callback: _tree_sitter_log_callback,
    /** @export */
    tree_sitter_parse_callback: _tree_sitter_parse_callback,
    /** @export */
    tree_sitter_progress_callback: _tree_sitter_progress_callback,
    /** @export */
    tree_sitter_query_progress_callback: _tree_sitter_query_progress_callback
  };
  function callMain(A = []) {
    var I = resolveGlobalSymbol("main").sym;
    if (I) {
      A.unshift(thisProgram);
      var g = A.length, Q = stackAlloc((g + 1) * 4), B = Q;
      A.forEach((o) => {
        LE_HEAP_STORE_U32((B >> 2) * 4, stringToUTF8OnStack(o)), B += 4;
      }), LE_HEAP_STORE_U32((B >> 2) * 4, 0);
      try {
        var E = I(g, Q);
        return exitJS(
          E,
          /* implicit = */
          !0
        ), E;
      } catch (o) {
        return handleException(o);
      }
    }
  }
  __name(callMain, "callMain");
  function run(A = arguments_) {
    if (runDependencies > 0) {
      dependenciesFulfilled = run;
      return;
    }
    if (preRun(), runDependencies > 0) {
      dependenciesFulfilled = run;
      return;
    }
    function I() {
      if (Module.calledRun = !0, !ABORT) {
        initRuntime(), readyPromiseResolve?.(Module), Module.onRuntimeInitialized?.();
        var g = Module.noInitialRun || !1;
        g || callMain(A), postRun();
      }
    }
    __name(I, "doRun"), Module.setStatus ? (Module.setStatus("Running..."), setTimeout(() => {
      setTimeout(() => Module.setStatus(""), 1), I();
    }, 1)) : I();
  }
  __name(run, "run");
  var wasmExports;
  return wasmExports = await createWasm(), run(), runtimeInitialized ? moduleRtn = Module : moduleRtn = new Promise((A, I) => {
    readyPromiseResolve = A, readyPromiseReject = I;
  }), moduleRtn;
}
__name(Module2, "Module");
var web_tree_sitter_default = Module2, Module3 = null;
async function initializeBinding(A) {
  return Module3 ??= await web_tree_sitter_default(A);
}
__name(initializeBinding, "initializeBinding");
function checkModule() {
  return !!Module3;
}
__name(checkModule, "checkModule");
var TRANSFER_BUFFER, LANGUAGE_VERSION, MIN_COMPATIBLE_VERSION, finalizer4 = newFinalizer((A) => {
  C._ts_parser_delete(A[0]), C._free(A[1]);
}), Parser = class {
  static {
    __name(this, "Parser");
  }
  /** @internal */
  0 = 0;
  // Internal handle for Wasm
  /** @internal */
  1 = 0;
  // Internal handle for Wasm
  /** @internal */
  logCallback = null;
  /** The parser's current language. */
  language = null;
  /**
   * This must always be called before creating a Parser.
   *
   * You can optionally pass in options to configure the Wasm module, the most common
   * one being `locateFile` to help the module find the `.wasm` file.
   */
  static async init(A) {
    setModule(await initializeBinding(A)), TRANSFER_BUFFER = C._ts_init(), LANGUAGE_VERSION = C.getValue(TRANSFER_BUFFER, "i32"), MIN_COMPATIBLE_VERSION = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
  }
  /**
   * Create a new parser.
   */
  constructor() {
    this.initialize(), finalizer4?.register(this, [this[0], this[1]], this);
  }
  /** @internal */
  initialize() {
    if (!checkModule())
      throw new Error("cannot construct a Parser before calling `init()`");
    C._ts_parser_new_wasm(), this[0] = C.getValue(TRANSFER_BUFFER, "i32"), this[1] = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
  }
  /** Delete the parser, freeing its resources. */
  delete() {
    finalizer4?.unregister(this), C._ts_parser_delete(this[0]), C._free(this[1]), this[0] = 0, this[1] = 0;
  }
  /**
   * Set the language that the parser should use for parsing.
   *
   * If the language was not successfully assigned, an error will be thrown.
   * This happens if the language was generated with an incompatible
   * version of the Tree-sitter CLI. Check the language's version using
   * {@link Language#version} and compare it to this library's
   * {@link LANGUAGE_VERSION} and {@link MIN_COMPATIBLE_VERSION} constants.
   */
  setLanguage(A) {
    let I;
    if (!A)
      I = 0, this.language = null;
    else if (A.constructor === Language) {
      I = A[0];
      const g = C._ts_language_abi_version(I);
      if (g < MIN_COMPATIBLE_VERSION || LANGUAGE_VERSION < g)
        throw new Error(
          `Incompatible language version ${g}. Compatibility range ${MIN_COMPATIBLE_VERSION} through ${LANGUAGE_VERSION}.`
        );
      this.language = A;
    } else
      throw new Error("Argument must be a Language");
    return C._ts_parser_set_language(this[0], I), this;
  }
  /**
   * Parse a slice of UTF8 text.
   *
   * @param {string | ParseCallback} callback - The UTF8-encoded text to parse or a callback function.
   *
   * @param {Tree | null} [oldTree] - A previous syntax tree parsed from the same document. If the text of the
   *   document has changed since `oldTree` was created, then you must edit `oldTree` to match
   *   the new text using {@link Tree#edit}.
   *
   * @param {ParseOptions} [options] - Options for parsing the text.
   *  This can be used to set the included ranges, or a progress callback.
   *
   * @returns {Tree | null} A {@link Tree} if parsing succeeded, or `null` if:
   *  - The parser has not yet had a language assigned with {@link Parser#setLanguage}.
   *  - The progress callback returned true.
   */
  parse(A, I, g) {
    if (typeof A == "string")
      C.currentParseCallback = (e) => A.slice(e);
    else if (typeof A == "function")
      C.currentParseCallback = A;
    else
      throw new Error("Argument must be a string or a function");
    g?.progressCallback ? C.currentProgressCallback = g.progressCallback : C.currentProgressCallback = null, this.logCallback ? (C.currentLogCallback = this.logCallback, C._ts_parser_enable_logger_wasm(this[0], 1)) : (C.currentLogCallback = null, C._ts_parser_enable_logger_wasm(this[0], 0));
    let Q = 0, B = 0;
    if (g?.includedRanges) {
      Q = g.includedRanges.length, B = C._calloc(Q, SIZE_OF_RANGE);
      let e = B;
      for (let s = 0; s < Q; s++)
        marshalRange(e, g.includedRanges[s]), e += SIZE_OF_RANGE;
    }
    const E = C._ts_parser_parse_wasm(
      this[0],
      this[1],
      I ? I[0] : 0,
      B,
      Q
    );
    if (!E)
      return C.currentParseCallback = null, C.currentLogCallback = null, C.currentProgressCallback = null, null;
    if (!this.language)
      throw new Error("Parser must have a language to parse");
    const o = new Tree(INTERNAL, E, this.language, C.currentParseCallback);
    return C.currentParseCallback = null, C.currentLogCallback = null, C.currentProgressCallback = null, o;
  }
  /**
   * Instruct the parser to start the next parse from the beginning.
   *
   * If the parser previously failed because of a callback, 
   * then by default, it will resume where it left off on the
   * next call to {@link Parser#parse} or other parsing functions.
   * If you don't want to resume, and instead intend to use this parser to
   * parse some other document, you must call `reset` first.
   */
  reset() {
    C._ts_parser_reset(this[0]);
  }
  /** Get the ranges of text that the parser will include when parsing. */
  getIncludedRanges() {
    C._ts_parser_included_ranges_wasm(this[0]);
    const A = C.getValue(TRANSFER_BUFFER, "i32"), I = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), g = new Array(A);
    if (A > 0) {
      let Q = I;
      for (let B = 0; B < A; B++)
        g[B] = unmarshalRange(Q), Q += SIZE_OF_RANGE;
      C._free(I);
    }
    return g;
  }
  /** Set the logging callback that a parser should use during parsing. */
  setLogger(A) {
    if (!A)
      this.logCallback = null;
    else {
      if (typeof A != "function")
        throw new Error("Logger callback must be a function");
      this.logCallback = A;
    }
    return this;
  }
  /** Get the parser's current logger. */
  getLogger() {
    return this.logCallback;
  }
}, PREDICATE_STEP_TYPE_CAPTURE = 1, PREDICATE_STEP_TYPE_STRING = 2, QUERY_WORD_REGEX = /[\w-]+/g, isCaptureStep = /* @__PURE__ */ __name((A) => A.type === "capture", "isCaptureStep"), isStringStep = /* @__PURE__ */ __name((A) => A.type === "string", "isStringStep"), QueryErrorKind = {
  Syntax: 1,
  NodeName: 2,
  FieldName: 3,
  CaptureName: 4,
  PatternStructure: 5
}, QueryError = class P extends Error {
  constructor(I, g, Q, B) {
    super(P.formatMessage(I, g)), this.kind = I, this.info = g, this.index = Q, this.length = B, this.name = "QueryError";
  }
  kind;
  info;
  index;
  length;
  static {
    __name(this, "QueryError");
  }
  /** Formats an error message based on the error kind and info */
  static formatMessage(I, g) {
    switch (I) {
      case QueryErrorKind.NodeName:
        return `Bad node name '${g.word}'`;
      case QueryErrorKind.FieldName:
        return `Bad field name '${g.word}'`;
      case QueryErrorKind.CaptureName:
        return `Bad capture name @${g.word}`;
      case QueryErrorKind.PatternStructure:
        return `Bad pattern structure at offset ${g.suffix}`;
      case QueryErrorKind.Syntax:
        return `Bad syntax at offset ${g.suffix}`;
    }
  }
};
function parseAnyPredicate(A, I, g, Q) {
  if (A.length !== 3)
    throw new Error(
      `Wrong number of arguments to \`#${g}\` predicate. Expected 2, got ${A.length - 1}`
    );
  if (!isCaptureStep(A[1]))
    throw new Error(
      `First argument of \`#${g}\` predicate must be a capture. Got "${A[1].value}"`
    );
  const B = g === "eq?" || g === "any-eq?", E = !g.startsWith("any-");
  if (isCaptureStep(A[2])) {
    const o = A[1].name, e = A[2].name;
    Q[I].push((s) => {
      const D = [], r = [];
      for (const n of s)
        n.name === o && D.push(n.node), n.name === e && r.push(n.node);
      const t = /* @__PURE__ */ __name((n, y, M) => M ? n.text === y.text : n.text !== y.text, "compare");
      return E ? D.every((n) => r.some((y) => t(n, y, B))) : D.some((n) => r.some((y) => t(n, y, B)));
    });
  } else {
    const o = A[1].name, e = A[2].value, s = /* @__PURE__ */ __name((r) => r.text === e, "matches"), D = /* @__PURE__ */ __name((r) => r.text !== e, "doesNotMatch");
    Q[I].push((r) => {
      const t = [];
      for (const y of r)
        y.name === o && t.push(y.node);
      const n = B ? s : D;
      return E ? t.every(n) : t.some(n);
    });
  }
}
__name(parseAnyPredicate, "parseAnyPredicate");
function parseMatchPredicate(A, I, g, Q) {
  if (A.length !== 3)
    throw new Error(
      `Wrong number of arguments to \`#${g}\` predicate. Expected 2, got ${A.length - 1}.`
    );
  if (A[1].type !== "capture")
    throw new Error(
      `First argument of \`#${g}\` predicate must be a capture. Got "${A[1].value}".`
    );
  if (A[2].type !== "string")
    throw new Error(
      `Second argument of \`#${g}\` predicate must be a string. Got @${A[2].name}.`
    );
  const B = g === "match?" || g === "any-match?", E = !g.startsWith("any-"), o = A[1].name, e = new RegExp(A[2].value);
  Q[I].push((s) => {
    const D = [];
    for (const t of s)
      t.name === o && D.push(t.node.text);
    const r = /* @__PURE__ */ __name((t, n) => n ? e.test(t) : !e.test(t), "test");
    return D.length === 0 ? !B : E ? D.every((t) => r(t, B)) : D.some((t) => r(t, B));
  });
}
__name(parseMatchPredicate, "parseMatchPredicate");
function parseAnyOfPredicate(A, I, g, Q) {
  if (A.length < 2)
    throw new Error(
      `Wrong number of arguments to \`#${g}\` predicate. Expected at least 1. Got ${A.length - 1}.`
    );
  if (A[1].type !== "capture")
    throw new Error(
      `First argument of \`#${g}\` predicate must be a capture. Got "${A[1].value}".`
    );
  const B = g === "any-of?", E = A[1].name, o = A.slice(2);
  if (!o.every(isStringStep))
    throw new Error(
      `Arguments to \`#${g}\` predicate must be strings.".`
    );
  const e = o.map((s) => s.value);
  Q[I].push((s) => {
    const D = [];
    for (const r of s)
      r.name === E && D.push(r.node.text);
    return D.length === 0 ? !B : D.every((r) => e.includes(r)) === B;
  });
}
__name(parseAnyOfPredicate, "parseAnyOfPredicate");
function parseIsPredicate(A, I, g, Q, B) {
  if (A.length < 2 || A.length > 3)
    throw new Error(
      `Wrong number of arguments to \`#${g}\` predicate. Expected 1 or 2. Got ${A.length - 1}.`
    );
  if (!A.every(isStringStep))
    throw new Error(
      `Arguments to \`#${g}\` predicate must be strings.".`
    );
  const E = g === "is?" ? Q : B;
  E[I] || (E[I] = {}), E[I][A[1].value] = A[2]?.value ?? null;
}
__name(parseIsPredicate, "parseIsPredicate");
function parseSetDirective(A, I, g) {
  if (A.length < 2 || A.length > 3)
    throw new Error(`Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${A.length - 1}.`);
  if (!A.every(isStringStep))
    throw new Error('Arguments to `#set!` predicate must be strings.".');
  g[I] || (g[I] = {}), g[I][A[1].value] = A[2]?.value ?? null;
}
__name(parseSetDirective, "parseSetDirective");
function parsePattern(A, I, g, Q, B, E, o, e, s, D, r) {
  if (I === PREDICATE_STEP_TYPE_CAPTURE) {
    const t = Q[g];
    E.push({ type: "capture", name: t });
  } else if (I === PREDICATE_STEP_TYPE_STRING)
    E.push({ type: "string", value: B[g] });
  else if (E.length > 0) {
    if (E[0].type !== "string")
      throw new Error("Predicates must begin with a literal value");
    const t = E[0].value;
    switch (t) {
      case "any-not-eq?":
      case "not-eq?":
      case "any-eq?":
      case "eq?":
        parseAnyPredicate(E, A, t, o);
        break;
      case "any-not-match?":
      case "not-match?":
      case "any-match?":
      case "match?":
        parseMatchPredicate(E, A, t, o);
        break;
      case "not-any-of?":
      case "any-of?":
        parseAnyOfPredicate(E, A, t, o);
        break;
      case "is?":
      case "is-not?":
        parseIsPredicate(E, A, t, D, r);
        break;
      case "set!":
        parseSetDirective(E, A, s);
        break;
      default:
        e[A].push({ operator: t, operands: E.slice(1) });
    }
    E.length = 0;
  }
}
__name(parsePattern, "parsePattern");
var finalizer5 = newFinalizer((A) => {
  C._ts_query_delete(A);
});
(class {
  static {
    __name(this, "Query");
  }
  /** @internal */
  0 = 0;
  // Internal handle for Wasm
  /** @internal */
  exceededMatchLimit;
  /** @internal */
  textPredicates;
  /** The names of the captures used in the query. */
  captureNames;
  /** The quantifiers of the captures used in the query. */
  captureQuantifiers;
  /**
   * The other user-defined predicates associated with the given index.
   *
   * This includes predicates with operators other than:
   * - `match?`
   * - `eq?` and `not-eq?`
   * - `any-of?` and `not-any-of?`
   * - `is?` and `is-not?`
   * - `set!`
   */
  predicates;
  /** The properties for predicates with the operator `set!`. */
  setProperties;
  /** The properties for predicates with the operator `is?`. */
  assertedProperties;
  /** The properties for predicates with the operator `is-not?`. */
  refutedProperties;
  /** The maximum number of in-progress matches for this cursor. */
  matchLimit;
  /**
   * Create a new query from a string containing one or more S-expression
   * patterns.
   *
   * The query is associated with a particular language, and can only be run
   * on syntax nodes parsed with that language. References to Queries can be
   * shared between multiple threads.
   *
   * @link {@see https://tree-sitter.github.io/tree-sitter/using-parsers/queries}
   */
  constructor(A, I) {
    const g = C.lengthBytesUTF8(I), Q = C._malloc(g + 1);
    C.stringToUTF8(I, Q, g + 1);
    const B = C._ts_query_new(
      A[0],
      Q,
      g,
      TRANSFER_BUFFER,
      TRANSFER_BUFFER + SIZE_OF_INT
    );
    if (!B) {
      const c = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), l = C.getValue(TRANSFER_BUFFER, "i32"), h = C.UTF8ToString(Q, l).length, _ = I.slice(h, h + 100).split(`
`)[0], K = _.match(QUERY_WORD_REGEX)?.[0] ?? "";
      switch (C._free(Q), c) {
        case QueryErrorKind.Syntax:
          throw new QueryError(QueryErrorKind.Syntax, { suffix: `${h}: '${_}'...` }, h, 0);
        case QueryErrorKind.NodeName:
          throw new QueryError(c, { word: K }, h, K.length);
        case QueryErrorKind.FieldName:
          throw new QueryError(c, { word: K }, h, K.length);
        case QueryErrorKind.CaptureName:
          throw new QueryError(c, { word: K }, h, K.length);
        case QueryErrorKind.PatternStructure:
          throw new QueryError(c, { suffix: `${h}: '${_}'...` }, h, 0);
      }
    }
    const E = C._ts_query_string_count(B), o = C._ts_query_capture_count(B), e = C._ts_query_pattern_count(B), s = new Array(o), D = new Array(e), r = new Array(E);
    for (let c = 0; c < o; c++) {
      const l = C._ts_query_capture_name_for_id(
        B,
        c,
        TRANSFER_BUFFER
      ), h = C.getValue(TRANSFER_BUFFER, "i32");
      s[c] = C.UTF8ToString(l, h);
    }
    for (let c = 0; c < e; c++) {
      const l = new Array(o);
      for (let h = 0; h < o; h++) {
        const _ = C._ts_query_capture_quantifier_for_id(B, c, h);
        l[h] = _;
      }
      D[c] = l;
    }
    for (let c = 0; c < E; c++) {
      const l = C._ts_query_string_value_for_id(
        B,
        c,
        TRANSFER_BUFFER
      ), h = C.getValue(TRANSFER_BUFFER, "i32");
      r[c] = C.UTF8ToString(l, h);
    }
    const t = new Array(e), n = new Array(e), y = new Array(e), M = new Array(e), U = new Array(e);
    for (let c = 0; c < e; c++) {
      const l = C._ts_query_predicates_for_pattern(B, c, TRANSFER_BUFFER), h = C.getValue(TRANSFER_BUFFER, "i32");
      M[c] = [], U[c] = [];
      const _ = new Array();
      let K = l;
      for (let Y = 0; Y < h; Y++) {
        const J = C.getValue(K, "i32");
        K += SIZE_OF_INT;
        const a = C.getValue(K, "i32");
        K += SIZE_OF_INT, parsePattern(
          c,
          J,
          a,
          s,
          r,
          _,
          U,
          M,
          t,
          n,
          y
        );
      }
      Object.freeze(U[c]), Object.freeze(M[c]), Object.freeze(t[c]), Object.freeze(n[c]), Object.freeze(y[c]);
    }
    C._free(Q), this[0] = B, this.captureNames = s, this.captureQuantifiers = D, this.textPredicates = U, this.predicates = M, this.setProperties = t, this.assertedProperties = n, this.refutedProperties = y, this.exceededMatchLimit = !1, finalizer5?.register(this, B, this);
  }
  /** Delete the query, freeing its resources. */
  delete() {
    finalizer5?.unregister(this), C._ts_query_delete(this[0]), this[0] = 0;
  }
  /**
   * Iterate over all of the matches in the order that they were found.
   *
   * Each match contains the index of the pattern that matched, and a list of
   * captures. Because multiple patterns can match the same set of nodes,
   * one match may contain captures that appear *before* some of the
   * captures from a previous match.
   *
   * @param {Node} node - The node to execute the query on.
   *
   * @param {QueryOptions} options - Options for query execution.
   */
  matches(A, I = {}) {
    const g = I.startPosition ?? ZERO_POINT, Q = I.endPosition ?? ZERO_POINT, B = I.startIndex ?? 0, E = I.endIndex ?? 0, o = I.startContainingPosition ?? ZERO_POINT, e = I.endContainingPosition ?? ZERO_POINT, s = I.startContainingIndex ?? 0, D = I.endContainingIndex ?? 0, r = I.matchLimit ?? 4294967295, t = I.maxStartDepth ?? 4294967295, n = I.progressCallback;
    if (typeof r != "number")
      throw new Error("Arguments must be numbers");
    if (this.matchLimit = r, E !== 0 && B > E)
      throw new Error("`startIndex` cannot be greater than `endIndex`");
    if (Q !== ZERO_POINT && (g.row > Q.row || g.row === Q.row && g.column > Q.column))
      throw new Error("`startPosition` cannot be greater than `endPosition`");
    if (D !== 0 && s > D)
      throw new Error("`startContainingIndex` cannot be greater than `endContainingIndex`");
    if (e !== ZERO_POINT && (o.row > e.row || o.row === e.row && o.column > e.column))
      throw new Error("`startContainingPosition` cannot be greater than `endContainingPosition`");
    n && (C.currentQueryProgressCallback = n), marshalNode(A), C._ts_query_matches_wasm(
      this[0],
      A.tree[0],
      g.row,
      g.column,
      Q.row,
      Q.column,
      B,
      E,
      o.row,
      o.column,
      e.row,
      e.column,
      s,
      D,
      r,
      t
    );
    const y = C.getValue(TRANSFER_BUFFER, "i32"), M = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), U = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32"), c = new Array(y);
    this.exceededMatchLimit = !!U;
    let l = 0, h = M;
    for (let _ = 0; _ < y; _++) {
      const K = C.getValue(h, "i32");
      h += SIZE_OF_INT;
      const Y = C.getValue(h, "i32");
      h += SIZE_OF_INT;
      const J = new Array(Y);
      if (h = unmarshalCaptures(this, A.tree, h, K, J), this.textPredicates[K].every((a) => a(J))) {
        c[l] = { patternIndex: K, captures: J };
        const a = this.setProperties[K];
        c[l].setProperties = a;
        const w = this.assertedProperties[K];
        c[l].assertedProperties = w;
        const N = this.refutedProperties[K];
        c[l].refutedProperties = N, l++;
      }
    }
    return c.length = l, C._free(M), C.currentQueryProgressCallback = null, c;
  }
  /**
   * Iterate over all of the individual captures in the order that they
   * appear.
   *
   * This is useful if you don't care about which pattern matched, and just
   * want a single, ordered sequence of captures.
   *
   * @param {Node} node - The node to execute the query on.
   *
   * @param {QueryOptions} options - Options for query execution.
   */
  captures(A, I = {}) {
    const g = I.startPosition ?? ZERO_POINT, Q = I.endPosition ?? ZERO_POINT, B = I.startIndex ?? 0, E = I.endIndex ?? 0, o = I.startContainingPosition ?? ZERO_POINT, e = I.endContainingPosition ?? ZERO_POINT, s = I.startContainingIndex ?? 0, D = I.endContainingIndex ?? 0, r = I.matchLimit ?? 4294967295, t = I.maxStartDepth ?? 4294967295, n = I.progressCallback;
    if (typeof r != "number")
      throw new Error("Arguments must be numbers");
    if (this.matchLimit = r, E !== 0 && B > E)
      throw new Error("`startIndex` cannot be greater than `endIndex`");
    if (Q !== ZERO_POINT && (g.row > Q.row || g.row === Q.row && g.column > Q.column))
      throw new Error("`startPosition` cannot be greater than `endPosition`");
    if (D !== 0 && s > D)
      throw new Error("`startContainingIndex` cannot be greater than `endContainingIndex`");
    if (e !== ZERO_POINT && (o.row > e.row || o.row === e.row && o.column > e.column))
      throw new Error("`startContainingPosition` cannot be greater than `endContainingPosition`");
    n && (C.currentQueryProgressCallback = n), marshalNode(A), C._ts_query_captures_wasm(
      this[0],
      A.tree[0],
      g.row,
      g.column,
      Q.row,
      Q.column,
      B,
      E,
      o.row,
      o.column,
      e.row,
      e.column,
      s,
      D,
      r,
      t
    );
    const y = C.getValue(TRANSFER_BUFFER, "i32"), M = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), U = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32"), c = new Array();
    this.exceededMatchLimit = !!U;
    const l = new Array();
    let h = M;
    for (let _ = 0; _ < y; _++) {
      const K = C.getValue(h, "i32");
      h += SIZE_OF_INT;
      const Y = C.getValue(h, "i32");
      h += SIZE_OF_INT;
      const J = C.getValue(h, "i32");
      if (h += SIZE_OF_INT, l.length = Y, h = unmarshalCaptures(this, A.tree, h, K, l), this.textPredicates[K].every((a) => a(l))) {
        const a = l[J], w = this.setProperties[K];
        a.setProperties = w;
        const N = this.assertedProperties[K];
        a.assertedProperties = N;
        const R = this.refutedProperties[K];
        a.refutedProperties = R, c.push(a);
      }
    }
    return C._free(M), C.currentQueryProgressCallback = null, c;
  }
  /** Get the predicates for a given pattern. */
  predicatesForPattern(A) {
    return this.predicates[A];
  }
  /**
   * Disable a certain capture within a query.
   *
   * This prevents the capture from being returned in matches, and also
   * avoids any resource usage associated with recording the capture.
   */
  disableCapture(A) {
    const I = C.lengthBytesUTF8(A), g = C._malloc(I + 1);
    C.stringToUTF8(A, g, I + 1), C._ts_query_disable_capture(this[0], g, I), C._free(g);
  }
  /**
   * Disable a certain pattern within a query.
   *
   * This prevents the pattern from matching, and also avoids any resource
   * usage associated with the pattern. This throws an error if the pattern
   * index is out of bounds.
   */
  disablePattern(A) {
    if (A >= this.predicates.length)
      throw new Error(
        `Pattern index is ${A} but the pattern count is ${this.predicates.length}`
      );
    C._ts_query_disable_pattern(this[0], A);
  }
  /**
   * Check if, on its last execution, this cursor exceeded its maximum number
   * of in-progress matches.
   */
  didExceedMatchLimit() {
    return this.exceededMatchLimit;
  }
  /** Get the byte offset where the given pattern starts in the query's source. */
  startIndexForPattern(A) {
    if (A >= this.predicates.length)
      throw new Error(
        `Pattern index is ${A} but the pattern count is ${this.predicates.length}`
      );
    return C._ts_query_start_byte_for_pattern(this[0], A);
  }
  /** Get the byte offset where the given pattern ends in the query's source. */
  endIndexForPattern(A) {
    if (A >= this.predicates.length)
      throw new Error(
        `Pattern index is ${A} but the pattern count is ${this.predicates.length}`
      );
    return C._ts_query_end_byte_for_pattern(this[0], A);
  }
  /** Get the number of patterns in the query. */
  patternCount() {
    return C._ts_query_pattern_count(this[0]);
  }
  /** Get the index for a given capture name. */
  captureIndexForName(A) {
    return this.captureNames.indexOf(A);
  }
  /** Check if a given pattern within a query has a single root node. */
  isPatternRooted(A) {
    return C._ts_query_is_pattern_rooted(this[0], A) === 1;
  }
  /** Check if a given pattern within a query has a single root node. */
  isPatternNonLocal(A) {
    return C._ts_query_is_pattern_non_local(this[0], A) === 1;
  }
  /**
   * Check if a given step in a query is 'definite'.
   *
   * A query step is 'definite' if its parent pattern will be guaranteed to
   * match successfully once it reaches the step.
   */
  isPatternGuaranteedAtStep(A) {
    return C._ts_query_is_pattern_guaranteed_at_step(this[0], A) === 1;
  }
});
const documents = /* @__PURE__ */ new Map(), trees = /* @__PURE__ */ new Map(), parserReady = (async () => {
  await Parser.init({
    locateFile: () => new URL("../grammar/tree-sitter.wasm", self.location.href).href
  });
  const A = new Parser();
  return A.setLanguage(await Language.load(
    new URL("../grammar/tree-sitter-lua.wasm", self.location.href).href
  )), A;
})();
function reply(A, I) {
  postMessage({ id: A, result: I });
}
function shortName(A) {
  return A.name.split(/[.:]/).at(-1);
}
function resolveSymbol(A, I, g) {
  const Q = I.word, B = Q.split(".").at(-1), E = A.symbols.filter((s) => (s.name === Q || shortName(s) === B) && s.visibilityStart <= g && g <= s.visibilityEnd && (s.offset <= g || s.scope === "global")).sort((s, D) => +(D.name === Q) - +(s.name === Q) || D.visibilityStart - s.visibilityStart || D.offset - s.offset);
  if (E.length) return E[0];
  const o = resolveAlias(documents, A, Q), e = [...documents.values()].flatMap((s) => s.symbols).filter((s) => s.name === o.name && (!o.uri || s.uri === o.uri));
  return e.length ? e[0] : [...documents.values()].flatMap((s) => s.symbols).filter((s) => s.name === Q || shortName(s) === B).sort((s, D) => +(D.name === Q) - +(s.name === Q))[0];
}
function signatureTarget(A, I) {
  const g = A.slice(0, I), Q = /((?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*(?:[.:](?:[A-Za-z_]|[^\x00-\x7F])(?:[A-Za-z0-9_]|[^\x00-\x7F])*)*)\s*\(([^()]*)$/u.exec(g);
  return Q ? {
    word: Q[1].replace(":", "."),
    activeParameter: (Q[2].match(/,/g) ?? []).length,
    start: g.lastIndexOf(Q[1]),
    end: g.lastIndexOf(Q[1]) + Q[1].length
  } : null;
}
function synchronizeDocument(A, I) {
  if (typeof I != "string") return documents.get(A);
  const g = documents.get(A);
  if (!g || g.source !== I) {
    const Q = analyze(I, A);
    return documents.set(A, Q), Q;
  }
  return g;
}
self.onmessage = async (A) => {
  const { id: I, method: g, params: Q = {} } = A.data;
  try {
    if (g === "update") {
      const o = analyze(Q.source, Q.uri), e = await parserReady;
      trees.get(Q.uri)?.delete(), trees.set(Q.uri, e.parse(Q.source)), documents.set(Q.uri, o), reply(I, o.diagnostics);
      return;
    }
    if (g === "remove") {
      documents.delete(Q.uri), reply(I, !0);
      return;
    }
    if (g === "completions") {
      synchronizeDocument(Q.uri, Q.source), reply(I, completions(documents, Q.uri, Q.offset));
      return;
    }
    const B = synchronizeDocument(Q.uri, Q.source);
    if (!B) {
      reply(I, null);
      return;
    }
    const E = identifierAt(B.source, Q.offset);
    if (g === "signature") {
      const o = signatureTarget(B.source, Q.offset);
      if (!o) {
        reply(I, null);
        return;
      }
      const e = resolveAlias(documents, B, o.word), s = LUA_STDLIB[o.word] ?? LUA_STDLIB[e.name], D = s ? null : resolveSymbol(B, o, Q.offset);
      reply(I, s ? { ...s, ...o } : D ? {
        signature: D.detail,
        doc: D.documentation || `${D.scope} ${D.kind}`,
        activeParameter: o.activeParameter,
        range: { start: o.start, end: o.end }
      } : null);
      return;
    }
    if (g === "hover") {
      const o = resolveAlias(documents, B, E.word), e = LUA_STDLIB[E.word] ?? LUA_STDLIB[o.name];
      if (e) reply(I, { ...e, range: { start: E.start, end: E.end } });
      else {
        const s = resolveSymbol(B, E, Q.offset);
        reply(I, s ? {
          signature: s.detail,
          doc: s.documentation || `${s.scope} ${s.kind}`,
          range: { start: E.start, end: E.end }
        } : null);
      }
      return;
    }
    if (g === "definition") {
      const o = resolveSymbol(B, E, Q.offset);
      reply(I, o ?? null);
      return;
    }
    if (g === "references") {
      const o = [], e = resolveSymbol(B, E, Q.offset), s = E.word.split(".").at(-1), D = e && ["local", "parameter", "for"].includes(e.scope);
      for (const r of documents.values())
        if (!(D && r.uri !== e.uri))
          for (const t of r.occurrences.get(s) ?? [])
            D && (t.offset < e.visibilityStart || t.offset > e.visibilityEnd) || o.push({ uri: r.uri, range: t.range });
      reply(I, o);
      return;
    }
    if (g === "symbols") {
      reply(I, B.symbols);
      return;
    }
    reply(I, null);
  } catch (B) {
    postMessage({ id: I, error: B instanceof Error ? B.message : String(B) });
  }
};
