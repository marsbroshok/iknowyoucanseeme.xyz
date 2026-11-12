import { CompassBearing } from '../../world/core/CompassBearing.js';
import type { GroundPoint, Region } from '../../world/core/FieldLayout.js';
import { SOUND_ZONES, SoundZones, type SoundZone, type ZoneWeights } from './SoundZones.js';

/** Shape of the zone weights in the field. */
export const ZONE_FIELD = {
  /** Distance (m) over which a zone's weight falls by a factor e relative to the nearest zone. */
  falloff: 8,
} as const;

/**
 * Where the camera stands, as zone weights (spec FR3), without audio.
 *
 * Each sound zone's distance is the ground distance from the camera to the
 * nearest stretch of path holding it ({@link Region}s of `FieldLayout`, the
 * same stretches the horizon compass names). The weights are a softmax of
 * those distances: `exp(-(d - dNearest) / falloff)`, normalised. They sum
 * to 1, change continuously as the camera moves (no jumps at a zone's
 * edge), and a zone the visitor stands in dominates. Zones absent from the
 * field get 0; a field without regions sounds like the arrival.
 */
export class ZoneField {
  private readonly regions: readonly { zone: SoundZone; region: Region }[];

  /**
   * @param regions - Stretches of path of the field (`FieldLayout.compute(...).regions`).
   */
  constructor(regions: readonly Region[]) {
    this.regions = regions.map((region) => ({ zone: SoundZones.of(region.territory, region.zone), region }));
  }

  /**
   * The zone weights at a point.
   *
   * @param point - Camera position on the ground.
   * @returns The mix.
   */
  weightsAt(point: GroundPoint): ZoneWeights {
    if (this.regions.length === 0) return SoundZones.only('arrival');
    const distance: Record<SoundZone, number> = { arrival: Infinity, lens: Infinity, leak: Infinity, border: Infinity };
    for (const { zone, region } of this.regions) distance[zone] = Math.min(distance[zone], CompassBearing.toSegment(point, region));
    const nearest = Math.min(...SOUND_ZONES.map((z) => distance[z]));
    const raw = {} as Record<SoundZone, number>;
    for (const z of SOUND_ZONES) raw[z] = Math.exp(-(distance[z] - nearest) / ZONE_FIELD.falloff);
    return SoundZones.normalize(raw);
  }
}
