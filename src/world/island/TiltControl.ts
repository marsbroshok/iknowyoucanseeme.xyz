import type { InputAccumulator } from '../core/InputAccumulator.js';
import { TiltInput, type OrientationPermission, type TiltPermission } from './input/TiltInput.js';

/** iOS adds a static `requestPermission` to `DeviceOrientationEvent`. */
interface OrientationApi {
  requestPermission?: () => Promise<TiltPermission>;
}

/**
 * The "Move with the phone" button of the world (FR3): shown on touch
 * devices that have the orientation API. A tap turns tilt control on; on
 * iOS that tap shows the system permission prompt. Refused or failed, the
 * button goes away and drag stays the way to move.
 */
export class TiltControl {
  private readonly input: TiltInput;

  /**
   * @param button - The page's `[data-drift-tilt]` button (hidden by default).
   * @param win - The window.
   * @param coarsePointer - Whether the device is touch-first.
   */
  constructor(
    private readonly button: HTMLButtonElement,
    win: Window,
    coarsePointer: boolean,
  ) {
    const api = (win as unknown as { DeviceOrientationEvent?: OrientationApi }).DeviceOrientationEvent;
    const permission: OrientationPermission = api?.requestPermission ? () => (api.requestPermission as () => Promise<TiltPermission>)() : null;
    this.input = new TiltInput(win, permission);
    button.hidden = !(api && coarsePointer);
    button.addEventListener('click', this.onClick);
  }

  /**
   * Adds this frame's tilt impulse (nothing until enabled).
   *
   * @param acc - Where impulses go.
   * @param dt - Frame time (s).
   */
  poll(acc: InputAccumulator, dt: number): void {
    this.input.poll(acc, dt);
  }

  /** Stops listening. */
  detach(): void {
    this.button.removeEventListener('click', this.onClick);
    this.input.detach();
  }

  private readonly onClick = (): void => {
    this.input.enable().then(
      () => {
        this.button.hidden = true;
      },
      (error: unknown) => {
        console.error('[drift] Tilt control could not start; drag to move instead.', error);
        this.button.hidden = true;
      },
    );
  };
}
