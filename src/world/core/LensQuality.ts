import type { QualityTier } from './DeviceProfile.js';
import { modesFor } from './LensMode.js';

/** Cost settings of the lens shader on a tier. */
export interface LensQuality {
  /** Texture samples along the motion-blur streak (≥ 2). */
  samples: number;
  /** Chromatic ghosts of the light leak (≥ 1). */
  ghosts: number;
  /** Whether the fracture lens (a Voronoi search per pixel) is compiled. */
  fracture: boolean;
}

/** Per-tier lens cost: phones (`low`) get fewer samples and no fracture. */
export const LENS_QUALITY: Readonly<Record<QualityTier, LensQuality>> = {
  high: { samples: 12, ghosts: 3, fracture: modesFor('high').includes('fracture') },
  low: { samples: 5, ghosts: 1, fracture: modesFor('low').includes('fracture') },
};

/**
 * Shader defines of a tier's lens variant.
 *
 * @param tier - Quality tier.
 * @returns `LENS_SAMPLES`, `LENS_GHOSTS` and, when compiled, `LENS_FRACTURE`.
 */
export function lensDefines(tier: QualityTier): Record<string, number | string> {
  const q = LENS_QUALITY[tier];
  return { LENS_SAMPLES: q.samples, LENS_GHOSTS: q.ghosts, ...(q.fracture ? { LENS_FRACTURE: '' } : {}) };
}
