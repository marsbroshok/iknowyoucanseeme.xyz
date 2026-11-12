import { contrast } from '../design/AccentColor.js';
import { LEAK } from './LeakMeter.js';

/** Background of awake pages (`--ink` in tokens.css). */
export const AWAKE_INK = '#0b1030';
/** Every text colour drawn on the awake background (`--text-primary`, `--text-secondary`, `--accent`). */
export const AWAKE_TEXT: readonly string[] = ['#f0f0f5', '#a0a5b5', '#ffffff'];
/** WCAG 2.2 AA for body text. */
export const MIN_CONTRAST = 4.5;

/** The stray apparition (FR2): from this level on, at most once per page view. */
export const APPARITION = {
  minLevel: 0.4,
  /** Chance per page view at level 1 (scaled by the level). */
  chance: 0.5,
} as const;

/** What the leak does to an awake page at one level. */
export interface LeakLook {
  /** Leak level in [0, 1]. */
  level: number;
  /** Share of the dream colour in the background, in hundredths. */
  mix: number;
  /** The dream colour (the ink when there is none). */
  color: string;
  /** Resulting page background. */
  background: string;
}

/**
 * Parses `#rrggbb`.
 *
 * @param hex - Colour.
 * @returns Red, green, blue (0–255).
 */
function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/**
 * How the leak stains the awake layer (FR2, FR3): the background moves
 * toward the colour of the last work seen in the drift, as far as the level
 * says and never further than text legibility allows. The cap is computed
 * with the site's `AccentColor.contrast` against every awake text colour,
 * with a small guard above 4.5:1, in hundredths; the mix is floored to
 * hundredths too, so only checked steps are ever drawn.
 */
export class LeakStyle {
  /** Contrast the cap keeps (a little above {@link MIN_CONTRAST}). */
  static readonly GUARD = 4.6;

  /**
   * Channel-by-channel blend in sRGB (like `color-mix(in srgb, …)`), rounded.
   *
   * @param base - Start colour (`#rrggbb`).
   * @param toward - End colour (`#rrggbb`).
   * @param t - Share of `toward`, in [0, 1].
   * @returns `#rrggbb`.
   */
  static mixHex(base: string, toward: string, t: number): string {
    const a = channels(base);
    const b = channels(toward);
    return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
  }

  /**
   * Highest background mix toward a colour (in hundredths, up to
   * `LEAK.maxMix`) such that this and every smaller step keep all awake
   * text at {@link LeakStyle.GUARD} or more.
   *
   * @param color - Dream colour (`#rrggbb`).
   * @returns Cap in [0, LEAK.maxMix].
   */
  static cap(color: string): number {
    let cap = 0;
    for (let step = 1; step <= Math.round(LEAK.maxMix * 100); step++) {
      const background = LeakStyle.mixHex(AWAKE_INK, color, step / 100);
      if (AWAKE_TEXT.some((text) => contrast(text, background) < LeakStyle.GUARD)) break;
      cap = step / 100;
    }
    return cap;
  }

  /**
   * The look at a level.
   *
   * @param level - Leak level in [0, 1].
   * @param color - Dream colour, or `null` (no tint).
   * @param cap - Stored cap; it is re-checked, never trusted beyond {@link LeakStyle.cap}.
   * @returns Mix and background.
   */
  static of(level: number, color: string | null, cap: number): LeakLook {
    if (color === null) return { level, mix: 0, color: AWAKE_INK, background: AWAKE_INK };
    const allowed = Math.min(cap, LeakStyle.cap(color));
    const mix = Math.floor(Math.min(level * LEAK.maxMix, allowed) * 100 + 1e-9) / 100;
    return { level, mix, color, background: LeakStyle.mixHex(AWAKE_INK, color, mix) };
  }

  /**
   * CSS custom properties set on `<html>` for the `@layer leak`.
   *
   * @param look - The look.
   * @returns Property → value.
   */
  static vars(look: LeakLook): Record<string, string> {
    return { '--leak-bg': look.background, '--leak-color': look.color, '--leak-level': String(look.level) };
  }

  /**
   * Whether the stray apparition crosses the margin on this page view.
   *
   * @param level - Leak level.
   * @param random - A number in [0, 1) drawn once per page view.
   * @returns `true` to show it.
   */
  static appears(level: number, random: number): boolean {
    return level >= APPARITION.minLevel && random < APPARITION.chance * level;
  }
}
