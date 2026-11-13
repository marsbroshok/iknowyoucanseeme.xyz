import { ApparitionCurve } from './ApparitionCurve.js';
import { CompassBearing, type CompassReading } from './CompassBearing.js';
import type { QualityTier } from './DeviceProfile.js';
import { DRIFT, DriftController, type CycleStop, type DriftInput, type DriftState } from './DriftController.js';
import { FieldLayout, type FieldLayoutResult, type Placement, type Region } from './FieldLayout.js';
import { PaletteSky } from './PaletteSky.js';
import { SettleDetector } from './SettleDetector.js';
import { TIER_BUDGETS, TextureBudget, type Lod, type TextureCandidate } from './TextureBudget.js';
import type { ManifestWork, WorldManifest } from './WorldManifest.js';
import { ZoneAtmosphere } from './ZoneAtmosphere.js';

/** Session timing and thresholds. */
export const SESSION = {
  /** Seconds between texture plans. */
  planEvery: 0.25,
  /** Seconds between compass readings. */
  compassEvery: 0.2,
  /** A work counts as faced within this distance… */
  facingDistance: DRIFT.viewDistance * 1.6,
  /** …and this angle from straight ahead (radians). */
  facingAngle: 0.35,
  /** Apparition curve per tier: [near, far]. */
  apparition: { high: [10, 42], low: [7, 34] } as Record<QualityTier, [number, number]>,
} as const;

/** A work's place in this frame. */
export interface WorkFrame {
  slug: string;
  distance: number;
  opacity: number;
}

/** Everything the renderer and the page need after one frame. */
export interface FrameResult {
  state: DriftState;
  works: WorkFrame[];
  /** Sky and fog colour. */
  sky: string;
  /** Active region containing or nearest to the camera, or `null` without works. */
  region: Region | null;
  /** New texture plan, or `null` when not due this frame. */
  plan: Record<string, Lod> | null;
  /** New compass reading, or `null` when not due this frame. */
  compass: CompassReading | null;
  /** Work the visitor stands in front of and looks at, or `null`. */
  facing: string | null;
  /** Closest work (the keyboard entry point), or `null` without works. */
  nearest: string | null;
  /** Distance to the closest work (infinite without works). */
  nearestDistance: number;
  /** Work the visitor has just settled in front of (once per settling), or `null`. */
  settled: string | null;
}

/**
 * One visit of the world, without WebGL: layout, camera motion, apparition
 * opacities, sky colour, texture plans and compass readings, frame by
 * frame. The renderer (src/world/gl) only applies its results.
 */
export class DriftSession {
  readonly layout: FieldLayoutResult;
  /** Works in path order (territory by territory), for keyboard cycling. */
  readonly stops: (CycleStop & Placement)[];
  state: DriftState;
  private readonly controller = new DriftController();
  private readonly curve: ApparitionCurve;
  private readonly sky: PaletteSky;
  private readonly settle = new SettleDetector();
  private readonly works: Map<string, ManifestWork>;
  private sincePlan = Number.POSITIVE_INFINITY;
  private sinceCompass = Number.POSITIVE_INFINITY;

  /**
   * @param manifest - Works and names of the page.
   * @param tier - Quality tier.
   * @param startSlug - Deep-linked work (`?w=`), or `null`.
   */
  constructor(
    manifest: WorldManifest,
    private readonly tier: QualityTier,
    startSlug: string | null,
  ) {
    this.works = new Map(manifest.works.map((w) => [w.slug, w]));
    this.layout = FieldLayout.compute(
      manifest.works.map((w) => ({ slug: w.slug, territory: w.territory, zone: w.zone ?? undefined })),
      manifest.territories.map((t) => t.slug),
    );
    const order = manifest.territories.map((t) => t.slug);
    this.stops = [...this.layout.placements].sort((a, b) => order.indexOf(a.territory) - order.indexOf(b.territory) || a.progress - b.progress);
    const [near, far] = SESSION.apparition[tier];
    this.curve = new ApparitionCurve(near, far);
    const start = this.controller.initial(this.layout.start);
    const linked = this.layout.placements.find((p) => p.slug === startSlug);
    this.state = linked ? this.controller.initial(this.controller.viewPoseFor(start, linked)) : start;
    const startRegion = CompassBearing.regionAt(this.state, this.layout.regions);
    this.sky = new PaletteSky(ZoneAtmosphere.forRegion(startRegion).base);
  }

  /**
   * The manifest entry of a work.
   *
   * @param slug - Work slug.
   * @returns The work, or `undefined`.
   */
  work(slug: string): ManifestWork | undefined {
    return this.works.get(slug);
  }

  /**
   * Starts a glide to a work (keyboard focus).
   *
   * @param slug - Work slug; unknown slugs are ignored.
   */
  focus(slug: string): void {
    const placement = this.layout.placements.find((p) => p.slug === slug);
    if (placement) this.state = this.controller.focus(this.state, this.controller.viewPoseFor(this.state, placement));
  }

  /**
   * Next work for Tab / Shift+Tab (see `DriftController.cycle`).
   *
   * @param current - Focused work, or `null`.
   * @param direction - `1` or `-1`.
   * @returns Slug to focus, or `null` without works.
   */
  cycle(current: string | null, direction: 1 | -1): string | null {
    return this.controller.cycle(this.state, this.stops, current, direction);
  }

  /**
   * The stop after a work along the zone path, starting over after the
   * last (the exhibition mode's auto-drift).
   *
   * @param current - Current work, or `null` (or unknown) for the first stop.
   * @returns Next slug, or `null` without works.
   */
  nextStop(current: string | null): string | null {
    const i = this.stops.findIndex((s) => s.slug === current);
    return this.stops[(i + 1) % Math.max(this.stops.length, 1)]?.slug ?? null;
  }

  /** Back to the start of the path, still (the exhibition mode's idle reset). */
  restart(): void {
    this.state = this.controller.initial(this.layout.start);
  }

  /**
   * Whether a work is the last stop in a direction (Tab then leaves the list).
   *
   * @param slug - Work slug.
   * @param direction - `1` or `-1`.
   * @returns `true` at the end of the path in that direction.
   */
  isLast(slug: string, direction: 1 | -1): boolean {
    const next = this.stops.findIndex((s) => s.slug === slug) + direction;
    return next < 0 || next >= this.stops.length;
  }

  /**
   * Advances one frame.
   *
   * @param input - Impulses since the last frame.
   * @param dt - Frame time (s).
   * @returns What to draw and show.
   */
  frame(input: DriftInput, dt: number): FrameResult {
    this.state = this.controller.step(this.state, input, dt);
    const { x, z } = this.state;
    const works = this.layout.placements.map((p) => {
      const distance = Math.hypot(p.x - x, p.z - z);
      return { slug: p.slug, distance, opacity: this.curve.opacity(distance) };
    });
    const nearest = works.reduce((best, w) => (w.distance < best.distance ? w : best), { slug: '', distance: Number.POSITIVE_INFINITY, opacity: 0 });
    const region = CompassBearing.regionAt(this.state, this.layout.regions);
    const sky = this.sky.update(this.works.get(nearest.slug)?.color ?? null, nearest.distance, dt, ZoneAtmosphere.forRegion(region).base);

    this.sincePlan += dt;
    this.sinceCompass += dt;
    let plan: Record<string, Lod> | null = null;
    if (this.sincePlan >= SESSION.planEvery) {
      this.sincePlan = 0;
      plan = TextureBudget.plan(works.map((w) => this.candidate(w)), TIER_BUDGETS[this.tier]);
    }
    let compass: CompassReading | null = null;
    if (this.sinceCompass >= SESSION.compassEvery) {
      this.sinceCompass = 0;
      compass = CompassBearing.read(this.state, this.layout.regions);
    }
    const facing = this.facing(works);
    const settled = this.settle.update(facing, Math.hypot(this.state.vx, this.state.vz), dt);
    return { state: this.state, works, sky, region, plan, compass, facing, nearest: nearest.slug || null, nearestDistance: nearest.distance, settled };
  }

  /**
   * The nearest work within facing distance and angle.
   *
   * @param works - This frame's distances.
   * @returns Its slug, or `null`.
   */
  private facing(works: readonly WorkFrame[]): string | null {
    const forward = { x: -Math.sin(this.state.yaw), z: -Math.cos(this.state.yaw) };
    const inView = works.filter((w) => {
      if (w.distance > SESSION.facingDistance) return false;
      const p = this.layout.placements.find((pl) => pl.slug === w.slug) as Placement;
      const cos = ((p.x - this.state.x) * forward.x + (p.z - this.state.z) * forward.z) / Math.max(w.distance, 1e-9);
      return Math.acos(Math.min(Math.max(cos, -1), 1)) <= SESSION.facingAngle;
    });
    return inView.sort((a, b) => a.distance - b.distance)[0]?.slug ?? null;
  }

  /**
   * Texture sizes of a work for the budget.
   *
   * @param w - Work distance.
   * @returns Budget candidate.
   */
  private candidate(w: WorkFrame): TextureCandidate {
    const images = (this.works.get(w.slug) as ManifestWork).images;
    const full = images[TIER_BUDGETS[this.tier].fullVariant];
    return {
      slug: w.slug,
      distance: w.distance,
      bytes: { low: TextureBudget.textureBytes(images.low.width, images.low.height), full: TextureBudget.textureBytes(full.width, full.height) },
    };
  }
}
