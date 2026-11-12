import type { ZoneSlug } from '../../domain/ZoneOrder.js';

/** The sound zones: one per Dreamland zone, plus the border territory (spec FR2 recipes). */
export const SOUND_ZONES = ['arrival', 'lens', 'leak', 'border'] as const;

/** A sound zone (a recipe of the generative ambience). */
export type SoundZone = (typeof SOUND_ZONES)[number];

/** How much each sound zone is heard; a mix has every weight in [0, 1] and they sum to 1. */
export type ZoneWeights = Readonly<Record<SoundZone, number>>;

/** Tolerance for "sums to 1". */
const EPSILON = 1e-6;

/**
 * Helpers for sound zones and their weights (pure, no audio).
 */
export class SoundZones {
  /** The territory that is one sound zone of its own, whatever the zone of its works. */
  static readonly BORDER_TERRITORY = 'the-border-is-thin';

  /**
   * The sound zone of a stretch of path.
   *
   * @param territory - Territory slug of the stretch.
   * @param zone - Its Dreamland zone, or `null` for works without one.
   * @returns `border` for the border territory; otherwise the zone, or `arrival` without one.
   */
  static of(territory: string, zone: ZoneSlug | null): SoundZone {
    if (territory === SoundZones.BORDER_TERRITORY) return 'border';
    return zone ?? 'arrival';
  }

  /**
   * The weights of one zone heard alone.
   *
   * @param zone - The zone.
   * @returns 1 for the zone, 0 for the others.
   */
  static only(zone: SoundZone): ZoneWeights {
    return { arrival: 0, lens: 0, leak: 0, border: 0, [zone]: 1 };
  }

  /**
   * Scales raw weights so they sum to 1.
   *
   * @param raw - Non-negative weights, not all 0.
   * @returns The mix.
   * @throws Error when a weight is negative or not finite, or all are 0.
   */
  static normalize(raw: Readonly<Record<SoundZone, number>>): ZoneWeights {
    for (const z of SOUND_ZONES) {
      if (!Number.isFinite(raw[z]) || raw[z] < 0) throw new Error(`[sound] zone weight "${z}" must be a finite number ≥ 0 (got ${raw[z]})`);
    }
    const total = SOUND_ZONES.reduce((s, z) => s + raw[z], 0);
    if (total === 0) throw new Error('[sound] zone weights must not all be 0');
    return { arrival: raw.arrival / total, lens: raw.lens / total, leak: raw.leak / total, border: raw.border / total };
  }

  /**
   * Whether weights form a mix.
   *
   * @param w - Weights.
   * @returns `true` when every weight is in [0, 1] and they sum to 1 (± 1e-6).
   */
  static isMix(w: ZoneWeights): boolean {
    const inRange = SOUND_ZONES.every((z) => w[z] >= 0 && w[z] <= 1);
    return inRange && Math.abs(SOUND_ZONES.reduce((s, z) => s + w[z], 0) - 1) <= EPSILON;
  }
}
