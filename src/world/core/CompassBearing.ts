import { DriftController, type ViewPose } from './DriftController.js';
import type { GroundPoint, Region } from './FieldLayout.js';

/** Direction to another region, as seen by the visitor. */
export interface Heading {
  region: Region;
  /** Angle from straight ahead in (−π, π]; positive is to the right. */
  bearing: number;
  /** Ground distance to the region's centre. */
  distance: number;
}

/** What the compass shows. */
export interface CompassReading {
  /** Region the visitor is in (nearest stretch of path), or `null` without regions. */
  current: Region | null;
  /** Every other region, in layout order. */
  others: Heading[];
}

/**
 * Pure maths of the horizon compass (FR4, "never truly lost"): which zone or
 * territory the visitor is in, and where the others lie relative to where
 * they look.
 */
export class CompassBearing {
  /**
   * Reads the compass at a pose.
   *
   * @param pose - Camera pose.
   * @param regions - Regions of the field (see `FieldLayout`).
   * @returns Current region and headings to the others.
   */
  static read(pose: ViewPose, regions: readonly Region[]): CompassReading {
    if (regions.length === 0) return { current: null, others: [] };
    const current = regions.reduce((best, r) => (CompassBearing.toSegment(pose, r) < CompassBearing.toSegment(pose, best) ? r : best));
    const forward = { x: -Math.sin(pose.yaw), z: -Math.cos(pose.yaw) };
    const right = { x: Math.cos(pose.yaw), z: -Math.sin(pose.yaw) };
    const others = regions
      .filter((r) => r !== current)
      .map((region) => {
        const vx = region.center.x - pose.x;
        const vz = region.center.z - pose.z;
        const bearing = DriftController.shortestAngle(Math.atan2(vx * right.x + vz * right.z, vx * forward.x + vz * forward.z));
        return { region, bearing, distance: Math.hypot(vx, vz) };
      });
    return { current, others };
  }

  /**
   * Ground distance from a point to a region's stretch of path (also used
   * by the sound's zone weights, src/sound/core/ZoneField.ts).
   *
   * @param p - Point.
   * @param r - Region.
   * @returns Distance to the segment start–end.
   */
  static toSegment(p: GroundPoint, r: Region): number {
    const dx = r.end.x - r.start.x;
    const dz = r.end.z - r.start.z;
    const t = Math.min(Math.max(((p.x - r.start.x) * dx + (p.z - r.start.z) * dz) / (dx * dx + dz * dz), 0), 1);
    return Math.hypot(p.x - (r.start.x + t * dx), p.z - (r.start.z + t * dz));
  }
}
