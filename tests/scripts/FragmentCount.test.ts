// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FRAGMENTS_KEY, showFragmentCount } from '../../src/scripts/FragmentCount.js';
import { FragmentProgress } from '../../src/world/core/FragmentProgress.js';
import { MemoryStorage } from '../world/memoryStorage.js';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const ids = ['work:a', 'work:b', 'statement:dream:0'];

beforeEach(() => {
  document.body.innerHTML = `<p data-fragments-found data-ids='${JSON.stringify(ids)}' data-template="Fragments found: {n} / {total}" hidden></p>`;
});

describe('showFragmentCount', () => {
  it('shows "found n / N" from the fragments read in the world (progressive: the element is hidden without JavaScript)', () => {
    const storage = new MemoryStorage();
    const p = new FragmentProgress(storage);
    p.add('work:a');
    p.add('statement:dream:0');
    p.add('work:elsewhere');
    expect(showFragmentCount(document, { localStorage: storage })).toBe(true);
    expect($('[data-fragments-found]').hidden).toBe(false);
    expect($('[data-fragments-found]').textContent).toBe('Fragments found: 2 / 3');
  });

  it('reads the same storage key the world writes', () => {
    expect(FRAGMENTS_KEY).toBe(FragmentProgress.KEY);
  });

  it('counts nothing, with a warning, when the stored value is unreadable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const bad of ['{nope', '[1]']) {
      const storage = new MemoryStorage();
      storage.setItem(FRAGMENTS_KEY, bad);
      showFragmentCount(document, { localStorage: storage });
      expect($('[data-fragments-found]').textContent).toBe('Fragments found: 0 / 3');
    }
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('shows 0 / N before any drift', () => {
    showFragmentCount(document, { localStorage: new MemoryStorage() });
    expect($('[data-fragments-found]').textContent).toBe('Fragments found: 0 / 3');
  });

  it('does nothing on pages without the counter, or a territory with no fragments', () => {
    document.body.innerHTML = '<main></main>';
    expect(showFragmentCount(document, { localStorage: new MemoryStorage() })).toBe(false);
    document.body.innerHTML = `<p data-fragments-found data-ids="[]" data-template="{n} / {total}" hidden></p>`;
    expect(showFragmentCount(document, { localStorage: new MemoryStorage() })).toBe(false);
    expect($('[data-fragments-found]').hidden).toBe(true);
  });

  it('reports a counter without its ids or text', () => {
    document.body.innerHTML = '<p data-fragments-found data-ids="[]" hidden></p>';
    expect(() => showFragmentCount(document, { localStorage: new MemoryStorage() })).toThrow('[fragments] [data-fragments-found] needs data-ids and data-template');
    document.body.innerHTML = '<p data-fragments-found data-template="x" hidden></p>';
    expect(() => showFragmentCount(document, { localStorage: new MemoryStorage() })).toThrow('needs data-ids');
  });

  it('stays hidden, with a warning, when the browser blocks storage', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const blocked = {
      get localStorage(): Storage {
        throw new DOMException('denied', 'SecurityError');
      },
    };
    expect(showFragmentCount(document, blocked)).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
    expect($('[data-fragments-found]').hidden).toBe(true);
    warn.mockRestore();
  });
});
