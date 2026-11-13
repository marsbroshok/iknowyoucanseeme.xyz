import { SeededRandom } from './SeededRandom.js';

import { ZONE_ORDER, type ZoneSlug } from '../../domain/ZoneOrder.js';

/** Zones of Dreamland, in path order (single source: src/domain/ZoneOrder.ts). */
export { ZONE_ORDER, type ZoneSlug };

/** What the layout needs to know about a work. */
export interface LayoutWork {
  slug: string;
  territory: string;
  zone?: ZoneSlug;
}

/** A point on the ground plane (x, z). */
export interface GroundPoint {
  x: number;
  z: number;
}

/** Where a work floats in the field. */
export interface Placement {
  slug: string;
  territory: string;
  zone: ZoneSlug | null;
  x: number;
  y: number;
  z: number;
  /** Distance along its territory's path from the path start. */
  progress: number;
}

/** A stretch of a territory's path holding one zone (or the zone-less works). */
export interface Region {
  territory: string;
  zone: ZoneSlug | null;
  start: GroundPoint;
  end: GroundPoint;
  center: GroundPoint;
}

/** Where and how the visitor starts. */
export interface StartPose extends GroundPoint {
  /** Heading in radians; 0 looks down the path (towards -z). */
  yaw: number;
}

/** The whole field. */
export interface FieldLayoutResult {
  placements: Placement[];
  regions: Region[];
  start: StartPose;
}

/** Field dimensions, in world units (~ metres). */
export const FIELD = {
  /** Minimum distance between two works. */
  spacing: 3.2,
  /** Path length per work (pitch - 2 × jitter = spacing). */
  pitch: 4.6,
  /** Random shift along the path (±). */
  jitter: 0.7,
  /** Minimum sideways offset from the path so works frame the sightline rather than stacking dead-centre. */
  minLateral: 0.65,
  /** Maximum sideways offset from the path. */
  lateral: 3.4,
  /** Sideways swing of the path itself (±). */
  curveAmplitude: 2.4,
  /** Path length of one full swing. */
  curveWavelength: 64,
  /** Empty path between two zones. */
  zoneGap: 10,
  /** Distance between the paths of two territories. */
  territoryDistance: 48,
  /** Guaranteed minimum distance between works of two territories. */
  territoryGap: 30,
  /** Lowest and highest centre height of a work (eye level ≈ 1.6). */
  minY: 1.3,
  maxY: 2.1,
} as const;

/**
 * Deterministic placement of the works in the 3D field (FR2).
 *
 * Every territory has its own straight-ish path running towards -z; the
 * paths lie {@link FIELD.territoryDistance} apart, separated by at least
 * {@link FIELD.territoryGap} across lateral sway. Along a territory's path
 * the zones follow each other (Arrival → Lens → Leak, then works without a
 * zone), separated by {@link FIELD.zoneGap}. Inside a zone the order of the
 * works and their offsets come from {@link SeededRandom} seeded by the slug,
 * alternating left and right of the path (`(-1)^(i + 1)` × `[minLateral, lateral]`)
 * so consecutive works frame the sightline without eclipsing one another and
 * the layout stays identical across builds regardless of input order.
 *
 * Minimum spacing holds by construction: consecutive works on a path are at
 * least `pitch − 2 × jitter = spacing` apart along z.
 */
export class FieldLayout {
  /**
   * Lays out the works.
   *
   * @param works - Works to place (unique slugs).
   * @param territoryOrder - Territory slugs; the first holds the start.
   * @returns Placements, compass regions and the start pose.
   * @throws Error on a duplicate slug or a territory missing from `territoryOrder`.
   */
  static compute(works: readonly LayoutWork[], territoryOrder: readonly string[]): FieldLayoutResult {
    FieldLayout.validate(works, territoryOrder);
    const placements: Placement[] = [];
    const regions: Region[] = [];

    territoryOrder.forEach((territory, index) => {
      const anchorX = index * FIELD.territoryDistance;
      let cursor = 0;
      for (const zone of [...ZONE_ORDER, null]) {
        const group = FieldLayout.orderGroup(works.filter((w) => w.territory === territory && (w.zone ?? null) === zone));
        if (group.length === 0) continue;
        group.forEach((work, i) => {
          const rnd = new SeededRandom(work.slug);
          const progress = cursor + FIELD.pitch * (i + 0.5) + rnd.between(-FIELD.jitter, FIELD.jitter);
          const z = -progress;
          const side = i % 2 === 0 ? -1 : 1;
          const lateralOffset = side * rnd.between(FIELD.minLateral, FIELD.lateral);
          placements.push({
            slug: work.slug,
            territory,
            zone,
            x: anchorX + FieldLayout.pathX(z) + lateralOffset,
            y: rnd.between(FIELD.minY, FIELD.maxY),
            z,
            progress,
          });
        });
        const end = cursor + FIELD.pitch * group.length;
        regions.push(FieldLayout.region(territory, zone, anchorX, cursor, end));
        cursor = end + FIELD.zoneGap;
      }
    });

    return { placements, regions, start: { x: FieldLayout.pathX(FIELD.pitch), z: FIELD.pitch, yaw: 0 } };
  }

  /**
   * Sideways position of a path at depth z (relative to its anchor).
   *
   * @param z - Depth.
   * @returns x offset.
   */
  static pathX(z: number): number {
    return FIELD.curveAmplitude * Math.sin((2 * Math.PI * z) / FIELD.curveWavelength);
  }

  /**
   * Seeded, input-order-independent order of a zone's works.
   *
   * @param group - Works of one zone.
   * @returns Sorted copy.
   */
  private static orderGroup(group: LayoutWork[]): LayoutWork[] {
    // Hash first (scatter), slug second (ties); keys are unique because slugs are.
    const key = (w: LayoutWork) => `${SeededRandom.hash(w.slug).toString(16).padStart(8, '0')}:${w.slug}`;
    return [...group].sort((a, b) => (key(a) > key(b) ? 1 : -1));
  }

  /**
   * A compass region spanning `[from, to]` of a territory's path.
   *
   * @param territory - Territory slug.
   * @param zone - Zone or `null`.
   * @param anchorX - x of the territory's path.
   * @param from - Start progress.
   * @param to - End progress.
   * @returns The region.
   */
  private static region(territory: string, zone: ZoneSlug | null, anchorX: number, from: number, to: number): Region {
    const point = (progress: number): GroundPoint => ({ x: anchorX + FieldLayout.pathX(-progress), z: -progress });
    return { territory, zone, start: point(from), end: point(to), center: point((from + to) / 2) };
  }

  /**
   * Rejects duplicate slugs and unknown territories.
   *
   * @param works - Works.
   * @param territoryOrder - Known territories.
   * @throws Error describing the first problem.
   */
  private static validate(works: readonly LayoutWork[], territoryOrder: readonly string[]): void {
    const seen = new Set<string>();
    for (const work of works) {
      if (seen.has(work.slug)) throw new Error(`[FieldLayout] Duplicate work slug "${work.slug}"`);
      seen.add(work.slug);
      if (!territoryOrder.includes(work.territory)) throw new Error(`[FieldLayout] Unknown territory "${work.territory}"`);
    }
  }
}
