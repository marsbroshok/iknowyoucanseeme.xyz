import type { GroundPoint } from './FieldLayout.js';

/** Where the camera stands and looks. */
export interface ViewPose extends GroundPoint {
  /** Heading in radians; forward is (−sin yaw, −cos yaw), so 0 looks towards −z. */
  yaw: number;
}

/** Camera state of the drift. */
export interface DriftState extends ViewPose {
  /** Ground velocity (units/s). */
  vx: number;
  vz: number;
  /** Turn rate (rad/s). */
  vyaw: number;
  /** Pose the camera glides to (keyboard focus, deep link), or `null`. */
  target: ViewPose | null;
}

/** Input gathered since the last frame (wheel, drag, keys, tilt). */
export interface DriftInput {
  /** Forward velocity impulse (units/s); negative drifts back. */
  thrust: number;
  /** Turn impulse (rad/s); positive turns left. */
  turn: number;
}

/** A work the keyboard can cycle to. */
export interface CycleStop extends GroundPoint {
  slug: string;
}

/** Motion tuning. */
export const DRIFT = {
  /** Speed clamp (units/s). */
  maxSpeed: 6,
  /** Turn-rate clamp (rad/s). */
  maxYawSpeed: 1.2,
  /** Time constant of the inertia decay (s): speed × 1/e per this time. */
  decaySeconds: 0.9,
  /** Longest frame integrated at once (s); longer gaps are capped. */
  maxFrameSeconds: 0.1,
  /** Distance kept in front of a focused work. */
  viewDistance: 4.5,
  /** Glide gain towards a target (1/s). */
  steer: 2.5,
  /** Glide ends within this distance / angle of the target. */
  arriveEpsilon: 1e-3,
} as const;

/**
 * Pure camera motion of the drift (FR3), testable without WebGL.
 *
 * Wheel, drag, keys and tilt become impulses; velocity decays exponentially
 * (inertia) and is clamped. Keyboard focus and deep links set a target pose
 * the camera glides to; any drift input cancels the glide. Every method
 * returns a new state and never mutates its input.
 */
export class DriftController {
  /**
   * A resting state at a pose.
   *
   * @param pose - Start pose.
   * @returns The state.
   */
  initial(pose: ViewPose): DriftState {
    return { x: pose.x, z: pose.z, yaw: pose.yaw, vx: 0, vz: 0, vyaw: 0, target: null };
  }

  /**
   * Advances the camera by one frame.
   *
   * @param state - Current state.
   * @param input - Impulses since the last frame.
   * @param dt - Frame time (s); capped at {@link DRIFT.maxFrameSeconds}.
   * @returns The next state.
   */
  step(state: DriftState, input: DriftInput, dt: number): DriftState {
    const t = Math.min(Math.max(dt, 0), DRIFT.maxFrameSeconds);
    const drifting = input.thrust !== 0 || input.turn !== 0;
    let { vx, vz, vyaw } = state;
    const target = drifting ? null : state.target;

    if (input.thrust !== 0) {
      vx += -Math.sin(state.yaw) * input.thrust;
      vz += -Math.cos(state.yaw) * input.thrust;
    }
    vyaw += input.turn;

    if (target) {
      const turn = DriftController.shortestAngle(target.yaw - state.yaw);
      if (Math.hypot(target.x - state.x, target.z - state.z) < DRIFT.arriveEpsilon && Math.abs(turn) < DRIFT.arriveEpsilon) {
        return this.initial(target);
      }
      vx = (target.x - state.x) * DRIFT.steer;
      vz = (target.z - state.z) * DRIFT.steer;
      vyaw = turn * DRIFT.steer;
    }

    const speed = Math.hypot(vx, vz);
    if (speed > DRIFT.maxSpeed) {
      vx *= DRIFT.maxSpeed / speed;
      vz *= DRIFT.maxSpeed / speed;
    }
    vyaw = Math.min(Math.max(vyaw, -DRIFT.maxYawSpeed), DRIFT.maxYawSpeed);

    const next: DriftState = { x: state.x + vx * t, z: state.z + vz * t, yaw: state.yaw + vyaw * t, vx, vz, vyaw, target };
    if (!target) {
      const decay = Math.exp(-t / DRIFT.decaySeconds);
      next.vx *= decay;
      next.vz *= decay;
      next.vyaw *= decay;
    }
    return next;
  }

  /**
   * Starts a glide to a pose.
   *
   * @param state - Current state.
   * @param target - Pose to reach.
   * @returns The state with the target set.
   */
  focus(state: DriftState, target: ViewPose): DriftState {
    return { ...state, target };
  }

  /**
   * The pose {@link DRIFT.viewDistance} in front of a work, facing it, on the
   * side the camera currently is (down the path when standing on it).
   *
   * @param state - Current state.
   * @param work - Work position.
   * @returns The viewing pose.
   */
  viewPoseFor(state: DriftState, work: GroundPoint): ViewPose {
    const dx = state.x - work.x;
    const dz = state.z - work.z;
    const length = Math.hypot(dx, dz);
    const [ux, uz] = length < 1e-9 ? [0, 1] : [dx / length, dz / length];
    return { x: work.x + ux * DRIFT.viewDistance, z: work.z + uz * DRIFT.viewDistance, yaw: Math.atan2(ux, uz) };
  }

  /**
   * Keyboard cycling (Tab / Shift+Tab): the nearest work first, then the
   * next or previous one along the path, wrapping around.
   *
   * @param state - Current state.
   * @param stops - Works in path order.
   * @param current - Slug of the focused work, or `null`.
   * @param direction - `1` forwards, `-1` backwards.
   * @returns Slug of the work to focus, or `null` without works.
   */
  cycle(state: DriftState, stops: readonly CycleStop[], current: string | null, direction: 1 | -1): string | null {
    if (stops.length === 0) return null;
    const index = stops.findIndex((s) => s.slug === current);
    if (index < 0) return this.nearest(state, stops).slug;
    return stops[(index + direction + stops.length) % stops.length].slug;
  }

  /**
   * The work closest to the camera on the ground plane.
   *
   * @param state - Current state.
   * @param stops - Candidate works (non-empty).
   * @returns The nearest one.
   */
  nearest<T extends GroundPoint>(state: GroundPoint, stops: readonly T[]): T {
    const d = (s: GroundPoint) => Math.hypot(s.x - state.x, s.z - state.z);
    return stops.reduce((best, s) => (d(s) < d(best) ? s : best));
  }

  /**
   * Wraps an angle difference into (−π, π].
   *
   * @param angle - Radians.
   * @returns Equivalent angle of smallest magnitude.
   */
  static shortestAngle(angle: number): number {
    const wrapped = angle - 2 * Math.PI * Math.floor((angle + Math.PI) / (2 * Math.PI));
    return wrapped === -Math.PI ? Math.PI : wrapped;
  }
}
