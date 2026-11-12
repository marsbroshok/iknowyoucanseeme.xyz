import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SoundLevel, VOLUME } from '../../../src/sound/core/SoundLevel.js';

describe('SoundLevel', () => {
  it('the ceiling is well below full scale', () => {
    expect(VOLUME.ceilingDb).toBeLessThanOrEqual(-6);
    expect(SoundLevel.ceiling()).toBeCloseTo(10 ** (VOLUME.ceilingDb / 20), 12);
    expect(VOLUME.limiterDb).toBeLessThan(0);
  });

  it('the master level is the ceiling when heard, 0 when muted or stopped, never above the ceiling (property)', () => {
    expect(SoundLevel.master({ muted: false, running: true })).toBe(SoundLevel.ceiling());
    expect(SoundLevel.master({ muted: true, running: true })).toBe(0);
    expect(SoundLevel.master({ muted: false, running: false })).toBe(0);
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (muted, running) => {
        expect(SoundLevel.master({ muted, running })).toBeLessThanOrEqual(SoundLevel.ceiling());
      }),
    );
  });

  it('fades: a slow fade in, quick fades out and to mute, short ramps for mix updates', () => {
    expect(VOLUME.fadeInSeconds).toBeGreaterThanOrEqual(1.5);
    expect(VOLUME.fadeOutSeconds).toBeLessThanOrEqual(0.5);
    expect(VOLUME.muteSeconds).toBeLessThanOrEqual(0.5);
    expect(VOLUME.applySeconds).toBeGreaterThan(0);
  });
});
