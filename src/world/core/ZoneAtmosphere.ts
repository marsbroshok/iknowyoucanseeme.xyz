import type { ZoneSlug } from './FieldLayout.js';
import { NIGHT_BLUE } from './StageSettings.js';

/** Minimal region identity (`Region` from `FieldLayout` satisfies this directly). */
export interface RegionKey {
  territory: string;
  zone: ZoneSlug | null;
}

/** Three-band boreal curtain colour stops (`#rrggbb`). */
export interface BorealRibbons {
  /** Leading ribbon hue of the region. */
  primary: string;
  /** Secondary ribbon hue. */
  secondary: string;
  /** Tertiary ribbon hue. */
  tertiary: string;
}

/** Nocturnal sky/fog atmosphere, UI accent, and boreal portal ribbons of a region. */
export interface RegionAtmosphere {
  /** Deep nocturnal sky and exponential-fog base colour (`#rrggbb`). */
  base: string;
  /** Luminous AA-legible accent colour (`≥ 4.6:1` over night blue and region base) for crossing banners and active pills. */
  accent: string;
  /** Boreal aurora curtain stops tuned to this region (green, violet, pink). */
  ribbons: BorealRibbons;
}

const ZONE_ATMOSPHERES: Readonly<Record<ZoneSlug, RegionAtmosphere>> = {
  arrival: {
    base: '#081a34',
    accent: '#5eead4',
    ribbons: { primary: '#12b886', secondary: '#6d3ccf', tertiary: '#d9468f' },
  },
  lens: {
    base: '#072622',
    accent: '#34d399',
    ribbons: { primary: '#10b981', secondary: '#7c3aed', tertiary: '#ec4899' },
  },
  leak: {
    base: '#240d2b',
    accent: '#f472b6',
    ribbons: { primary: '#d9468f', secondary: '#7c3aed', tertiary: '#14b8a6' },
  },
};

const TERRITORY_ATMOSPHERES: Readonly<Record<string, RegionAtmosphere>> = {
  'the-border-is-thin': {
    base: '#180e38',
    accent: '#c084fc',
    ribbons: { primary: '#7c3aed', secondary: '#12b886', tertiary: '#db2777' },
  },
};

const FALLBACK_ATMOSPHERE: RegionAtmosphere = {
  base: NIGHT_BLUE,
  accent: '#93c5fd',
  ribbons: { primary: '#12b886', secondary: '#6d3ccf', tertiary: '#d9468f' },
};

/**
 * Pure per-region nocturnal atmospheres and boreal ribbon stops (FR2, FR3, FR4):
 * replaces uniform `#0b1030` across the world so crossing between *Arrival*,
 * *Lens*, *Leak*, and *The border is thin* shifts sky, fog, portal curtains,
 * and UI accents unmistakably while preserving WCAG AA contrast.
 */
export class ZoneAtmosphere {
  /**
   * Resolves the atmosphere descriptor for a region (or the night-blue
   * fallback when `region` is `null` or belongs to an unmapped territory).
   *
   * @param region - Active region key, or `null`.
   * @returns Nocturnal base, AA accent, and boreal ribbon colours.
   */
  static forRegion(region: RegionKey | null): RegionAtmosphere {
    if (!region) return FALLBACK_ATMOSPHERE;
    if (region.zone !== null) return ZONE_ATMOSPHERES[region.zone];
    return TERRITORY_ATMOSPHERES[region.territory] ?? FALLBACK_ATMOSPHERE;
  }
}
