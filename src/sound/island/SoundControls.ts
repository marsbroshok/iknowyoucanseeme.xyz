import type { SoundDirector } from '../core/SoundDirector.js';

/**
 * The always-visible mute toggle of the world layer (spec FR5) and the
 * tab's visibility, wired to the {@link SoundDirector}. The button
 * (`[data-sound-toggle]`) carries its two labels in `data-label-mute` and
 * `data-label-unmute` (page language, `ui.yaml`); its text says what a
 * press does.
 */
export class SoundControls {
  private readonly labels: { mute: string; unmute: string };
  private readonly onClick = () => {
    this.director.setMuted(!this.director.muted);
    this.sync();
    this.onToggle(this.director.muted);
  };
  private readonly onVisibility = () => this.director.setHidden(this.doc.visibilityState === 'hidden');

  /**
   * @param button - The toggle.
   * @param director - The sound's decisions.
   * @param doc - The document (visibility).
   * @param onToggle - Called after each press with the new mute state (e.g. the threshold re-evaluates its click).
   * @throws Error when the button lacks its labels (a page bug).
   */
  constructor(
    private readonly button: HTMLButtonElement,
    private readonly director: SoundDirector,
    private readonly doc: Document,
    private readonly onToggle: (muted: boolean) => void = () => undefined,
  ) {
    const { labelMute, labelUnmute } = button.dataset;
    if (!labelMute || !labelUnmute) throw new Error('[sound] [data-sound-toggle] needs data-label-mute and data-label-unmute');
    this.labels = { mute: labelMute, unmute: labelUnmute };
    button.addEventListener('click', this.onClick);
    doc.addEventListener('visibilitychange', this.onVisibility);
    this.onVisibility();
    this.sync();
  }

  /** Removes the listeners. */
  detach(): void {
    this.button.removeEventListener('click', this.onClick);
    this.doc.removeEventListener('visibilitychange', this.onVisibility);
  }

  /** Shows the label of what a press does, and the state for styling. */
  private sync(): void {
    const muted = this.director.muted;
    this.button.textContent = muted ? this.labels.unmute : this.labels.mute;
    this.button.dataset.muted = String(muted);
  }
}
