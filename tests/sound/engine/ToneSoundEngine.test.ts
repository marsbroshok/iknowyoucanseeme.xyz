import './webAudio.js';
import { describe, it, expect } from 'vitest';
import { maxLevelJump, maxStep, peak, render, rms, splice } from './offline.js';
import { SoundLevel, VOLUME } from '../../../src/sound/core/SoundLevel.js';
import { SOUND_ZONES, SoundZones, type SoundZone } from '../../../src/sound/core/SoundZones.js';
import { ZoneMixer } from '../../../src/sound/core/ZoneMixer.js';
import { QUIET_CUES } from '../../../src/sound/core/SoundCues.js';

/** Below this RMS a render counts as silent (−120 dBFS). */
const SILENT = 1e-6;
/** Above this RMS a render counts as heard (−50 dBFS). */
const HEARD = 10 ** (-50 / 20);
/** The limiter's threshold as a linear peak. */
const LIMIT = 10 ** (VOLUME.limiterDb / 20);
/** The fade-in is over (s). */
const SETTLED = VOLUME.fadeInSeconds + 0.5;

/** Renders one zone heard alone, from start to `seconds`. */
const alone = (zone: SoundZone, seconds: number, cues = QUIET_CUES) =>
  render(
    seconds,
    async (engine) => {
      engine.setMix(SoundZones.only(zone));
      engine.setCues(cues);
      await engine.start();
    },
    null,
  );

describe('ToneSoundEngine, rendered offline (Tone.Offline)', () => {
  it.each(SOUND_ZONES)('the %s recipe heard alone is audible after the fade-in and never above the limiter', async (zone) => {
    const x = await alone(zone, SETTLED + 1.5, { approach: 1, eclipse: 1 });
    expect(rms(x, SETTLED, SETTLED + 1.5)).toBeGreaterThan(HEARD);
    expect(peak(x, 0, SETTLED + 1.5)).toBeLessThanOrEqual(LIMIT);
  }, 30_000);

  it('fades in rather than starting at full level', async () => {
    const x = await alone('arrival', SETTLED + 1, QUIET_CUES);
    expect(rms(x, 0, 0.3)).toBeLessThan(rms(x, SETTLED, SETTLED + 1) / 4);
  }, 30_000);

  it('is silent before start, and silent when muted from the start', async () => {
    const idle = await render(2, (engine) => engine.setMix(SoundZones.only('arrival')), null);
    expect(peak(idle, 0, 2)).toBe(0);
    const muted = await render(
      SETTLED + 1,
      async (engine) => {
        engine.setMuted(true);
        await engine.start();
      },
      null,
    );
    expect(rms(muted, 0, SETTLED + 1)).toBeLessThan(SILENT);
  }, 30_000);

  it('mute fades to silence within its ramp, unmute brings the sound back', async () => {
    const x = await render(
      SETTLED + 4,
      async (engine, context) => {
        await engine.start();
        context.setTimeout(() => engine.setMuted(true), SETTLED);
        context.setTimeout(() => engine.setMuted(false), SETTLED + 2);
      },
      null,
    );
    expect(rms(x, SETTLED - 1, SETTLED)).toBeGreaterThan(HEARD);
    expect(rms(x, SETTLED + VOLUME.muteSeconds + 0.05, SETTLED + 2)).toBeLessThan(SILENT);
    expect(rms(x, SETTLED + 3, SETTLED + 4)).toBeGreaterThan(HEARD);
  }, 30_000);

  it('a stop right after start (while the context resumes) wins: silence', async () => {
    const x = await render(
      2,
      (engine) => {
        void engine.start();
        void engine.stop();
      },
      null,
    );
    expect(peak(x, 0, 2)).toBe(0);
  }, 30_000);

  it('stop fades out to silence (and dispose keeps it silent)', async () => {
    const x = await render(
      SETTLED + 2,
      async (engine, context) => {
        await engine.start();
        context.setTimeout(() => void engine.stop(), SETTLED);
        context.setTimeout(() => void engine.dispose(), SETTLED + 1);
      },
      null,
    );
    expect(rms(x, SETTLED - 1, SETTLED)).toBeGreaterThan(HEARD);
    expect(rms(x, SETTLED + VOLUME.fadeOutSeconds + 0.05, SETTLED + 2)).toBeLessThan(SILENT);
  }, 30_000);

  it('the master never exceeds the ceiling: a full mix of every zone stays below the limiter', async () => {
    const x = await render(
      SETTLED + 2,
      async (engine) => {
        engine.setMix({ arrival: 0.25, lens: 0.25, leak: 0.25, border: 0.25 });
        engine.setCues({ approach: 1, eclipse: 1 });
        await engine.start();
      },
      null,
    );
    expect(peak(x, 0, SETTLED + 2)).toBeLessThanOrEqual(LIMIT);
    expect(SoundLevel.ceiling()).toBeLessThan(LIMIT);
  }, 30_000);

  it('an eclipse work nearby raises the border swell', async () => {
    const calm = await alone('border', SETTLED + 1.5, { approach: 0, eclipse: 0 });
    const swell = await alone('border', SETTLED + 1.5, { approach: 0, eclipse: 1 });
    expect(rms(swell, SETTLED, SETTLED + 1.5)).toBeGreaterThan(rms(calm, SETTLED, SETTLED + 1.5) * 1.1);
  }, 30_000);

  describe('zone crossfades (ZoneMixer steps every 0.1 s, as the world sends them)', () => {
    /** Crossfade start (after the fade-in) and end of the measured window. */
    const FROM = SETTLED;
    const TO = SETTLED + 2.5;
    const LENGTH = TO + 0.25;
    /** RMS window of the level-jump measure (s). */
    const WINDOW = 0.02;
    /** Allowed level jump above the zones' own (dB). */
    const MARGIN_DB = 1.5;

    const crossfade = (a: SoundZone, b: SoundZone) =>
      render(
        LENGTH,
        async (engine, context) => {
          const mixer = new ZoneMixer(SoundZones.only(a));
          engine.setMix(mixer.current);
          await engine.start();
          const step = () => {
            engine.setMix(mixer.step(SoundZones.only(b), 0.1));
            context.setTimeout(step, 0.1);
          };
          context.setTimeout(step, FROM);
        },
        null,
      );

    it.each([
      ['arrival', 'lens'],
      ['lens', 'leak'],
      ['leak', 'border'],
      ['border', 'arrival'],
    ] as [SoundZone, SoundZone][])('%s → %s: no click or discontinuity above what either zone makes alone', async (a, b) => {
      // One render at a time: Tone.Offline swaps Tone's global context while it renders.
      const x = await crossfade(a, b);
      const steadyA = await alone(a, LENGTH);
      const steadyB = await alone(b, LENGTH);
      // Sample to sample: an equal-power blend can change at most √2 times faster than either zone alone.
      expect(maxStep(x, FROM, TO)).toBeLessThanOrEqual(Math.SQRT2 * Math.max(maxStep(steadyA, FROM, TO), maxStep(steadyB, FROM, TO)) * 1.1);
      // Level (20 ms RMS): no jump beyond the zones' own movement.
      expect(maxLevelJump(x, FROM, TO, WINDOW)).toBeLessThanOrEqual(Math.max(maxLevelJump(steadyA, FROM, TO, WINDOW), maxLevelJump(steadyB, FROM, TO, WINDOW)) + MARGIN_DB);
      // And the crossfade really happened: B alone at the end.
      expect(rms(x, TO - 0.5, TO)).toBeCloseTo(rms(steadyB, TO - 0.5, TO), 3);
    }, 60_000);

    it.each([
      ['lens', 'leak'],
      ['leak', 'border'],
    ] as [SoundZone, SoundZone][])('control: an instant %s → %s switch would fail the level-jump check', async (a, b) => {
      const steadyA = await alone(a, LENGTH);
      const steadyB = await alone(b, LENGTH);
      const own = Math.max(maxLevelJump(steadyA, FROM, TO, WINDOW), maxLevelJump(steadyB, FROM, TO, WINDOW));
      expect(maxLevelJump(splice(steadyA, steadyB, FROM + 1), FROM, TO, WINDOW)).toBeGreaterThan(own + MARGIN_DB);
    }, 60_000);
  });
});
