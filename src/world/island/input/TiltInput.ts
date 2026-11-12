import type { InputAccumulator } from '../../core/InputAccumulator.js';
import { InputMapping, type TiltReading } from '../../core/InputMapping.js';

/** Outcome of asking for the orientation sensor. */
export type TiltPermission = 'granted' | 'denied';

/**
 * iOS's `DeviceOrientationEvent.requestPermission` (must run in a tap
 * handler); `null` on browsers that need no permission.
 */
export type OrientationPermission = (() => Promise<TiltPermission>) | null;

/**
 * Phone tilt drives the drift (FR3) once the visitor turns it on with a
 * tap: on iOS that tap shows the system permission prompt; elsewhere the
 * sensor starts at once. The first reading is the neutral position. When
 * permission is refused, drag remains the way to move.
 */
export class TiltInput {
  private reading: TiltReading | null = null;
  private baseline: number | null = null;

  private readonly onOrientation = (event: Event): void => {
    const { beta, gamma } = event as DeviceOrientationEvent;
    if (this.baseline === null && beta !== null) this.baseline = beta;
    this.reading = { beta, gamma };
  };

  /**
   * @param win - Window receiving `deviceorientation` events.
   * @param permission - iOS permission request, or `null` when not needed.
   */
  constructor(
    private readonly win: Window,
    private readonly permission: OrientationPermission,
  ) {}

  /**
   * Turns tilt control on (call from a tap handler).
   *
   * @returns `granted` when tilt now drives the drift, else `denied`.
   * @throws Whatever the browser's permission request rejects with.
   */
  async enable(): Promise<TiltPermission> {
    const state = this.permission ? await this.permission() : 'granted';
    if (state === 'granted') this.win.addEventListener('deviceorientation', this.onOrientation);
    return state;
  }

  /**
   * Adds this frame's tilt impulse.
   *
   * @param acc - Where impulses go.
   * @param dt - Frame time (s).
   */
  poll(acc: InputAccumulator, dt: number): void {
    if (!this.reading || this.baseline === null) return;
    acc.add(InputMapping.tilt(this.reading, this.baseline, dt));
  }

  /** Stops listening. */
  detach(): void {
    this.win.removeEventListener('deviceorientation', this.onOrientation);
    this.reading = null;
    this.baseline = null;
  }
}
