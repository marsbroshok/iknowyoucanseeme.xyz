import { ContactFormEnhancer } from './ContactFormEnhancer.js';

/** The parts of `window` the contact forms need. */
export interface ContactWindow {
  fetch: typeof fetch;
  location: { search: string };
}

/**
 * Enhances every `form[data-contact-form]` of the document.
 *
 * @param doc - The document.
 * @param win - Window-like provider of `fetch` and the query string.
 * @returns The number of forms enhanced.
 */
export function bootContactForms(doc: Document, win: ContactWindow): number {
  const forms = doc.querySelectorAll<HTMLFormElement>('form[data-contact-form]');
  forms.forEach((form) => {
    new ContactFormEnhancer(form, { fetch: win.fetch, search: win.location.search, document: doc }).init();
  });
  return forms.length;
}
