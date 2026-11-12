import type { FragmentCatalog, FragmentEntry } from './FragmentCatalog.js';
import type { FragmentProgress } from './FragmentProgress.js';

/** Fragment timing (s). */
export const FRAGMENTS = {
  fadeInSeconds: 1.5,
  holdSeconds: 7,
  fadeOutSeconds: 1.5,
} as const;

/** What the camera does this frame (from DriftSession). */
export interface SurfacerInput {
  /** Work faced this frame, or `null`. */
  facing: string | null;
  /** Work just settled in front of (once per settling), or `null`. */
  settled: string | null;
}

/** The fragment in the fog this frame. */
export interface SurfacedFragment extends FragmentEntry {
  /** Opacity in [0, 1]. */
  opacity: number;
}

/** Fragment results of one frame. */
export interface SurfacerFrame {
  /** Fragment that starts surfacing this frame (mirror it into the live region), or `null`. */
  started: FragmentEntry | null;
  /** Fragment showing, or `null`. */
  current: SurfacedFragment | null;
}

/**
 * Surfaces fragments near works (FR3), without DOM or clock: when the
 * camera settles close to a work, one of the fragments placed near it fades
 * in (unread ones first, then in turn), holds, and fades out, or fades out
 * early when the visitor turns away. Each surfaced fragment is stored as
 * read. One fragment at a time (text in the world: fragments only, never
 * paragraphs).
 */
export class FragmentSurfacer {
  private current: { entry: FragmentEntry; age: number; leaving: boolean; opacity: number } | null = null;
  private readonly turns = new Map<string, number>();

  /**
   * @param catalog - Where fragments surface.
   * @param progress - Read fragments (updated on surfacing).
   */
  constructor(
    private readonly catalog: FragmentCatalog,
    private readonly progress: FragmentProgress,
  ) {}

  /**
   * Advances one frame.
   *
   * @param input - Facing and settled work.
   * @param dt - Frame time (s).
   * @returns The fragment starting and the one showing.
   */
  frame(input: SurfacerInput, dt: number): SurfacerFrame {
    let started: FragmentEntry | null = null;
    const near = input.settled ? this.catalog.near(input.settled) : [];
    const showingThere = this.current && !this.current.leaving && this.current.entry.slug === input.settled;
    if (near.length > 0 && !showingThere) {
      started = this.pick(near);
      this.progress.add(started.id);
      this.current = { entry: started, age: 0, leaving: false, opacity: 0 };
    }
    return { started, current: this.advance(input.facing, dt) };
  }

  /**
   * Next fragment near a work: the first unread, else the next in turn.
   *
   * @param near - Fragments near the work (non-empty).
   * @returns The fragment.
   */
  private pick(near: readonly FragmentEntry[]): FragmentEntry {
    const slug = (near[0] as FragmentEntry).slug;
    const turn = this.turns.get(slug) ?? 0;
    this.turns.set(slug, turn + 1);
    return near.find((e) => !this.progress.has(e.id)) ?? (near[turn % near.length] as FragmentEntry);
  }

  /**
   * Fades the current fragment.
   *
   * @param facing - Work faced this frame.
   * @param dt - Frame time (s).
   * @returns The fragment showing, or `null` once faded out.
   */
  private advance(facing: string | null, dt: number): SurfacedFragment | null {
    const c = this.current;
    if (!c) return null;
    const { fadeInSeconds: fadeIn, holdSeconds: hold, fadeOutSeconds: fadeOut } = FRAGMENTS;
    if (!c.leaving && facing !== c.entry.slug) c.leaving = true;
    if (c.leaving) c.opacity -= dt / fadeOut;
    else {
      c.age += dt;
      c.opacity = c.age < fadeIn ? c.age / fadeIn : c.age <= fadeIn + hold ? 1 : 1 - (c.age - fadeIn - hold) / fadeOut;
    }
    if (c.leaving ? c.opacity <= 0 : c.age >= fadeIn + hold + fadeOut) {
      this.current = null;
      return null;
    }
    return { ...c.entry, opacity: c.opacity };
  }
}
