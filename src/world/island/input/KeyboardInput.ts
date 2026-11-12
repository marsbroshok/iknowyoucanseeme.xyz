import type { InputAccumulator } from '../../core/InputAccumulator.js';
import { InputMapping } from '../../core/InputMapping.js';

/**
 * Arrow keys (and WASD) drift while held (FR3, keyboard path of the
 * guidelines). Tab, Enter and Escape are left to the browser and the work
 * list; keys typed in fields or inside the open focus dialog are ignored.
 * Held keys are forgotten when the window loses focus.
 */
export class KeyboardInput {
  private readonly held = new Set<string>();
  private readonly win: Window;

  private readonly onDown = (event: KeyboardEvent): void => {
    const origin = event.target as Element;
    if (!InputMapping.isDriftKey(event.key) || origin.closest('dialog, input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    this.held.add(event.key);
  };

  private readonly onUp = (event: KeyboardEvent): void => {
    this.held.delete(event.key);
  };

  private readonly onBlur = (): void => {
    this.held.clear();
  };

  /**
   * @param target - The world layer.
   */
  constructor(private readonly target: HTMLElement) {
    this.win = target.ownerDocument.defaultView as Window;
    target.addEventListener('keydown', this.onDown);
    this.win.addEventListener('keyup', this.onUp);
    this.win.addEventListener('blur', this.onBlur);
  }

  /**
   * Adds this frame's impulse of the held keys.
   *
   * @param acc - Where impulses go.
   * @param dt - Frame time (s).
   */
  poll(acc: InputAccumulator, dt: number): void {
    acc.add(InputMapping.keys(this.held, dt));
  }

  /** Stops listening and forgets held keys. */
  detach(): void {
    this.target.removeEventListener('keydown', this.onDown);
    this.win.removeEventListener('keyup', this.onUp);
    this.win.removeEventListener('blur', this.onBlur);
    this.held.clear();
  }
}
