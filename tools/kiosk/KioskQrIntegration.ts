import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import yaml from 'yaml';
import { WorkSchema } from '../../src/content/schema/index.js';
import { canonicalUrl } from '../../src/i18n/Alternates.js';
import { LOCALES } from '../../src/i18n/RouteMap.js';
import { qrPath } from '../../src/kiosk/KioskQr.js';
import { QrCode } from '../../src/qr/QrCode.js';

/** Where to read works and write the codes, and the site origin. */
export interface KioskQrOptions {
  /** Directory of work YAML files (`src/content/works`). */
  worksDir: string;
  /** Build directory (the codes go to `<outDir>/qr/<lang>/<slug>.svg`). */
  outDir: string;
  /** Site origin, e.g. `https://www.iknowyoucanseeme.xyz`. */
  site: string;
}

/**
 * Writes one QR code per work and language: the canonical work page in
 * that language, as SVG (the launch track's `QrCode`), at the address
 * `qrPath` gives. The exhibition mode shows it in the focus dialog.
 *
 * @param options - Input, output and site.
 * @returns Paths of the written files.
 * @throws When a work file fails schema validation.
 */
export async function generateKioskQrCodes(options: KioskQrOptions): Promise<string[]> {
  const files = (await fs.readdir(options.worksDir)).filter((f) => f.endsWith('.yaml')).sort();
  const written: string[] = [];
  for (const file of files) {
    const work = WorkSchema.parse(yaml.parse(await fs.readFile(path.join(options.worksDir, file), 'utf8')));
    for (const lang of LOCALES) {
      const target = path.join(options.outDir, qrPath(lang, work.slug));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, await QrCode.svg(canonicalUrl('works', lang, options.site, { en: [work.slug], fr: [work.slug] })));
      written.push(target);
    }
  }
  return written;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Astro integration that writes the exhibition mode's QR codes when the
 * static build is done, for the configured `site`.
 *
 * @param options - Optional works directory override (tests).
 * @returns The integration.
 * @throws Error at build time when the Astro config has no `site`.
 */
export function kioskQrCodes(options: { worksDir?: string } = {}): AstroIntegration {
  const worksDir = options.worksDir ?? path.join(ROOT, 'src/content/works');
  let site: string | null = null;
  return {
    name: 'kiosk-qr-codes',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site ? config.site.replace(/\/$/, '') : null;
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (!site) throw new Error('[kiosk] The Astro config needs a site for the QR codes');
        const files = await generateKioskQrCodes({ worksDir, outDir: fileURLToPath(dir), site });
        logger.info(`${files.length} exhibition QR codes written to qr/`);
      },
    },
  };
}
