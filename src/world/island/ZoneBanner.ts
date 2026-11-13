import type { ZoneCrossingState } from '../core/ZoneCrossing.js';

/**
 * Centered `Fraunces` zone-crossing title card (`[data-zone-banner]`, FR4):
 * fades in and out gracefully when {@link ZoneCrossing} detects that the
 * visitor entered or crossed into a new zone or territory, displaying the
 * localized region title and 1-line statement/zone excerpt with an AA-legible
 * region accent while staying `pointer-events: none`.
 */
export class ZoneBanner {
  private readonly el: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly subtitleEl: HTMLElement;
  private renderedKey = '';

  /**
   * @param root - The world layer (`[data-drift]`).
   * @throws Error when `[data-zone-banner]` or its title/subtitle child is missing.
   */
  constructor(root: HTMLElement) {
    const part = (selector: string): HTMLElement => {
      const found = root.querySelector<HTMLElement>(selector);
      if (!found) throw new Error(`[drift] Missing ${selector} in the world layer`);
      return found;
    };
    this.el = part('[data-zone-banner]');
    this.titleEl = part('[data-zone-banner-title]');
    this.subtitleEl = part('[data-zone-banner-subtitle]');
    this.clear();
  }

  /**
   * Synchronizes the DOM card with this frame's {@link ZoneCrossingState}.
   *
   * @param state - Output of `ZoneCrossing.update`.
   */
  update(state: ZoneCrossingState): void {
    if (!state.visible) {
      this.el.hidden = true;
      this.el.style.opacity = '0';
      return;
    }
    this.el.hidden = false;
    this.el.style.opacity = String(state.opacity);
    const key = `${state.title}\n${state.subtitle}\n${state.accent}`;
    if (state.triggered || this.renderedKey !== key) {
      this.renderedKey = key;
      this.titleEl.textContent = state.title;
      this.subtitleEl.textContent = state.subtitle;
      this.subtitleEl.hidden = state.subtitle.length === 0;
      this.el.style.setProperty('--zone-accent', state.accent);
    }
  }

  /** Hides the banner immediately and resets its cached copy (on unmount or kiosk reset). */
  clear(): void {
    this.el.hidden = true;
    this.el.style.opacity = '0';
    this.renderedKey = '';
  }
}
