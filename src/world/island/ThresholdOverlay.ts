import type { ThresholdState } from '../core/ThresholdState.js';

/** The timer functions of `window` the overlay uses. */
export interface ThresholdTimers {
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

/** What the world asks of the threshold each frame. */
export interface ThresholdView {
  /** The threshold is up and the world holds still. */
  readonly holding: boolean;
  /** The threshold is on screen (shown or fading out). */
  readonly visible: boolean;
}

/** Marks elements this overlay made inert. */
const MARK = 'data-threshold-inert';

/**
 * The threshold screen over the world layer (FR1, FR4): the line, the
 * breathing leak's canvas and the Enter button, driven by a
 * {@link ThresholdState}. While the full threshold is up, the rest of the
 * world layer is `inert` (keyboard and screen readers stay on Enter) except
 * the always-visible "Wake up" (`.drift-top`), so the threshold never
 * blocks the awake layer. Enter is a real `<button>`: click, Enter and Space
 * all work. Fades are CSS transitions keyed on `data-phase`.
 */
export class ThresholdOverlay implements ThresholdView {
  private readonly el: HTMLElement;
  private readonly enterButton: HTMLButtonElement;
  private readonly timers: number[] = [];
  private closed = false;
  private autoTimer: number | null = null;
  private readonly onEnter = () => this.enter(true);

  /**
   * @param root - The world layer (`[data-drift]`).
   * @param state - The threshold's state machine.
   * @param timers - `window` (or fake timers in tests).
   * @throws Error when the layer has no `[data-threshold]` or it has no `[data-threshold-enter]`.
   */
  constructor(
    private readonly root: HTMLElement,
    private readonly state: ThresholdState,
    private readonly timers$: ThresholdTimers,
  ) {
    const el = root.querySelector<HTMLElement>('[data-threshold]');
    if (!el) throw new Error('[drift] Missing [data-threshold] in the world layer');
    const enter = el.querySelector<HTMLButtonElement>('[data-threshold-enter]');
    if (!enter) throw new Error('[drift] Missing [data-threshold-enter] in the threshold');
    this.el = el;
    this.enterButton = enter;
    this.enterButton.addEventListener('click', this.onEnter);
  }

  /** The threshold is up and the world holds still. */
  get holding(): boolean {
    return !this.closed && this.state.phase === 'shown';
  }

  /** The threshold is on screen (shown or fading out). */
  get visible(): boolean {
    return !this.closed && (this.state.phase === 'shown' || this.state.phase === 'leaving');
  }

  /** Shows the threshold (full: Enter focused, world inert; short: fades by itself unless a click is needed). */
  show(): void {
    this.state.show();
    this.el.hidden = false;
    this.el.dataset.kind = this.state.kind;
    this.sync();
    this.applyClickNeed();
    if (this.state.needsClick) this.enterButton.focus();
  }

  /**
   * The visitor muted or unmuted the sound: a short threshold that is up
   * then waits for Enter again (sound on) or fades by itself (muted).
   *
   * @param on - Sound is on (not muted).
   */
  soundChanged(on: boolean): void {
    if (this.closed || !this.state.setSoundOn(on) || this.state.phase !== 'shown') return;
    this.applyClickNeed();
  }

  /** Shows Enter (world inert) when a click is needed, otherwise schedules the automatic entry. */
  private applyClickNeed(): void {
    const needsClick = this.state.needsClick;
    this.enterButton.hidden = !needsClick;
    this.setInert(needsClick);
    if (this.autoTimer !== null) this.timers$.clearTimeout(this.autoTimer);
    this.autoTimer = null;
    const auto = this.state.autoEnterSeconds;
    if (auto !== null) this.autoTimer = this.later(auto, () => this.enter(false));
  }

  /**
   * Enters at once without showing the threshold ("Drift" on the awake page
   * is itself the gesture; the exhibition mode enters without one).
   *
   * @param gesture - Whether a user gesture caused it (default `true`).
   */
  skip(gesture = true): void {
    this.state.skip(gesture);
    this.close();
  }

  /** Hides the threshold without entering ("Wake up" pressed on it). */
  dismiss(): void {
    this.close();
  }

  /**
   * Enters from the shown threshold.
   *
   * @param gesture - Click / key press (`true`) or automatic entry.
   */
  private enter(gesture: boolean): void {
    if (!this.state.enter(gesture)) return;
    this.sync();
    this.setInert(false);
    if (gesture) this.root.focus();
    this.later(this.state.leaveSeconds, () => {
      this.state.finish();
      this.close();
    });
  }

  /** Hides the overlay for good: timers cancelled, Enter detached, world parts restored. */
  private close(): void {
    this.closed = true;
    for (const id of this.timers.splice(0)) this.timers$.clearTimeout(id);
    this.enterButton.removeEventListener('click', this.onEnter);
    this.setInert(false);
    this.el.hidden = true;
    this.sync();
  }

  /** Mirrors the phase into `data-phase` (CSS fades). */
  private sync(): void {
    this.el.dataset.phase = this.state.phase;
  }

  /**
   * Schedules a callback.
   *
   * @param seconds - Delay.
   * @param callback - Work to run.
   * @returns The timer id.
   */
  private later(seconds: number, callback: () => void): number {
    const id = this.timers$.setTimeout(callback, seconds * 1000);
    this.timers.push(id);
    return id;
  }

  /**
   * Makes the world layer's other parts inert (or restores them), leaving
   * "Wake up" and the threshold itself alone.
   *
   * @param on - `true` to make inert.
   */
  private setInert(on: boolean): void {
    for (const child of this.root.children) {
      if (child === this.el || child.classList.contains('drift-top')) continue;
      if (on && !child.hasAttribute('inert')) {
        child.setAttribute('inert', '');
        child.setAttribute(MARK, '');
      } else if (!on && child.hasAttribute(MARK)) {
        child.removeAttribute('inert');
        child.removeAttribute(MARK);
      }
    }
  }
}
