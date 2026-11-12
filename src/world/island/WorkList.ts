/** A work as listed for keyboard and screen-reader users. */
export interface ListedWork {
  slug: string;
  title: string;
}

/** What the list asks of the world. */
export interface WorkListHandlers {
  /** A work received focus: glide to it. */
  onFocus(slug: string): void;
  /** A work was activated (click, Enter, Space): open it. */
  onOpen(slug: string): void;
  /** Next work along the path from `current` (see `DriftSession.cycle`). */
  next(current: string | null, direction: 1 | -1): string | null;
  /** Whether `slug` is the last stop in `direction`. */
  isLast(slug: string, direction: 1 | -1): boolean;
}

/**
 * The works of the field as real buttons: the keyboard path through the
 * world (arrow keys drift; Tab goes to the nearest work, then along the
 * path; Enter opens). Only one button is a tab stop (the nearest work), so
 * Tab enters the list there; at either end of the path Tab leaves the list
 * as usual, so focus is never trapped.
 */
export class WorkList {
  private readonly buttons = new Map<string, HTMLButtonElement>();

  private readonly onFocusIn = (event: FocusEvent): void => {
    const slug = (event.target as HTMLElement).dataset.slug as string;
    this.setEntry(slug);
    this.handlers.onFocus(slug);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const slug = (event.target as HTMLElement).dataset.slug;
    if (event.key !== 'Tab' || !slug) return;
    const direction = event.shiftKey ? -1 : 1;
    if (this.handlers.isLast(slug, direction)) return;
    event.preventDefault();
    this.focus(this.handlers.next(slug, direction) as string);
  };

  private readonly onClick = (event: MouseEvent): void => {
    this.handlers.onOpen((event.currentTarget as HTMLElement).dataset.slug as string);
  };

  /**
   * @param list - Empty `<ul>` rendered by the page.
   * @param works - Works in path order.
   * @param handlers - World callbacks.
   */
  constructor(
    private readonly list: HTMLUListElement,
    works: readonly ListedWork[],
    private readonly handlers: WorkListHandlers,
  ) {
    const doc = list.ownerDocument;
    for (const work of works) {
      const item = doc.createElement('li');
      const button = doc.createElement('button');
      button.type = 'button';
      button.dataset.slug = work.slug;
      button.textContent = work.title;
      button.tabIndex = this.buttons.size === 0 ? 0 : -1;
      button.addEventListener('focus', this.onFocusIn);
      button.addEventListener('click', this.onClick);
      item.append(button);
      list.append(item);
      this.buttons.set(work.slug, button);
    }
    list.addEventListener('keydown', this.onKeyDown);
  }

  /**
   * Makes a work the list's tab stop (normally the nearest one).
   *
   * @param slug - Work slug; unknown slugs are ignored.
   */
  setEntry(slug: string): void {
    if (!this.buttons.has(slug)) return;
    for (const [s, b] of this.buttons) b.tabIndex = s === slug ? 0 : -1;
  }

  /**
   * Moves focus to a work's button.
   *
   * @param slug - Work slug; unknown slugs are ignored.
   */
  focus(slug: string): void {
    this.buttons.get(slug)?.focus();
  }

  /** Removes the buttons and listeners. */
  detach(): void {
    this.list.removeEventListener('keydown', this.onKeyDown);
    this.list.replaceChildren();
    this.buttons.clear();
  }
}
