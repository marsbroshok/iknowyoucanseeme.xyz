/** Which threshold a visit gets. */
export type ThresholdKind = 'full' | 'short';

/** Where the threshold is in its life. */
export type ThresholdPhase = 'hidden' | 'shown' | 'leaving' | 'gone';

/** What the threshold depends on (deliberately not reduced motion, docs/adr/0009). */
export interface ThresholdContext {
  /** The browser has entered before ({@link VisitMemory}). */
  returning: boolean;
  /** The visit opens on a work (`?w=`, e.g. a QR wall label). */
  deepLink: boolean;
  /** Sound is on (the sound track; the Enter click unlocks audio). */
  soundOn: boolean;
}

/** Detail of the `entered` event (consumed by the sound track). */
export interface EnteredDetail {
  /** The entry came from a click or key press (a user gesture that may unlock audio). */
  gesture: boolean;
  /** The visitor had entered before. */
  returning: boolean;
}

/** Threshold timing (s). */
export const THRESHOLD = {
  /** Fade-out of the full threshold after Enter. */
  fullLeaveSeconds: 1.6,
  /** Fade of the short threshold (FR1: 1 s). */
  shortLeaveSeconds: 1,
} as const;

/**
 * The first screen as a state machine (FR1), without DOM or clock: a first
 * visit gets the full threshold and needs a click on Enter; a returning or
 * deep-linked visit gets the short one, which fades by itself unless sound
 * is on (then the click is still needed, it unlocks audio). Entering emits
 * `entered` exactly once. "Wake up" is never blocked: it is outside this
 * machine and always visible.
 */
export class ThresholdState {
  readonly kind: ThresholdKind;
  /** Entering needs a click or key press on Enter. */
  readonly needsClick: boolean;
  /** Seconds after showing at which the threshold enters by itself, or `null`. */
  readonly autoEnterSeconds: number | null;
  /** Length of the fade-out after entering. */
  readonly leaveSeconds: number;
  private current: ThresholdPhase = 'hidden';

  /**
   * @param context - Return, deep link, sound.
   * @param onEntered - Called once when the visitor enters.
   */
  constructor(
    private readonly context: ThresholdContext,
    private readonly onEntered: (detail: EnteredDetail) => void,
  ) {
    this.kind = context.returning || context.deepLink ? 'short' : 'full';
    this.needsClick = this.kind === 'full' || context.soundOn;
    this.autoEnterSeconds = this.needsClick ? null : 0;
    this.leaveSeconds = this.kind === 'full' ? THRESHOLD.fullLeaveSeconds : THRESHOLD.shortLeaveSeconds;
  }

  /** Current phase. */
  get phase(): ThresholdPhase {
    return this.current;
  }

  /** Shows the threshold (only from `hidden`). */
  show(): void {
    if (this.current === 'hidden') this.current = 'shown';
  }

  /**
   * Enters the world from the shown threshold.
   *
   * @param gesture - `true` for a click or key press on Enter; `false` for the automatic entry.
   * @returns `true` when this call entered (and emitted `entered`).
   */
  enter(gesture: boolean): boolean {
    if (this.current !== 'shown' || (!gesture && this.needsClick)) return false;
    this.current = 'leaving';
    this.emit(gesture);
    return true;
  }

  /** Ends the fade-out (only from `leaving`). */
  finish(): void {
    if (this.current === 'leaving') this.current = 'gone';
  }

  /** Enters without showing the screen ("Drift" pressed on the awake page is itself the gesture). */
  skip(): void {
    if (this.current === 'leaving' || this.current === 'gone') return;
    this.current = 'gone';
    this.emit(true);
  }

  /**
   * Emits `entered`.
   *
   * @param gesture - Whether a user gesture caused it.
   */
  private emit(gesture: boolean): void {
    this.onEntered({ gesture, returning: this.context.returning });
  }
}
