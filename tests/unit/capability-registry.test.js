import { describe, expect, it } from 'vitest';
import {
  CapabilityRegistry, createCapabilityModule
} from '../../src/sdk/capability-registry.js';

describe('host capability registry', () => {
  it('registers hierarchical groups atomically and has generation-safe cleanup', async () => {
    const registry = new CapabilityRegistry();
    const first = registry.register('app.version', () => 'old');
    const second = registry.register('app.version', () => 'new', { replace: true });
    first();
    await expect(registry.invoke('app.version')).resolves.toBe('new');

    const group = registry.registerGroup('tasks', {
      users: {
        get: {
          description: '获取用户',
          parameters: [{ name: 'id', type: 'integer' }],
          returns: { type: 'table' },
          handler: id => ({ id })
        }
      },
      remove: id => id
    });
    expect(group.handle.names).toEqual(['tasks.users.get', 'tasks.remove']);
    await expect(registry.invoke('tasks.users.get', [7])).resolves.toEqual({ id: 7 });
    expect(registry.list().map(item => item.name)).toContain('tasks.users.get');
    group.handle.dispose();
    await expect(registry.invoke('tasks.users.get', [7])).rejects.toThrow('未注册');
    second();
  });

  it('supports middleware, lifecycle events, concurrency bounds and cancellation', async () => {
    const registry = new CapabilityRegistry();
    const events = [];
    registry.addEventListener('invocationstart', event => events.push(event.type));
    registry.addEventListener('invocationend', event => events.push(event.type));
    registry.use(async (context, next) => `${context.name}:${await next()}`);
    registry.register('事务.运行', {
      maxConcurrency: 1,
      queueLimit: 0,
      handler: async value => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return value * 2;
      }
    });
    const first = registry.invoke('事务.运行', [21]);
    await Promise.resolve();
    await expect(registry.invoke('事务.运行', [1])).rejects.toThrow('队列已满');
    await expect(first).resolves.toBe('事务.运行:42');
    expect(events).toEqual(['invocationstart', 'invocationend']);
  });

  it('rejects invalid generated identifiers and duplicate middleware next calls', async () => {
    const registry = new CapabilityRegistry();
    expect(() => registry.registerGroup('tasks', {
      execute: { parameters: [{ name: 'end' }], handler() {} }
    })).toThrow('Lua 标识符');
    registry.register('tasks.execute', () => 1);
    registry.use(async (_context, next) => {
      await next();
      return next();
    });
    await expect(registry.invoke('tasks.execute')).rejects.toThrow('不能重复调用');
  });

  it('aborts timed-out handlers and generates typed Lua module wrappers', async () => {
    const registry = new CapabilityRegistry();
    let aborted = false;
    registry.register('slow.wait', {
      timeoutMs: 10,
      handler: function () {
        return new Promise((_resolve, reject) => this.signal.addEventListener('abort', () => {
          aborted = true;
          reject(this.signal.reason);
        }, { once: true }));
      }
    });
    await expect(registry.invoke('slow.wait')).rejects.toThrow('超时');
    expect(aborted).toBe(true);

    const descriptor = {
      handler: () => null,
      description: '获取用户',
      parameters: [{ name: 'id', type: 'integer', description: '用户编号' }],
      returns: [{ type: 'table', description: '' }]
    };
    const module = createCapabilityModule('tasks', [{
      relativeName: 'users.get', name: 'tasks.users.get', descriptor
    }], 'host.tasks');
    expect(module.source).toContain('js.call("tasks.users.get", id)');
    expect(module.definition).toContain('---@module host.tasks');
    expect(module.definition).toContain('---@param id integer 用户编号');
    expect(() => createCapabilityModule('tasks', [], 'host.bad\ncode'))
      .toThrow('点分 Lua 标识符');
  });

  it('releases concurrency slots when a non-cooperative handler is cancelled', async () => {
    const registry = new CapabilityRegistry();
    let calls = 0;
    registry.register('task.run', {
      maxConcurrency: 1,
      queueLimit: 1,
      handler: () => ++calls === 1 ? new Promise(() => {}) : 'recovered'
    });
    const stuck = registry.invoke('task.run');
    await Promise.resolve();
    registry.cancelActive('VM reset');
    await expect(stuck).rejects.toThrow('VM reset');
    await expect(registry.invoke('task.run')).resolves.toBe('recovered');
  });

  it('releases concurrency slots when a timed-out handler ignores abort', async () => {
    const registry = new CapabilityRegistry();
    let calls = 0;
    registry.register('task.timeout', {
      timeoutMs: 5,
      maxConcurrency: 1,
      queueLimit: 0,
      handler: () => ++calls === 1 ? new Promise(() => {}) : 'next'
    });
    await expect(registry.invoke('task.timeout')).rejects.toThrow('超时');
    await expect(registry.invoke('task.timeout')).resolves.toBe('next');
  });
});
