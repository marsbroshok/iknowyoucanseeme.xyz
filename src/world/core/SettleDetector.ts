/** When a visitor counts as settled in front of a work. */
export const SETTLE = {
  /** Seconds of standing still in front of the same work. */
  holdSeconds: 1.2,
  /** Ground speed (units/s) under which the visitor counts as still. */
  maxSpeed: 0.15,
} as const;

/**
 * Notices when the visitor has settled in front of a work (FR6: the address
 * then follows it). Reports each settling once; moving away or turning to
 * another work starts over.
 */
export class SettleDetector {
  private candidate: string | null = null;
  private held = 0;
  private reported = false;

  /**
   * Feeds one frame.
   *
   * @param facing - Work faced this frame, or `null`.
   * @param speed - Ground speed (units/s).
   * @param dt - Frame time (s).
   * @returns The work just settled on, or `null`.
   */
  update(facing: string | null, speed: number, dt: number): string | null {
    if (facing === null || speed > SETTLE.maxSpeed || facing !== this.candidate) {
      this.candidate = speed > SETTLE.maxSpeed ? null : facing;
      this.held = 0;
      this.reported = false;
      return null;
    }
    this.held += dt;
    if (this.reported || this.held < SETTLE.holdSeconds) return null;
    this.reported = true;
    return facing;
  }
}
