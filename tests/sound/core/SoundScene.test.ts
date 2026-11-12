import { describe, it, expect } from 'vitest';
import { SoundScene } from '../../../src/sound/core/SoundScene.js';
import { DriftSession } from '../../../src/world/core/DriftSession.js';
import { sampleManifest } from '../../world/fixtures.js';

describe('SoundScene', () => {
  it('reads the zone mix and the closeness cues of a drift session at the camera', () => {
    const session = new DriftSession(sampleManifest, 'high', null);
    const scene = SoundScene.of(session.layout, sampleManifest.works);
    const atStart = scene.read(session.state);
    expect(atStart.weights.arrival).toBeGreaterThan(0.9);
    expect(atStart.cues.eclipse).toBe(0);
    const swan = session.layout.placements.find((p) => p.slug === 'cygne-icm-1') as { x: number; z: number };
    const atSwan = scene.read(swan);
    expect(atSwan.weights.border).toBeCloseTo(1, 6);
    expect(atSwan.cues).toEqual({ approach: 1, eclipse: 0 });
  });
});
