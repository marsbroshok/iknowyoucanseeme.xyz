/** Dependencies injected so the enhancer is testable without globals. */
export interface ContactFormDeps {
  fetch: typeof fetch;
  /** `location.search` of the page (e.g. `?work=arrivee`). */
  search: string;
  document: Document;
}

const SLUG = /^[a-z0-9-]+$/;

/**
 * Reads a valid work slug from a query string.
 *
 * @param search - Query string, e.g. `?work=arrivee`.
 * @returns The slug, or `undefined` when absent or not a slug.
 */
export function readWorkSlug(search: string): string | undefined {
  const slug = new URLSearchParams(search).get('work');
  return slug && SLUG.test(slug) ? slug : undefined;
}

/**
 * Progressive enhancement for the contact form. Without it the form is a
 * plain POST to Web3Forms. With it: the hidden `work` field is pre-filled
 * from `?work=<slug>` (and the work's title shown), and submission happens
 * in place via `fetch`, with sending/success/failure states announced in a
 * live region.
 */
export class ContactFormEnhancer {
  private readonly workInput: HTMLInputElement;
  private readonly status: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly messages: Record<'sending' | 'success' | 'error', string>;

  /**
   * @param form - The `form[data-contact-form]` element.
   * @param deps - Injected fetch, query string and document.
   * @throws Error when the form lacks the `work` field, status region,
   *   button or one of the `data-msg-sending|success|error` messages.
   */
  constructor(
    private readonly form: HTMLFormElement,
    private readonly deps: ContactFormDeps,
  ) {
    const workInput = form.querySelector<HTMLInputElement>('input[name="work"]');
    const status = form.querySelector<HTMLElement>('[data-form-status]');
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!workInput || !status || !button) {
      throw new Error('[contact] Form markup is missing the work field, status region or submit button');
    }
    this.workInput = workInput;
    this.status = status;
    this.button = button;
    const { msgSending, msgSuccess, msgError } = form.dataset;
    if (!msgSending || !msgSuccess || !msgError) {
      throw new Error('[contact] Form markup is missing a data-msg-* status message');
    }
    this.messages = { sending: msgSending, success: msgSuccess, error: msgError };
  }

  /** Pre-fills the work and starts handling submissions. */
  init(): void {
    this.prefillWork();
    this.form.addEventListener('submit', (event) => void this.handleSubmit(event));
  }

  /**
   * Sends the form with `fetch` and reports the outcome.
   *
   * @param event - The submit event (its default navigation is prevented).
   */
  async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.say('sending');
    this.button.disabled = true;
    try {
      const response = await this.deps.fetch(this.form.action, {
        method: 'POST',
        body: new FormData(this.form),
        headers: { Accept: 'application/json' },
      });
      const result = (await response.json()) as { success?: unknown };
      if (response.ok && result.success === true) {
        this.say('success');
        this.form.reset();
        this.prefillWork();
      } else {
        this.say('error');
      }
    } catch (error) {
      this.say('error');
      console.error('[contact] Sending failed', error);
    } finally {
      this.button.disabled = false;
    }
  }

  private prefillWork(): void {
    const slug = readWorkSlug(this.deps.search);
    if (!slug) return;
    this.workInput.value = slug;
    const note = this.form.querySelector<HTMLElement>('[data-work-note]');
    const title = this.form.querySelector<HTMLElement>('[data-work-title]');
    if (note && title) {
      title.textContent = this.workTitles()[slug] ?? slug;
      note.hidden = false;
    }
  }

  private workTitles(): Record<string, string> {
    const source = this.deps.document.getElementById('work-titles')?.textContent;
    if (!source) return {};
    const parsed: unknown = JSON.parse(source);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('[contact] Invalid work titles map');
    }
    return parsed as Record<string, string>;
  }

  private say(state: 'sending' | 'success' | 'error'): void {
    this.status.textContent = this.messages[state];
  }
}
