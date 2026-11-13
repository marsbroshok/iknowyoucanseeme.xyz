import { FIELD, FieldLayout, type FieldLayoutResult, type GroundPoint, type Region } from './FieldLayout.js';
import { ZoneAtmosphere, type BorealRibbons } from './ZoneAtmosphere.js';

/** Dimensions and clearance parameters of 3D boreal curtain portals (FR3). */
export const GATE = {
  /** Curtain span across the path (world units, ~ metres). */
  width: 16,
  /** Curtain height (world units). */
  height: 6.5,
  /** Vertical centre of the curtain (world units). */
  centerY: 2.8,
  /** Distance ahead of a non-initial territory's start where its entry portal hangs. */
  entryLead: FIELD.zoneGap / 2,
  /** Radius around the camera within which the curtain parts/softens smoothly. */
  partRadius: 2.5,
  /** Guaranteed minimum ground clearance from any artwork placement to any curtain segment. */
  minClearance: 5.0,
} as const;

/** A 3D boreal curtain portal separating two zones or introducing a territory. */
export interface ZoneGate {
  /** Deterministic portal identifier (`<territory>:<zone|entry>`). */
  id: string;
  /** Region entered when drifting forward through this portal. */
  into: Region;
  /** Preceding region on the same territory path, or `null` for a territory entry gate. */
  from: Region | null;
  /** Ground centre x. */
  x: number;
  /** Centre height y. */
  y: number;
  /** Ground centre z. */
  z: number;
  /** Rotation around Y in radians so the curtain spans perpendicular to the curved path. */
  yaw: number;
  /** Curtain width (world units). */
  width: number;
  /** Curtain height (world units). */
  height: number;
  /** Boreal ribbon colours tuned to `into`. */
  ribbons: BorealRibbons;
}

/**
 * Pure placement and proximity maths of 3D boreal curtain portals (FR3):
 * places one portal centered in every intra-territory `zoneGap` (`Arrival → Lens`,
 * `Lens → Leak`) and an entry portal just ahead of each secondary territory
 * (*The border is thin*), tuned to the entered region's boreal ribbon stops.
 */
export class ZoneGates {
  /**
   * Computes portal placements for a laid-out field.
   *
   * @param layout - Regions and placements from `FieldLayout.compute`.
   * @returns Ordered boreal gates; empty when fewer than two regions exist.
   */
  static compute(layout: Pick<FieldLayoutResult, 'regions' | 'placements'>): ZoneGate[] {
    const { regions } = layout;
    if (regions.length <= 1) return [];
    const gates: ZoneGate[] = [];
    for (let i = 1; i < regions.length; i++) {
      const prev = regions[i - 1];
      const into = regions[i];
      const sameTerritory = prev.territory === into.territory;
      const z = sameTerritory ? (prev.end.z + into.start.z) / 2 : into.start.z + GATE.entryLead;
      const anchorX = into.start.x - FieldLayout.pathX(into.start.z);
      const x = anchorX + FieldLayout.pathX(z);
      const dPathX = ((2 * Math.PI * FIELD.curveAmplitude) / FIELD.curveWavelength) * Math.cos((2 * Math.PI * z) / FIELD.curveWavelength);
      const yaw = Math.atan2(dPathX, 1);
      gates.push({
        id: `${into.territory}:${into.zone ?? 'entry'}`,
        into,
        from: sameTerritory ? prev : null,
        x,
        y: GATE.centerY,
        z,
        yaw,
        width: GATE.width,
        height: GATE.height,
        ribbons: ZoneAtmosphere.forRegion(into).ribbons,
      });
    }
    return gates;
  }

  /**
   * Shortest ground distance from a point to a gate's finite curtain segment.
   *
   * @param point - Ground point (`{ x, z }`).
   * @param gate - Boreal gate.
   * @returns Euclidean ground distance to the curtain segment.
   */
  static distanceToCurtain(point: GroundPoint, gate: ZoneGate): number {
    const half = gate.width / 2;
    const cos = Math.cos(gate.yaw);
    const sin = Math.sin(gate.yaw);
    const ax = gate.x - half * cos;
    const az = gate.z + half * sin;
    const dx = gate.width * cos;
    const dz = -gate.width * sin;
    const lenSq = gate.width * gate.width;
    const t = Math.min(Math.max(((point.x - ax) * dx + (point.z - az) * dz) / lenSq, 0), 1);
    return Math.hypot(point.x - (ax + t * dx), point.z - (az + t * dz));
  }

  /**
   * Smooth Hermite parting factor in `[0, 1]` (`0` at the camera, `1` beyond
   * `GATE.partRadius`) used to soften the curtain near the visitor.
   *
   * @param distance - Distance from the camera (`>= 0`).
   * @returns Factor in `[0, 1]`.
   */
  static partFactor(distance: number): number {
    const u = Math.min(Math.max(distance / GATE.partRadius, 0), 1);
    return u * u * (3 - 2 * u);
  }
}
