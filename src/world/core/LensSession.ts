import type { LensDirector } from './LensDirector.js';
import { LensCrossfade, type LensBlend } from './LensCrossfade.js';
import type { LensMode } from './LensMode.js';
import { LensUniforms, type LensInput, type Uv } from './LensUniforms.js';

/** Everything the lens shader of one work needs this frame (lens names, not GPU indices). */
export interface LensSettings {
  strength: number;
  center: Uv;
  blur: Uv;
  /** Lens faded from (weight `1 − mix`). */
  modeA: LensMode;
  /** Lens faded to (weight `mix`). */
  modeB: LensMode;
  mix: number;
  gel: string;
  segments: number;
  seed: number;
  /** Work whose image the multiple exposure blends in (its image is loaded), or `null`. */
  partner: string | null;
}

/** What the renderer and the live caption do after one lens frame. */
export interface LensSessionFrame {
  /** Work the lens is on, or `null`. */
  slug: string | null;
  /** Work the lens just left (its lens must be switched off), or `null`. */
  released: string | null;
  /** Lens to announce, `'clear'` to empty the caption, or `null` for no change. */
  announce: LensMode | 'clear' | null;
  /** Uniforms for the work under the lens, or `null` when the lens is off. */
  settings: LensSettings | null;
  /** Lens in use (target of a crossfade), or `null` when off. */
  mode: LensMode | null;
  /** Current crossfade, or `null` when off. */
  blend: LensBlend | null;
  /** How much of the lens shows, in [0, 1]. */
  strength: number;
}

/**
 * The lens frame by frame, without WebGL (lens review finding: the
 * decisions leave `DriftWorld`): which work the lens is on, when the caption
 * changes, the crossfade between lenses, and the uniform values to apply.
 * The renderer only maps lens names to shader indices and slugs to textures.
 */
export class LensSession {
  private readonly uniforms = new LensUniforms();
  private readonly fade: LensCrossfade;
  private current: string | null = null;

  /**
   * @param director - Lens choices per work.
   */
  constructor(private readonly director: LensDirector) {
    this.fade = new LensCrossfade(director.modes[0] as LensMode);
  }

  /** Work the lens is on, or `null`. */
  get slug(): string | null {
    return this.current;
  }

  /**
   * Changes the lens of the current work (L key or long press).
   *
   * @returns The new lens to announce, or `null` when the lens is off.
   */
  cycle(): LensMode | null {
    if (!this.current) return null;
    const mode = this.director.cycle(this.current);
    this.fade.to(mode);
    return mode;
  }

  /**
   * Advances one frame.
   *
   * @param input - Aim, touch and "see unaltered" this frame.
   * @param dt - Frame time (s).
   * @param hasTexture - Whether a work's image is loaded (for the partner work).
   * @returns What to draw and announce.
   */
  frame(input: LensInput, dt: number, hasTexture: (slug: string) => boolean): LensSessionFrame {
    const lf = this.uniforms.frame(input, dt);
    let released: string | null = null;
    let announce: LensMode | 'clear' | null = null;
    if (lf.slug !== this.current) {
      released = this.current;
      this.current = lf.slug;
      if (this.current) {
        this.fade.jump(this.director.mode(this.current));
        announce = this.fade.target;
      } else announce = 'clear';
    }
    this.fade.advance(dt);
    const slug = this.current;
    if (!slug) return { slug, released, announce, settings: null, mode: null, blend: null, strength: lf.strength };
    const blend = this.fade.blend();
    return {
      slug,
      released,
      announce,
      mode: this.fade.target,
      blend,
      strength: lf.strength,
      settings: {
        strength: lf.strength,
        center: lf.center,
        blur: lf.blur,
        modeA: blend.a,
        modeB: blend.b,
        mix: blend.mix,
        gel: this.director.gel(slug),
        segments: this.director.segments(slug),
        seed: this.director.seed(slug),
        partner: this.director.partnerFor(slug, hasTexture),
      },
    };
  }
}
