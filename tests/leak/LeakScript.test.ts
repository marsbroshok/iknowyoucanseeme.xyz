// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { LEAK, LeakMeter, type LeakRecord } from '../../src/leak/LeakMeter.js';
import { LeakStyle } from '../../src/leak/LeakStyle.js';
import { LEAK_SCRIPT_BUDGET, leakScript } from '../../src/leak/LeakScript.js';

const NOW = Date.UTC(2026, 10, 12, 21, 0, 0);
const VARS = ['--leak-bg', '--leak-color', '--leak-level'] as const;

/** In-memory Storage (Node's own global localStorage shadows jsdom's here). */
class MemoryStorage {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}

interface Run {
  storage: MemoryStorage;
  warnings: unknown[][];
}

/**
 * Runs the inline script against this document with a given storage, clock and random draw.
 *
 * @param storage - Storage, or a getter that throws (blocked storage).
 * @param random - Value `Math.random()` returns.
 */
function run(storage: MemoryStorage | (() => never), random = 0.99): Run {
  const warnings: unknown[][] = [];
  const fakeConsole = { warn: (...args: unknown[]) => warnings.push(args) };
  const fakeMath = Object.create(Math, { random: { value: () => random } }) as Math;
  const fakeDate = { now: () => NOW };
  const win = typeof storage === 'function' ? Object.defineProperty({}, 'localStorage', { get: storage }) : { localStorage: storage };
  new Function('document', 'window', 'Math', 'Date', 'console', leakScript())(doc, win, fakeMath, fakeDate, fakeConsole);
  return { storage: typeof storage === 'function' ? new MemoryStorage() : storage, warnings };
}

function stored(record: LeakRecord): MemoryStorage {
  const s = new MemoryStorage();
  s.setItem(LEAK.key, LeakMeter.serialize(record));
  return s;
}

/** A fresh document per test: the script adds listeners to the document it runs in. */
let doc: Document;
const vars = () => Object.fromEntries(VARS.map((v) => [v, doc.documentElement.style.getPropertyValue(v)]));

beforeEach(() => {
  doc = document.implementation.createHTMLDocument('leak');
});

describe('leak inline script — size', () => {
  it(`stays within ${LEAK_SCRIPT_BUDGET} bytes (1.5 KB)`, () => {
    expect(LEAK_SCRIPT_BUDGET).toBe(1536);
    expect(Buffer.byteLength(leakScript(), 'utf8')).toBeLessThanOrEqual(LEAK_SCRIPT_BUDGET);
  });
});

describe('leak inline script — staining', () => {
  it('does nothing without a stored leak', () => {
    run(new MemoryStorage());
    expect(doc.documentElement.getAttribute('style')).toBeNull();
  });

  it('sets the @layer leak custom properties from the stored record', () => {
    const color = '#eaca92';
    const record = { ms: LEAK.saturateMs, at: NOW, color, cap: LeakStyle.cap(color) };
    run(stored(record));
    expect(vars()).toEqual(LeakStyle.vars(LeakStyle.of(1, color, record.cap)));
  });

  it('property: sets exactly what LeakMeter and LeakStyle compute, for any record, absence and colour', () => {
    const hex = fc.tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 })).map(([r, g, b]) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`);
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * LEAK.saturateMs, noNaN: true }),
        fc.integer({ min: -86_400_000, max: 40 * 86_400_000 }),
        fc.option(hex, { nil: null }),
        fc.double({ min: 0, max: 0.999, noNaN: true }),
        (ms, away, color, random) => {
          doc = document.implementation.createHTMLDocument('leak');
          const record: LeakRecord = { ms, at: NOW - away, color, cap: color ? LeakStyle.cap(color) : 0 };
          run(stored(record), random);
          const level = LeakMeter.level(record, NOW);
          expect(vars()).toEqual(LeakStyle.vars(LeakStyle.of(level, color, record.cap)));
          expect(doc.documentElement.hasAttribute('data-leak-apparition')).toBe(LeakStyle.appears(level, random));
        },
      ),
      { numRuns: 300 },
    );
  });

  it('marks the page for the stray apparition only when LeakStyle says so', () => {
    run(stored({ ms: LEAK.saturateMs, at: NOW, color: '#13103a', cap: 0.3 }), 0.1);
    expect(doc.documentElement.hasAttribute('data-leak-apparition')).toBe(true);
  });

  it('reports a damaged record in the console and leaves the page as it is', () => {
    const s = new MemoryStorage();
    s.setItem(LEAK.key, '{oops');
    const { warnings } = run(s);
    expect(doc.documentElement.getAttribute('style')).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0][0]).toBe('[leak]');
  });

  it('reports blocked storage in the console and leaves the page as it is', () => {
    const { warnings } = run(() => {
      throw new Error('SecurityError');
    });
    expect(doc.documentElement.getAttribute('style')).toBeNull();
    expect(warnings).toHaveLength(1);
  });

  it('never trusts a stored cap above the leak maximum', () => {
    run(stored({ ms: LEAK.saturateMs, at: NOW, color: '#13103a', cap: 5 } as LeakRecord));
    expect(vars()['--leak-bg']).toBe(LeakStyle.mixHex('#0b1030', '#13103a', LEAK.maxMix));
  });
});

describe('leak inline script — "Clear the leak" (legal page)', () => {
  function legalPage(): void {
    doc.body.innerHTML = '<button type="button" data-leak-clear hidden>Clear the leak</button><p data-leak-cleared role="status" data-text="The leak is cleared."></p><button data-other>Other</button>';
  }

  it('shows the control once the page is parsed (it needs JavaScript)', () => {
    legalPage();
    run(new MemoryStorage());
    doc.dispatchEvent(new Event('DOMContentLoaded'));
    expect((doc.querySelector('[data-leak-clear]') as HTMLButtonElement).hidden).toBe(false);
  });

  it('does nothing on pages without the control', () => {
    run(new MemoryStorage());
    expect(() => doc.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
  });

  it('removes the stored leak, the stain and the apparition mark, and says so', () => {
    legalPage();
    const { storage } = run(stored({ ms: LEAK.saturateMs, at: NOW, color: '#13103a', cap: 0.3 }), 0);
    expect(doc.documentElement.hasAttribute('data-leak-apparition')).toBe(true);
    (doc.querySelector('[data-leak-clear]') as HTMLButtonElement).click();
    expect(storage.getItem(LEAK.key)).toBeNull();
    expect(vars()).toEqual({ '--leak-bg': '', '--leak-color': '', '--leak-level': '' });
    expect(doc.documentElement.hasAttribute('data-leak-apparition')).toBe(false);
    expect(doc.querySelector('[data-leak-cleared]')?.textContent).toBe('The leak is cleared.');
  });

  it('ignores other clicks', () => {
    legalPage();
    const { storage } = run(stored({ ms: 1, at: NOW, color: null, cap: 0 }));
    (doc.querySelector('[data-other]') as HTMLButtonElement).click();
    doc.body.click();
    expect(storage.getItem(LEAK.key)).not.toBeNull();
  });

  it('reports blocked storage when clearing, in the console', () => {
    legalPage();
    let calls = 0;
    const { warnings } = run(() => {
      calls++;
      throw new Error('SecurityError');
    });
    (doc.querySelector('[data-leak-clear]') as HTMLButtonElement).click();
    expect(calls).toBe(2);
    expect(warnings).toHaveLength(2);
    expect(doc.querySelector('[data-leak-cleared]')?.textContent).toBe('');
  });
});
