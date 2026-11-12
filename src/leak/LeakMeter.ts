/** A stored leak: how much the visitor has drifted, and the colour the leak takes. */
export interface LeakRecord {
  /** Drift time (ms) still felt at `at`, after decay. */
  ms: number;
  /** When `ms` was last brought up to date (epoch ms). */
  at: number;
  /** Dominant colour of the last work seen in the drift (CSS hex), or `null`. */
  color: string | null;
  /** Highest background mix toward `color` that keeps awake text legible (`LeakStyle.cap`). */
  cap: number;
}

/** Leak tuning (FR1). */
export const LEAK = {
  /** `localStorage` key of the record (local only; "Clear the leak" removes it). */
  key: 'iknowyoucanseeme.leak',
  /** Drift time at which the level reaches 1. */
  saturateMs: 15 * 60_000,
  /** Absence after which the felt drift time is halved. */
  halfLifeMs: 5 * 86_400_000,
  /** Stored drift time never exceeds this many saturations (so it decays in days). */
  storeLimit: 2,
  /** Highest share of the dream colour in the awake background (before the contrast cap). */
  maxMix: 0.3,
} as const;

const HEX = /^#[0-9a-f]{6}$/;

/**
 * The leak level (FR1), without storage or clock: accumulated drift time
 * becomes a level in [0, 1] through an ease-in curve that saturates at 15
 * minutes, and fades slowly (half-life of days) while the visitor stays
 * away. The tiny inline script on awake pages (`LeakScript`) repeats the
 * reading half of this; a unit test keeps the two equal.
 */
export class LeakMeter {
  /**
   * Level for a drift time: `(t / 15 min)²`, clamped to [0, 1].
   *
   * @param ms - Drift time (ms); negative or non-finite counts as none.
   * @returns Level in [0, 1].
   */
  static curve(ms: number): number {
    if (!(ms > 0)) return 0;
    const x = Math.min(ms / LEAK.saturateMs, 1);
    return x * x;
  }

  /**
   * Drift time still felt at `now`.
   *
   * @param record - Stored record.
   * @param now - Current time (epoch ms).
   * @returns Decayed drift time (ms); unchanged when `now` is before `record.at`.
   */
  static decayed(record: LeakRecord, now: number): number {
    const away = Math.max(now - record.at, 0);
    return record.ms * Math.pow(2, -away / LEAK.halfLifeMs);
  }

  /**
   * Level at `now`.
   *
   * @param record - Stored record.
   * @param now - Current time (epoch ms).
   * @returns Level in [0, 1].
   */
  static level(record: LeakRecord, now: number): number {
    return LeakMeter.curve(LeakMeter.decayed(record, now));
  }

  /**
   * Adds drift time: the stored time is first decayed up to `now`.
   *
   * @param record - Previous record, or `null`.
   * @param addMs - Drift time to add (ms); negative or non-finite is ignored.
   * @param now - Current time (epoch ms).
   * @returns The new record (colour and cap kept).
   */
  static accumulate(record: LeakRecord | null, addMs: number, now: number): LeakRecord {
    const base = record ? LeakMeter.decayed(record, now) : 0;
    const add = Number.isFinite(addMs) && addMs > 0 ? addMs : 0;
    return {
      ms: Math.min(base + add, LEAK.storeLimit * LEAK.saturateMs),
      at: now,
      color: record?.color ?? null,
      cap: record?.cap ?? 0,
    };
  }

  /**
   * The stored form.
   *
   * @param record - Record.
   * @returns JSON text.
   */
  static serialize(record: LeakRecord): string {
    return JSON.stringify(record);
  }

  /**
   * Reads the stored form.
   *
   * @param raw - Stored text, or `null` when nothing is stored.
   * @returns The record, or `null` when nothing is stored.
   * @throws Error (`[leak] …`) when the stored text is damaged; the caller decides what to do.
   */
  static parse(raw: string | null): LeakRecord | null {
    if (raw === null) return null;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new Error('[leak] The stored leak is not JSON', { cause: error });
    }
    if (typeof value !== 'object' || value === null) throw new Error('[leak] The stored leak is not an object');
    const r = value as Record<string, unknown>;
    if (typeof r.ms !== 'number' || !(r.ms >= 0) || !Number.isFinite(r.ms)) throw new Error('[leak] ms must be a drift time ≥ 0');
    if (typeof r.at !== 'number' || !Number.isFinite(r.at)) throw new Error('[leak] at must be a time');
    if (r.color !== null && (typeof r.color !== 'string' || !HEX.test(r.color))) throw new Error('[leak] color must be #rrggbb or null');
    if (typeof r.cap !== 'number' || !(r.cap >= 0 && r.cap <= LEAK.maxMix)) throw new Error(`[leak] cap must be in [0, ${LEAK.maxMix}]`);
    return { ms: r.ms, at: r.at, color: r.color, cap: r.cap };
  }
}
