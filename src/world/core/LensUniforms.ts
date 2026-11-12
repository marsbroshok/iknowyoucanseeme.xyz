/** A point in a work's texture space (0–1 on both axes, y up). */
export interface Uv {
  x: number;
  y: number;
}

/** The work under the lens and where on it. */
export interface LensAim {
  slug: string;
  uv: Uv;
}

/** What the visitor does this frame. */
export interface LensInput {
  /** Work under the pointer (or the keyboard lens), or `null`. */
  aim: LensAim | null;
  /** The pointer is a finger (a lifted finger fades the lens slowly). */
  touch: boolean;
  /** "See unaltered" is held (Shift, or toggled by a two-finger tap). */
  unaltered: boolean;
}

/** Uniform values of the lens for one frame. */
export interface LensFrame {
  /** Work the lens is on, or `null` when it is off. */
  slug: string | null;
  /** Lens centre (texture space, smoothed). */
  center: Uv;
  /** Pointer velocity (texture space per second, smoothed, capped). */
  velocity: Uv;
  /** Motion-blur streak of the ICM lens (texture space). */
  blur: Uv;
  /** How much of the lens shows, in [0, 1]. */
  strength: number;
}

/** Lens timing and motion constants. */
export const LENS = {
  /** Radius of the soft circular region (fraction of the work's height). */
  radius: 0.24,
  /** Seconds to fade in. */
  riseSeconds: 0.15,
  /** Seconds to fade out after a finger lifts (FR3: ~600 ms). */
  releaseSeconds: 0.6,
  /** Seconds to fade out when the mouse leaves a work. */
  leaveSeconds: 0.25,
  /** Seconds to fade out for "see unaltered" (FR4). */
  hideSeconds: 0.12,
  /** Rate (1/s) at which the centre follows the pointer. */
  follow: 18,
  /** Rate (1/s) at which the measured velocity follows the pointer's. */
  velocityFollow: 8,
  /** Highest velocity kept (texture space per second). */
  maxSpeed: 3,
  /** Below this speed the pointer counts as still. */
  minSpeed: 0.05,
  /** Blur streak per unit of speed (s). */
  blurPerSpeed: 0.05,
  /** Longest blur streak (texture space). */
  maxBlur: 0.08,
  /** Frames shorter than this (s) do not measure velocity (it would overflow). */
  minFrameSeconds: 1e-4,
  /** Streak of a still pointer: the slow vertical pan of an ICM shot. */
  idleBlur: { x: 0, y: 0.025 } as Readonly<Uv>,
} as const;

/**
 * The lens's state from frame to frame, without WebGL: which work it is on,
 * a smoothed centre that follows the pointer, a smoothed and capped pointer
 * velocity (and the ICM blur streak made from it) and a strength that rises
 * when a work is under the pointer and falls when it is not: slowly after a
 * finger lifts (FR3), quickly for "see unaltered" (FR4). The renderer only
 * copies {@link LensFrame} into uniforms.
 */
export class LensUniforms {
  private slug: string | null = null;
  private center: Uv = { x: 0.5, y: 0.5 };
  private last: Uv = { x: 0.5, y: 0.5 };
  private velocity: Uv = { x: 0, y: 0 };
  private strength = 0;

  /**
   * Where the lens should be: the work under the pointer, else (when the
   * keyboard asked for the lens) the centre of the work being faced.
   *
   * @param pointer - Work under the pointer, or `null`.
   * @param keyboard - The lens was last asked for with the keyboard.
   * @param facing - Work the visitor faces, or `null`.
   * @returns The aim, or `null`.
   */
  static aimFrom(pointer: LensAim | null, keyboard: boolean, facing: string | null): LensAim | null {
    if (pointer) return pointer;
    return keyboard && facing ? { slug: facing, uv: { x: 0.5, y: 0.5 } } : null;
  }

  /**
   * Advances one frame.
   *
   * @param input - Aim, pointer kind and "see unaltered".
   * @param dt - Frame time (s, ≥ 0).
   * @returns The lens uniforms for this frame.
   */
  frame(input: LensInput, dt: number): LensFrame {
    const { aim } = input;
    if (aim && aim.slug !== this.slug) this.retarget(aim);
    if (aim) this.track(aim.uv, dt);
    else this.velocity = scale(this.velocity, Math.exp(-LENS.velocityFollow * dt));

    const showing = aim !== null && !input.unaltered;
    const seconds = showing ? LENS.riseSeconds : input.unaltered ? LENS.hideSeconds : input.touch ? LENS.releaseSeconds : LENS.leaveSeconds;
    this.strength = Math.min(1, Math.max(0, this.strength + ((showing ? 1 : -1) * dt) / seconds));
    if (this.strength === 0 && !aim) this.slug = null;

    return { slug: this.slug, center: { ...this.center }, velocity: { ...this.velocity }, blur: this.blur(), strength: this.strength };
  }

  /** A new work under the lens: start from nothing, centred on the pointer. */
  private retarget(aim: LensAim): void {
    this.slug = aim.slug;
    this.center = { ...aim.uv };
    this.last = { ...aim.uv };
    this.velocity = { x: 0, y: 0 };
    this.strength = 0;
  }

  /** Follows the pointer and measures its velocity (not over frames too short to divide by). */
  private track(uv: Uv, dt: number): void {
    if (dt >= LENS.minFrameSeconds) {
      const raw = cap({ x: (uv.x - this.last.x) / dt, y: (uv.y - this.last.y) / dt }, LENS.maxSpeed);
      const k = 1 - Math.exp(-LENS.velocityFollow * dt);
      this.velocity = { x: this.velocity.x + (raw.x - this.velocity.x) * k, y: this.velocity.y + (raw.y - this.velocity.y) * k };
    }
    const f = 1 - Math.exp(-LENS.follow * dt);
    this.center = { x: this.center.x + (uv.x - this.center.x) * f, y: this.center.y + (uv.y - this.center.y) * f };
    this.last = { ...uv };
  }

  /** The ICM streak: along the motion, or the idle vertical pan. */
  private blur(): Uv {
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    return speed < LENS.minSpeed ? { ...LENS.idleBlur } : cap(scale(this.velocity, LENS.blurPerSpeed), LENS.maxBlur);
  }
}

/** A vector times a number. */
function scale(v: Uv, k: number): Uv {
  return { x: v.x * k, y: v.y * k };
}

/** A vector shortened to at most `max` long. */
function cap(v: Uv, max: number): Uv {
  const len = Math.hypot(v.x, v.y);
  return len > max ? scale(v, max / len) : v;
}
