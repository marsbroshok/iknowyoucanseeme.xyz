import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { FragmentProgress } from '../../../src/world/core/FragmentProgress.js';
import { MemoryStorage } from '../memoryStorage.js';

describe('FragmentProgress', () => {
  it('stores each fragment read once, across instances (page loads)', () => {
    const storage = new MemoryStorage();
    const p = new FragmentProgress(storage);
    expect(p.add('work:a')).toBe(true);
    expect(p.add('work:a')).toBe(false);
    expect(p.add('statement:dream:0')).toBe(true);
    const again = new FragmentProgress(storage);
    expect(again.has('work:a')).toBe(true);
    expect(again.has('work:b')).toBe(false);
    expect(JSON.parse(storage.items.get(FragmentProgress.KEY) as string)).toEqual(['work:a', 'statement:dream:0']);
  });

  it('counts only the fragments of the given set (found n / N stays ≤ N)', () => {
    const p = new FragmentProgress(new MemoryStorage());
    p.add('work:a');
    p.add('work:elsewhere');
    expect(p.count(['work:a', 'work:b'])).toBe(1);
    expect(p.count([])).toBe(0);
  });

  it('keeps progress for the page only when storage is blocked', () => {
    const p = new FragmentProgress(null);
    expect(p.add('work:a')).toBe(true);
    expect(p.count(['work:a'])).toBe(1);
  });

  it('warns and starts over when the stored value is not a list of ids (never crashes the world)', () => {
    for (const bad of ['{not json', '{"a":1}', '[1,2]']) {
      const storage = new MemoryStorage();
      storage.setItem(FragmentProgress.KEY, bad);
      const warn = vi.fn();
      const p = new FragmentProgress(storage, warn);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0][0]).toContain('[fragments]');
      expect(p.count(['work:a'])).toBe(0);
      p.add('work:a');
      expect(JSON.parse(storage.items.get(FragmentProgress.KEY) as string)).toEqual(['work:a']);
    }
  });

  it('property: progress is monotonic and bounded by the set size', () => {
    const id = fc.constantFrom('work:a', 'work:b', 'work:c', 'statement:t:0', 'statement:t:1', 'other');
    fc.assert(
      fc.property(fc.array(id, { maxLength: 40 }), fc.uniqueArray(id, { maxLength: 6 }), (reads, set) => {
        const storage = new MemoryStorage();
        let previous = 0;
        for (const r of reads) {
          new FragmentProgress(storage).add(r);
          const n = new FragmentProgress(storage).count(set);
          expect(n).toBeGreaterThanOrEqual(previous);
          expect(n).toBeLessThanOrEqual(set.length);
          previous = n;
        }
      }),
    );
  });
});
