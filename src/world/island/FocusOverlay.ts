import type { ManifestWork } from '../core/WorldManifest.js';

/**
 * The focus overlay of the world (FR7): clicking or tapping an apparition,
 * or activating it from the keyboard list, opens a modal `<dialog>` with the
 * work's title, fragment, the unaltered image ("the photo is sacred") and
 * links to its awake page and to the contact page.
 *
 * `showModal()` gives the focus trap, `Esc` and focus return; `closedby="any"`
 * adds light dismiss, with a backdrop-click fallback where it is not
 * supported (Safari).
 */
export class FocusOverlay {
  private readonly title: HTMLElement;
  private readonly fragment: HTMLElement;
  private readonly image: HTMLImageElement;
  private readonly workLink: HTMLAnchorElement;
  private readonly contactLink: HTMLAnchorElement;
  private readonly contactRow: HTMLElement;
  private readonly closeButton: HTMLButtonElement;

  private readonly onCloseClick = (): void => this.dialog.close();
  private readonly onClosed = (): void => this.onClose();
  private readonly onBackdropClick = (event: MouseEvent): void => {
    if ('closedBy' in this.dialog || event.target !== this.dialog) return;
    const r = this.dialog.getBoundingClientRect();
    const inside = r.top <= event.clientY && event.clientY <= r.top + r.height && r.left <= event.clientX && event.clientX <= r.left + r.width;
    if (!inside) this.dialog.close();
  };

  /**
   * @param dialog - The page's `[data-drift-focus]` dialog.
   * @param onClose - Called after the dialog closed (any way).
   * @throws Error when a part of the dialog is missing.
   */
  constructor(
    private readonly dialog: HTMLDialogElement,
    private readonly onClose: () => void = () => undefined,
  ) {
    this.title = this.part('[data-focus-title]');
    this.fragment = this.part('[data-focus-fragment]');
    this.image = this.part('[data-focus-image]');
    this.workLink = this.part('[data-focus-work]');
    this.contactLink = this.part('[data-focus-contact]');
    this.contactRow = this.part('[data-focus-contact-row]');
    this.closeButton = this.part('[data-focus-close]');
    this.closeButton.addEventListener('click', this.onCloseClick);
    dialog.addEventListener('close', this.onClosed);
    dialog.addEventListener('click', this.onBackdropClick);
  }

  /** Whether the overlay is open. */
  get isOpen(): boolean {
    return this.dialog.open;
  }

  /**
   * Shows a work.
   *
   * @param work - The work (manifest entry).
   */
  open(work: ManifestWork): void {
    this.title.textContent = work.title;
    this.fragment.textContent = work.fragment ?? '';
    this.fragment.hidden = work.fragment === null;
    this.image.src = work.images.mid.url;
    this.image.alt = work.title;
    this.image.width = work.images.mid.width;
    this.image.height = work.images.mid.height;
    this.workLink.href = work.href;
    this.contactLink.href = work.contactHref ?? '';
    this.contactRow.hidden = work.contactHref === null;
    this.dialog.showModal();
  }

  /** Closes the overlay and stops listening. */
  detach(): void {
    this.closeButton.removeEventListener('click', this.onCloseClick);
    this.dialog.removeEventListener('close', this.onClosed);
    this.dialog.removeEventListener('click', this.onBackdropClick);
    if (this.dialog.open) this.dialog.close();
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
