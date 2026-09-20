const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAGIC = [0x57, 0x4c, 0x55, 1];

export class LuaRef {
  /** @readonly @type {number} */
  id;
  /** @readonly @type {string|number} */
  type;
  /** @param {number} id @param {string|number} [type]
   * @param {((id: number) => void)|null} [release] @param {object|null} [owner] */
  constructor(id, type = 'value', release = null, owner = null) {
    Object.defineProperties(this, {
      id: { value: id, enumerable: true, writable: false, configurable: false },
      type: { value: type, enumerable: true, writable: false, configurable: false }
    });
    this.#release = release;
    this.#owner = owner;
  }
  #release;
  #owner;
  /** @param {object} owner */
  isOwnedBy(owner) { return this.#owner === owner; }
  release() {
    this.#release?.(this.id);
    this.#release = null;
    this.#owner = null;
  }
  toJSON() { return { $luaRef: this.id, type: this.type }; }
}

class Writer {
  chunks = [];
  length = 0;
  push(bytes) { this.chunks.push(bytes); this.length += bytes.length; }
  byte(value) { this.push(Uint8Array.of(value)); }
  u32(value) {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    this.push(bytes);
  }
  i64(value) {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigInt64(0, BigInt(value), true);
    this.push(bytes);
  }
  f64(value) {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setFloat64(0, value, true);
    this.push(bytes);
  }
  finish() {
    const result = new Uint8Array(this.length);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}

function writeValue(writer, value, seen, depth) {
  if (depth > 64) throw new TypeError('Value nesting exceeds 64 levels.');
  if (value === null || value === undefined) { writer.byte(0); return; }
  if (value === false) { writer.byte(1); return; }
  if (value === true) { writer.byte(2); return; }
  if (typeof value === 'number') {
    writer.byte(3);
    writer.f64(value);
    return;
  }
  if (typeof value === 'bigint') {
    writer.byte(4);
    writer.i64(value);
    return;
  }
  if (value instanceof Uint8Array) {
    writer.byte(5);
    writer.u32(value.length);
    writer.push(value);
    return;
  }
  if (typeof value === 'string') {
    const bytes = encoder.encode(value);
    writer.byte(6);
    writer.u32(bytes.length);
    writer.push(bytes);
    return;
  }
  if (value instanceof LuaRef) {
    writer.byte(9);
    writer.u32(value.id);
    writer.byte(0);
    return;
  }
  if (value && Number.isInteger(value.$luaRef))
    throw new TypeError('Raw Lua reference objects cannot cross the ABI boundary.');
  if (typeof value !== 'object') throw new TypeError('Unsupported value: ' + typeof value);
  if (seen.has(value)) throw new TypeError('Cyclic values cannot cross the Lua boundary.');
  seen.add(value);
  if (Array.isArray(value)) {
    writer.byte(7);
    writer.u32(value.length);
    for (const item of value) writeValue(writer, item, seen, depth + 1);
  } else {
    const entries = Object.entries(value);
    writer.byte(8);
    writer.u32(entries.length);
    for (const [key, item] of entries) {
      writeValue(writer, key, seen, depth + 1);
      writeValue(writer, item, seen, depth + 1);
    }
  }
  seen.delete(value);
}

/** @param {any} value @returns {Uint8Array} */
export function encodeWire(value) {
  const writer = new Writer();
  writer.push(Uint8Array.from(MAGIC));
  writeValue(writer, value, new WeakSet(), 0);
  return writer.finish();
}

class Reader {
  constructor(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  bytes;
  view;
  offset = 0;
  byte() {
    if (this.offset >= this.bytes.length) throw new RangeError('Truncated wire value.');
    return this.bytes[this.offset++];
  }
  u32() {
    const result = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return result;
  }
  i64() {
    const result = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return result;
  }
  f64() {
    const result = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return result;
  }
  take(length) {
    const result = this.bytes.subarray(this.offset, this.offset + length);
    if (result.length !== length) throw new RangeError('Truncated wire value.');
    this.offset += length;
    return result;
  }
}

function readValue(reader, depth) {
  if (depth > 64) throw new RangeError('Wire value nesting exceeds 64 levels.');
  const tag = reader.byte();
  switch (tag) {
    case 0: return null;
    case 1: return false;
    case 2: return true;
    case 3: return reader.f64();
    case 4: return reader.i64();
    case 5: return reader.take(reader.u32()).slice();
    case 6: return decoder.decode(reader.take(reader.u32()));
    case 7: {
      const result = [];
      const count = reader.u32();
      for (let i = 0; i < count; i++) result.push(readValue(reader, depth + 1));
      return result;
    }
    case 8: {
      const result = {};
      const count = reader.u32();
      for (let i = 0; i < count; i++) {
        const key = readValue(reader, depth + 1);
        result[String(key)] = readValue(reader, depth + 1);
      }
      return result;
    }
    case 9: {
      const id = reader.u32();
      const luaType = reader.byte();
      return { $luaRef: id, luaType };
    }
    case 10: return { $jsRef: reader.u32() };
    case 11: {
      const error = new Error(decoder.decode(reader.take(reader.u32())));
      error.name = 'LuaError';
      return error;
    }
    default: throw new RangeError('Unknown wire tag ' + tag + '.');
  }
}

/** @param {ArrayBuffer|Uint8Array} value @returns {any} */
export function decodeWire(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  if (bytes.length < 5 || MAGIC.some((byte, index) => bytes[index] !== byte))
    throw new TypeError('Unsupported wasm-lua wire format.');
  const reader = new Reader(bytes);
  reader.offset = 4;
  return readValue(reader, 0);
}
