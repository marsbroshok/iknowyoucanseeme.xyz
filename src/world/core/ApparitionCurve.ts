/**
 * How visible a work is at a distance (FR4 "apparition curve"): fully
 * visible within `near`, gone beyond `far`, and a smoothstep fade in
 * between, so works emerge from the fog instead of popping in.
 */
export class ApparitionCurve {
  /**
   * @param near - Distance up to which the work is fully visible (≥ 0).
   * @param far - Distance from which it is invisible (> near).
   * @throws Error when `near < 0` or `far ≤ near`.
   */
  constructor(
    readonly near: number,
    readonly far: number,
  ) {
    if (!(near >= 0 && far > near)) throw new Error(`[ApparitionCurve] near (${near}) must be ≥ 0 and < far (${far})`);
  }

  /**
   * Opacity at a distance.
   *
   * @param distance - Distance from the camera (negative counts as 0).
   * @returns Opacity in [0, 1], never increasing with distance.
   */
  opacity(distance: number): number {
    const t = Math.min(Math.max((distance - this.near) / (this.far - this.near), 0), 1);
    return 1 - t * t * (3 - 2 * t);
  }
}
