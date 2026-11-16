/** Thresholds governing automatic dismissal of the transient Drift onboarding hint (FR1). */
export const DRIFT_HELP = {
  /** Camera displacement in world metres from the initial active pose that dismisses onboarding. */
  dismissDistanceMeters: 2.5,
  /** Active drifting time in seconds after which the onboarding hint auto-dismisses. */
  dismissAfterSeconds: 6,
} as const;

/** Per-frame camera and hold state consumed by {@link DriftHelp}. */
export interface DriftHelpFrame {
  /** Camera x position in world metres. */
  readonly x: number;
  /** Camera z position in world metres. */
  readonly z: number;
  /** Whether the visitor is actively in the Drift (not held by Threshold or FocusOverlay). */
  readonly active: boolean;
}

/**
 * Pointer-aware transient onboarding hint (`[data-drift-onboarding]`) and
 * toggleable controls sheet (`[data-drift-help-toggle]` + `[data-drift-help-panel]`)
 * for the Drift world (FR1).
 *
 * Replaces permanent multi-paragraph top-left help clutter so `.drift-top`
 * never collides with help copy on mobile or tablet viewports while full
 * bilingual controls remain 1 tap or `Escape` away in the bottom dock.
 */
export class DriftHelp {
  private readonly onboarding: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private origin: { readonly x: number; readonly z: number } | null = null;
  private elapsedSeconds = 0;
  private onboardingDismissed = false;
  private open = false;

  private readonly onToggleClick = (): void => {
    if (this.open) {
      this.close();
    } else {
      this.dismissOnboarding();
      this.open = true;
      this.panel.hidden = false;
      this.toggle.setAttribute('aria-expanded', 'true');
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.open || event.key !== 'Escape') return;
    if ((event.target as Element).closest('dialog')) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
    this.toggle.focus();
  };

  /**
   * @param root - The `[data-drift]` world layer element.
   * @param coarsePointer - Whether `matchMedia('(pointer: coarse)')` is active.
   * @throws Error when onboarding copy attributes or help DOM parts are missing.
   */
  constructor(
    private readonly root: HTMLElement,
    coarsePointer: boolean,
  ) {
    this.onboarding = this.part('[data-drift-onboarding]');
    this.toggle = this.part('[data-drift-help-toggle]');
    this.panel = this.part('[data-drift-help-panel]');

    const hintFine = this.onboarding.dataset.hintFine;
    if (!hintFine) throw new Error('[drift] Missing data-hint-fine on [data-drift-onboarding]');
    const hintCoarse = this.onboarding.dataset.hintCoarse;
    if (!hintCoarse) throw new Error('[drift] Missing data-hint-coarse on [data-drift-onboarding]');

    this.onboarding.textContent = coarsePointer ? hintCoarse : hintFine;
    this.onboarding.dataset.pointer = coarsePointer ? 'coarse' : 'fine';
    this.toggle.setAttribute('aria-expanded', 'false');
    this.panel.hidden = true;

    this.toggle.addEventListener('click', this.onToggleClick);
    this.root.addEventListener('keydown', this.onKeyDown);
  }

  /** Whether the full controls sheet (`[data-drift-help-panel]`) is expanded. */
  get isOpen(): boolean {
    return this.open;
  }

  /** Whether the transient onboarding hint (`[data-drift-onboarding]`) has dismissed. */
  get isOnboardingDismissed(): boolean {
    return this.onboardingDismissed;
  }

  /**
   * Advances onboarding dismissal tracking by one frame.
   *
   * @param state - Camera position and active-drifting flag.
   * @param dt - Frame delta time in seconds.
   */
  frame(state: DriftHelpFrame, dt: number): void {
    if (this.onboardingDismissed || !state.active) return;
    if (this.origin === null) {
      this.origin = { x: state.x, z: state.z };
    }
    this.elapsedSeconds += Math.max(0, dt);
    const distance = Math.hypot(state.x - this.origin.x, state.z - this.origin.z);
    if (
      distance >= DRIFT_HELP.dismissDistanceMeters ||
      this.elapsedSeconds >= DRIFT_HELP.dismissAfterSeconds
    ) {
      this.dismissOnboarding();
    }
  }

  /** Closes the controls sheet if currently open. */
  close(): void {
    if (!this.open) return;
    this.open = false;
    this.panel.hidden = true;
    this.toggle.setAttribute('aria-expanded', 'false');
  }

  /** Closes the controls sheet and removes DOM listeners. */
  detach(): void {
    this.close();
    this.toggle.removeEventListener('click', this.onToggleClick);
    this.root.removeEventListener('keydown', this.onKeyDown);
  }

  private dismissOnboarding(): void {
    if (this.onboardingDismissed) return;
    this.onboardingDismissed = true;
    this.onboarding.hidden = true;
    this.onboarding.dataset.dismissed = 'true';
  }

  private part<T extends HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`[drift] Missing ${selector} in the world layer`);
    return el;
  }
}
