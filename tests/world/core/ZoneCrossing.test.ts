import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CROSSING, ZoneCrossing } from '../../../src/world/core/ZoneCrossing.js';
import { FieldLayout, type Region } from '../../../src/world/core/FieldLayout.js';
import { ZoneAtmosphere } from '../../../src/world/core/ZoneAtmosphere.js';
import type { WorldManifest } from '../../../src/world/core/WorldManifest.js';
import { sampleManifest } from '../fixtures.js';

const region = (territory: string, zone: Region['zone'], z0: number, z1: number, x = 0): Region => ({
  territory,
  zone,
  start: { x, z: z0 },
  end: { x, z: z1 },
  center: { x, z: (z0 + z1) / 2 },
});

const manifestWithZones: WorldManifest = {
  ...sampleManifest,
  territories: [
    { slug: 'dreamland', title: 'Dreamland', sentences: ['Le rêve est notre demeure.'] },
    { slug: 'the-border-is-thin', title: "La frontière s'efface", sentences: ['La pluie grise cède aux éclats.'] },
  ],
  zones: [
    { slug: 'arrival', title: 'Arrivée', excerpt: "L'arrivée dans les vastes champs colorés." },
    { slug: 'lens', title: 'La Loupe', excerpt: "Ce passage précise le regard de l'atmosphérique au singulier." },
    { slug: 'leak', title: "L'Infiltration", excerpt: null },
  ],
};

describe('ZoneCrossing', () => {
  const regions = [
    region('dreamland', 'arrival', 0, -20),
    region('dreamland', 'lens', -30, -50),
    region('dreamland', 'leak', -60, -80),
    region('the-border-is-thin', null, 0, -30, 48),
  ];

  it('stays hidden when there are no regions', () => {
    const empty = ZoneCrossing.fromManifest([], manifestWithZones);
    expect(empty.update({ x: 0, z: 0 }, false, 0.1)).toEqual({
      visible: false,
      triggered: false,
      opacity: 0,
      title: '',
      subtitle: '',
      accent: '',
      region: null,
    });
  });

  it('suppresses announcements while the threshold holds, then announces initial entry and expires after duration', () => {
    const crossing = ZoneCrossing.fromManifest(regions, manifestWithZones);

    // Threshold holding still: nothing fires yet.
    const held = crossing.update({ x: 0, z: -5 }, true, 0.5);
    expect(held.visible).toBe(false);
    expect(held.triggered).toBe(false);

    // Threshold releases: announces Dreamland · Arrivée with its zone excerpt and Arrival accent.
    const entered = crossing.update({ x: 0, z: -5 }, false, 1 / 60);
    expect(entered.visible).toBe(true);
    expect(entered.triggered).toBe(true);
    expect(entered.title).toBe('Dreamland · Arrivée');
    expect(entered.subtitle).toBe("L'arrivée dans les vastes champs colorés.");
    expect(entered.accent).toBe(ZoneAtmosphere.forRegion(regions[0]).accent);
    expect(entered.opacity).toBeGreaterThan(0);

    // Mid-plateau: full opacity, triggered is false on subsequent frames.
    const plateau = crossing.update({ x: 0, z: -6 }, false, 1.0);
    expect(plateau.visible).toBe(true);
    expect(plateau.triggered).toBe(false);
    expect(plateau.opacity).toBe(1);

    // Near the end: fading out smoothly.
    const fading = crossing.update({ x: 0, z: -7 }, false, CROSSING.durationSeconds - 1.2);
    expect(fading.visible).toBe(true);
    expect(fading.opacity).toBeLessThan(1);
    expect(fading.opacity).toBeGreaterThan(0);

    // Past CROSSING.durationSeconds: hidden cleanly.
    const expired = crossing.update({ x: 0, z: -8 }, false, 0.5);
    expect(expired.visible).toBe(false);
    expect(expired.opacity).toBe(0);
  });

  it('fires on crossing into Lens, Leak (falling back to territory sentence), and The border is thin, and suppresses border flicker via hysteresis', () => {
    const crossing = ZoneCrossing.fromManifest(regions, manifestWithZones);
    crossing.update({ x: 0, z: -5 }, false, 1 / 60);
    crossing.update({ x: 0, z: -5 }, false, CROSSING.durationSeconds + 0.1);

    // Midpoint of Arrival (-20) and Lens (-30) is z = -25. Just past midpoint (-25.3 -> advantage 0.6 < hysteresis) does NOT fire yet.
    const insideBand = crossing.update({ x: 0, z: -25.3 }, false, 0.1);
    expect(insideBand.triggered).toBe(false);
    expect(insideBand.visible).toBe(false);

    // Past hysteresis into Lens (z = -26 -> dArrival = 6, dLens = 4 -> advantage 2.0 >= hysteresis): fires!
    const intoLens = crossing.update({ x: 0, z: -26 }, false, 0.1);
    expect(intoLens.triggered).toBe(true);
    expect(intoLens.visible).toBe(true);
    expect(intoLens.title).toBe('Dreamland · La Loupe');
    expect(intoLens.subtitle).toBe("Ce passage précise le regard de l'atmosphérique au singulier.");
    expect(intoLens.accent).toBe(ZoneAtmosphere.forRegion(regions[1]).accent);

    // Hovering slightly back across the midpoint (z = -24.6 -> dLens = 5.4, dArrival = 4.6 -> advantage 0.8 < hysteresis) never flickers back!
    const wobble = crossing.update({ x: 0, z: -24.6 }, false, 0.1);
    expect(wobble.triggered).toBe(false);
    expect(wobble.title).toBe('Dreamland · La Loupe');

    // Jump into Leak (excerpt is null -> falls back to Dreamland's opening sentence).
    const intoLeak = crossing.update({ x: 0, z: -65 }, false, 0.1);
    expect(intoLeak.triggered).toBe(true);
    expect(intoLeak.title).toBe("Dreamland · L'Infiltration");
    expect(intoLeak.subtitle).toBe('Le rêve est notre demeure.');

    // Jump into The border is thin (unzoned territory -> uses territory title + opening sentence).
    const intoBorder = crossing.update({ x: 48, z: -10 }, false, 0.1);
    expect(intoBorder.triggered).toBe(true);
    expect(intoBorder.title).toBe("La frontière s'efface");
    expect(intoBorder.subtitle).toBe('La pluie grise cède aux éclats.');

    // Reset clears active state so a fresh kiosk cycle announces Arrival again.
    crossing.reset();
    const restarted = crossing.update({ x: 0, z: -2 }, false, 1 / 60);
    expect(restarted.triggered).toBe(true);
    expect(restarted.title).toBe('Dreamland · Arrivée');
  });

  it('handles territories with empty sentences cleanly and rejects missing territory/zone titles', () => {
    const sparseManifest: WorldManifest = {
      ...manifestWithZones,
      territories: [{ slug: 'the-border-is-thin', title: 'The border is thin', sentences: [] }],
    };
    const c = ZoneCrossing.fromManifest([region('the-border-is-thin', null, 0, -20, 48)], sparseManifest);
    expect(c.update({ x: 48, z: -5 }, false, 0.1).subtitle).toBe('');

    expect(() => ZoneCrossing.fromManifest([region('unknown', null, 0, -10)], manifestWithZones)).toThrow(/No territory "unknown"/);
    expect(() =>
      ZoneCrossing.fromManifest([region('dreamland', 'arrival', 0, -10)], { ...manifestWithZones, zones: [] }),
    ).toThrow(/No zone "arrival"/);
  });

  it('property: random oscillations inside the border hysteresis band never re-trigger', () => {
    const layout = FieldLayout.compute(
      [
        { slug: 'a1', territory: 'dreamland', zone: 'arrival' },
        { slug: 'l1', territory: 'dreamland', zone: 'lens' },
      ],
      ['dreamland'],
    );
    const midZ = (layout.regions[0].end.z + layout.regions[1].start.z) / 2;
    // Any z within ±(hysteresis / 4) of midZ has |d0 - d1| < hysteresis.
    const bandOffset = fc.double({ min: -CROSSING.hysteresis * 0.2, max: CROSSING.hysteresis * 0.2, noNaN: true });

    fc.assert(
      fc.property(fc.array(bandOffset, { minLength: 1, maxLength: 30 }), (offsets) => {
        const crossing = ZoneCrossing.fromManifest(layout.regions, manifestWithZones);
        // Settle cleanly inside Lens first.
        crossing.update({ x: layout.regions[1].center.x, z: layout.regions[1].center.z }, false, 0.016);
        crossing.update({ x: layout.regions[1].center.x, z: layout.regions[1].center.z }, false, CROSSING.durationSeconds + 0.1);

        for (const dz of offsets) {
          const z = midZ + dz;
          const x = FieldLayout.pathX(z);
          const step = crossing.update({ x, z }, false, 0.05);
          expect(step.triggered).toBe(false);
          expect(step.opacity).toBeGreaterThanOrEqual(0);
          expect(step.opacity).toBeLessThanOrEqual(1);
        }
      }),
    );
  });
});
