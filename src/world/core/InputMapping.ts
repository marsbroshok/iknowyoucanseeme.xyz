import type { DriftInput } from './DriftController.js';

/** Input sensitivities. */
export const INPUT = {
  /** Forward impulse (units/s) per wheel pixel. */
  wheelThrustPerPixel: 0.02,
  /** Pixels per wheel line (`deltaMode` 1) and page (`deltaMode` 2). */
  pixelsPerLine: 16,
  pixelsPerPage: 800,
  /** Turn impulse (rad/s) per dragged pixel, sideways. */
  dragTurnPerPixel: 0.006,
  /** Forward impulse (units/s) per dragged pixel, up. */
  dragThrustPerPixel: 0.04,
  /** Held-key impulse per second: forward (units/s²) and turn (rad/s²). */
  keyThrustPerSecond: 14,
  keyTurnPerSecond: 3,
  /** Tilt below this many degrees is ignored. */
  tiltDeadZone: 5,
  /** Impulse per degree of tilt beyond the dead zone, per second. */
  tiltTurnPerDegree: 0.06,
  tiltThrustPerDegree: 0.3,
} as const;

const FORWARD = new Set(['ArrowUp', 'w', 'W']);
const BACK = new Set(['ArrowDown', 's', 'S']);
const LEFT = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT = new Set(['ArrowRight', 'd', 'D']);

/** A device orientation reading (degrees; `null` when the sensor gives none). */
export interface TiltReading {
  /** Front/back tilt. */
  beta: number | null;
  /** Left/right tilt. */
  gamma: number | null;
}

/**
 * Pure mapping from raw input to drift impulses (FR3): wheel, drag, held
 * keys and phone tilt. Positive thrust drifts forward; positive turn turns
 * left (the yaw convention of `DriftController`).
 */
export class InputMapping {
  /**
   * Wheel or trackpad scroll: down drifts forward.
   *
   * @param deltaY - `WheelEvent.deltaY`.
   * @param deltaMode - `WheelEvent.deltaMode` (0 pixels, 1 lines, 2 pages).
   * @returns Impulse.
   */
  static wheel(deltaY: number, deltaMode: number): DriftInput {
    const scale = deltaMode === 1 ? INPUT.pixelsPerLine : deltaMode === 2 ? INPUT.pixelsPerPage : 1;
    return { thrust: deltaY * scale * INPUT.wheelThrustPerPixel, turn: 0 };
  }

  /**
   * Pointer drag, as if pulling the world: right turns left, up drifts forward.
   *
   * @param dx - Horizontal movement (px).
   * @param dy - Vertical movement (px, down positive).
   * @returns Impulse.
   */
  static drag(dx: number, dy: number): DriftInput {
    return { thrust: -dy * INPUT.dragThrustPerPixel, turn: dx * INPUT.dragTurnPerPixel };
  }

  /**
   * Held keys during one frame: arrows or WASD.
   *
   * @param held - Keys currently down (`KeyboardEvent.key`).
   * @param dt - Frame time (s).
   * @returns Impulse.
   */
  static keys(held: ReadonlySet<string>, dt: number): DriftInput {
    const any = (set: Set<string>) => [...set].some((k) => held.has(k));
    const axis = (plus: Set<string>, minus: Set<string>) => (any(plus) ? 1 : 0) - (any(minus) ? 1 : 0);
    return { thrust: axis(FORWARD, BACK) * INPUT.keyThrustPerSecond * dt, turn: axis(LEFT, RIGHT) * INPUT.keyTurnPerSecond * dt };
  }

  /**
   * Whether a key drives the drift.
   *
   * @param key - `KeyboardEvent.key`.
   * @returns `true` for arrows and WASD.
   */
  static isDriftKey(key: string): boolean {
    return FORWARD.has(key) || BACK.has(key) || LEFT.has(key) || RIGHT.has(key);
  }

  /**
   * Phone tilt during one frame: tilting left turns left; tilting the top
   * away from the start position drifts forward.
   *
   * @param reading - Current orientation.
   * @param baselineBeta - Front/back tilt when tilt control started.
   * @param dt - Frame time (s).
   * @returns Impulse.
   */
  static tilt(reading: TiltReading, baselineBeta: number, dt: number): DriftInput {
    const forward = reading.beta === null ? 0 : InputMapping.beyondDeadZone(baselineBeta - reading.beta);
    const left = reading.gamma === null ? 0 : InputMapping.beyondDeadZone(-reading.gamma);
    return { thrust: forward * INPUT.tiltThrustPerDegree * dt, turn: left * INPUT.tiltTurnPerDegree * dt };
  }

  /**
   * Degrees beyond the dead zone, keeping the sign.
   *
   * @param degrees - Tilt.
   * @returns 0 inside the dead zone.
   */
  private static beyondDeadZone(degrees: number): number {
    const magnitude = Math.abs(degrees) - INPUT.tiltDeadZone;
    return magnitude > 0 ? Math.sign(degrees) * magnitude : 0;
  }
}
