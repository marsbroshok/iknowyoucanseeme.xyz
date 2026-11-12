import type { InputAccumulator } from '../../core/InputAccumulator.js';
import { InputMapping } from '../../core/InputMapping.js';

/** Movement (px) from which a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 6;

/**
 * Mouse, pen and touch drag over the world (FR3): pulling the world turns
 * and drifts the camera. Moves are followed on the window so a drag that
 * leaves the canvas keeps working. Remembers whether the last press was a
 * drag, so the click that ends it does not open a work.
 */
export class PointerDragInput {
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private moved = 0;
  private lastWasDrag = false;
  private readonly win: Window;

  private readonly onDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.moved = 0;
  };

  private readonly onMove = (event: MouseEvent): void => {
    if (!this.dragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.moved += Math.abs(dx) + Math.abs(dy);
    this.acc.add(InputMapping.drag(dx, dy));
  };

  private readonly onUp = (): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.lastWasDrag = this.moved > DRAG_THRESHOLD;
  };

  /**
   * @param target - The world layer (where a drag starts).
   * @param acc - Where impulses go.
   */
  constructor(
    private readonly target: HTMLElement,
    private readonly acc: InputAccumulator,
  ) {
    this.win = target.ownerDocument.defaultView as Window;
    target.addEventListener('pointerdown', this.onDown);
    this.win.addEventListener('pointermove', this.onMove);
    this.win.addEventListener('pointerup', this.onUp);
    this.win.addEventListener('pointercancel', this.onUp);
  }

  /**
   * Whether the last finished press moved far enough to be a drag.
   *
   * @returns `true` after a drag, `false` after a click.
   */
  wasDrag(): boolean {
    return this.lastWasDrag;
  }

  /** Stops listening. */
  detach(): void {
    this.target.removeEventListener('pointerdown', this.onDown);
    this.win.removeEventListener('pointermove', this.onMove);
    this.win.removeEventListener('pointerup', this.onUp);
    this.win.removeEventListener('pointercancel', this.onUp);
  }
}
