/** Attributes whose values are read out or shown to visitors. */
const TEXT_ATTRIBUTES = /\s(?:alt|aria-label|title|placeholder)="([^"]*)"/gi;

/** Entities Astro and the browser emit in built pages. */
const ENTITIES: Readonly<Record<string, string>> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };

/**
 * Text a visitor of a built page reads or hears in the page language: the
 * `<title>`, the meta description, body text and accessible-name attributes
 * (`alt`, `aria-label`, `title`, `placeholder`).
 *
 * Scripts, styles, templates and elements whose `lang` differs from the
 * page's `<html lang>` are dropped, so correctly marked other-language parts
 * (WCAG 2.2 SC 3.1.2) are not counted as page-language text.
 *
 * @param html - Page HTML.
 * @returns Whitespace-collapsed, entity-decoded text.
 */
export function pageText(html: string): string {
  const pageLang = /<html[^>]*\blang="([^"]*)"/i.exec(html)?.[1];
  const head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? '';
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ?? '';
  const description = /<meta\s[^>]*name="description"[^>]*\scontent="([^"]*)"/i.exec(head)?.[1] ?? '';

  let body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? '';
  body = body.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  body = body.replace(/<([a-z][a-z0-9-]*)\b[^>]*\slang="([^"]*)"[^>]*>[\s\S]*?<\/\1\s*>/gi, (whole, _tag: string, lang: string) =>
    lang === pageLang ? whole : ' ',
  );
  const attributes = [...body.matchAll(TEXT_ATTRIBUTES)].map((m) => m[1]);
  const text = body.replace(/<[^>]*>/g, ' ');

  return decode([title, description, ...attributes, text].join(' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Decodes named (see {@link ENTITIES}) and numeric HTML entities.
 *
 * @param s - Text with entities.
 * @returns Decoded text; unknown named entities are left as is.
 */
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return String.fromCodePoint(n);
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}
