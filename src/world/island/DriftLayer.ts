/** Marks elements this layer made inert (so `hide()` leaves others' inert alone). */
const MARK = 'data-drift-inert';

/**
 * Shows and hides the world layer over the awake home page. The awake DOM
 * is never removed: while the world is shown it stays in the document
 * (indexable, the accessible layer) but is made `inert`, so keyboard and
 * screen-reader users stay in the world until they choose "Wake up".
 */
export class DriftLayer {
  /**
   * @param root - The world layer (`[data-drift]`), a direct child of `<body>`.
   */
  constructor(private readonly root: HTMLElement) {}

  /** Whether the world is shown. */
  get visible(): boolean {
    return !this.root.hidden;
  }

  /** Shows the world and moves focus into it. */
  show(): void {
    const doc = this.root.ownerDocument;
    this.root.hidden = false;
    for (const sibling of this.siblings()) {
      if (sibling.hasAttribute('inert')) continue;
      sibling.setAttribute('inert', '');
      sibling.setAttribute(MARK, '');
    }
    doc.documentElement.classList.add('drift-active');
    this.root.focus();
  }

  /** Hides the world; the awake page is reachable again. */
  hide(): void {
    this.root.hidden = true;
    for (const sibling of this.siblings()) {
      if (!sibling.hasAttribute(MARK)) continue;
      sibling.removeAttribute('inert');
      sibling.removeAttribute(MARK);
    }
    this.root.ownerDocument.documentElement.classList.remove('drift-active');
  }

  /**
   * Visible content next to the layer (scripts excluded).
   *
   * @returns Sibling elements.
   */
  private siblings(): Element[] {
    return [...(this.root.parentElement as HTMLElement).children].filter((el) => el !== this.root && el.tagName !== 'SCRIPT');
  }
}
