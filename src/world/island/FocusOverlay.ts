import type { ManifestWork } from '../core/WorldManifest.js';

/** Configuration options for {@link FocusOverlay}. */
export interface FocusOverlayOptions {
  /** Exhibition mode (`?kiosk=1`): shows the work's QR code instead of links. */
  readonly kiosk?: boolean;
  /**
   * Resolves the previous (`-1`) or next (`1`) work from `currentSlug` along
   * the exhibition path, gliding the world camera and syncing `?w=` when
   * outside kiosk mode. Returning a `ManifestWork` updates the dialog in place.
   */
  readonly onStep?: (currentSlug: string, direction: -1 | 1) => ManifestWork | null;
}

/**
 * The focus overlay of the world (FR7, Track 16 FR3): clicking or tapping an
 * apparition, pressing `Enter` in the keyboard work list, or activating
 * `[data-drift-current]` opens a modal `<dialog>` displaying the work's
 * territory/zone sequence header (`[data-focus-context]`), title, curatorial
 * metadata and non-commercial availability (`[data-focus-meta]`), poetic
 * fragment, specimen tag (in the Leak), unaltered photograph ("the photo is
 * sacred"), in-dialog `Previous / Next` stepping buttons (`[data-focus-prev]`,
 * `[data-focus-next]`, plus `ArrowLeft` / `ArrowRight` keyboard support), and
 * links to its awake page and contact page. In exhibition mode (`?kiosk=1`),
 * a build-time SVG QR code replaces both links and zero `a[href]` attributes
 * are set.
 *
 * `showModal()` provides the native focus trap, `Esc`, and focus return;
 * `closedby="any"` adds declarative light dismiss, paired with a backdrop-click
 * fallback where `closedBy` is unsupported (Safari).
 */
export class FocusOverlay {
  private readonly context: HTMLElement;
  private readonly title: HTMLElement;
  private readonly meta: HTMLElement;
  private readonly fragment: HTMLElement;
  private readonly image: HTMLImageElement;
  private readonly prevButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly workLink: HTMLAnchorElement;
  private readonly workRow: HTMLElement;
  private readonly contactLink: HTMLAnchorElement;
  private readonly contactRow: HTMLElement;
  private readonly specimen: HTMLElement;
  private readonly qrRow: HTMLElement;
  private readonly qr: HTMLImageElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly kiosk: boolean;
  private readonly onStep?: (currentSlug: string, direction: -1 | 1) => ManifestWork | null;
  private currentSlug: string | null = null;

  private readonly onCloseClick = (): void => this.dialog.close();
  private readonly onPrevClick = (): void => this.step(-1);
  private readonly onNextClick = (): void => this.step(1);
  private readonly onClosed = (): void => {
    this.currentSlug = null;
    this.onClose();
  };
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.step(1);
    }
  };
  private readonly onBackdropClick = (event: MouseEvent): void => {
    if ('closedBy' in this.dialog || event.target !== this.dialog) return;
    const r = this.dialog.getBoundingClientRect();
    const inside = r.top <= event.clientY && event.clientY <= r.top + r.height && r.left <= event.clientX && event.clientX <= r.left + r.width;
    if (!inside) this.dialog.close();
  };

  /**
   * @param dialog - The page's `[data-drift-focus]` dialog.
   * @param onClose - Called after the dialog closes (any way).
   * @param options - Kiosk flag and optional in-place work stepping callback.
   * @throws Error when any required part of the dialog is missing.
   */
  constructor(
    private readonly dialog: HTMLDialogElement,
    private readonly onClose: () => void = () => undefined,
    options: FocusOverlayOptions = {},
  ) {
    this.kiosk = options.kiosk ?? false;
    this.onStep = options.onStep;
    this.context = this.part('[data-focus-context]');
    this.title = this.part('[data-focus-title]');
    this.meta = this.part('[data-focus-meta]');
    this.fragment = this.part('[data-focus-fragment]');
    this.image = this.part('[data-focus-image]');
    this.prevButton = this.part('[data-focus-prev]');
    this.nextButton = this.part('[data-focus-next]');
    this.workLink = this.part('[data-focus-work]');
    this.workRow = this.part('[data-focus-work-row]');
    this.contactLink = this.part('[data-focus-contact]');
    this.contactRow = this.part('[data-focus-contact-row]');
    this.specimen = this.part('[data-focus-specimen]');
    this.qrRow = this.part('[data-focus-qr-row]');
    this.qr = this.part('[data-focus-qr]');
    this.closeButton = this.part('[data-focus-close]');
    this.closeButton.addEventListener('click', this.onCloseClick);
    this.prevButton.addEventListener('click', this.onPrevClick);
    this.nextButton.addEventListener('click', this.onNextClick);
    dialog.addEventListener('keydown', this.onKeyDown);
    dialog.addEventListener('close', this.onClosed);
    dialog.addEventListener('click', this.onBackdropClick);
  }

  /** Whether the overlay is open. */
  get isOpen(): boolean {
    return this.dialog.open;
  }

  /**
   * Shows a work (opening the modal if closed, or updating in place if already open).
   *
   * @param work - The work (manifest entry).
   */
  open(work: ManifestWork): void {
    this.render(work);
    if (!this.dialog.open) this.dialog.showModal();
  }

  /** Closes the dialog if it is open (the exhibition mode's reset). */
  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  /** Closes the overlay and stops listening. */
  detach(): void {
    this.closeButton.removeEventListener('click', this.onCloseClick);
    this.prevButton.removeEventListener('click', this.onPrevClick);
    this.nextButton.removeEventListener('click', this.onNextClick);
    this.dialog.removeEventListener('keydown', this.onKeyDown);
    this.dialog.removeEventListener('close', this.onClosed);
    this.dialog.removeEventListener('click', this.onBackdropClick);
    if (this.dialog.open) this.dialog.close();
  }

  /**
   * Steps to the previous or next work in place while open.
   *
   * @param direction - `-1` for previous, `1` for next.
   */
  private step(direction: -1 | 1): void {
    if (!this.dialog.open || !this.currentSlug || !this.onStep) return;
    const nextWork = this.onStep(this.currentSlug, direction);
    if (nextWork) this.render(nextWork);
  }

  /**
   * Populates the dialog's DOM elements for `work`.
   *
   * @param work - Manifest work entry to display.
   */
  private render(work: ManifestWork): void {
    this.currentSlug = work.slug;
    this.context.textContent = `${work.contextLabel} · ${work.positionIndex} / ${work.positionTotal}`;
    this.title.textContent = work.title;
    this.meta.textContent = `${work.metaLine} · ${work.availabilityLabel}`;
    this.fragment.textContent = work.fragment ?? '';
    this.fragment.hidden = work.fragment === null;
    this.image.src = work.images.mid.url;
    this.image.alt = work.title;
    this.image.width = work.images.mid.width;
    this.image.height = work.images.mid.height;
    this.specimen.textContent = work.specimen ?? '';
    this.specimen.hidden = work.specimen === null;
    this.workRow.hidden = this.kiosk;
    this.contactRow.hidden = this.kiosk || work.contactHref === null;
    if (this.kiosk) {
      this.workLink.removeAttribute('href');
      this.contactLink.removeAttribute('href');
      this.qr.src = work.qr;
    } else {
      this.workLink.href = work.href;
      if (work.contactHref !== null) {
        this.contactLink.href = work.contactHref;
      } else {
        this.contactLink.removeAttribute('href');
      }
    }
    this.qrRow.hidden = !this.kiosk;
  }

  /**
   * A required element inside the dialog.
   *
   * @param selector - CSS selector.
   * @returns The element.
   * @throws Error when missing.
   */
  private part<T extends HTMLElement>(selector: string): T {
    const el = this.dialog.querySelector<T>(selector);
    if (!el) throw new Error(`[drift] Missing ${selector} in the focus dialog`);
    return el;
  }
}
