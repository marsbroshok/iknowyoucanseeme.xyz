import type { QualityTier } from './DeviceProfile.js';
import type { ZoneSlug } from './FieldLayout.js';

/** Per-tier FBM octave budget for boreal curtain shaders (`ThresholdLeak` and `BorealGateMesh`). */
export const BOREAL_QUALITY: Readonly<Record<QualityTier, { octaves: number }>> = {
  high: { octaves: 4 },
  low: { octaves: 2 },
};

/**
 * GLSL preprocessor defines for boreal curtain shaders on a quality tier.
 *
 * @param tier - Quality tier.
 * @returns `BOREAL_OCTAVES` define map.
 */
export function borealDefines(tier: QualityTier): Record<string, number> {
  return { BOREAL_OCTAVES: BOREAL_QUALITY[tier].octaves };
}

/** A work as the threshold palette needs it. */
export interface PaletteWork {
  zone: ZoneSlug | null;
  /** CSS hex colours, dominant first (may be empty). */
  palette: readonly string[];
}

/** Boreal anchor stops and modulation factor of the threshold curtain (FR1). */
export const BOREAL_THRESHOLD = {
  /** Deep night-indigo void behind the aurora wall. */
  base: '#070b22',
  /** Luminous boreal emerald/teal green ribbon anchor. */
  green: '#12b886',
  /** Rich boreal violet ribbon anchor. */
  violet: '#6d3ccf',
  /** Luminous boreal magenta-pink ribbon anchor. */
  pink: '#d9468f',
  /** Subtle share of the chosen Arrival work's brightest colour blended into each ribbon. */
  tintMix: 0.12,
} as const;

/** Colours of the threshold's boreal light curtain. */
export interface ThresholdColours {
  /** Deep night-indigo void (`#070b22`). */
  base: string;
  /** Boreal emerald/teal green ribbon (`#rrggbb`). */
  green: string;
  /** Boreal violet ribbon (`#rrggbb`). */
  violet: string;
  /** Boreal rose/magenta-pink ribbon (`#rrggbb`). */
  pink: string;
  /** Brightest colour of the chosen Arrival work (or `base` when no palette exists). */
  leak: string;
}

type Rgb = [number, number, number];

/**
 * Pure boreal palette for the Threshold curtain (FR1): anchors the void in deep
 * night indigo (`#070b22`) and supplies vivid emerald/teal green, boreal
 * violet, and magenta-pink aurora ribbon stops subtly modulated by the
 * brightest palette colour of a random Arrival work (falling back to any work
 * when there is no Arrival work, or unmodulated boreal anchors when no palette
 * exists).
 */
export class ThresholdPalette {
  /**
   * Picks and modulates the boreal threshold palette.
   *
   * @param works - Works of the page.
   * @param random - Uniform random numbers in [0, 1).
   * @returns Base void, modulated green/violet/pink ribbons, and work leak tint.
   */
  static pick(works: readonly PaletteWork[], random: () => number): ThresholdColours {
    const arrival = works.filter((w) => w.zone === 'arrival');
    const pool = arrival.length > 0 ? arrival : works;
    const chosen = pool[Math.floor(random() * pool.length)];
    const brightest = [...(chosen?.palette ?? [])].sort((a, b) => ThresholdPalette.luma(b) - ThresholdPalette.luma(a))[0];
    if (!brightest) {
      return {
        base: BOREAL_THRESHOLD.base,
        green: BOREAL_THRESHOLD.green,
        violet: BOREAL_THRESHOLD.violet,
        pink: BOREAL_THRESHOLD.pink,
        leak: BOREAL_THRESHOLD.base,
      };
    }
    return {
      base: BOREAL_THRESHOLD.base,
      green: ThresholdPalette.modulate(BOREAL_THRESHOLD.green, brightest, BOREAL_THRESHOLD.tintMix),
      violet: ThresholdPalette.modulate(BOREAL_THRESHOLD.violet, brightest, BOREAL_THRESHOLD.tintMix),
      pink: ThresholdPalette.modulate(BOREAL_THRESHOLD.pink, brightest, BOREAL_THRESHOLD.tintMix),
      leak: brightest,
    };
  }

  /**
   * Blends a boreal anchor stop subtly toward a work tint.
   *
   * @param anchor - Base ribbon stop (`#rrggbb`).
   * @param tint - Work palette colour (`#rrggbb`).
   * @param weight - Share of `tint` in `[0, 1]`.
   * @returns Modulated `#rrggbb` colour.
   */
  private static modulate(anchor: string, tint: string, weight: number): string {
    const a = ThresholdPalette.parse(anchor);
    const b = ThresholdPalette.parse(tint);
    const mixed = a.map((c, i) => Math.round(c + (b[i] - c) * weight)) as Rgb;
    return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }

  /**
   * Parses `#rrggbb` into 8-bit channels.
   *
   * @param hex - `#rrggbb`.
   * @returns RGB tuple.
   */
  private static parse(hex: string): Rgb {
    const n = Number.parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /**
   * Relative brightness of a colour.
   *
   * @param hex - `#rrggbb`.
   * @returns Luma (Rec. 709 weights, 0–255).
   */
  private static luma(hex: string): number {
    const [r, g, b] = ThresholdPalette.parse(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}
