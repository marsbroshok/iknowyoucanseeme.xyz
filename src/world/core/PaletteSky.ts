import { contrast } from '../../design/AccentColor.js';
import { NIGHT_BLUE } from './StageSettings.js';

/** Sky tuning. */
export const SKY = {
  /** Distance within which the nearest work tints the sky. */
  reach: 20,
  /** Largest share of the work's colour in the sky (when standing at it). */
  maxMix: 0.3,
  /** Speed of the colour drift (1/s): ~78 % of the way per second. */
  rate: 1.5,
  /** UI text colour over the world that must keep ≥ 4.6:1 contrast (the dimmer one). */
  dimText: '#a0a5b5',
  /** Target contrast floor (includes rounding margin so interpolated frames stay ≥ 4.6:1). */
  minContrast: 4.65,
} as const;

type Rgb = [number, number, number];

/**
 * The background (and fog) colour of the world (FR2, FR4): follows the active
 * region's nocturnal atmosphere (`ZoneAtmosphere`) and leans towards the
 * dominant colour of the nearest work so "the palette breathes". The shift is
 * capped so light UI text over the world keeps at least 4.6:1 contrast, and it
 * drifts smoothly across frames when either the region or nearest work changes.
 */
export class PaletteSky {
  private current: Rgb;

  /**
   * @param initialBase - Starting nocturnal base colour (defaults to `NIGHT_BLUE`).
   */
  constructor(initialBase: string = NIGHT_BLUE) {
    this.current = PaletteSky.parse(initialBase);
  }

  /** Current colour (CSS hex). */
  get color(): string {
    return PaletteSky.format(this.current);
  }

  /**
   * Where the sky is heading for a nearest work at a distance within a region's
   * base atmosphere.
   *
   * @param color - Dominant colour of the nearest work (CSS hex), or `null`.
   * @param distance - Distance to that work.
   * @param baseHex - Active region's nocturnal base colour (defaults to `NIGHT_BLUE`).
   * @returns Target colour (CSS hex) with contrast ≥ 4.6:1 against `SKY.dimText`.
   */
  static targetFor(color: string | null, distance: number, baseHex: string = NIGHT_BLUE): string {
    const weight = Math.min(Math.max(1 - distance / SKY.reach, 0), 1);
    if (!color || weight === 0) return baseHex;
    const base = PaletteSky.parse(baseHex);
    const tint = PaletteSky.parse(color);
    let mix = SKY.maxMix * weight;
    let result = PaletteSky.format(PaletteSky.mix(base, tint, mix));
    while (contrast(SKY.dimText, result) < SKY.minContrast && mix > 0) {
      mix = Math.max(0, mix - 0.02);
      result = PaletteSky.format(PaletteSky.mix(base, tint, mix));
    }
    return result;
  }

  /**
   * Moves the sky part of the way towards its target.
   *
   * @param color - Dominant colour of the nearest work, or `null`.
   * @param distance - Distance to that work.
   * @param dt - Frame time (s).
   * @param baseHex - Active region's nocturnal base colour (defaults to `NIGHT_BLUE`).
   * @returns The new colour (CSS hex).
   */
  update(color: string | null, distance: number, dt: number, baseHex: string = NIGHT_BLUE): string {
    const target = PaletteSky.parse(PaletteSky.targetFor(color, distance, baseHex));
    const k = 1 - Math.exp(-SKY.rate * Math.max(dt, 0));
    this.current = this.current.map((c, i) => c + (target[i] - c) * k) as Rgb;
    return this.color;
  }

  /**
   * Linear mix of two colours.
   *
   * @param a - First colour.
   * @param b - Second colour.
   * @param t - Share of `b` in [0, 1].
   * @returns Mixed colour.
   */
  private static mix(a: Rgb, b: Rgb, t: number): Rgb {
    return a.map((v, i) => v + (b[i] - v) * t) as Rgb;
  }

  /**
   * @param hex - `#rrggbb`.
   * @returns Channels 0–255.
   */
  private static parse(hex: string): Rgb {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
  }

  /**
   * @param rgb - Channels 0–255 (rounded).
   * @returns `#rrggbb`.
   */
  private static format(rgb: Rgb): string {
    return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  }
}
