import { describe, expect, it } from 'vitest';
import { keyboardEventToBinding } from '../../src/ui/keybinding-recorder.js';

describe('快捷键录制器', () => {
  it('records ordinary, function and navigation key combinations canonically', () => {
    expect(keyboardEventToBinding({ code: 'KeyK', key: 'k', ctrlKey: true,
      shiftKey: true })).toBe('Ctrl+Shift+K');
    expect(keyboardEventToBinding({ code: 'F12', key: 'F12', altKey: true }))
      .toBe('Alt+F12');
    expect(keyboardEventToBinding({ code: 'ArrowUp', key: 'ArrowUp' }))
      .toBe('UpArrow');
  });

  it('uses physical keys for shifted punctuation and waits on modifiers', () => {
    expect(keyboardEventToBinding({ code: 'Digit1', key: '!', shiftKey: true }))
      .toBe('Shift+1');
    expect(keyboardEventToBinding({ code: 'ControlLeft', key: 'Control',
      ctrlKey: true })).toBeNull();
    expect(keyboardEventToBinding({ code: 'KeyP', key: 'p', metaKey: true }))
      .toBe('Meta+P');
  });
});
