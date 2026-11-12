/** Metrics tuning: coarse buckets only, never exact times (privacy). */
export const METRICS = {
  /** Drift-time buckets: upper bound (s, exclusive) and label. */
  buckets: [
    { below: 30, label: '0-30s' },
    { below: 120, label: '30s-2m' },
    { below: 300, label: '2-5m' },
    { below: 900, label: '5-15m' },
    { below: Number.POSITIVE_INFINITY, label: '15m+' },
  ],
  /** A work counts as approached within this distance. */
  approachDistance: 6,
} as const;

/**
 * What the world measures (FR8): time spent drifting, as a coarse bucket,
 * and which works the visitor came close to (once per work and visit).
 */
export class DriftMetrics {
  private seconds = 0;
  private readonly approached = new Set<string>();

  /**
   * Bucket label of a duration.
   *
   * @param seconds - Time drifted.
   * @returns Label such as `2-5m`.
   */
  static bucket(seconds: number): string {
    return (METRICS.buckets.find((b) => seconds < b.below) as { label: string }).label;
  }

  /**
   * Adds frame time.
   *
   * @param dt - Seconds.
   */
  tick(dt: number): void {
    this.seconds += dt;
  }

  /**
   * Hands over the drift time so far as a bucket and starts again from zero.
   *
   * @returns The bucket, or `null` when no time was counted.
   */
  takeTime(): string | null {
    if (this.seconds <= 0) return null;
    const label = DriftMetrics.bucket(this.seconds);
    this.seconds = 0;
    return label;
  }

  /**
   * Notes the nearest work; reports it the first time it is close.
   *
   * @param slug - Nearest work, or `null`.
   * @param distance - Its distance.
   * @returns The slug when newly approached, else `null`.
   */
  approach(slug: string | null, distance: number): string | null {
    if (slug === null || distance > METRICS.approachDistance || this.approached.has(slug)) return null;
    this.approached.add(slug);
    return slug;
  }
}
