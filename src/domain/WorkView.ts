import type { Work } from '../content/schema/index.js';
import type { UiText } from '../i18n/UiText.js';
import { localizedPath } from '../i18n/LocalizedPath.js';
import { getAvailabilityLabel, isEnquirable } from './Availability.js';

/** Everything a page needs to display one work in one locale. */
export interface WorkView {
  slug: string;
  territory: string;
  year: number;
  /** Original (French) title; never translated. */
  title: string;
  /** English subtitle, only on the EN site and only when one exists. */
  subtitle?: string;
  /** Title + subtitle in one string, e.g. for `<title>` and links. */
  displayTitle: string;
  /** Image alternative text. */
  alt: string;
  /** `size · year · medium · techniques`, absent parts skipped. */
  metaLine: string;
  /** Availability label; never a price. */
  availabilityLabel: string;
  /** Whether the "ask about this work" contact link is shown. */
  enquirable: boolean;
  /** Work page path in this locale. */
  href: string;
  /** Contact page path pre-filled with this work (`?work=<slug>`). */
  contactHref: string;
  /** Poetic fragment in this locale, when written. */
  fragment?: string;
  /** Source images (relative to `src/assets/works/<slug>/`). */
  images: Work['images'];
}

/**
 * UI string id of a declared technique (`colour filter` → `technique_colour_filter`):
 * declared techniques are named in the page language from `ui.yaml`.
 *
 * @param technique - Declared technique as written in the work file.
 * @returns The UI string id.
 */
export function techniqueKey(technique: string): string {
  return `technique_${technique.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
}

/**
 * Builds the display model of a work for one locale.
 *
 * @param work - The work, with its copy merged in (see `withCopy`).
 * @param ui - Strict UI strings of the target locale.
 * @returns The view model.
 * @throws Error when a needed UI string (medium label, declared technique) is missing.
 */
export function buildWorkView(work: Work, ui: UiText): WorkView {
  const lang = ui.lang;
  const subtitle = lang === 'en' && work.title.en ? work.title.en : undefined;
  const displayTitle = subtitle ? `${work.title.fr} (${subtitle})` : work.title.fr;

  const metaParts: string[] = [];
  if (work.size) metaParts.push(`${work.size.w} × ${work.size.h} ${work.size.unit}`);
  metaParts.push(String(work.year));
  metaParts.push(ui.t(`medium_${work.medium}`));
  if (work.techniques && work.techniques.length > 0) metaParts.push(work.techniques.map((t) => ui.t(techniqueKey(t))).join(', '));

  const href = localizedPath('works', lang, [work.slug]);
  return {
    slug: work.slug,
    territory: work.territory,
    year: work.year,
    title: work.title.fr,
    subtitle,
    displayTitle,
    alt: displayTitle,
    metaLine: metaParts.join(' · '),
    availabilityLabel: getAvailabilityLabel(work, lang),
    enquirable: isEnquirable(work),
    href,
    contactHref: `${localizedPath('contact', lang)}?work=${encodeURIComponent(work.slug)}`,
    fragment: work.fragment?.[lang],
    images: work.images,
  };
}
