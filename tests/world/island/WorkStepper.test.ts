// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { WorkStepper, type SteppedWork } from '../../../src/world/island/WorkStepper.js';

const MARKUP = `
  <div data-drift-dock>
    <button type="button" data-drift-prev aria-label="Previous work">‹</button>
    <button type="button" data-drift-current></button>
    <button type="button" data-drift-next aria-label="Next work">›</button>
  </div>
`;

const WORKS: readonly SteppedWork[] = [
  { slug: 'arrivee', title: 'Arrivée', positionIndex: 1, positionTotal: 3 },
  { slug: 'solitude', title: 'Solitude', positionIndex: 2, positionTotal: 3 },
  { slug: 'cygne-icm-1', title: 'Cygne ICM 1', positionIndex: 3, positionTotal: 3 },
];

let root: HTMLElement;
const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;

beforeEach(() => {
  document.body.innerHTML = MARKUP;
  root = document.querySelector('[data-drift-dock]') as HTMLElement;
});

describe('WorkStepper', () => {
  it('renders current work "<Title> · i / N", avoids redundant DOM writes, and opens FocusOverlay on current click', () => {
    const opened: string[] = [];
    const stepper = new WorkStepper(root, {
      onStep: () => null,
      onOpen: (slug) => opened.push(slug),
    });

    // Empty catalogue disables buttons and ignores clicks.
    stepper.update(null);
    expect(($('[data-drift-prev]') as HTMLButtonElement).disabled).toBe(true);
    expect(($('[data-drift-current]') as HTMLButtonElement).disabled).toBe(true);
    expect(($('[data-drift-next]') as HTMLButtonElement).disabled).toBe(true);
    ($('[data-drift-current]') as HTMLButtonElement).click();
    expect(opened).toEqual([]);

    // Repeated null updates are idempotent.
    stepper.update(null);

    stepper.update(WORKS[1]);
    expect(($('[data-drift-prev]') as HTMLButtonElement).disabled).toBe(false);
    expect(($('[data-drift-current]') as HTMLButtonElement).disabled).toBe(false);
    expect(($('[data-drift-next]') as HTMLButtonElement).disabled).toBe(false);
    expect($('[data-drift-current]').textContent).toBe('Solitude · 2 / 3');
    expect($('[data-drift-current]').dataset.slug).toBe('solitude');

    // Repeated frame updates with the same work do not rewrite children.
    const titleSpan = $('[data-drift-current] .drift-stepper-title');
    stepper.update(WORKS[1]);
    expect($('[data-drift-current] .drift-stepper-title')).toBe(titleSpan);

    ($('[data-drift-current]') as HTMLButtonElement).click();
    expect(opened).toEqual(['solitude']);
    stepper.detach();
  });

  it('steps Prev / Next smoothly, preserves glide target across in-flight frames until arrival or manual cancel, and supports clearTarget()', () => {
    const steps: Array<[string | null, -1 | 1]> = [];
    const cycle = (slug: string | null, dir: -1 | 1): SteppedWork => {
      steps.push([slug, dir]);
      const idx = WORKS.findIndex((w) => w.slug === slug);
      const base = idx < 0 ? 0 : idx;
      return WORKS[(base + dir + WORKS.length) % WORKS.length];
    };
    const opened: string[] = [];
    const stepper = new WorkStepper(root, {
      onStep: cycle,
      onOpen: (slug) => opened.push(slug),
    });

    stepper.update(WORKS[0], false);
    expect($('[data-drift-current]').textContent).toBe('Arrivée · 1 / 3');

    // Click Next twice while camera is still physically near WORKS[0] during glide.
    ($('[data-drift-next]') as HTMLButtonElement).click();
    expect($('[data-drift-current]').textContent).toBe('Solitude · 2 / 3');
    stepper.update(WORKS[0], true); // In-flight glide: must keep showing Solitude!
    expect($('[data-drift-current]').textContent).toBe('Solitude · 2 / 3');

    ($('[data-drift-next]') as HTMLButtonElement).click();
    expect($('[data-drift-current]').textContent).toBe('Cygne ICM 1 · 3 / 3');
    expect(steps).toEqual([
      ['arrivee', 1],
      ['solitude', 1],
    ]);

    // Clicking current during glide opens the targeted work.
    ($('[data-drift-current]') as HTMLButtonElement).click();
    expect(opened).toEqual(['cygne-icm-1']);

    // Once camera arrives at Cygne ICM 1 (or glide ends), live tracking resumes.
    stepper.update(WORKS[2], true);
    stepper.update(WORKS[1], false);
    expect($('[data-drift-current]').textContent).toBe('Solitude · 2 / 3');

    // Click Prev, then cancel glide manually (gliding = false on next frame).
    ($('[data-drift-prev]') as HTMLButtonElement).click();
    expect($('[data-drift-current]').textContent).toBe('Arrivée · 1 / 3');
    stepper.update(WORKS[1], false);
    expect($('[data-drift-current]').textContent).toBe('Solitude · 2 / 3');

    // clearTarget() resets any pending glide target immediately.
    ($('[data-drift-next]') as HTMLButtonElement).click();
    expect($('[data-drift-current]').textContent).toBe('Cygne ICM 1 · 3 / 3');
    stepper.clearTarget();
    stepper.update(WORKS[0], true);
    expect($('[data-drift-current]').textContent).toBe('Arrivée · 1 / 3');

    stepper.detach();
  });

  it('property: arbitrary sequences of Prev/Next clicks wrap modulo N in exact lockstep', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(-1 as const, 1 as const), { minLength: 1, maxLength: 30 }), (dirs) => {
        document.body.innerHTML = MARKUP;
        const el = document.querySelector('[data-drift-dock]') as HTMLElement;
        const stepper = new WorkStepper(el, {
          onStep: (slug, dir) => {
            const idx = WORKS.findIndex((w) => w.slug === slug);
            return WORKS[(idx + dir + WORKS.length) % WORKS.length];
          },
          onOpen: () => undefined,
        });
        stepper.update(WORKS[0], false);
        let expectedIdx = 0;
        for (const dir of dirs) {
          (el.querySelector(dir === 1 ? '[data-drift-next]' : '[data-drift-prev]') as HTMLButtonElement).click();
          expectedIdx = (expectedIdx + dir + WORKS.length) % WORKS.length;
          expect(el.querySelector('[data-drift-current]')?.textContent).toBe(
            `${WORKS[expectedIdx].title} · ${WORKS[expectedIdx].positionIndex} / ${WORKS[expectedIdx].positionTotal}`,
          );
        }
        stepper.detach();
      }),
    );
  });

  it('handles null onStep return cleanly, fails loudly on missing buttons, and stops listening on detach', () => {
    const onStep = vi.fn(() => null);
    const onOpen = vi.fn();
    const stepper = new WorkStepper(root, { onStep, onOpen });
    stepper.update(WORKS[0]);
    ($('[data-drift-next]') as HTMLButtonElement).click();
    expect($('[data-drift-current]').textContent).toBe('Arrivée · 1 / 3');

    stepper.detach();
    ($('[data-drift-prev]') as HTMLButtonElement).click();
    ($('[data-drift-current]') as HTMLButtonElement).click();
    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();

    $('[data-drift-next]').remove();
    expect(() => new WorkStepper(root, { onStep, onOpen })).toThrow(/Missing \[data-drift-next\]/);
  });
});
