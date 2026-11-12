import type { PreferenceStorage } from './ModePreference.js';

/**
 * Whether this browser has been through the threshold before (FR1:
 * returning visitors get the short threshold). Kept in `localStorage`;
 * blocked storage means every visit is a first visit.
 */
export class VisitMemory {
  /** Storage key. */
  static readonly KEY = 'iknowyoucanseeme:visited';

  /**
   * @param storage - `localStorage`, or `null` when the browser blocks it.
   */
  constructor(private readonly storage: PreferenceStorage | null) {}

  /** `true` when a previous visit entered the world. */
  get returning(): boolean {
    return this.storage?.getItem(VisitMemory.KEY) === '1';
  }

  /** Remembers that the visitor has entered. */
  mark(): void {
    this.storage?.setItem(VisitMemory.KEY, '1');
  }
}
