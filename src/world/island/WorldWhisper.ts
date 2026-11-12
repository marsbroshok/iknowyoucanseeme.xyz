/** A fragment to show this frame. */
export interface WhisperFragment {
  text: string;
  /** Opacity in [0, 1]. */
  opacity: number;
  /** Screen position of its work (normalised device coordinates, −1…1, y up), or `null` when off screen. */
  at: { x: number; y: number } | null;
}

/** Keeps fragments away from the screen edges (percent of the layer). */
const EDGE = 15;

/**
 * The world's text (FR2–FR4): the gaze line in the fog, the fragment near
 * its work, and a polite live region that mirrors each one when it starts
 * surfacing, so screen-reader visitors hear what others read. The visible
 * texts are `aria-hidden` (the live region is the accessible copy); the
 * fade itself comes from GazeDirector / FragmentSurfacer opacities.
 */
export class WorldWhisper {
  private readonly gazeEl: HTMLElement;
  private readonly fragmentEl: HTMLElement;
  private readonly saidEl: HTMLElement;

  /**
   * @param root - The world layer (`[data-drift]`).
   * @throws Error when a text element is missing.
   */
  constructor(root: HTMLElement) {
    const part = (selector: string): HTMLElement => {
      const el = root.querySelector<HTMLElement>(selector);
      if (!el) throw new Error(`[drift] Missing ${selector} in the world layer`);
      return el;
    };
    this.gazeEl = part('[data-drift-gaze]');
    this.fragmentEl = part('[data-drift-fragment]');
    this.saidEl = part('[data-drift-said]');
    this.gazeEl.style.opacity = '0';
    this.fragmentEl.style.opacity = '0';
  }

  /**
   * Shows the gaze line.
   *
   * @param opacity - Opacity in [0, 1].
   * @param started - The line starts surfacing this frame (announce it).
   */
  gaze(opacity: number, started: boolean): void {
    this.gazeEl.style.opacity = String(opacity);
    if (started) this.say(String(this.gazeEl.textContent));
  }

  /**
   * Shows, moves or clears the fragment.
   *
   * @param fragment - Fragment to show, or `null` for none.
   * @param started - It starts surfacing this frame (announce it).
   */
  fragment(fragment: WhisperFragment | null, started: boolean): void {
    const el = this.fragmentEl;
    if (!fragment) {
      el.textContent = '';
      el.style.opacity = '0';
      return;
    }
    el.textContent = fragment.text;
    el.style.opacity = String(fragment.opacity);
    if (fragment.at) {
      el.style.setProperty('--x', `${WorldWhisper.percent(fragment.at.x)}%`);
      el.style.setProperty('--y', `${WorldWhisper.percent(-fragment.at.y)}%`);
    }
    if (started) this.say(fragment.text);
  }

  /**
   * Mirrors a text into the polite live region.
   *
   * @param text - What surfaced.
   */
  private say(text: string): void {
    this.saidEl.textContent = text;
  }

  /**
   * A device coordinate as a percentage of the layer, kept off the edges.
   *
   * @param ndc - −1…1 (left/top to right/bottom after the y flip).
   * @returns Percent in [EDGE, 100 − EDGE].
   */
  private static percent(ndc: number): number {
    return Math.min(Math.max(((ndc + 1) / 2) * 100, EDGE), 100 - EDGE);
  }
}
