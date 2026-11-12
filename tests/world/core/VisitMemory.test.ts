import { describe, it, expect } from 'vitest';
import { VisitMemory } from '../../../src/world/core/VisitMemory.js';
import { MemoryStorage } from '../memoryStorage.js';

describe('VisitMemory', () => {
  it('knows a returning visitor only after a visit was marked', () => {
    const storage = new MemoryStorage();
    expect(new VisitMemory(storage).returning).toBe(false);
    new VisitMemory(storage).mark();
    expect(new VisitMemory(storage).returning).toBe(true);
    expect(storage.items.get(VisitMemory.KEY)).toBe('1');
  });

  it('treats blocked storage as a first visit and remembers nothing', () => {
    const memory = new VisitMemory(null);
    memory.mark();
    expect(memory.returning).toBe(false);
  });
});
