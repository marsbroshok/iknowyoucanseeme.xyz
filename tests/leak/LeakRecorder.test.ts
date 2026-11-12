import { describe, it, expect, vi, afterEach } from 'vitest';
import { LEAK, LeakMeter } from '../../src/leak/LeakMeter.js';
import { LeakRecorder, RECORDER } from '../../src/leak/LeakRecorder.js';
import { LeakStyle } from '../../src/leak/LeakStyle.js';

const T0 = Date.UTC(2026, 10, 12, 21, 0, 0);

class MemoryStorage {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

const read = (s: MemoryStorage) => LeakMeter.parse(s.getItem(LEAK.key));

afterEach(() => vi.restoreAllMocks());

describe('LeakRecorder', () => {
  it('stores drift time every 5 s of drifting, not on every frame', () => {
    const storage = new MemoryStorage();
    const rec = new LeakRecorder(storage, () => T0);
    for (let i = 0; i < 49; i++) rec.frame(0.1, false, null);
    expect(storage.getItem(LEAK.key)).toBeNull();
    rec.frame(0.1, false, null);
    expect(read(storage)?.ms).toBeCloseTo(RECORDER.flushEveryMs, 6);
  });

  it('does not count time while the threshold holds the world', () => {
    const storage = new MemoryStorage();
    const rec = new LeakRecorder(storage, () => T0);
    rec.frame(10, true, null);
    rec.flush();
    expect(storage.getItem(LEAK.key)).toBeNull();
  });

  it('counts at most a quarter second per frame (a long pause is not drifting) and ignores bad frame times', () => {
    const storage = new MemoryStorage();
    const rec = new LeakRecorder(storage, () => T0);
    rec.frame(30, false, null);
    rec.frame(-1, false, null);
    rec.frame(Number.NaN, false, null);
    rec.flush();
    expect(read(storage)?.ms).toBe(RECORDER.maxFrameSeconds * 1000);
  });

  it('adds to what was stored before (decayed to now)', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEAK.key, LeakMeter.serialize({ ms: 60_000, at: T0 - LEAK.halfLifeMs, color: null, cap: 0 }));
    const rec = new LeakRecorder(storage, () => T0);
    rec.frame(0.2, false, null);
    rec.flush();
    expect(read(storage)).toEqual({ ms: 30_000 + 200, at: T0, color: null, cap: 0 });
  });

  it('remembers the colour of the last work seen up close, with its contrast cap', () => {
    const storage = new MemoryStorage();
    const rec = new LeakRecorder(storage, () => T0);
    rec.frame(0.1, false, { color: '#eaca92', distance: RECORDER.colorDistance });
    rec.frame(0.1, false, { color: '#13103a', distance: RECORDER.colorDistance + 1 });
    rec.flush();
    expect(read(storage)).toMatchObject({ color: '#eaca92', cap: LeakStyle.cap('#eaca92') });
  });

  it('keeps the stored colour and cap when no new work was seen', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEAK.key, LeakMeter.serialize({ ms: 1, at: T0, color: '#a6bce0', cap: 0.2 }));
    const rec = new LeakRecorder(storage, () => T0);
    rec.frame(0.1, false, null);
    rec.flush();
    expect(read(storage)).toMatchObject({ color: '#a6bce0', cap: 0.2 });
  });

  it('writes nothing when nothing happened', () => {
    const storage = new MemoryStorage();
    const set = vi.spyOn(storage, 'setItem');
    new LeakRecorder(storage, () => T0).flush();
    expect(set).not.toHaveBeenCalled();
  });

  it('starts again from zero, with a console warning, when the stored leak is damaged', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEAK.key, '{oops');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rec = new LeakRecorder(storage, () => T0);
    rec.frame(0.2, false, null);
    rec.flush();
    expect(read(storage)?.ms).toBe(200);
    expect(warn).toHaveBeenCalledWith('[leak] The stored leak was damaged; it starts again.', expect.any(Error));
  });

  it('reports a storage that refuses the write (quota), and keeps drifting', () => {
    const storage = new MemoryStorage();
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rec = new LeakRecorder(storage, () => T0);
    rec.frame(0.2, false, null);
    expect(() => rec.flush()).not.toThrow();
    expect(warn).toHaveBeenCalledWith('[leak] The leak could not be stored.', expect.any(Error));
  });

  it('works without storage (blocked): nothing is kept', () => {
    const rec = new LeakRecorder(null, () => T0);
    rec.frame(10, false, { color: '#eaca92', distance: 0 });
    expect(() => rec.flush()).not.toThrow();
  });

  it('stores when the page is hidden or left (pagehide), until detached', () => {
    const storage = new MemoryStorage();
    const target = new EventTarget();
    const rec = new LeakRecorder(storage, () => T0, target);
    rec.frame(0.2, false, null);
    target.dispatchEvent(new Event('pagehide'));
    expect(read(storage)?.ms).toBe(200);
    rec.detach();
    rec.frame(0.2, false, null);
    target.dispatchEvent(new Event('pagehide'));
    expect(read(storage)?.ms).toBe(200);
  });
});
