import { InputMapping } from '../../core/InputMapping.js';

/** Hold time (ms) of a still finger that changes the lens. */
export const LONG_PRESS_MS = 500;
/** Movement (px) that cancels a long press or a tap. */
const STILL_PX = 10;
/** Longest two-finger tap (ms). */
const TAP_MS = 400;

/** Pointer position in normalised device coordinates (−1…1, y up). */
export interface Ndc {
  x: number;
  y: number;
}

/** What the lens reads from the visitor's input each frame. */
export interface LensInputState {
  /** Pointer over the canvas (mouse hovering, or a finger down), or `null`. */
  ndc: Ndc | null;
  /** The pointer is (or last was) a finger. */
  touch: boolean;
  /** "See unaltered": Shift held, or toggled by a two-finger tap (FR4). */
  unaltered: boolean;
  /** The lens was last asked for with the keyboard (L), not the pointer. */
  keyboard: boolean;
}

/** Called to change the lens (key L or a long press). */
export type CycleHandler = () => void;

/**
 * The visitor's lens input (FR2–FR4), in the DOM: the mouse's position over
 * the canvas (the lens follows it), a finger while it touches (FR3), a long
 * press or the L key to change the lens, Shift held or a two-finger tap to
 * see the work unaltered. A press that was a long press or a two-finger tap
 * must not also open the work: {@link LensInput.claimedPress} says so.
 * Keys typed in fields or in the open focus dialog are ignored; Shift is
 * forgotten when the window loses focus.
 */
export class LensInput {
  private ndc: Ndc | null = null;
  private touch = false;
  private shift = false;
  private toggled = false;
  private keyboard = false;
  private claimed = false;
  private readonly fingers = new Map<number, { x: number; y: number; t: number; moved: boolean }>();
  private multiTouch = false;
  private pressTimer: number | null = null;
  private readonly win: Window;

  private readonly onMove = (event: PointerEvent): void => {
    const finger = this.fingers.get(event.pointerId);
    if (finger && Math.hypot(event.clientX - finger.x, event.clientY - finger.y) > STILL_PX) {
      finger.moved = true;
      this.cancelPress();
    }
    if (event.pointerType === 'touch' && !finger) return;
    this.keyboard = false;
    this.touch = event.pointerType === 'touch';
    this.ndc = this.toNdc(event);
  };

  private readonly onDown = (event: PointerEvent): void => {
    this.keyboard = false;
    this.touch = event.pointerType === 'touch';
    this.ndc = this.toNdc(event);
    this.claimed = false;
    if (!this.touch) return;
    this.fingers.set(event.pointerId, { x: event.clientX, y: event.clientY, t: event.timeStamp, moved: false });
    if (this.fingers.size === 2) {
      this.multiTouch = true;
      this.cancelPress();
    } else if (this.fingers.size === 1) {
      this.multiTouch = false;
      this.pressTimer = this.win.setTimeout(this.onLongPress, LONG_PRESS_MS);
    }
  };

  private readonly onUp = (event: PointerEvent): void => {
    const finger = this.fingers.get(event.pointerId);
    if (!finger) return;
    this.fingers.delete(event.pointerId);
    this.cancelPress();
    if (this.multiTouch && this.fingers.size === 0) {
      this.claimed = true;
      if (!finger.moved && event.timeStamp - finger.t <= TAP_MS) this.toggled = !this.toggled;
      this.multiTouch = false;
    }
    if (this.fingers.size === 0) this.ndc = null;
  };

  private readonly onLeave = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') this.ndc = null;
  };

  private readonly onLongPress = (): void => {
    this.pressTimer = null;
    this.claimed = true;
    this.onCycle();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') {
      this.shift = true;
      return;
    }
    const origin = event.target as Element;
    if (!InputMapping.isLensKey(event.key) || origin.closest('dialog, input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    this.keyboard = true;
    this.onCycle();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') this.shift = false;
  };

  private readonly onBlur = (): void => {
    this.shift = false;
  };

  /**
   * @param canvas - The world canvas (pointer events).
   * @param root - The world layer (key events).
   * @param onCycle - Changes the lens.
   */
  constructor(
    private readonly canvas: HTMLElement,
    private readonly root: HTMLElement,
    private readonly onCycle: CycleHandler,
  ) {
    this.win = canvas.ownerDocument.defaultView as Window;
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerleave', this.onLeave);
    this.win.addEventListener('pointerup', this.onUp);
    this.win.addEventListener('pointercancel', this.onUp);
    root.addEventListener('keydown', this.onKeyDown);
    this.win.addEventListener('keyup', this.onKeyUp);
    this.win.addEventListener('blur', this.onBlur);
  }

  /**
   * The input for this frame.
   *
   * @returns Pointer, pointer kind, "see unaltered" and keyboard flag.
   */
  state(): LensInputState {
    return { ndc: this.ndc && { ...this.ndc }, touch: this.touch, unaltered: this.shift || this.toggled, keyboard: this.keyboard };
  }

  /**
   * Aims the lens at the work in front of the camera (used by the tactile
   * `[data-lens-cycle]` pill), until the pointer next moves over or touches
   * the canvas.
   */
  aimAtFacing(): void {
    this.keyboard = true;
  }

  /**
   * Whether the last press was used by the lens (a long press or a
   * two-finger tap), so its click must not open the work.
   *
   * @returns `true` after such a press.
   */
  claimedPress(): boolean {
    return this.claimed;
  }

  /** Stops listening and cancels a pending long press. */
  detach(): void {
    this.cancelPress();
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    this.win.removeEventListener('pointerup', this.onUp);
    this.win.removeEventListener('pointercancel', this.onUp);
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.win.removeEventListener('keyup', this.onKeyUp);
    this.win.removeEventListener('blur', this.onBlur);
  }

  /** Cancels a pending long press. */
  private cancelPress(): void {
    if (this.pressTimer !== null) this.win.clearTimeout(this.pressTimer);
    this.pressTimer = null;
  }

  /** Client position → normalised device coordinates of the canvas. */
  private toNdc(event: PointerEvent): Ndc {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(r.width, 1);
    const h = Math.max(r.height, 1);
    return { x: ((event.clientX - r.left) / w) * 2 - 1, y: -(((event.clientY - r.top) / h) * 2 - 1) };
  }
}
