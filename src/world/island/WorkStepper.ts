/** Summary of a work displayed in the bottom Guided Work Stepper (`[data-drift-current]`). */
export interface SteppedWork {
  /** Work slug. */
  readonly slug: string;
  /** Localized display title. */
  readonly title: string;
  /** 1-based position along the exhibition path (`1..positionTotal`). */
  readonly positionIndex: number;
  /** Total works along the exhibition path. */
  readonly positionTotal: number;
}

/** Callbacks invoked by {@link WorkStepper}. */
export interface WorkStepperHandlers {
  /**
   * Glides the camera to the previous (`-1`) or next (`1`) work along the path
   * from `currentSlug`, returning the newly targeted work (or `null` when empty).
   */
  onStep(currentSlug: string | null, direction: -1 | 1): SteppedWork | null;
  /** Opens `FocusOverlay` for `slug`. */
  onOpen(slug: string): void;
}

/**
 * Guided Work Stepper in the bottom Drift wayfinding dock (FR2):
 * - `[data-drift-prev]` glides smoothly to the previous work along the path.
 * - `[data-drift-current]` displays `<Title> · i / N` and opens `FocusOverlay`
 *   in 1 tap/click without 3D raycast hunting.
 * - `[data-drift-next]` glides smoothly to the next work along the path.
 *
 * Preserves any active stepper-initiated glide target across in-flight frames so
 * rapid multi-click stepping advances cleanly without snapping back to the
 * departing work's nearest-neighbour reading.
 */
export class WorkStepper {
  private readonly prevButton: HTMLButtonElement;
  private readonly currentButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly titleSpan: HTMLSpanElement;
  private readonly posSpan: HTMLSpanElement;
  private initialized = false;
  private displayedSlug: string | null = null;
  private targetWork: SteppedWork | null = null;

  private readonly onPrevClick = (): void => this.step(-1);
  private readonly onNextClick = (): void => this.step(1);
  private readonly onCurrentClick = (): void => {
    if (this.displayedSlug !== null) {
      this.handlers.onOpen(this.displayedSlug);
    }
  };

  /**
   * @param root - Container holding `[data-drift-prev]`, `[data-drift-current]`, and `[data-drift-next]`.
   * @param handlers - World glide and inspect callbacks.
   * @throws Error when any stepper button is missing.
   */
  constructor(
    private readonly root: HTMLElement,
    private readonly handlers: WorkStepperHandlers,
  ) {
    this.prevButton = this.part('[data-drift-prev]');
    this.currentButton = this.part('[data-drift-current]');
    this.nextButton = this.part('[data-drift-next]');

    const doc = root.ownerDocument;
    this.titleSpan = doc.createElement('span');
    this.titleSpan.className = 'drift-stepper-title';
    this.posSpan = doc.createElement('span');
    this.posSpan.className = 'drift-stepper-pos';

    this.prevButton.addEventListener('click', this.onPrevClick);
    this.currentButton.addEventListener('click', this.onCurrentClick);
    this.nextButton.addEventListener('click', this.onNextClick);
  }

  /**
   * Updates the stepper with the world's currently faced or nearest work.
   *
   * @param activeWork - Faced or nearest work this frame, or `null` when empty.
   * @param gliding - Whether `DriftSession` currently has an active camera glide target.
   */
  update(activeWork: SteppedWork | null, gliding = false): void {
    if (this.targetWork !== null && (!gliding || activeWork?.slug === this.targetWork.slug)) {
      this.targetWork = null;
    }
    this.render(this.targetWork ?? activeWork);
  }

  /** Clears any in-flight stepper glide target (e.g. on exhibition idle reset). */
  clearTarget(): void {
    this.targetWork = null;
  }

  /** Removes click listeners from all three stepper buttons. */
  detach(): void {
    this.prevButton.removeEventListener('click', this.onPrevClick);
    this.currentButton.removeEventListener('click', this.onCurrentClick);
    this.nextButton.removeEventListener('click', this.onNextClick);
  }

  private step(direction: -1 | 1): void {
    const next = this.handlers.onStep(this.displayedSlug, direction);
    if (!next) return;
    this.targetWork = next;
    this.render(next);
  }

  private render(work: SteppedWork | null): void {
    const nextSlug = work?.slug ?? null;
    if (this.initialized && nextSlug === this.displayedSlug) return;
    this.initialized = true;
    this.displayedSlug = nextSlug;

    const disabled = work === null;
    this.prevButton.disabled = disabled;
    this.currentButton.disabled = disabled;
    this.nextButton.disabled = disabled;

    if (work === null) {
      delete this.currentButton.dataset.slug;
      this.currentButton.replaceChildren();
      return;
    }

    this.currentButton.dataset.slug = work.slug;
    this.titleSpan.textContent = work.title;
    this.posSpan.textContent = ` · ${work.positionIndex} / ${work.positionTotal}`;
    this.currentButton.replaceChildren(this.titleSpan, this.posSpan);
  }

  private part<T extends HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`[drift] Missing ${selector} in the work stepper`);
    return el;
  }
}
