import { CompassBearing } from './CompassBearing.js';
import type { GroundPoint, Region } from './FieldLayout.js';
import type { WorldManifest } from './WorldManifest.js';
import { ZoneAtmosphere } from './ZoneAtmosphere.js';

/** Timing and spatial hysteresis of the zone-crossing title apparition (FR4). */
export const CROSSING = {
  /** Total seconds a zone-crossing banner stays visible. */
  durationSeconds: 3.0,
  /** Seconds spent fading in from 0 to 1. */
  fadeInSeconds: 0.35,
  /** Seconds spent fading out from 1 to 0 at the end of `durationSeconds`. */
  fadeOutSeconds: 0.55,
  /** Distance advantage (world units) over the active region needed to switch regions (prevents border flicker). */
  hysteresis: 1.6,
} as const;

/** Localized copy and accent associated with one region. */
export interface ZoneCrossingMeta {
  title: string;
  subtitle: string;
  accent: string;
}

/** Frame output of {@link ZoneCrossing.update}. */
export interface ZoneCrossingState extends ZoneCrossingMeta {
  /** Whether `[data-zone-banner]` should be shown on screen. */
  visible: boolean;
  /** `true` only on the frame a new crossing begins. */
  triggered: boolean;
  /** Opacity in `[0, 1]` for smooth fade-in / plateau / fade-out. */
  opacity: number;
  /** Active region (after hysteresis), or `null` while held or empty. */
  region: Region | null;
}

const HIDDEN_STATE: ZoneCrossingState = {
  visible: false,
  triggered: false,
  opacity: 0,
  title: '',
  subtitle: '',
  accent: '',
  region: null,
};

/**
 * Pure state machine for the centered `Fraunces` zone-crossing banner (FR4):
 * ignores spawn frames while the Threshold holds the world still, announces on
 * entry and on every subsequent region switch once the visitor crosses past the
 * border hysteresis band, and expires cleanly after {@link CROSSING.durationSeconds}.
 */
export class ZoneCrossing {
  private active: Region | null = null;
  private elapsed: number | null = null;

  /**
   * @param regions - Laid-out regions of the field.
   * @param meta - Localized title, 1-sentence excerpt, and AA accent per region.
   */
  constructor(
    private readonly regions: readonly Region[],
    private readonly meta: ReadonlyMap<Region, ZoneCrossingMeta>,
  ) {}

  /**
   * Builds a {@link ZoneCrossing} tracker from laid-out regions and the page's
   * validated {@link WorldManifest}.
   *
   * @param regions - Regions from `FieldLayout.compute`.
   * @param manifest - Territories and zones with localized titles and sentences/excerpts.
   * @returns Configured crossing state machine.
   * @throws Error when a region references an unknown territory or zone.
   */
  static fromManifest(regions: readonly Region[], manifest: Pick<WorldManifest, 'territories' | 'zones'>): ZoneCrossing {
    const territories = new Map(manifest.territories.map((t) => [t.slug, t]));
    const zones = new Map(manifest.zones.map((z) => [z.slug, z]));
    const meta = new Map<Region, ZoneCrossingMeta>();
    for (const region of regions) {
      const territory = territories.get(region.territory);
      if (!territory) throw new Error(`[ZoneCrossing] No territory "${region.territory}" in manifest`);
      let title = territory.title;
      let subtitle = territory.sentences[0] ?? '';
      if (region.zone !== null) {
        const zone = zones.get(region.zone);
        if (!zone) throw new Error(`[ZoneCrossing] No zone "${region.zone}" in manifest`);
        title = `${territory.title} · ${zone.title}`;
        subtitle = zone.excerpt ?? subtitle;
      }
      meta.set(region, { title, subtitle, accent: ZoneAtmosphere.forRegion(region).accent });
    }
    return new ZoneCrossing(regions, meta);
  }

  /** Clears the active region and timer (e.g. when exhibition mode restarts at the beginning). */
  reset(): void {
    this.active = null;
    this.elapsed = null;
  }

  /**
   * Advances the crossing tracker by one frame.
   *
   * @param point - Current camera ground coordinates.
   * @param holding - `true` while the Threshold holds the world still.
   * @param dt - Frame delta in seconds.
   * @returns Banner state for this frame.
   */
  update(point: GroundPoint, holding: boolean, dt: number): ZoneCrossingState {
    if (this.regions.length === 0 || holding) return HIDDEN_STATE;
    const nearest = CompassBearing.regionAt(point, this.regions) as Region;
    const prev = this.active;
    const switched =
      prev === null ||
      (nearest !== prev && CompassBearing.toSegment(point, prev) - CompassBearing.toSegment(point, nearest) >= CROSSING.hysteresis);

    const active = switched ? nearest : prev;
    this.active = active;
    if (switched) {
      this.elapsed = 0;
    } else if (this.elapsed !== null) {
      this.elapsed += Math.max(dt, 0);
      if (this.elapsed >= CROSSING.durationSeconds) this.elapsed = null;
    }

    const info = this.meta.get(active) as ZoneCrossingMeta;
    if (this.elapsed === null) {
      return { visible: false, triggered: false, opacity: 0, ...info, region: active };
    }
    const fadeIn = Math.min(1, (this.elapsed + 0.05) / CROSSING.fadeInSeconds);
    const fadeOut = Math.min(1, (CROSSING.durationSeconds - this.elapsed) / CROSSING.fadeOutSeconds);
    return {
      visible: true,
      triggered: switched,
      opacity: Math.min(fadeIn, fadeOut),
      ...info,
      region: active,
    };
  }
}
