import type { LensMode } from './LensMode.js';

/** Two lenses being mixed: `a` at weight `1 − mix`, `b` at weight `mix`. */
export interface LensBlend {
  a: LensMode;
  b: LensMode;
  /** Weight of `b`, in [0, 1]. */
  mix: number;
}

/** Default length of a lens change (s). */
export const LENS_CROSSFADE_SECONDS = 0.35;

/**
 * Crossfade between lenses when the visitor changes the lens (FR2): the
 * old lens gives way to the new one with a smoothstep ease. The shader
 * draws both and mixes them with {@link LensBlend.mix}; at rest both are
 * the same lens. Weights always sum to 1.
 */
export class LensCrossfade {
  private from: LensMode;
  private toMode: LensMode;
  private elapsed = 0;

  /**
   * @param initial - Lens shown at first.
   * @param seconds - Length of a change (> 0).
   * @throws Error when `seconds` is not positive.
   */
  constructor(
    initial: LensMode,
    private readonly seconds: number = LENS_CROSSFADE_SECONDS,
  ) {
    if (!(seconds > 0)) throw new Error('[lens] The crossfade duration must be positive');
    this.from = initial;
    this.toMode = initial;
  }

  /** The lens being faded to (or shown). */
  get target(): LensMode {
    return this.toMode;
  }

  /**
   * Starts fading to a lens. An interrupted fade restarts from the lens
   * that showed most; asking for the current target changes nothing.
   *
   * @param mode - New lens.
   */
  to(mode: LensMode): void {
    if (mode === this.toMode) return;
    const dominant = this.blend().mix < 0.5 ? this.from : this.toMode;
    if (dominant === mode) return this.jump(mode);
    this.from = dominant;
    this.toMode = mode;
    this.elapsed = 0;
  }

  /**
   * Shows a lens at once (another work came under the lens).
   *
   * @param mode - Lens.
   */
  jump(mode: LensMode): void {
    this.from = mode;
    this.toMode = mode;
    this.elapsed = 0;
  }

  /**
   * Moves the fade on; a finished fade settles on its target.
   *
   * @param dt - Frame time (s).
   */
  advance(dt: number): void {
    if (this.from === this.toMode) return;
    this.elapsed += dt;
    if (this.elapsed >= this.seconds) this.jump(this.toMode);
  }

  /**
   * The two lenses to draw and their mix.
   *
   * @returns Lens `a`, lens `b` and the weight of `b`.
   */
  blend(): LensBlend {
    const t = Math.min(this.elapsed / this.seconds, 1);
    return { a: this.from, b: this.toMode, mix: this.from === this.toMode ? 0 : t * t * (3 - 2 * t) };
  }

  /**
   * Weight of each lens drawn.
   *
   * @returns Lens → weight; weights sum to 1.
   */
  weights(): Partial<Record<LensMode, number>> {
    const { a, b, mix } = this.blend();
    return a === b ? { [a]: 1 } : { [a]: 1 - mix, [b]: mix };
  }
}
