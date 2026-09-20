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
export declare function keyboardEventToBinding(event: {
    code?: string;
    key?: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    isComposing?: boolean;
}): string | null;
