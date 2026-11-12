/** One rule broken by a built page. */
export interface GuardViolation {
  /** Path relative to the build directory. */
  file: string;
  rule: 'no-price' | 'lang' | 'canonical' | 'hreflang-en' | 'hreflang-fr' | 'hreflang-x-default' | 'js-budget';
  detail: string;
}

/** Maximum inline JavaScript (bytes) on a contact page: the form enhancement. */
export const CONTACT_JS_BUDGET = 3072;
/** Maximum inline JavaScript (bytes) on the root language chooser. */
export const ROOT_CHOOSER_JS_BUDGET = 512;

/** Price-like content: a currency sign/code, or the words price/prix/tarif. */
const PRICE_PATTERNS: readonly RegExp[] = [/€/, /\bEUR\b/, /\$\s?\d/, /\bprices?\b/i, /\bprix\b/i, /\btarifs?\b/i];

/**
 * Executable JavaScript of a page: inline bytes and external script URLs.
 * JSON data blocks (`application/ld+json`, `application/json`) are ignored.
 *
 * @param html - Page HTML.
 * @returns Inline byte count and external sources.
 */
export function scriptBytes(html: string): { inlineBytes: number; external: string[] } {
  let inlineBytes = 0;
  const external: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1];
    if (/type="application\/(ld\+)?json"/i.test(attrs)) continue;
    const src = /\bsrc="([^"]+)"/i.exec(attrs);
    if (src) external.push(src[1]);
    else inlineBytes += Buffer.byteLength(match[2], 'utf8');
  }
  return { inlineBytes, external };
}

/**
 * JavaScript allowed on a page: the contact enhancement on contact pages,
 * the language redirect on the root chooser, nothing elsewhere.
 *
 * @param file - Path relative to the build directory.
 * @returns Allowed inline bytes.
 */
export function jsBudgetFor(file: string): number {
  if (/^(en|fr)\/contact\/index\.html$/.test(file)) return CONTACT_JS_BUDGET;
  if (file === 'index.html') return ROOT_CHOOSER_JS_BUDGET;
  return 0;
}

/**
 * Checks one built HTML page: no price content, `<html lang>`, and (for
 * localized pages) exactly one canonical plus EN/FR/x-default alternates;
 * JavaScript within the page's budget, never as external files.
 *
 * @param file - Path relative to the build directory (e.g. `fr/oeuvres/x/index.html`).
 * @param html - Page HTML.
 * @returns All violations (empty when the page is clean).
 */
export function inspectPage(file: string, html: string): GuardViolation[] {
  const violations: GuardViolation[] = [];
  const add = (rule: GuardViolation['rule'], detail: string) => violations.push({ file, rule, detail });

  for (const pattern of PRICE_PATTERNS) {
    const hit = pattern.exec(html);
    if (hit) add('no-price', `matches ${pattern}: "${hit[0]}"`);
  }
  if (!/<html[^>]*\blang="(en|fr)"/.test(html)) add('lang', 'missing <html lang="en|fr">');

  if (file !== 'index.html') {
    const canonicals = html.match(/<link[^>]*rel="canonical"/g) ?? [];
    if (canonicals.length !== 1) add('canonical', `expected 1 canonical link, found ${canonicals.length}`);
    for (const lang of ['en', 'fr', 'x-default'] as const) {
      if (!new RegExp(`<link[^>]*rel="alternate"[^>]*hreflang="${lang}"`).test(html)) {
        add(`hreflang-${lang}`, `missing hreflang="${lang}" alternate`);
      }
    }
  }

  const { inlineBytes, external } = scriptBytes(html);
  const budget = jsBudgetFor(file);
  if (external.length > 0 || inlineBytes > budget) {
    add('js-budget', `inline ${inlineBytes} B (budget ${budget} B), external ${external.join(', ') || 'none'}`);
  }
  return violations;
}
