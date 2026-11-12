import { NIGHT_BLUE } from './StageSettings.js';
import type { ZoneSlug } from './FieldLayout.js';

/** A work as the threshold palette needs it. */
export interface PaletteWork {
  zone: ZoneSlug | null;
  /** CSS hex colours, dominant first (may be empty). */
  palette: readonly string[];
}

/** Colours of the threshold's breathing leak. */
export interface ThresholdColours {
  /** The near-black night-blue void. */
  base: string;
  /** The single colour leak. */
  leak: string;
}

/**
 * The threshold's palette (FR1): the void is the night blue, the single
 * breathing leak takes the brightest colour of a random Arrival work (any
 * work when there is no Arrival work). With no palette at all the leak is
 * the base blue itself, so the threshold stays a quiet void.
 */
export class ThresholdPalette {
  /**
   * @param works - Works of the page.
   * @param random - Uniform random numbers in [0, 1).
   * @returns Base and leak colours.
   */
  static pick(works: readonly PaletteWork[], random: () => number): ThresholdColours {
    const arrival = works.filter((w) => w.zone === 'arrival');
    const pool = arrival.length > 0 ? arrival : works;
    const chosen = pool[Math.floor(random() * pool.length)];
    const brightest = [...(chosen?.palette ?? [])].sort((a, b) => ThresholdPalette.luma(b) - ThresholdPalette.luma(a))[0];
    return { base: NIGHT_BLUE, leak: brightest ?? NIGHT_BLUE };
  }

  /**
   * Relative brightness of a colour.
   *
   * @param hex - `#rrggbb`.
   * @returns Luma (Rec. 709 weights, 0–255).
   */
  private static luma(hex: string): number {
    const n = Number.parseInt(hex.slice(1), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  }
}
