import { monaco } from '../language/monaco.js';

export const COMMAND_LABELS = Object.freeze({
  run: '运行 / 继续', stop: '停止并重建 VM', pause: '暂停',
  stepOver: '步过', stepIn: '步入', stepOut: '步出',
  runToCursor: '运行到光标', toggleBreakpoint: '切换断点',
  gotoLine: '跳转到行', find: '查找', replace: '替换',
  suggest: '触发补全', rename: '重命名', references: '查找引用',
  format: '格式化文档', commandPalette: '命令面板', outline: '文件大纲',
  nextProblem: '下一个问题', previousProblem: '上一个问题'
});

export const DEFAULT_KEYBINDINGS = Object.freeze({
  run: 'F5', stop: 'Shift+F5', pause: 'F6',
  toggleBreakpoint: 'F9', stepOver: 'F10', stepIn: 'F11',
  stepOut: 'Shift+F11', runToCursor: 'Ctrl+F10', gotoLine: 'Ctrl+G',
  find: 'Ctrl+F', replace: 'Ctrl+H', suggest: 'Ctrl+Space',
  rename: 'F2', references: 'Shift+F12', format: 'Shift+Alt+F',
  commandPalette: 'F1', outline: 'Ctrl+Shift+O',
  nextProblem: 'F8', previousProblem: 'Shift+F8'
});

const MODIFIERS = {
  ctrl: monaco.KeyMod.CtrlCmd,
  control: monaco.KeyMod.CtrlCmd,
  cmd: monaco.KeyMod.CtrlCmd,
  meta: monaco.KeyMod.CtrlCmd,
  shift: monaco.KeyMod.Shift,
  alt: monaco.KeyMod.Alt,
  option: monaco.KeyMod.Alt
};

function keyCode(name) {
  const aliases = { esc: 'Escape', del: 'Delete', spacebar: 'Space' };
  const requested = aliases[name.toLowerCase()] ?? name;
  const normalized = requested.length === 1 ? requested.toUpperCase() : requested;
  const direct = monaco.KeyCode[normalized] ??
    monaco.KeyCode[`Key${normalized}`] ?? monaco.KeyCode[`Digit${normalized}`];
  if (direct) return direct;
  const canonical = Object.keys(monaco.KeyCode).find(key =>
    key.toLowerCase() === normalized.toLowerCase() ||
    key.toLowerCase() === `key${normalized}`.toLowerCase() ||
    key.toLowerCase() === `digit${normalized}`.toLowerCase());
  return canonical ? monaco.KeyCode[canonical] : undefined;
}

/** @param {string} binding @returns {number} */
export function parseKeybinding(binding) {
  if (typeof binding !== 'string' || !binding.trim())
    throw new TypeError('快捷键必须是非空字符串。');
  let value = 0;
  let key = 0;
  for (const part of binding.split('+').map(item => item.trim()).filter(Boolean)) {
    const modifier = MODIFIERS[part.toLowerCase()];
    if (modifier) value |= modifier;
    else {
      if (key) throw new Error(`快捷键只能包含一个普通按键：${binding}`);
      key = keyCode(part);
      if (!key) throw new Error(`不支持的按键：${part}`);
    }
  }
  if (!key) throw new Error(`快捷键缺少普通按键：${binding}`);
  return value | key;
}

/** @param {Record<string, string|null|undefined>} [overrides] */
export function resolveKeybindings(overrides = {}) {
  /** @type {Record<string, string|null|undefined>} */
  const result = { ...DEFAULT_KEYBINDINGS, ...overrides };
  const seen = new Map();
  for (const [command, binding] of Object.entries(result)) {
    if (binding == null || binding === '') continue;
    const parsed = parseKeybinding(binding);
    const normalized = String(parsed);
    if (seen.has(normalized))
      throw new Error(`快捷键冲突：${binding} 同时绑定到 ${seen.get(normalized)} 和 ${command}`);
    seen.set(normalized, command);
  }
  return result;
}

export function displayKeybinding(binding) {
  if (!binding) return '';
  return binding.split('+').map(part => part.trim()).filter(Boolean).map(part => {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'control' || lower === 'cmd' || lower === 'meta')
      return '⌃';
    if (lower === 'shift') return '⇧';
    if (lower === 'alt' || lower === 'option') return 'Alt';
    const aliases = { esc: 'Escape', del: 'Delete', spacebar: 'Space' };
    const requested = aliases[lower] ?? part;
    if (requested.length === 1) return requested.toUpperCase();
    const canonical = Object.keys(monaco.KeyCode).find(key =>
      key.toLowerCase() === requested.toLowerCase());
    return canonical ?? requested[0].toUpperCase() + requested.slice(1).toLowerCase();
  }).join('');
}
