import type { Page } from './schema/index.js';
import type { Locale } from '../i18n/RouteMap.js';

/**
 * Reads a required text block of a copy page in one locale.
 *
 * @param page - Parsed copy page (e.g. `about`, `legal`).
 * @param key - Block id.
 * @param lang - Locale.
 * @returns The block text.
 * @throws Error when the page has no such block (the build must fail rather
 *   than publish an empty section).
 */
export function requireBlock(page: Pick<Page, 'slug' | 'blocks'>, key: string, lang: Locale): string {
  const block = page.blocks?.[key];
  if (!block) throw new Error(`[content] Missing block "${key}" in page "${page.slug}"`);
  return block[lang];
}
