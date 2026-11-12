import { describe, it, expect } from 'vitest';
import { DriftSession, SESSION } from '../../../src/world/core/DriftSession.js';
import { DRIFT } from '../../../src/world/core/DriftController.js';
import { sampleManifest } from '../fixtures.js';

const still = { thrust: 0, turn: 0 };

describe('DriftSession', () => {
  it('keeps no unused copy of the manifest (only its works, by slug)', () => {
    const s = new DriftSession(sampleManifest, 'high', null);
    expect(Object.keys(s)).not.toContain('manifest');
    expect(s.work('arrivee')).toBe(sampleManifest.works[0]);
  });

  it('starts at the beginning of the first territory, looking down the path', () => {
    const s = new DriftSession(sampleManifest, 'high', null);
    expect(s.state.yaw).toBe(0);
    expect(s.state.z).toBeGreaterThan(Math.max(...s.layout.placements.map((p) => p.z)));
  });

  it('starts in front of the deep-linked work, facing it', () => {
    const s = new DriftSession(sampleManifest, 'high', 'cygne-icm-1');
    const work = s.layout.placements.find((p) => p.slug === 'cygne-icm-1');
    expect(Math.hypot(s.state.x - (work?.x ?? 0), s.state.z - (work?.z ?? 0))).toBeCloseTo(DRIFT.viewDistance, 9);
    expect(s.frame(still, 1 / 60).facing).toBe('cygne-icm-1');
  });

  it('reports once when the visitor settles in front of a work (the address follows)', () => {
    const s = new DriftSession(sampleManifest, 'high', 'arrivee');
    const settled: string[] = [];
    for (let i = 0; i < 180; i++) {
      const f = s.frame(still, 1 / 60);
      if (f.settled) settled.push(f.settled);
    }
    expect(settled).toEqual(['arrivee']);
  });

  it('ignores an unknown deep link (normal start)', () => {
    expect(new DriftSession(sampleManifest, 'high', 'nope').state).toEqual(new DriftSession(sampleManifest, 'high', null).state);
  });

  it('lists the works in path order for keyboard cycling', () => {
    expect(new DriftSession(sampleManifest, 'low', null).stops.map((s) => s.slug)).toEqual(['arrivee', 'cygne-icm-1']);
  });

  it('fades works by distance: the near one shows, the far territory does not', () => {
    const s = new DriftSession(sampleManifest, 'high', 'arrivee');
    const f = s.frame(still, 1 / 60);
    const opacity = Object.fromEntries(f.works.map((w) => [w.slug, w.opacity]));
    expect(opacity.arrivee).toBe(1);
    expect(opacity['cygne-icm-1']).toBe(0);
    expect(f.works.find((w) => w.slug === 'arrivee')?.distance).toBeCloseTo(DRIFT.viewDistance, 9);
    expect(f.nearest).toBe('arrivee');
    expect(f.nearestDistance).toBeCloseTo(DRIFT.viewDistance, 9);
  });

  it('plans textures on the first frame, then a few times a second', () => {
    const s = new DriftSession(sampleManifest, 'high', 'arrivee');
    expect(s.frame(still, 1 / 60).plan).toEqual({ arrivee: 'full', 'cygne-icm-1': 'none' });
    expect(s.frame(still, 1 / 60).plan).toBeNull();
    let planned = null;
    for (let t = 0; t < SESSION.planEvery && !planned; t += 1 / 60) planned = s.frame(still, 1 / 60).plan;
    expect(planned).not.toBeNull();
  });

  it('reads the compass on the first frame, then a few times a second', () => {
    const s = new DriftSession(sampleManifest, 'high', 'arrivee');
    expect(s.frame(still, 1 / 60).compass?.current).toMatchObject({ territory: 'dreamland', zone: 'arrival' });
    expect(s.frame(still, 1 / 60).compass).toBeNull();
  });

  it('tints the sky with the nearest work\'s colour', () => {
    const s = new DriftSession(sampleManifest, 'high', 'arrivee');
    let sky = '';
    for (let i = 0; i < 600; i++) sky = s.frame(still, 1 / 60).sky;
    expect(sky).not.toBe('#0b1030');
    expect(parseInt(sky.slice(5, 7), 16)).toBeGreaterThan(0x30);
  });

  it('is not facing anything when looking away', () => {
    const s = new DriftSession(sampleManifest, 'high', 'arrivee');
    let f = s.frame({ thrust: 0, turn: DRIFT.maxYawSpeed }, 1 / 60);
    for (let i = 0; i < 120; i++) f = s.frame(still, 1 / 60);
    expect(f.facing).toBeNull();
  });

  it('glides to a work on focus (Tab), and ignores unknown works', () => {
    const s = new DriftSession(sampleManifest, 'high', null);
    s.focus('nope');
    expect(s.state.target).toBeNull();
    s.focus('arrivee');
    let f = s.frame(still, 1 / 60);
    for (let i = 0; i < 600; i++) f = s.frame(still, 1 / 60);
    expect(f.facing).toBe('arrivee');
  });

  it('cycles from the nearest work along the path', () => {
    const s = new DriftSession(sampleManifest, 'high', 'arrivee');
    expect(s.cycle(null, 1)).toBe('arrivee');
    expect(s.cycle('arrivee', 1)).toBe('cygne-icm-1');
    expect(s.isLast('cygne-icm-1', 1)).toBe(true);
    expect(s.isLast('arrivee', -1)).toBe(true);
    expect(s.isLast('arrivee', 1)).toBe(false);
  });

  it('exhibition mode: walks the stops along the zone path and starts over after the last (auto-drift)', () => {
    const s = new DriftSession(sampleManifest, 'high', null);
    expect(s.nextStop(null)).toBe('arrivee');
    expect(s.nextStop('arrivee')).toBe('cygne-icm-1');
    expect(s.nextStop('cygne-icm-1')).toBe('arrivee');
    expect(s.nextStop('nope')).toBe('arrivee');
  });

  it('exhibition mode: restart() goes back to the start of the path, still', () => {
    const s = new DriftSession(sampleManifest, 'high', 'cygne-icm-1');
    const start = new DriftSession(sampleManifest, 'high', null).state;
    s.focus('arrivee');
    s.frame({ thrust: 1, turn: 0.5 }, 0.2);
    s.restart();
    expect(s.state).toEqual(start);
  });

  it('finds a work by slug', () => {
    const s = new DriftSession(sampleManifest, 'high', null);
    expect(s.work('arrivee')?.title).toBe('Arrivée');
    expect(s.work('nope')).toBeUndefined();
  });
});

describe('DriftSession with crowded and empty fields', () => {
  const twin = (slug: string) => ({ ...sampleManifest.works[0], slug });
  const crowded = { ...sampleManifest, works: [...sampleManifest.works, twin('arrivee-2'), twin('arrivee-3')] };

  it('orders works of one territory by their place on the path', () => {
    const s = new DriftSession(crowded, 'high', null);
    const dream = s.stops.filter((p) => p.territory === 'dreamland');
    expect(dream.map((p) => p.progress)).toEqual([...dream.map((p) => p.progress)].sort((a, b) => a - b));
    expect(s.stops[s.stops.length - 1].slug).toBe('cygne-icm-1');
  });

  it('faces the nearest of several works in view', () => {
    const s = new DriftSession(crowded, 'high', 'arrivee-2');
    expect(s.frame(still, 1 / 60).facing).toBe('arrivee-2');
  });

  it('has no next stop without works', () => {
    expect(new DriftSession({ ...sampleManifest, works: [] }, 'high', null).nextStop(null)).toBeNull();
  });

  it('runs with no works at all (night blue, nothing to face)', () => {
    const s = new DriftSession({ ...sampleManifest, works: [] }, 'low', null);
    const f = s.frame(still, 1 / 60);
    expect(f.works).toEqual([]);
    expect(f.facing).toBeNull();
    expect(f.nearest).toBeNull();
    expect(f.nearestDistance).toBe(Number.POSITIVE_INFINITY);
    expect(f.sky).toBe('#0b1030');
    expect(f.plan).toEqual({});
    expect(s.cycle(null, 1)).toBeNull();
  });
});
