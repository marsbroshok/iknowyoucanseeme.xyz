import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import yaml from 'yaml';
import { WorkSchema } from '../../src/content/schema/index.js';
import { OgImageRenderer } from './OgImageRenderer.js';

/** Where to read works/assets/font and where to write the images. */
export interface OgGenerateOptions {
  /** Directory of work YAML files (`src/content/works`). */
  worksDir: string;
  /** Directory of work assets (`src/assets/works`). */
  assetsDir: string;
  /** Output directory (e.g. `dist/og`). */
  outDir: string;
  /** Path to `Fraunces.woff2`. */
  fontPath: string;
}

/**
 * Renders `<outDir>/<slug>.jpg` for every work YAML.
 *
 * @param options - Input and output locations.
 * @returns Paths of the written files.
 * @throws When a work file fails schema validation or an image is missing.
 */
export async function generateOgImages(options: OgGenerateOptions): Promise<string[]> {
  const renderer = await OgImageRenderer.fromWoff2(options.fontPath);
  await fs.mkdir(options.outDir, { recursive: true });
  const files = (await fs.readdir(options.worksDir)).filter((f) => f.endsWith('.yaml')).sort();
  const written: string[] = [];
  for (const file of files) {
    const work = WorkSchema.parse(yaml.parse(await fs.readFile(path.join(options.worksDir, file), 'utf8')));
    const first = work.images[0];
    const jpeg = await renderer.render({
      title: work.title.fr,
      subtitle: work.title.en,
      imagePath: first ? path.join(options.assetsDir, work.slug, first.src) : undefined,
    });
    const target = path.join(options.outDir, `${work.slug}.jpg`);
    await fs.writeFile(target, jpeg);
    written.push(target);
  }
  return written;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Astro integration that writes one Open Graph image per work into
 * `<build dir>/og/` when the static build is done. Work pages reference
 * `/og/<slug>.jpg`.
 *
 * @param options - Optional overrides (tests); defaults to the repository.
 * @returns The integration.
 */
export function ogImages(options: Partial<Omit<OgGenerateOptions, 'outDir'>> = {}): AstroIntegration {
  const worksDir = options.worksDir ?? path.join(ROOT, 'src/content/works');
  const assetsDir = options.assetsDir ?? path.join(ROOT, 'src/assets/works');
  const fontPath = options.fontPath ?? path.join(ROOT, 'public/fonts/Fraunces.woff2');
  return {
    name: 'og-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = path.join(fileURLToPath(dir), 'og');
        const files = await generateOgImages({ worksDir, assetsDir, outDir, fontPath });
        logger.info(`${files.length} Open Graph images written to og/`);
      },
    },
  };
}
