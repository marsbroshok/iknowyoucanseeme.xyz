import type { TextBlock } from '../content/schema/index.js';
import type { Locale } from '../i18n/RouteMap.js';
import { pageText } from './PageText.js';

/** A built page showing UI text in the other locale. */
export interface LanguageViolation {
  /** Path relative to the build directory. */
  file: string;
  rule: 'wrong-language';
  detail: string;
}

/** One UI string of a locale, with its whole-word matcher. */
interface Needle {
  text: string;
  pattern: RegExp;
}

/**
 * Guards built pages against wrong-language UI text (WCAG 2.2 SC 3.1.2,
 * "Bilingual FR + EN, equal status"): a FR page must not show an English UI
 * string from ui.yaml, and an EN page must not show a French one, unless the
 * text sits in an element marked with its `lang`.
 *
 * Strings that are the same in both locales (e.g. "Contact") are ignored.
 * Proper nouns and work titles are not UI strings, so they are never checked.
 */
export class LanguageGuard {
  private readonly needles: Readonly<Record<Locale, readonly Needle[]>>;

  /**
   * @param blocks - UI text blocks keyed by id (the parsed ui.yaml).
   */
  constructor(blocks: Readonly<Record<string, TextBlock>>) {
    const differing = Object.values(blocks).filter((b) => normalize(b.en) !== normalize(b.fr));
    this.needles = {
      en: differing.map((b) => needle(b.en)),
      fr: differing.map((b) => needle(b.fr)),
    };
  }

  /**
   * Checks one built page.
   *
   * @param file - Path relative to the build directory.
   * @param html - Page HTML.
   * @returns One violation per other-locale UI string found; empty when the
   *   page is clean or has no `<html lang="en|fr">` (the bilingual root chooser).
   */
  inspect(file: string, html: string): LanguageViolation[] {
    const lang = /<html[^>]*\blang="(en|fr)"/.exec(html)?.[1] as Locale | undefined;
    if (!lang) return [];
    const other: Locale = lang === 'en' ? 'fr' : 'en';
    const text = pageText(html);
    return this.needles[other]
      .filter((n) => n.pattern.test(text))
      .map((n) => ({ file, rule: 'wrong-language' as const, detail: `${other} UI string "${n.text}" on a ${lang} page` }));
  }
}

/**
 * Lower-cased, whitespace-collapsed form used to compare the two locales.
 *
 * @param s - A UI string.
 * @returns Normalized string.
 */
function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Whole-word, case-insensitive matcher for a UI string.
 *
 * @param text - A UI string.
 * @returns The needle.
 */
function needle(text: string): Needle {
  const body = text
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return { text, pattern: new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'iu') };
}
