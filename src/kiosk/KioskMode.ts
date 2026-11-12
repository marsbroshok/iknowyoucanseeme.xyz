import { KioskState } from './KioskState.js';

/** How often the kiosk looks at its idle machine (ms). */
export const KIOSK_TICK_MS = 500;

/** What the exhibition mode asks of the drift. */
export interface KioskHooks {
  /** Drift to the next work along the zone path. */
  advance(): void;
  /** Back to the start (Dreamland · Arrival), dialog closed, world shown. */
  reset(): void;
  /** The first tap or key press: the gesture that may start the sound. */
  gesture(): void;
}

/** Interval timer (the window, or fake timers in tests). */
export interface KioskTimers {
  setInterval(callback: () => void, ms: number): number;
  clearInterval(id: number): void;
}

/** Events that count as someone using the screen. */
const INPUTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
/** Inputs that are user gestures (they may unlock audio). */
const GESTURES = new Set<string>(['pointerdown', 'keydown', 'touchstart']);

/**
 * The exhibition screen (FR5), wired to the page: every link is taken out
 * (no external links, and nothing leads away from the screen; the focus
 * dialog shows QR codes instead), input of any kind is heard, the first tap
 * or key press is handed on as the gesture that may start the sound, the
 * cursor hides after 5 s (`html.kiosk-idle`), and {@link KioskState}
 * decides when to drift on and when to reset after 90 s without input.
 */
export class KioskMode {
  private readonly state: KioskState;
  private readonly timer: number;
  private gestured = false;
  private readonly onInput = (event: Event): void => {
    this.state.input(this.now());
    if (!this.gestured && GESTURES.has(event.type)) {
      this.gestured = true;
      this.hooks.gesture();
    }
  };

  /**
   * @param doc - The document.
   * @param timers - Interval timer (the window).
   * @param now - Clock (ms).
   * @param hooks - What to do on the drift.
   */
  constructor(
    private readonly doc: Document,
    private readonly timers: KioskTimers,
    private readonly now: () => number,
    private readonly hooks: KioskHooks,
  ) {
    this.state = new KioskState(now());
    doc.documentElement.classList.add('kiosk');
    for (const a of doc.querySelectorAll('a[href]')) a.removeAttribute('href');
    for (const type of INPUTS) doc.addEventListener(type, this.onInput, { capture: true, passive: true });
    this.timer = timers.setInterval(() => this.tick(), KIOSK_TICK_MS);
  }

  /** Stops listening and timing; the cursor comes back. */
  detach(): void {
    this.timers.clearInterval(this.timer);
    for (const type of INPUTS) this.doc.removeEventListener(type, this.onInput, { capture: true });
    this.doc.documentElement.classList.remove('kiosk', 'kiosk-idle');
  }

  /** Applies the idle machine's decisions. */
  private tick(): void {
    const t = this.state.tick(this.now());
    this.doc.documentElement.classList.toggle('kiosk-idle', t.cursorHidden);
    if (t.reset) this.hooks.reset();
    if (t.advance) this.hooks.advance();
  }
}
