import type { SoundCues } from './SoundCues.js';
import { SOUND_ZONES, type SoundZone, type ZoneWeights } from './SoundZones.js';

/** The fixed character of a zone's recipe (what `src/sound/engine/` voices play). */
export interface Recipe {
  /** Level of the zone heard alone, in (0, 1]. */
  gain: number;
  /** Filter cutoff (Hz) with nothing near. */
  cutoff: number;
  /** Filter cutoff (Hz) with a work right there (≥ `cutoff`). */
  brightCutoff: number;
  /** Events per second (glints) with nothing near. */
  activity: number;
  /** Events per second with a work right there. */
  busyActivity: number;
  /** How much an eclipse work nearby raises the low swell (0: none). */
  swell: number;
}

/** What one voice plays right now. */
export interface VoiceParams {
  /** Output level in [0, recipe gain]. */
  level: number;
  /** Filter cutoff (Hz). */
  cutoff: number;
  /** Events (glints) per second. */
  activity: number;
  /** Level of the low swell, in [0, 1]. */
  swell: number;
}

/**
 * The four recipes (spec FR2): Arrival, a wide filtered pink-noise sea and
 * slow detuned pads under a long reverb; Lens, sparser and brighter, with
 * glints as works approach; Leak, a low, close and dry pulse with a faint
 * hum; the border, wind with slow bends and a low swell near eclipse works.
 */
export const RECIPES: Readonly<Record<SoundZone, Recipe>> = Object.freeze({
  arrival: { gain: 0.9, cutoff: 650, brightCutoff: 650, activity: 0, busyActivity: 0, swell: 0 },
  lens: { gain: 0.6, cutoff: 1800, brightCutoff: 4200, activity: 0.15, busyActivity: 1.4, swell: 0 },
  leak: { gain: 0.8, cutoff: 420, brightCutoff: 420, activity: 0, busyActivity: 0, swell: 0 },
  border: { gain: 0.8, cutoff: 900, brightCutoff: 900, activity: 0, busyActivity: 0, swell: 1 },
});

/**
 * Maps the zone mix and closeness cues to each voice's parameters, without
 * audio. Levels follow an equal-power crossfade (`gain × √weight`), so the
 * loudness holds steady while zones blend.
 */
export class SoundRecipes {
  /**
   * Parameters of one zone's voice.
   *
   * @param zone - The zone.
   * @param weight - Its weight in the mix (clamped to [0, 1]).
   * @param cues - Closeness cues (clamped to [0, 1]).
   * @returns What the voice plays.
   * @throws Error when an input is NaN.
   */
  static voice(zone: SoundZone, weight: number, cues: SoundCues): VoiceParams {
    const r = RECIPES[zone];
    const w = unit(weight, 'weight');
    const approach = unit(cues.approach, 'approach');
    const eclipse = unit(cues.eclipse, 'eclipse');
    return {
      level: r.gain * Math.sqrt(w),
      cutoff: r.cutoff + (r.brightCutoff - r.cutoff) * approach,
      activity: r.activity + (r.busyActivity - r.activity) * approach,
      swell: r.swell * eclipse,
    };
  }

  /**
   * Parameters of every voice.
   *
   * @param weights - The zone mix.
   * @param cues - Closeness cues.
   * @returns Parameters per zone.
   */
  static mix(weights: ZoneWeights, cues: SoundCues): Record<SoundZone, VoiceParams> {
    const out = {} as Record<SoundZone, VoiceParams>;
    for (const z of SOUND_ZONES) out[z] = SoundRecipes.voice(z, weights[z], cues);
    return out;
  }
}

/**
 * Clamps to [0, 1].
 *
 * @param value - Input.
 * @param name - Its name, for the error.
 * @returns The clamped value.
 * @throws Error when it is NaN.
 */
function unit(value: number, name: string): number {
  if (Number.isNaN(value)) throw new Error(`[sound] ${name} must be a number`);
  return Math.min(Math.max(value, 0), 1);
}
