// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { DriftMetrics, METRICS } from '../../../src/world/core/DriftMetrics.js';
import { DriftAnalytics, type EventSink } from '../../../src/world/island/DriftAnalytics.js';

describe('DriftMetrics.bucket', () => {
  it.each([
    [0, '0-30s'],
    [29.9, '0-30s'],
    [30, '30s-2m'],
    [119, '30s-2m'],
    [120, '2-5m'],
    [300, '5-15m'],
    [899, '5-15m'],
    [900, '15m+'],
    [86400, '15m+'],
  ])('%d s → %s', (seconds, bucket) => {
    expect(DriftMetrics.bucket(seconds)).toBe(bucket);
  });

  it('property: buckets never go down as time grows (no exact times are sent)', () => {
    const order = METRICS.buckets.map((b) => b.label);
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e5, noNaN: true }), fc.double({ min: 0, max: 1e5, noNaN: true }), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(order.indexOf(DriftMetrics.bucket(lo))).toBeLessThanOrEqual(order.indexOf(DriftMetrics.bucket(hi)));
      }),
    );
  });
});

describe('DriftMetrics', () => {
  it('counts drift time and hands it over once', () => {
    const m = new DriftMetrics();
    expect(m.takeTime()).toBeNull();
    for (let i = 0; i < 45; i++) m.tick(1);
    expect(m.takeTime()).toBe('30s-2m');
    expect(m.takeTime()).toBeNull();
  });

  it('reports a work the first time the visitor comes close, once per visit', () => {
    const m = new DriftMetrics();
    expect(m.approach('arrivee', METRICS.approachDistance + 1)).toBeNull();
    expect(m.approach('arrivee', METRICS.approachDistance)).toBe('arrivee');
    expect(m.approach('arrivee', 1)).toBeNull();
    expect(m.approach('solitude', 2)).toBe('solitude');
    expect(m.approach(null, 0)).toBeNull();
  });
});

describe('DriftAnalytics', () => {
  const sink = () => {
    const events: [string, Record<string, string | number | boolean> | undefined][] = [];
    const s: EventSink = { track: (event, data) => (events.push([event, data]), 'sent') };
    return { s, events };
  };

  it('sends work-approached as works come close', () => {
    const { s, events } = sink();
    const a = new DriftAnalytics(s, window);
    a.frame('arrivee', 3, 1 / 60);
    a.frame('arrivee', 2, 1 / 60);
    expect(events).toEqual([['work-approached', { work: 'arrivee' }]]);
    a.finish();
  });

  it('sends the drift-time bucket when the visitor wakes up', () => {
    const { s, events } = sink();
    const a = new DriftAnalytics(s, window);
    a.frame(null, Infinity, 200);
    a.finish();
    a.finish();
    expect(events).toEqual([['drift-time', { bucket: '2-5m' }]]);
  });

  it('sends it when the page is left, then counts again from zero', () => {
    const { s, events } = sink();
    const a = new DriftAnalytics(s, window);
    a.frame(null, Infinity, 10);
    window.dispatchEvent(new Event('pagehide'));
    a.frame(null, Infinity, 1000);
    a.finish();
    expect(events).toEqual([
      ['drift-time', { bucket: '0-30s' }],
      ['drift-time', { bucket: '15m+' }],
    ]);
  });

  it('stops listening to the page after finish', () => {
    const { s } = sink();
    const track = vi.spyOn(s, 'track');
    const a = new DriftAnalytics(s, window);
    a.finish();
    a.frame(null, Infinity, 10);
    window.dispatchEvent(new Event('pagehide'));
    expect(track).not.toHaveBeenCalled();
  });
});
