import { GOATCOUNTER_SCRIPT_SRC } from '../analytics/AnalyticsConfig.js';

/** One rule broken by a built page. */
export interface GuardViolation {
  /** Path relative to the build directory. */
  file: string;
  rule: 'no-price' | 'lang' | 'canonical' | 'hreflang-en' | 'hreflang-fr' | 'hreflang-x-default' | 'js-budget' | 'redirect';
  detail: string;
}

/** Maximum inline JavaScript (bytes) on a contact page: the form enhancement. */
export const CONTACT_JS_BUDGET = 3072;
/** Maximum inline JavaScript (bytes) on the root language chooser. */
export const ROOT_CHOOSER_JS_BUDGET = 512;

/**
 * External scripts allowed on any page: only GoatCounter's cookieless
 * counter (present when analytics is enabled). Everything else is inline
 * and within the page budget.
 */
export const ALLOWED_EXTERNAL_SCRIPTS: readonly string[] = [GOATCOUNTER_SCRIPT_SRC];

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
 * localized pages) exactly one canonical plus EN/FR/x-default alternates
 * (redirect pages of old addresses: canonical = refresh target, noindex);
 * JavaScript within the page's budget, never as external files except
 * {@link ALLOWED_EXTERNAL_SCRIPTS}.
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
    const refresh = /<meta[^>]*http-equiv="refresh"[^>]*content="0; url=([^"]+)"/i.exec(html);
    if (refresh && !/^(en|fr)\//.test(file)) {
      for (const detail of redirectProblems(html, refresh[1])) add('redirect', detail);
      return withScriptCheck(file, html, violations);
    }
    for (const lang of ['en', 'fr', 'x-default'] as const) {
      if (!new RegExp(`<link[^>]*rel="alternate"[^>]*hreflang="${lang}"`).test(html)) {
        add(`hreflang-${lang}`, `missing hreflang="${lang}" alternate`);
      }
    }
  }

  return withScriptCheck(file, html, violations);
}

/**
 * Appends the JavaScript budget check to a page's violations.
 *
 * @param file - Path relative to the build directory.
 * @param html - Page HTML.
 * @param violations - Violations found so far (mutated and returned).
 * @returns All violations.
 */
function withScriptCheck(file: string, html: string, violations: GuardViolation[]): GuardViolation[] {
  const { inlineBytes, external: allExternal } = scriptBytes(html);
  const external = allExternal.filter((src) => !ALLOWED_EXTERNAL_SCRIPTS.includes(src));
  const budget = jsBudgetFor(file);
  if (external.length > 0 || inlineBytes > budget) {
    violations.push({ file, rule: 'js-budget', detail: `inline ${inlineBytes} B (budget ${budget} B), external ${external.join(', ') || 'none'}` });
  }
  return violations;
}

/**
 * Problems of a redirect page of an old address (a static page whose
 * `<meta http-equiv="refresh">` replaces a server redirect): its canonical
 * must be the refresh target and it must not be indexed. It needs no
 * hreflang alternates: it is not a page of its own.
 *
 * @param html - Page HTML.
 * @param target - Refresh URL (site-relative).
 * @returns Problem descriptions (empty when fine).
 */
function redirectProblems(html: string, target: string): string[] {
  const problems: string[] = [];
  const canonical = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/.exec(html)?.[1];
  const canonicalPath = canonical ? new URL(canonical).pathname : undefined;
  if (canonicalPath !== target) problems.push(`refresh target ${target} does not match canonical ${canonicalPath ?? '(none)'}`);
  if (!/<meta[^>]*name="robots"[^>]*content="noindex"/.test(html)) problems.push('redirect page must be noindex');
  return problems;
}
