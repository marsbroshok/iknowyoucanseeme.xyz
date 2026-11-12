import type { PreferenceStorage } from '../../world/core/ModePreference.js';

/**
 * The visitor's mute choice (spec FR5), kept in `localStorage` so it holds
 * across reloads and visits. Sound is on unless the visitor muted it.
 * Storage may be unavailable (`null`); the choice then lasts for the page.
 */
export class SoundPreference {
  /** Storage key. */
  static readonly KEY = 'iknowyoucanseeme:sound';
  /** The choice made on this page (wins over storage, and the only memory without it). */
  private chosen: boolean | null = null;

  /**
   * @param storage - `localStorage`, or `null` when the browser blocks it.
   */
  constructor(private readonly storage: PreferenceStorage | null) {}

  /** Whether the visitor muted the sound (an unknown stored value counts as not muted). */
  get muted(): boolean {
    return this.chosen ?? this.storage?.getItem(SoundPreference.KEY) === 'off';
  }

  /**
   * Stores the choice.
   *
   * @param muted - `true` to mute.
   */
  write(muted: boolean): void {
    this.chosen = muted;
    this.storage?.setItem(SoundPreference.KEY, muted ? 'off' : 'on');
  }
}
