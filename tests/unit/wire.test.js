import { describe, expect, it } from 'vitest';
import { decodeWire, encodeWire, LuaRef } from '../../src/sdk/wire.js';

describe('ABI v1 tagged-value wire format', () => {
  it('makes Lua reference identity immutable', () => {
    const reference = new LuaRef(7, 'table');
    expect(() => { reference.id = 2; }).toThrow(TypeError);
    expect(reference.id).toBe(7);
  });

  it('round-trips bigint, binary, arrays and maps', () => {
    const input = {
      integer: 9223372036854775807n,
      binary: Uint8Array.of(0, 255, 7),
      values: [null, true, 1.25, '中文']
    };
    expect(decodeWire(encodeWire(input))).toEqual(input);
  });

  it('rejects cyclic values and bad headers', () => {
    const value = {};
    value.self = value;
    expect(() => encodeWire(value)).toThrow(/Cyclic/);
    expect(() => decodeWire(Uint8Array.of(1, 2, 3))).toThrow(/format/);
    expect(() => encodeWire({ $luaRef: 7 })).toThrow(/Unsupported|object/);
  });
});
