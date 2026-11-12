/** Exhibition-mode timing (FR5). */
export const KIOSK = {
  /** Without input for this long, the screen goes back to its start. */
  idleResetMs: 90_000,
  /** Without input for this long, the cursor is hidden. */
  cursorHideMs: 5_000,
  /** Without input for this long, the drift moves on by itself… */
  autoDriftAfterMs: 10_000,
  /** …then to the next work this often. */
  autoDriftEveryMs: 12_000,
} as const;

/** What the kiosk should do at one moment. */
export interface KioskTick {
  /** Hide the cursor. */
  cursorHidden: boolean;
  /** Go back to the start state now (fires once per idle period). */
  reset: boolean;
  /** Drift to the next work now. */
  advance: boolean;
}

/**
 * The exhibition screen's idle machine, without DOM or clock (FR5): it
 * hears input times and is asked, at any time, whether to hide the cursor,
 * reset the screen or move the drift on. A screen nobody touched is never
 * reset (it is already at its start); a clock that goes back counts as no
 * idle time.
 */
export class KioskState {
  private lastInput: number;
  private nextAdvanceAt: number;
  /** Someone used the screen since the last reset. */
  private attended = false;

  /**
   * @param now - Time the screen started (epoch ms or any monotonic ms).
   */
  constructor(now: number) {
    this.lastInput = now;
    this.nextAdvanceAt = now + KIOSK.autoDriftAfterMs;
  }

  /**
   * Someone touched, clicked, scrolled or pressed a key.
   *
   * @param now - Time of the input.
   */
  input(now: number): void {
    this.lastInput = now;
    this.attended = true;
    this.nextAdvanceAt = now + KIOSK.autoDriftAfterMs;
  }

  /**
   * What to do now.
   *
   * @param now - Current time.
   * @returns Cursor, reset and auto-drift decisions.
   */
  tick(now: number): KioskTick {
    const idle = Math.max(now - this.lastInput, 0);
    const reset = this.attended && idle >= KIOSK.idleResetMs;
    if (reset) {
      this.attended = false;
      // The start view stays a moment before the drift moves on.
      this.nextAdvanceAt = now + KIOSK.autoDriftAfterMs;
    }
    const advance = idle >= KIOSK.autoDriftAfterMs && now >= this.nextAdvanceAt;
    if (advance) this.nextAdvanceAt = now + KIOSK.autoDriftEveryMs;
    return { cursorHidden: idle >= KIOSK.cursorHideMs, reset, advance };
  }
}
