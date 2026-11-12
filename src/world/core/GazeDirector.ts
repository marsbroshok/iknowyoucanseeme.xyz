import type { PreferenceStorage } from './ModePreference.js';
import type { Uv } from './LensUniforms.js';

/** Gaze timing and bounds. */
export const GAZE = {
  /** Seconds the pointer must stay on a work before it turns (FR2: > 2 s). */
  dwellSeconds: 2,
  /** Largest turn around the vertical axis (radians, "slightly"). */
  maxYaw: 0.22,
  /** Largest tilt around the horizontal axis (radians). */
  maxPitch: 0.1,
  /** Rate (1/s) at which a turn eases toward its target. */
  ease: 2.5,
  /** Turns smaller than this (radians) count as at rest and are dropped. */
  rest: 1e-4,
  /** Drifting time before the gaze line may surface (FR2: ≥ 3 minutes). */
  lineAfterSeconds: 180,
  /** Mean wait (s) for the line once allowed: rare, but it does come. */
  lineMeanWaitSeconds: 90,
  /** Line fade-in, hold and fade-out (s). */
  lineFadeInSeconds: 2,
  lineHoldSeconds: 4,
  lineFadeOutSeconds: 3,
} as const;

/** What the visitor does this frame. */
export interface GazeInput {
  /** Work under the pointer and where on it, or `null`. */
  hovered: { slug: string; uv: Uv } | null;
  /** The visitor is drifting (entered, no work open in the dialog). */
  drifting: boolean;
}

/** Extra rotation of one apparition toward the pointer (radians). */
export interface GazeTurn {
  slug: string;
  /** Positive: toward a pointer on the work's right. */
  yaw: number;
  /** Positive: toward a pointer on the work's upper half. */
  pitch: number;
}

/** Gaze results of one frame. */
export interface GazeFrame {
  /** Works currently turned (or easing back), others are at rest. */
  turns: GazeTurn[];
  /** The gaze line starts surfacing this frame (mirror it into the live region). */
  lineStarted: boolean;
  /** Opacity of the gaze line in the fog, in [0, 1]. */
  lineOpacity: number;
}

/**
 * The world's quiet awareness of the visitor (FR2), without DOM, WebGL or
 * clock (time is only the `dt` it is fed):
 *
 * - after the pointer has dwelt on an apparition for more than 2 s, the
 *   apparition turns slightly toward it (bounded, eased), and eases back
 *   when the pointer leaves;
 * - after ≥ 3 minutes of drifting, the gaze line may surface in the fog,
 *   at a random moment, then fade; at most once per session
 *   (`sessionStorage`, the tab's lifetime). The threshold's own line is
 *   separate and not counted.
 */
export class GazeDirector {
  /** `sessionStorage` key marking that the line was shown. */
  static readonly SESSION_KEY = 'iknowyoucanseeme:gaze';

  private dwellSlug: string | null = null;
  private dwell = 0;
  private readonly turns = new Map<string, { yaw: number; pitch: number }>();
  private drifted = 0;
  private shown: boolean;
  private lineAge: number | null = null;

  /**
   * @param session - `sessionStorage`, or `null` when blocked (then once per page).
   * @param random - Uniform random numbers in [0, 1).
   */
  constructor(
    private readonly session: PreferenceStorage | null,
    private readonly random: () => number,
  ) {
    this.shown = session?.getItem(GazeDirector.SESSION_KEY) === 'shown';
  }

  /**
   * Chance that the line surfaces in a frame once allowed (a memoryless
   * wait with mean {@link GAZE.lineMeanWaitSeconds}).
   *
   * @param dt - Frame time (s).
   * @returns Probability in [0, 1).
   */
  static chance(dt: number): number {
    return 1 - Math.exp(-dt / GAZE.lineMeanWaitSeconds);
  }

  /**
   * Advances one frame.
   *
   * @param input - Pointer and drift state.
   * @param dt - Frame time (s).
   * @returns Turns and gaze-line state.
   */
  frame(input: GazeInput, dt: number): GazeFrame {
    const turns = this.turn(input, dt);
    let lineStarted = false;
    if (input.drifting) this.drifted += dt;
    if (this.lineAge !== null) this.lineAge += dt;
    else if (!this.shown && input.drifting && this.drifted >= GAZE.lineAfterSeconds && this.random() < GazeDirector.chance(dt)) {
      this.shown = true;
      this.session?.setItem(GazeDirector.SESSION_KEY, 'shown');
      this.lineAge = 0;
      lineStarted = true;
    }
    return { turns, lineStarted, lineOpacity: this.lineAge === null ? 0 : GazeDirector.lineOpacity(this.lineAge) };
  }

  /**
   * Opacity of the line at an age.
   *
   * @param age - Seconds since it started.
   * @returns Opacity in [0, 1].
   */
  private static lineOpacity(age: number): number {
    const { lineFadeInSeconds: fadeIn, lineHoldSeconds: hold, lineFadeOutSeconds: fadeOut } = GAZE;
    if (age < fadeIn) return age / fadeIn;
    if (age <= fadeIn + hold) return 1;
    return Math.max(0, 1 - (age - fadeIn - hold) / fadeOut);
  }

  /**
   * Dwell detection and eased turns.
   *
   * @param input - Pointer and drift state.
   * @param dt - Frame time (s).
   * @returns Works not at rest.
   */
  private turn(input: GazeInput, dt: number): GazeTurn[] {
    const hovered = input.drifting ? input.hovered : null;
    if (hovered?.slug !== this.dwellSlug) {
      this.dwellSlug = hovered?.slug ?? null;
      this.dwell = 0;
    } else if (hovered) this.dwell += dt;
    const k = 1 - Math.exp(-GAZE.ease * dt);
    const target = hovered && this.dwell > GAZE.dwellSeconds ? hovered : null;
    if (target && !this.turns.has(target.slug)) this.turns.set(target.slug, { yaw: 0, pitch: 0 });
    const out: GazeTurn[] = [];
    for (const [slug, t] of this.turns) {
      const aim = target?.slug === slug ? target.uv : null;
      const yawGoal = aim ? GazeDirector.side(aim.x) * GAZE.maxYaw : 0;
      const pitchGoal = aim ? GazeDirector.side(aim.y) * GAZE.maxPitch : 0;
      t.yaw += (yawGoal - t.yaw) * k;
      t.pitch += (pitchGoal - t.pitch) * k;
      if (!aim && Math.abs(t.yaw) < GAZE.rest && Math.abs(t.pitch) < GAZE.rest) this.turns.delete(slug);
      else out.push({ slug, yaw: t.yaw, pitch: t.pitch });
    }
    return out;
  }

  /**
   * Where a texture coordinate lies from the centre, in [-1, 1].
   *
   * @param v - Coordinate (0–1; values outside are clamped).
   * @returns -1 at the left / bottom edge, 1 at the right / top edge.
   */
  private static side(v: number): number {
    return Math.min(Math.max(v * 2 - 1, -1), 1);
  }
}
