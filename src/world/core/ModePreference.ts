import type { ModeOverride, WorldMode } from './DeviceProfile.js';

/** The part of the Web Storage API the preference uses (`localStorage`). */
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * The visitor's "Wake up" / "Drift" choice, kept in `localStorage` so it
 * holds across visits (FR1 manual override).
 *
 * Storage may be unavailable (blocked cookies, some private modes); the
 * island then passes `null` and the choice only lasts for the page.
 */
export class ModePreference {
  /** Storage key. */
  static readonly KEY = 'iknowyoucanseeme:mode';

  /**
   * @param storage - `localStorage`, or `null` when the browser blocks it.
   */
  constructor(private readonly storage: PreferenceStorage | null) {}

  /**
   * Reads the stored choice.
   *
   * @returns `world`, `awake`, or `null` when none (or an unknown value) is stored.
   */
  read(): ModeOverride {
    const value = this.storage?.getItem(ModePreference.KEY);
    return value === 'world' || value === 'awake' ? value : null;
  }

  /**
   * Stores the visitor's choice.
   *
   * @param mode - Chosen layer.
   */
  write(mode: WorldMode): void {
    this.storage?.setItem(ModePreference.KEY, mode);
  }

  /** Forgets the choice (back to automatic routing). */
  clear(): void {
    this.storage?.removeItem(ModePreference.KEY);
  }
}
