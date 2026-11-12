import type { QualityTier } from './DeviceProfile.js';
import { modesFor, type LensMode } from './LensMode.js';
import { SeededRandom } from './SeededRandom.js';

/** What the lens needs to know about a work. */
export interface LensWork {
  slug: string;
  territory: string;
  zone: string | null;
  /** Technique keys found in the work's caption (see `TechniqueHints`). */
  techniques: readonly string[];
  /** Palette of the work's first image (CSS hex), dominant first. */
  palette: readonly string[];
}

/**
 * Caption technique → default lens, in priority order (spec Assumptions):
 * mirror → mirror fold, ND / filter → colour filter, ICM → motion blur,
 * multiple exposure → multiple exposure.
 */
export const TECHNIQUE_MODES: readonly (readonly [string, LensMode])[] = [
  ['mirror', 'mirror'],
  ['filter', 'gel'],
  ['icm', 'icm'],
  ['multiple-exposure', 'exposure'],
];

/** Colour spread (0–255) below which a palette entry counts as grey. */
const MIN_CHROMA = 40;

/**
 * Chooses the lens of each work and its parameters, without WebGL: the
 * default lens from the caption's techniques (else a choice seeded by the
 * slug), cycling, mirror segments, the gel colour (taken from another
 * work's palette) and the second picture of a multiple exposure (a work of
 * the same zone). Everything is deterministic per slug; only cycled lenses
 * are remembered, for the visit.
 */
export class LensDirector {
  /** Amber gel (a warming filter) used when no other work has a colour. */
  static readonly DEFAULT_GEL = '#ff9a3c';

  /** Lenses of this tier, in cycling order. */
  readonly modes: readonly LensMode[];
  private readonly works: Map<string, LensWork>;
  private readonly chosen = new Map<string, LensMode>();
  /** Per-slug results that never change (asked for every frame). */
  private readonly gels = new Map<string, string>();
  private readonly partnerLists = new Map<string, string[]>();

  /**
   * @param works - Works of the page.
   * @param tier - Quality tier (the `low` tier has no fracture).
   */
  constructor(works: readonly LensWork[], tier: QualityTier) {
    this.works = new Map(works.map((w) => [w.slug, w]));
    this.modes = modesFor(tier);
  }

  /**
   * The lens a work starts with.
   *
   * @param slug - Work slug (unknown slugs get the seeded choice).
   * @returns The first technique-mapped lens of the tier, else a seeded one.
   */
  defaultMode(slug: string): LensMode {
    const techniques = this.works.get(slug)?.techniques ?? [];
    const mapped = TECHNIQUE_MODES.find(([t, mode]) => techniques.includes(t) && this.modes.includes(mode));
    if (mapped) return mapped[1];
    return this.modes[Math.floor(new SeededRandom(`lens:${slug}`).next() * this.modes.length)];
  }

  /**
   * The current lens of a work (cycled, or its default).
   *
   * @param slug - Work slug.
   * @returns The lens.
   */
  mode(slug: string): LensMode {
    return this.chosen.get(slug) ?? this.defaultMode(slug);
  }

  /**
   * Moves a work to the next (or previous) lens of the tier.
   *
   * @param slug - Work slug.
   * @param direction - `1` forwards, `-1` backwards.
   * @returns The new lens.
   */
  cycle(slug: string, direction: 1 | -1 = 1): LensMode {
    const n = this.modes.length;
    const next = this.modes[(this.modes.indexOf(this.mode(slug)) + direction + n) % n];
    this.chosen.set(slug, next);
    return next;
  }

  /**
   * Mirror segments of a work's kaleidoscope.
   *
   * @param slug - Work slug.
   * @returns An integer in [2, 6].
   */
  segments(slug: string): number {
    return 2 + Math.floor(new SeededRandom(`segments:${slug}`).next() * 5);
  }

  /**
   * A stable per-work number for the shaders (fracture shard layout).
   *
   * @param slug - Work slug.
   * @returns A float in [0, 1).
   */
  seed(slug: string): number {
    return new SeededRandom(`seed:${slug}`).next();
  }

  /**
   * The gel of a work's colour filter: the most colourful palette entry of
   * another work (others are tried in an order seeded by the slug; grey
   * palettes are skipped).
   *
   * @param slug - Work slug.
   * @returns A CSS hex colour; {@link LensDirector.DEFAULT_GEL} when no other work has a colour.
   */
  gel(slug: string): string {
    const known = this.gels.get(slug);
    if (known) return known;
    const gel = this.pickGel(slug);
    this.gels.set(slug, gel);
    return gel;
  }

  /** The gel of {@link LensDirector.gel}, computed. */
  private pickGel(slug: string): string {
    for (const other of this.seededOthers(slug, [...this.works.values()], 'gel')) {
      const best = [...other.palette].sort((a, b) => chroma(b) - chroma(a))[0];
      if (best !== undefined && chroma(best) >= MIN_CHROMA) return best.toLowerCase();
    }
    return LensDirector.DEFAULT_GEL;
  }

  /**
   * Works that can be the second picture of a work's multiple exposure:
   * the same zone, or the same territory for works without a zone.
   *
   * @param slug - Work slug.
   * @returns Slugs in an order seeded by the slug; empty for unknown slugs.
   */
  partners(slug: string): string[] {
    let list = this.partnerLists.get(slug);
    if (!list) {
      list = this.pickPartners(slug);
      this.partnerLists.set(slug, list);
    }
    return [...list];
  }

  /** The partners of {@link LensDirector.partners}, computed. */
  private pickPartners(slug: string): string[] {
    const self = this.works.get(slug);
    if (!self) return [];
    const same = [...this.works.values()].filter((w) => (self.zone === null ? w.zone === null && w.territory === self.territory : w.zone === self.zone));
    return this.seededOthers(slug, same, 'partner').map((w) => w.slug);
  }

  /**
   * The partner to use now: the first one whose texture is already loaded.
   *
   * @param slug - Work slug.
   * @param hasTexture - Whether a work's texture is loaded.
   * @returns A slug, or `null` when none is loaded.
   */
  partnerFor(slug: string, hasTexture: (slug: string) => boolean): string | null {
    return this.partners(slug).find(hasTexture) ?? null;
  }

  /** Other works than `slug`, in an order seeded by `slug` and a purpose. */
  private seededOthers(slug: string, works: LensWork[], purpose: string): LensWork[] {
    return works
      .filter((w) => w.slug !== slug)
      .map((w) => ({ w, key: `${SeededRandom.hash(`${purpose}:${slug}:${w.slug}`).toString(16).padStart(8, '0')}:${w.slug}` }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((e) => e.w);
  }
}

/**
 * Colour spread of a CSS hex colour (max − min channel, 0–255).
 *
 * @param hex - `#rrggbb`.
 * @returns The chroma.
 */
function chroma(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return Math.max(...rgb) - Math.min(...rgb);
}
