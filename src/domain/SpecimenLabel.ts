import type { Work } from '../content/schema/index.js';
import type { UiText } from '../i18n/UiText.js';

/**
 * Known places of photograph series in the Leak zone, by slug prefix
 * (`venise-portrait-5` → Venice), as `ui.yaml` ids. A series without an
 * entry is labelled without a place.
 */
export const SPECIMEN_PLACES: Readonly<Record<string, string>> = {
  'venise-portrait': 'specimen_venice',
};

/** Trailing number of a slug (`venise-portrait-11` → 11), or 0. */
function serial(slug: string): number {
  return Number(/-(\d+)$/.exec(slug)?.[1] ?? 0);
}

/** Series prefix of a slug (`venise-portrait-11` → `venise-portrait`). */
function series(slug: string): string {
  return slug.replace(/-\d+$/, '');
}

/**
 * Museum-tag labels of the Leak zone's inhabitants (FR4): Venice portraits
 * are `specimen 03 · Venise · 2025`, clay creatures are
 * `esquisse 02 · argile · 2026` (sketch / clay in English). Each kind is
 * numbered from 01 on its own, oldest first, then by the number in the
 * slug, so the numbers do not depend on the order of the input. Every word
 * comes from `ui.yaml` (EN + FR).
 *
 * @param works - Works (any; only Leak-zone works are labelled).
 * @param ui - UI strings of the page language.
 * @returns Label by work slug.
 * @throws Error when a label word is missing from `ui.yaml`.
 */
export function specimenLabels(works: readonly Work[], ui: UiText): Map<string, string> {
  const labels = new Map<string, string>();
  const inLeak = works.filter((w) => w.zone === 'leak').sort((a, b) => a.year - b.year || serial(a.slug) - serial(b.slug) || a.slug.localeCompare(b.slug));
  for (const medium of ['photo', 'ceramic'] as const) {
    inLeak
      .filter((w) => w.medium === medium)
      .forEach((work, i) => {
        const number = String(i + 1).padStart(2, '0');
        const kind = medium === 'ceramic' ? ui.t('specimen_sketch') : ui.t('specimen');
        const placeKey = medium === 'ceramic' ? 'specimen_clay' : SPECIMEN_PLACES[series(work.slug)];
        const parts = [`${kind} ${number}`, ...(placeKey ? [ui.t(placeKey)] : []), String(work.year)];
        labels.set(work.slug, parts.join(' · '));
      });
  }
  return labels;
}
