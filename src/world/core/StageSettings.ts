import type { QualityTier } from './DeviceProfile.js';

/** Renderer settings of a quality tier. */
export interface StageSettings {
  /** Highest device pixel ratio rendered (sharper costs more fill rate). */
  maxPixelRatio: number;
  /** Multisample anti-aliasing. */
  antialias: boolean;
}

/** Night blue of the world (≈ `#0b1030`, from *Arrivée* / *Un Étranger*). */
export const NIGHT_BLUE = '#0b1030';

/** Camera height above the ground (eye level). */
export const EYE_HEIGHT = 1.6;

/** Exponential-squared fog density: ~43 % fogged at 25 units, ~96 % at 60. */
export const FOG_DENSITY = 0.03;

/** Vertical field of view (degrees) and clipping planes of the camera. */
export const CAMERA = { fov: 60, near: 0.1, far: 160 } as const;

/** Per-tier renderer settings: phones (`low`) render fewer pixels, no MSAA. */
export const STAGE_SETTINGS: Readonly<Record<QualityTier, StageSettings>> = {
  high: { maxPixelRatio: 2, antialias: true },
  low: { maxPixelRatio: 1.25, antialias: false },
};

/**
 * Pixel ratio to render at: the device's, capped by the tier.
 *
 * @param devicePixelRatio - `window.devicePixelRatio` (falsy or < 1 counts as 1).
 * @param tier - Quality tier.
 * @returns Ratio in [1, tier cap].
 */
export function pixelRatioFor(devicePixelRatio: number, tier: QualityTier): number {
  return Math.min(Math.max(devicePixelRatio || 1, 1), STAGE_SETTINGS[tier].maxPixelRatio);
}
