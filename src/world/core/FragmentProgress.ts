import type { PreferenceStorage } from './ModePreference.js';

/**
 * Which fragments the visitor has read (FR3), kept in `localStorage` as a
 * JSON list of fragment ids so the awake territory page can show
 * "fragments found: n / N". Progress only grows. Blocked storage keeps it
 * for the page only; a stored value that is not a list of ids is reported
 * and replaced on the next read fragment.
 */
export class FragmentProgress {
  /** Storage key. */
  static readonly KEY = 'iknowyoucanseeme:fragments';

  private readonly found: Set<string>;

  /**
   * @param storage - `localStorage`, or `null` when the browser blocks it.
   * @param warn - Where an unreadable stored value is reported.
   */
  constructor(
    private readonly storage: PreferenceStorage | null,
    warn: (message: string, detail: unknown) => void = console.warn,
  ) {
    this.found = new Set(FragmentProgress.parse(storage?.getItem(FragmentProgress.KEY) ?? null, warn));
  }

  /**
   * Whether a fragment has been read.
   *
   * @param id - Fragment id.
   * @returns `true` once read.
   */
  has(id: string): boolean {
    return this.found.has(id);
  }

  /**
   * Stores a fragment as read.
   *
   * @param id - Fragment id.
   * @returns `true` when it was not read before.
   */
  add(id: string): boolean {
    if (this.found.has(id)) return false;
    this.found.add(id);
    this.storage?.setItem(FragmentProgress.KEY, JSON.stringify([...this.found]));
    return true;
  }

  /**
   * How many of a set of fragments have been read.
   *
   * @param ids - Fragment ids (e.g. one territory's).
   * @returns Count in [0, ids.length].
   */
  count(ids: readonly string[]): number {
    return ids.filter((id) => this.found.has(id)).length;
  }

  /**
   * Reads the stored list.
   *
   * @param raw - Stored JSON, or `null`.
   * @param warn - Reporter for an unreadable value.
   * @returns Ids (empty when none or unreadable).
   */
  private static parse(raw: string | null, warn: (message: string, detail: unknown) => void): string[] {
    if (raw === null) return [];
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      warn('[fragments] The stored fragment progress is not valid JSON; starting over.', error);
      return [];
    }
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return value;
    warn('[fragments] The stored fragment progress is not a list of ids; starting over.', value);
    return [];
  }
}
