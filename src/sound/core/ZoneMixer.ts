import { SOUND_ZONES, SoundZones, type SoundZone, type ZoneWeights } from './SoundZones.js';

/** Crossfade timing (spec FR3). */
export const MIX = {
  /** Shortest allowed ramp: a full change of zone never takes less (s). */
  minRampSeconds: 1.5,
  /** Ramp of a full change of zone (s). */
  rampSeconds: 2,
} as const;

/**
 * Crossfades the zone weights towards a target (spec FR3), frame by frame
 * and without audio: every weight moves in a straight line towards its
 * target at no more than `1 / rampSeconds` per second, so a full change of
 * zone takes the whole ramp and smaller changes take less. All weights of
 * a step move by the same fraction of their distance to the target, so the
 * result stays a mix (each weight in [0, 1], sum 1) and never overshoots.
 */
export class ZoneMixer {
  private weights: ZoneWeights;

  /**
   * @param initial - Starting mix (default: the arrival alone).
   * @param rampSeconds - Length of a full change of zone, ≥ {@link MIX.minRampSeconds}.
   * @throws Error when the ramp is too short or `initial` is not a mix.
   */
  constructor(
    initial: ZoneWeights = SoundZones.only('arrival'),
    readonly rampSeconds: number = MIX.rampSeconds,
  ) {
    if (!(rampSeconds >= MIX.minRampSeconds)) throw new Error(`[sound] the zone ramp must last at least ${MIX.minRampSeconds} s (got ${rampSeconds})`);
    if (!SoundZones.isMix(initial)) throw new Error('[sound] the starting weights must sum to 1, each in [0, 1]');
    this.weights = initial;
  }

  /** The current mix. */
  get current(): ZoneWeights {
    return this.weights;
  }

  /**
   * Moves the mix towards a target.
   *
   * @param target - Where the camera says the mix should be.
   * @param dt - Frame time (s); frames without positive time change nothing.
   * @returns The new current mix.
   * @throws Error when `target` is not a mix.
   */
  step(target: ZoneWeights, dt: number): ZoneWeights {
    if (!SoundZones.isMix(target)) throw new Error('[sound] target zone weights must sum to 1, each in [0, 1]');
    if (!(dt > 0)) return this.weights;
    const gap = Math.max(...SOUND_ZONES.map((z) => Math.abs(target[z] - this.weights[z])));
    if (gap === 0) return this.weights;
    const fraction = dt / this.rampSeconds / gap;
    if (fraction >= 1) {
      this.weights = { ...target };
      return this.weights;
    }
    const next = {} as Record<SoundZone, number>;
    for (const z of SOUND_ZONES) next[z] = this.weights[z] + fraction * (target[z] - this.weights[z]);
    this.weights = next;
    return this.weights;
  }
}
