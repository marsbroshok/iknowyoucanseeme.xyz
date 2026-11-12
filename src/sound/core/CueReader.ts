import type { GroundPoint } from '../../world/core/FieldLayout.js';
import { QUIET_CUES, type SoundCues } from './SoundCues.js';

/** Distances (m) of the closeness cues. */
export const CUE_RANGE = {
  /** At or within this distance a work is "right there" (closeness 1). */
  near: 4,
  /** At or beyond this distance a work is not heard (closeness 0). */
  far: 24,
} as const;

/** What the reader needs to know about a work. */
export interface CueWork {
  slug: string;
  title: string;
}

/** Where a work floats (from `FieldLayout`). */
export interface CuePlacement extends GroundPoint {
  slug: string;
}

/**
 * Closeness cues at the camera (spec FR2), without audio: how near the
 * nearest work is (the lens zone's glints) and how near the nearest
 * eclipse work is (the border's low swell).
 */
export class CueReader {
  private readonly all: readonly CuePlacement[];
  private readonly eclipses: readonly CuePlacement[];

  /**
   * @param placements - Where the works float.
   * @param works - The works (to tell eclipse works).
   */
  constructor(placements: readonly CuePlacement[], works: readonly CueWork[]) {
    const eclipse = new Set(works.filter((w) => CueReader.isEclipse(w)).map((w) => w.slug));
    this.all = placements;
    this.eclipses = placements.filter((p) => eclipse.has(p.slug));
  }

  /**
   * Whether a work is an eclipse work: its slug has the word `eclipse`, or
   * its title has the word "éclipse" / "eclipse" (any case or accent).
   *
   * @param work - Slug and title.
   * @returns `true` for an eclipse work.
   */
  static isEclipse(work: CueWork): boolean {
    const title = work.title.normalize('NFD').replace(/\p{M}/gu, '');
    return work.slug.split('-').includes('eclipse') || /\beclipse\b/i.test(title);
  }

  /**
   * Closeness of something at a distance: 1 within {@link CUE_RANGE.near},
   * 0 beyond {@link CUE_RANGE.far}, a smoothstep in between.
   *
   * @param distance - Ground distance (m).
   * @returns Closeness in [0, 1].
   */
  static closeness(distance: number): number {
    const t = Math.min(Math.max((CUE_RANGE.far - distance) / (CUE_RANGE.far - CUE_RANGE.near), 0), 1);
    return t * t * (3 - 2 * t);
  }

  /**
   * The cues at a point.
   *
   * @param point - Camera position.
   * @returns Approach and eclipse closeness.
   */
  read(point: GroundPoint): SoundCues {
    if (this.all.length === 0) return QUIET_CUES;
    return { approach: CueReader.closeness(nearest(this.all, point)), eclipse: CueReader.closeness(nearest(this.eclipses, point)) };
  }
}

/**
 * Distance to the nearest of some placements.
 *
 * @param placements - Candidates (may be empty).
 * @param point - From where.
 * @returns The distance, infinite when there are none.
 */
function nearest(placements: readonly CuePlacement[], point: GroundPoint): number {
  return placements.reduce((best, p) => Math.min(best, Math.hypot(p.x - point.x, p.z - point.z)), Number.POSITIVE_INFINITY);
}
