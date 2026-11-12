import type { AnalyticsData, AnalyticsEventName, TrackResult } from '../../analytics/Analytics.js';
import { DriftMetrics } from '../core/DriftMetrics.js';

/** Where events go (the site's `Analytics`; a no-op when analytics is off). */
export interface EventSink {
  track(event: AnalyticsEventName, data?: AnalyticsData): TrackResult;
}

/**
 * Sends the world's metrics through the site's `Analytics.track()` (FR8):
 * `work-approached` with the work slug, and `drift-time` with a coarse
 * bucket when the visitor wakes up or leaves the page (`pagehide`).
 */
export class DriftAnalytics {
  private readonly metrics = new DriftMetrics();
  private finished = false;

  private readonly onPageHide = (): void => this.sendTime();

  /**
   * @param sink - Analytics.
   * @param win - Window (for `pagehide`).
   */
  constructor(
    private readonly sink: EventSink,
    private readonly win: Window,
  ) {
    win.addEventListener('pagehide', this.onPageHide);
  }

  /**
   * Feeds one frame.
   *
   * @param nearest - Nearest work, or `null`.
   * @param distance - Its distance.
   * @param dt - Frame time (s).
   */
  frame(nearest: string | null, distance: number, dt: number): void {
    if (this.finished) return;
    this.metrics.tick(dt);
    const approached = this.metrics.approach(nearest, distance);
    if (approached) this.sink.track('work-approached', { work: approached });
  }

  /** Sends the drift time and stops (the world is unmounted). */
  finish(): void {
    if (this.finished) return;
    this.sendTime();
    this.finished = true;
    this.win.removeEventListener('pagehide', this.onPageHide);
  }

  /** Sends the time counted so far, if any. */
  private sendTime(): void {
    const bucket = this.metrics.takeTime();
    if (bucket) this.sink.track('drift-time', { bucket });
  }
}
