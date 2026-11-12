import type { Locale } from '../i18n/RouteMap.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Site-relative address of a work's QR code (an SVG made at build time by
 * `tools/kiosk/KioskQrIntegration.ts`), shown by the exhibition mode
 * instead of the contact link (FR5). The code opens the work's page in the
 * same language.
 *
 * @param lang - Page language.
 * @param slug - Work slug.
 * @returns `/qr/<lang>/<slug>.svg`.
 * @throws Error when the slug is not a plain slug.
 */
export function qrPath(lang: Locale, slug: string): string {
  if (!SLUG.test(slug)) throw new Error(`[kiosk] "${slug}" is not a work slug`);
  return `/qr/${lang}/${slug}.svg`;
}
