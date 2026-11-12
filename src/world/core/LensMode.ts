import type { QualityTier } from './DeviceProfile.js';

/**
 * The six lenses, each one of the artist's real camera techniques
 * (product guidelines): colour filter / gel, mirror fold, multiple
 * exposure, fracture & re-collage, light leak / flare, and motion blur /
 * intentional camera movement (ICM). The order is the cycling order.
 */
export const LENS_MODES = ['gel', 'mirror', 'exposure', 'fracture', 'flare', 'icm'] as const;

/** A lens. */
export type LensMode = (typeof LENS_MODES)[number];

/** Lenses the `low` tier leaves out (fracture needs a Voronoi search per pixel). */
const LOW_TIER_SKIPS: ReadonlySet<LensMode> = new Set(['fracture']);

/**
 * Lenses available on a quality tier, in cycling order.
 *
 * @param tier - Quality tier.
 * @returns All six on `high`; all but fracture on `low`.
 */
export function modesFor(tier: QualityTier): readonly LensMode[] {
  return tier === 'high' ? LENS_MODES : LENS_MODES.filter((m) => !LOW_TIER_SKIPS.has(m));
}

/**
 * Number of a lens in the fragment shader (`lensModeA` / `lensModeB`).
 *
 * @param mode - Lens.
 * @returns Its index in {@link LENS_MODES} (0–5).
 */
export function modeIndex(mode: LensMode): number {
  return LENS_MODES.indexOf(mode);
}
