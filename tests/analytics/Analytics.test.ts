import { describe, it, expect, vi } from 'vitest';
import { Analytics, type AnalyticsHost, type GoatCounterVars } from '../../src/analytics/Analytics.js';
import { readAnalyticsConfig } from '../../src/analytics/AnalyticsConfig.js';

const ENABLED = readAnalyticsConfig('iknowyoucanseeme');
const DISABLED = readAnalyticsConfig(undefined);

/** A page where GoatCounter's count.js has loaded. */
function loadedHost(): { host: AnalyticsHost; sent: GoatCounterVars[] } {
  const sent: GoatCounterVars[] = [];
  return { host: { goatcounter: { count: (vars) => sent.push(vars) } }, sent };
}

describe('Analytics', () => {
  it('does nothing when analytics is disabled by configuration', () => {
    const { host, sent } = loadedHost();
    const analytics = new Analytics(DISABLED, host);
    expect(analytics.enabled).toBe(false);
    expect(analytics.track('drift-time', { seconds: 12 })).toBe('disabled');
    expect(analytics.flush()).toBe(0);
    expect(sent).toEqual([]);
  });

  it('sends a GoatCounter event with the event name as path and the data as title', () => {
    const { host, sent } = loadedHost();
    const analytics = new Analytics(ENABLED, host);
    expect(analytics.enabled).toBe(true);
    expect(analytics.track('work-approached', { work: 'arrivee', zone: 'arrival' })).toBe('sent');
    expect(analytics.track('drift-time')).toBe('sent');
    expect(sent).toEqual([
      { path: 'work-approached', title: 'work=arrivee, zone=arrival', event: true },
      { path: 'drift-time', title: '', event: true },
    ]);
  });

  it('describes data with sorted keys so equal data gives equal titles', () => {
    expect(Analytics.describe({ zone: 'lens', seconds: 30, first: true })).toBe('first=true, seconds=30, zone=lens');
    expect(Analytics.describe(undefined)).toBe('');
  });

  it('queues events until the GoatCounter script has loaded, then sends them in order', () => {
    const host: AnalyticsHost = {};
    const analytics = new Analytics(ENABLED, host);
    expect(analytics.track('drift-time', { seconds: 5 })).toBe('queued');
    expect(analytics.track('work-approached', { work: 'solitude' })).toBe('queued');
    expect(analytics.flush()).toBe(0);

    const count = vi.fn();
    host.goatcounter = { count };
    expect(analytics.track('drift-time', { seconds: 9 })).toBe('sent');
    expect(count.mock.calls.map((c) => c[0].title)).toEqual(['seconds=5', 'work=solitude', 'seconds=9']);
    expect(analytics.flush()).toBe(0);
  });

  it('flush() sends the queue once count.js is there (e.g. from the script load event)', () => {
    const host: AnalyticsHost = { goatcounter: {} };
    const analytics = new Analytics(ENABLED, host);
    analytics.track('drift-time');
    const count = vi.fn();
    host.goatcounter = { count };
    expect(analytics.flush()).toBe(1);
    expect(count).toHaveBeenCalledWith({ path: 'drift-time', title: '', event: true });
  });
});
