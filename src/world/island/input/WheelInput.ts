import type { InputAccumulator } from '../../core/InputAccumulator.js';
import { InputMapping } from '../../core/InputMapping.js';

/**
 * Wheel and trackpad scrolling over the world drift forward and back
 * (FR3). The page itself does not scroll while the world is shown; wheel
 * events over the open focus dialog are left alone.
 */
export class WheelInput {
  private readonly onWheel = (event: WheelEvent): void => {
    if ((event.target as Element).closest('dialog')) return;
    event.preventDefault();
    this.acc.add(InputMapping.wheel(event.deltaY, event.deltaMode));
  };

  /**
   * @param target - The world layer.
   * @param acc - Where impulses go.
   */
  constructor(
    private readonly target: HTMLElement,
    private readonly acc: InputAccumulator,
  ) {
    target.addEventListener('wheel', this.onWheel, { passive: false });
  }

  /** Stops listening. */
  detach(): void {
    this.target.removeEventListener('wheel', this.onWheel);
  }
}
