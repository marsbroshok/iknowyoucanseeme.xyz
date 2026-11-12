import { LENS_MODES, type LensMode } from '../core/LensMode.js';

/**
 * Names the lens in use, in the page language: a small caption in the
 * world layer that is also a polite live region, so screen-reader and
 * keyboard visitors hear which camera technique the lens now applies. The
 * names come from the page (`data-lens-names`, UI copy EN/FR).
 */
export class LensAnnouncer {
  private readonly names: Readonly<Record<LensMode, string>>;
  private current: LensMode | null = null;

  /**
   * @param el - The page's `[data-drift-lens]` element.
   * @throws Error when a lens has no name in `data-lens-names`.
   */
  constructor(private readonly el: HTMLElement) {
    const parsed = JSON.parse(el.dataset.lensNames ?? '{}') as Record<string, unknown>;
    for (const mode of LENS_MODES) {
      if (typeof parsed[mode] !== 'string' || parsed[mode] === '') throw new Error(`[drift] The lens "${mode}" has no name in data-lens-names`);
    }
    this.names = parsed as Record<LensMode, string>;
  }

  /**
   * Shows and announces a lens (once per change).
   *
   * @param mode - Lens now in use.
   */
  announce(mode: LensMode): void {
    if (mode === this.current) return;
    this.current = mode;
    this.el.textContent = this.names[mode];
  }

  /** The lens is off: the caption empties. */
  clear(): void {
    this.current = null;
    this.el.textContent = '';
  }
}
