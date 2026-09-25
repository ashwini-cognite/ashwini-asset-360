import { describe, expect, it } from 'vitest';

import QueuedTaskRunner, { AbortError } from './semaphore';

describe(QueuedTaskRunner.name, () => {
  it('runs only as many tasks as the cap allows', async () => {
    const runner = new QueuedTaskRunner<() => Promise<string>, string>(1);
    let release: () => void = () => undefined;
    const first = runner.schedule(
      () =>
        new Promise((resolve) => {
          release = () => resolve('first');
        }),
    );
    let started = false;
    const second = runner.schedule(() => {
      started = true;
      return Promise.resolve('second');
    });
    expect(started).toBe(false);
    release();
    await expect(first).resolves.toBe('first');
    await expect(second).resolves.toBe('second');
  });

  it('replaces a queued task that shares a key and rejects a failing task', async () => {
    const runner = new QueuedTaskRunner<() => Promise<string>, string>(1);
    let release: () => void = () => undefined;
    const blocking = runner.schedule(
      () =>
        new Promise((resolve) => {
          release = () => resolve('block');
        }),
    );
    const stale = runner.schedule(() => Promise.resolve('old'), { key: 'search' });
    const fresh = runner.schedule(() => Promise.resolve('new'), { key: 'search' });
    await expect(stale).rejects.toBeInstanceOf(AbortError);
    release();
    await expect(blocking).resolves.toBe('block');
    await expect(fresh).resolves.toBe('new');
    await expect(runner.schedule(() => Promise.reject(new Error('nope')))).rejects.toThrow('nope');
    runner.clearQueue();
  });
});
