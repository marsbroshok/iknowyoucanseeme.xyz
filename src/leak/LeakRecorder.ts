import { LEAK, LeakMeter, type LeakRecord } from './LeakMeter.js';
import { LeakStyle } from './LeakStyle.js';

/** The part of `Storage` the recorder uses. */
export interface LeakStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Recorder tuning. */
export const RECORDER = {
  /** Drift time gathered before it is written. */
  flushEveryMs: 5_000,
  /** A work closer than this gives the leak its colour. */
  colorDistance: 6,
  /** Longest frame counted (a stalled tab is not drifting). */
  maxFrameSeconds: 0.25,
} as const;

/** The nearest work this frame: its dominant colour and distance. */
export interface NearWork {
  color: string;
  distance: number;
}

/**
 * Feeds the leak from the world (FR1): counts drift time while the world
 * is shown (not while the threshold holds it), remembers the dominant
 * colour of the last work seen up close (with its `LeakStyle.cap`), and
 * writes the `LeakMeter` record to `localStorage` every 5 s of drifting,
 * when the world is closed (`flush`) and on `pagehide`. Local only; the
 * legal page's "Clear the leak" removes it.
 */
export class LeakRecorder {
  private pendingMs = 0;
  private color: string | null = null;
  private readonly onPageHide = (): void => this.flush();

  /**
   * @param storage - `localStorage`, or `null` when blocked (nothing is kept).
   * @param now - Clock (epoch ms).
   * @param events - Where `pagehide` is heard (the window), if anywhere.
   */
  constructor(
    private readonly storage: LeakStorage | null,
    private readonly now: () => number,
    private readonly events: EventTarget | null = null,
  ) {
    events?.addEventListener('pagehide', this.onPageHide);
  }

  /**
   * One frame of the world.
   *
   * @param dt - Frame time (s).
   * @param held - The threshold holds the world (not drifting yet).
   * @param near - Nearest work, or `null`.
   */
  frame(dt: number, held: boolean, near: NearWork | null): void {
    if (held || !(dt > 0)) return;
    this.pendingMs += Math.min(dt, RECORDER.maxFrameSeconds) * 1000;
    if (near && near.distance <= RECORDER.colorDistance) this.color = near.color;
    if (this.pendingMs >= RECORDER.flushEveryMs) this.flush();
  }

  /** Writes what was gathered (no-op when nothing was, or without storage). */
  flush(): void {
    if (!this.storage || (this.pendingMs === 0 && this.color === null)) return;
    const next = LeakMeter.accumulate(this.previous(this.storage), this.pendingMs, this.now());
    if (this.color !== null && this.color !== next.color) {
      next.color = this.color;
      next.cap = LeakStyle.cap(this.color);
    }
    this.pendingMs = 0;
    try {
      this.storage.setItem(LEAK.key, LeakMeter.serialize(next));
    } catch (error) {
      console.warn('[leak] The leak could not be stored.', error);
    }
  }

  /** Stops listening for `pagehide`. */
  detach(): void {
    this.events?.removeEventListener('pagehide', this.onPageHide);
  }

  /**
   * The stored record; a damaged one is reported and replaced.
   *
   * @param storage - Storage.
   * @returns Record or `null`.
   */
  private previous(storage: LeakStorage): LeakRecord | null {
    try {
      return LeakMeter.parse(storage.getItem(LEAK.key));
    } catch (error) {
      console.warn('[leak] The stored leak was damaged; it starts again.', error);
      return null;
    }
  }
}
