import type { AnalyticsConfig } from './AnalyticsConfig.js';

/** Custom events of the site (drift metrics of the world, later tracks). */
export type AnalyticsEventName = 'drift-time' | 'work-approached';

/** Extra values of an event; sent as GoatCounter's event title. */
export type AnalyticsData = Readonly<Record<string, string | number | boolean>>;

/** Arguments of GoatCounter's `window.goatcounter.count()` for an event. */
export interface GoatCounterVars {
  path: string;
  title: string;
  event: true;
}

/** The page globals Analytics reads (`window` in the browser). */
export interface AnalyticsHost {
  /** Set by GoatCounter's count.js; `count` exists once it has loaded. */
  goatcounter?: { count?: (vars: GoatCounterVars) => void };
}

/** What happened to a tracked event. */
export type TrackResult = 'disabled' | 'sent' | 'queued';

/**
 * Custom events for GoatCounter (cookieless), e.g. `drift-time` and
 * `work-approached` from the world.
 *
 * `track()` does nothing **only** when analytics is disabled by configuration
 * (`PUBLIC_GOATCOUNTER_CODE` unset). When enabled, an event is sent right
 * away, or queued until GoatCounter's script has loaded and sent with the
 * next `track()` or `flush()`; events are never dropped silently.
 */
export class Analytics {
  private readonly queue: GoatCounterVars[] = [];

  /**
   * @param config - Build settings (see `readAnalyticsConfig`).
   * @param host - Page globals, normally `window`.
   */
  constructor(
    private readonly config: AnalyticsConfig,
    private readonly host: AnalyticsHost,
  ) {}

  /** Whether analytics is enabled by configuration. */
  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Records a custom event.
   *
   * @param event - Event name (GoatCounter path).
   * @param data - Optional values (GoatCounter title, `key=value, …`).
   * @returns `disabled` (configuration off, nothing done), `sent`, or
   *   `queued` (script not loaded yet).
   */
  track(event: AnalyticsEventName, data?: AnalyticsData): TrackResult {
    if (!this.config.enabled) return 'disabled';
    this.queue.push({ path: event, title: Analytics.describe(data), event: true });
    return this.flush() > 0 ? 'sent' : 'queued';
  }

  /**
   * Sends queued events once GoatCounter's script has loaded.
   *
   * @returns Number of events sent (0 when disabled, empty or not loaded).
   */
  flush(): number {
    const count = this.host.goatcounter?.count;
    if (!count) return 0;
    const pending = this.queue.splice(0);
    for (const vars of pending) count(vars);
    return pending.length;
  }

  /**
   * Stable text form of event data: keys sorted, `key=value` joined by `, `.
   *
   * @param data - Event data.
   * @returns The title (empty without data).
   */
  static describe(data: AnalyticsData | undefined): string {
    return Object.keys(data ?? {})
      .sort()
      .map((key) => `${key}=${String((data as AnalyticsData)[key])}`)
      .join(', ');
  }
}
