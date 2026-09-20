import { describe, expect, it } from 'vitest';
import { createOsBridge } from '../../src/sdk/os-bridge.js';

describe('JavaScript os bridge', () => {
  it('provides deterministic clock, UTC formatting and date tables', () => {
    const bridge = createOsBridge({
      clock: () => 12.5,
      environment: { APP_ENV: 'test' }
    });
    expect(bridge.invoke('__wlua.os.clock', [])).toEqual({
      handled: true, value: 12.5
    });
    expect(bridge.invoke('__wlua.os.getenv', ['APP_ENV']).value).toBe('test');
    expect(bridge.invoke('__wlua.os.getenv', ['MISSING']).value).toBeNull();
    expect(bridge.invoke('__wlua.os.date', [
      '!%F %T %u %V %G %EY %Od', 0n
    ]).value).toBe('1970-01-01 00:00:00 4 01 1970 1970 01');
    expect(bridge.invoke('__wlua.os.date', ['!*t', 0n]).value).toMatchObject({
      year: 1970n, month: 1n, day: 1n, hour: 0n, min: 0n, sec: 0n,
      wday: 5n, yday: 1n, isdst: false
    });
  });

  it('normalizes local date tables and rejects unsupported conversions', () => {
    const bridge = createOsBridge();
    const value = bridge.invoke('__wlua.os.time', [2024n, 2n, 30n, 1n, 2n, 3n]);
    expect(value.handled).toBe(true);
    expect(value.value).toMatchObject({ year: 2024n, month: 3n, day: 1n });
    expect(() => bridge.invoke('__wlua.os.date', ['%Q', 0n]))
      .toThrow('无效的 os.date 转换符');
    expect(bridge.invoke('__wlua.os.remove', ['/tmp/a'])).toEqual({ handled: false });
  });
});
