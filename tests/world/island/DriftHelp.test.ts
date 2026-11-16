// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { DRIFT_HELP, DriftHelp } from '../../../src/world/island/DriftHelp.js';

const MARKUP = `
  <section data-drift tabindex="-1">
    <p
      data-drift-onboarding
      data-hint-fine="Scroll, drag, or use the arrows below to drift"
      data-hint-coarse="Swipe to drift · tap below to step or change lens"
    >Scroll, drag, or use the arrows below to drift</p>
    <div data-drift-dock>
      <button type="button" data-drift-help-toggle aria-expanded="false" aria-controls="drift-help-panel">Help</button>
    </div>
    <div id="drift-help-panel" data-drift-help-panel hidden>
      <p>Scroll or drag to move.</p>
    </div>
    <dialog data-drift-focus><button type="button" id="inside-dialog">Close</button></dialog>
  </section>
`;

let root: HTMLElement;
const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;

beforeEach(() => {
  document.body.innerHTML = MARKUP;
  root = document.querySelector('[data-drift]') as HTMLElement;
});

describe('DriftHelp', () => {
  it('selects fine vs coarse onboarding copy from pointer profile and initializes help panel closed', () => {
    const fineHelp = new DriftHelp(root, false);
    expect($('[data-drift-onboarding]').textContent).toBe('Scroll, drag, or use the arrows below to drift');
    expect($('[data-drift-onboarding]').dataset.pointer).toBe('fine');
    expect(fineHelp.isOpen).toBe(false);
    expect(fineHelp.isOnboardingDismissed).toBe(false);
    expect($('[data-drift-help-toggle]').getAttribute('aria-expanded')).toBe('false');
    expect($('[data-drift-help-panel]').hidden).toBe(true);
    fineHelp.detach();

    const coarseHelp = new DriftHelp(root, true);
    expect($('[data-drift-onboarding]').textContent).toBe('Swipe to drift · tap below to step or change lens');
    expect($('[data-drift-onboarding]').dataset.pointer).toBe('coarse');
    coarseHelp.detach();
  });

  it('holds onboarding timer while inactive (Threshold or FocusOverlay up), then auto-dismisses at >= 6 s', () => {
    const help = new DriftHelp(root, false);
    help.frame({ x: 0, z: 4.6, active: false }, 10);
    expect(help.isOnboardingDismissed).toBe(false);
    expect($('[data-drift-onboarding]').hidden).toBe(false);

    help.frame({ x: 0, z: 4.6, active: true }, 3.5);
    expect(help.isOnboardingDismissed).toBe(false);

    // Negative dt is clamped to 0.
    help.frame({ x: 0, z: 4.6, active: true }, -1);
    expect(help.isOnboardingDismissed).toBe(false);

    help.frame({ x: 0, z: 4.6, active: true }, 2.5);
    expect(help.isOnboardingDismissed).toBe(true);
    expect($('[data-drift-onboarding]').hidden).toBe(true);
    expect($('[data-drift-onboarding]').dataset.dismissed).toBe('true');

    // Subsequent frames remain dismissed without mutating again.
    help.frame({ x: 10, z: -20, active: true }, 1);
    expect(help.isOnboardingDismissed).toBe(true);
    help.detach();
  });

  it('auto-dismisses onboarding as soon as camera drifts >= 2.5 m from initial active pose', () => {
    const help = new DriftHelp(root, true);
    help.frame({ x: 1, z: 5, active: true }, 0.1);
    help.frame({ x: 2.5, z: 3.5, active: true }, 0.1); // hypot(1.5, -1.5) ≈ 2.12 m < 2.5 m
    expect(help.isOnboardingDismissed).toBe(false);

    help.frame({ x: 3, z: 3, active: true }, 0.1); // hypot(2, -2) ≈ 2.83 m >= 2.5 m
    expect(help.isOnboardingDismissed).toBe(true);
    expect($('[data-drift-onboarding]').hidden).toBe(true);
    help.detach();
  });

  it('property: dismisses iff displacement >= 2.5 m or elapsed active time >= 6 s', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -20, max: 20, noNaN: true }),
        fc.double({ min: -20, max: 20, noNaN: true }),
        fc.double({ min: 0, max: 12, noNaN: true }),
        (dx, dz, dt) => {
          document.body.innerHTML = MARKUP;
          const el = document.querySelector('[data-drift]') as HTMLElement;
          const help = new DriftHelp(el, false);
          help.frame({ x: 0, z: 0, active: true }, 0);
          help.frame({ x: dx, z: dz, active: true }, dt);
          const expected =
            Math.hypot(dx, dz) >= DRIFT_HELP.dismissDistanceMeters ||
            dt >= DRIFT_HELP.dismissAfterSeconds;
          expect(help.isOnboardingDismissed).toBe(expected);
          help.detach();
        },
      ),
    );
  });

  it('toggles [data-drift-help-panel] via button click, updates aria-expanded, dismisses onboarding, and closes on Escape (returning focus to toggle)', () => {
    const help = new DriftHelp(root, false);
    const toggle = $('[data-drift-help-toggle]') as HTMLButtonElement;
    const panel = $('[data-drift-help-panel]');

    toggle.click();
    expect(help.isOpen).toBe(true);
    expect(panel.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(help.isOnboardingDismissed).toBe(true);

    // Escape originating inside a <dialog> is left to the dialog, not swallowed by DriftHelp.
    const dialogEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    ($<HTMLButtonElement>('#inside-dialog')).dispatchEvent(dialogEsc);
    expect(help.isOpen).toBe(true);
    expect(dialogEsc.defaultPrevented).toBe(false);

    // Unrelated keys do not close the panel.
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(help.isOpen).toBe(true);

    // Escape on the Drift layer closes the panel and restores focus to [data-drift-help-toggle].
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    root.dispatchEvent(esc);
    expect(esc.defaultPrevented).toBe(true);
    expect(help.isOpen).toBe(false);
    expect(panel.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);

    // Escape while already closed is ignored.
    const escClosed = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    root.dispatchEvent(escClosed);
    expect(escClosed.defaultPrevented).toBe(false);

    // Clicking toggle open then clicking again closes cleanly; close() is idempotent.
    toggle.click();
    expect(help.isOpen).toBe(true);
    toggle.click();
    expect(help.isOpen).toBe(false);
    toggle.click();
    help.close();
    expect(help.isOpen).toBe(false);
    help.close();
    expect(help.isOpen).toBe(false);

    help.detach();
    toggle.click();
    expect(help.isOpen).toBe(false);
  });

  it('fails loudly when required onboarding attributes or help elements are missing', () => {
    $('[data-drift-onboarding]').removeAttribute('data-hint-coarse');
    expect(() => new DriftHelp(root, true)).toThrow(/data-hint-coarse/);

    document.body.innerHTML = MARKUP;
    root = document.querySelector('[data-drift]') as HTMLElement;
    $('[data-drift-onboarding]').setAttribute('data-hint-fine', '');
    expect(() => new DriftHelp(root, false)).toThrow(/data-hint-fine/);

    document.body.innerHTML = MARKUP;
    root = document.querySelector('[data-drift]') as HTMLElement;
    $('[data-drift-help-panel]').remove();
    expect(() => new DriftHelp(root, false)).toThrow(/Missing \[data-drift-help-panel\]/);
  });
});
