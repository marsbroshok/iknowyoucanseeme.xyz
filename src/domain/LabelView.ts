import type { Work } from '../content/schema/index.js';
import type { UiText } from '../i18n/UiText.js';
import { canonicalUrl } from '../i18n/Alternates.js';

/** One printed exhibition label. */
export interface LabelView {
  slug: string;
  /** Original (French) title; labels always show it. */
  title: string;
  /** `size · year · medium` in the sheet language (size only when known). */
  meta: string;
  /** Canonical work page in the sheet language (QR code target). */
  url: string;
  /** The same URL without scheme and `www.`, printed under the QR code. */
  displayUrl: string;
}

/**
 * Builds the labels of a printable sheet: one per work, sorted by French
 * title (as visitors read them on the wall).
 *
 * @param works - All works (copy merged).
 * @param ui - UI strings of the sheet language.
 * @param site - Site origin.
 * @returns Labels in print order.
 * @throws Error when a medium label is missing in ui.yaml.
 */
export function buildLabelViews(works: readonly Work[], ui: UiText, site: string): LabelView[] {
  return [...works]
    .sort((a, b) => a.title.fr.localeCompare(b.title.fr, 'fr'))
    .map((work) => {
      const parts: string[] = [];
      if (work.size) parts.push(`${work.size.w} × ${work.size.h} ${work.size.unit}`);
      parts.push(String(work.year), ui.t(`medium_${work.medium}`));
      const url = canonicalUrl('works', ui.lang, site, { en: [work.slug], fr: [work.slug] });
      return {
        slug: work.slug,
        title: work.title.fr,
        meta: parts.join(' · '),
        url,
        displayUrl: url.replace(/^https?:\/\/(www\.)?/, ''),
      };
    });
}
