import { LENS_MODES, type LensMode } from '../core/LensMode.js';

/** Callbacks invoked by {@link LensToggle}. */
export interface LensToggleHandlers {
  /**
   * Activates or cycles the camera lens on the faced work, returning the
   * resulting {@link LensMode} (or `null` when no work can be aimed at).
   */
  onCycle(): LensMode | null;
}

/**
 * Tactile 1-tap/click camera Lens Cycle Pill (`[data-lens-cycle]`) in the
 * bottom Drift wayfinding dock (FR2).
 *
 * Displays a concise localized prompt before first aim/hover and updates to
 * the localized active camera technique (`Lens · Mirror fold` / `Loupe · Pli de miroir`),
 * letting mouse-only and smartphone visitors discover and cycle every optical
 * shader without memorised keyboard shortcuts or 500 ms touch holds.
 */
export class LensToggle {
  private readonly names: Readonly<Record<LensMode, string>>;
  private readonly prompt: string;
  private readonly template: string;
  private initialized = false;
  private current: LensMode | null = null;

  private readonly onClick = (): void => {
    const next = this.handlers.onCycle();
    if (next !== null) this.setMode(next);
  };

  /**
   * @param button - The `[data-lens-cycle]` `<button type="button">` element.
   * @param handlers - Lens cycle callback.
   * @throws Error when `data-lens-names`, `data-lens-prompt`, or `data-lens-template` is invalid.
   */
  constructor(
    private readonly button: HTMLButtonElement,
    private readonly handlers: LensToggleHandlers,
  ) {
    const parsed = JSON.parse(button.dataset.lensNames ?? '{}') as Record<string, unknown>;
    for (const mode of LENS_MODES) {
      if (typeof parsed[mode] !== 'string' || parsed[mode] === '') {
        throw new Error(`[drift] The lens "${mode}" has no name in data-lens-names`);
      }
    }
    const prompt = button.dataset.lensPrompt;
    if (!prompt) throw new Error('[drift] Missing data-lens-prompt on [data-lens-cycle]');
    const template = button.dataset.lensTemplate;
    if (!template || !template.includes('{mode}')) {
      throw new Error('[drift] Missing {mode} template in data-lens-template on [data-lens-cycle]');
    }

    this.names = parsed as Record<LensMode, string>;
    this.prompt = prompt;
    this.template = template;
    this.setMode(null);
    this.button.addEventListener('click', this.onClick);
  }

  /** Currently displayed lens mode, or `null` when idle. */
  get currentMode(): LensMode | null {
    return this.current;
  }

  /**
   * Updates the pill label and state attributes when the active lens changes.
   *
   * @param mode - Active lens mode, or `null` when the lens leaves all works.
   */
  setMode(mode: LensMode | null): void {
    if (this.initialized && mode === this.current) return;
    this.initialized = true;
    this.current = mode;
    if (mode === null) {
      this.button.textContent = this.prompt;
      this.button.dataset.lensActive = 'false';
      delete this.button.dataset.lensMode;
      return;
    }
    this.button.textContent = this.template.replace('{mode}', this.names[mode]);
    this.button.dataset.lensActive = 'true';
    this.button.dataset.lensMode = mode;
  }

  /** Stops listening for clicks on the pill button. */
  detach(): void {
    this.button.removeEventListener('click', this.onClick);
  }
}
