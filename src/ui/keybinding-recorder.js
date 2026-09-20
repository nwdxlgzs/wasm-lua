const MODIFIER_CODES = new Set([
  'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight',
  'MetaLeft', 'MetaRight', 'ShiftLeft', 'ShiftRight'
]);

const CODE_ALIASES = Object.freeze({
  ArrowDown: 'DownArrow', ArrowLeft: 'LeftArrow',
  ArrowRight: 'RightArrow', ArrowUp: 'UpArrow',
  NumpadEnter: 'Enter', Pause: 'PauseBreak', Space: 'Space'
});

/**
 * Convert a browser keyboard event into the canonical string accepted by the
 * Monaco binding adapter. Returning null means that only a modifier is held
 * and recording should continue.
 *
 * `code` is preferred over `key`: shifted punctuation must still identify its
 * physical ordinary key (`Shift+Digit1`, not the unsupported `!`).
 *
 * @param {{code?: string, key?: string, ctrlKey?: boolean, shiftKey?: boolean,
 *   altKey?: boolean, metaKey?: boolean, isComposing?: boolean}} event
 * @returns {string|null}
 */
export function keyboardEventToBinding(event) {
  if (event.isComposing) return null;
  const code = event.code ?? '';
  if (MODIFIER_CODES.has(code) ||
      ['Alt', 'Control', 'Meta', 'Shift'].includes(event.key ?? '')) return null;

  let key = CODE_ALIASES[code] ?? code;
  if (/^Key[A-Z]$/u.test(key)) key = key.slice(3);
  else if (/^Digit[0-9]$/u.test(key)) key = key.slice(5);
  if (!key || key === 'Unidentified') {
    key = event.key === ' ' ? 'Space' : event.key ?? '';
    if (key.length === 1) key = key.toUpperCase();
  }
  if (!key) return null;

  const parts = [];
  // CtrlCmd is Monaco's cross-platform primary modifier. If both are held,
  // retain one primary modifier instead of encoding the same bit twice.
  if (event.ctrlKey) parts.push('Ctrl');
  else if (event.metaKey) parts.push('Meta');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');
  parts.push(key);
  return parts.join('+');
}
