import type { Work } from '../content/schema/index.js';
import { uiText } from '../i18n/UiCatalog.js';

/** ui.yaml key of the label shown for each availability state. */
const LABEL_KEYS: Readonly<Record<Work['availability'], string>> = {
  sold: 'availability_sold',
  'not-for-sale': 'availability_not_for_sale',
  available: 'contact',
  unknown: 'contact',
};

/**
 * Human label for a work's availability, read from ui.yaml. Never outputs a
 * price: anything not marked `sold` or `not-for-sale` (i.e. `available` or
 * `unknown`) resolves to the "contact for availability" label.
 *
 * @param work - The work (only `availability` is read).
 * @param lang - Display locale.
 * @returns The localized label.
 * @throws Error when the ui.yaml key is missing (build error, never a fallback).
 */
export function getAvailabilityLabel(work: Pick<Work, 'availability'>, lang: 'en' | 'fr'): string {
  return uiText(lang).t(LABEL_KEYS[work.availability]);
}

/**
 * Whether visitors may ask about acquiring the work (shows the contact link).
 *
 * @param work - The work (only `availability` is read).
 * @returns `true` for `available` and `unknown`.
 */
export function isEnquirable(work: Pick<Work, 'availability'>): boolean {
  return work.availability === 'available' || work.availability === 'unknown';
}
