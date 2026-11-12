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
  /** UI text colour over the world that must keep 4.5:1 (the dimmer one). */
  dimText: '#a0a5b5',
} as const;

type Rgb = [number, number, number];

/**
 * The background (and fog) colour of the world (FR4): night blue that leans
 * towards the dominant colour of the nearest work, so "the palette breathes".
 * The shift is capped so light UI text over the world keeps at least 4.5:1,
 * and it drifts smoothly instead of jumping when the nearest work changes.
 */
export class PaletteSky {
  private current: Rgb = PaletteSky.parse(NIGHT_BLUE);

  /** Current colour (CSS hex). */
  get color(): string {
    return PaletteSky.format(this.current);
  }

  /**
   * Where the sky is heading for a nearest work at a distance.
   *
   * @param color - Dominant colour of the nearest work (CSS hex), or `null`.
   * @param distance - Distance to that work.
   * @returns Target colour (CSS hex).
   */
  static targetFor(color: string | null, distance: number): string {
    const weight = Math.min(Math.max(1 - distance / SKY.reach, 0), 1);
    if (!color || weight === 0) return NIGHT_BLUE;
    const base = PaletteSky.parse(NIGHT_BLUE);
    const tint = PaletteSky.parse(color);
    let mix = SKY.maxMix * weight;
    let result = PaletteSky.format(PaletteSky.mix(base, tint, mix));
    while (contrast(SKY.dimText, result) < 4.6) {
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
   * @returns The new colour (CSS hex).
   */
  update(color: string | null, distance: number, dt: number): string {
    const target = PaletteSky.parse(PaletteSky.targetFor(color, distance));
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
