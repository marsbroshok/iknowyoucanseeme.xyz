import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import sharp from 'sharp';

/**
 * The stray apparition of the leak (FR2) is a cut-out of an existing work,
 * never a new picture: the swan on the right of *Les Reflets II* (the
 * "dreaming birds" of its caption), from the committed web master.
 */
export const APPARITION_CROP = {
  slug: 'les-reflets-ii',
  file: '0.jpg',
  /** Region of the 1440 × 1440 web master holding the bird. */
  region: { left: 730, top: 700, width: 200, height: 200 },
  /** Output edge (px): 7 rem at 2× density. */
  size: 224,
} as const;

/**
 * Renders the cut-out: crop, resize, and a radial alpha mask so the edges
 * dissolve (no hard frame), as WebP with alpha.
 *
 * @param source - Path of the work's web master.
 * @returns WebP bytes.
 * @throws When the source cannot be read.
 */
export async function renderApparition(source: string): Promise<Buffer> {
  const { size, region } = APPARITION_CROP;
  const half = size / 2;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="g"><stop offset="0.45" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="${half}" cy="${half}" r="${half}" fill="url(#g)"/></svg>`,
  );
  return sharp(await fs.readFile(source))
    .extract(region)
    .resize(size, size)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .webp({ quality: 70, alphaQuality: 80 })
    .toBuffer();
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Astro integration that writes `<build dir>/leak/apparition.webp` when the
 * static build is done (like the Open Graph images). Awake pages reference
 * `/leak/apparition.webp`, loaded only when the apparition shows.
 *
 * @param options - Optional source override (tests); defaults to the repository asset.
 * @returns The integration.
 */
export function leakApparition(options: { source?: string } = {}): AstroIntegration {
  const source = options.source ?? path.join(ROOT, 'src/assets/works', APPARITION_CROP.slug, APPARITION_CROP.file);
  return {
    name: 'leak-apparition',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = path.join(fileURLToPath(dir), 'leak');
        await fs.mkdir(outDir, { recursive: true });
        await fs.writeFile(path.join(outDir, 'apparition.webp'), await renderApparition(source));
        logger.info('Leak apparition written to leak/apparition.webp');
      },
    },
  };
}
