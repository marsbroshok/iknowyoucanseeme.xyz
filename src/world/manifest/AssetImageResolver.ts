import type { Work } from '../../content/schema/index.js';
import type { ImageResolver } from './WorldManifestBuilder.js';

/** Pixel size of an image. */
export interface PixelSize {
  width: number;
  height: number;
}

/** A source image as `import.meta.glob` loads it (astro:assets `ImageMetadata`). */
export type ImageFiles<M extends PixelSize> = Record<string, () => Promise<{ default: M }>>;

/** Builds one output image (astro:assets `getImage`, WebP) at a width. */
export type ImageRenderer<M extends PixelSize> = (source: M, width: number) => Promise<{ src: string }>;

/**
 * Size of an image whose long edge is brought down to `longEdge`, never
 * upscaled; both sides are rounded and at least 1 px.
 *
 * @param source - Source size.
 * @param longEdge - Wanted long edge (px).
 * @returns The output size.
 */
export function scaledSize(source: PixelSize, longEdge: number): PixelSize {
  const scale = Math.min(1, longEdge / Math.max(source.width, source.height));
  return { width: Math.max(1, Math.round(source.width * scale)), height: Math.max(1, Math.round(source.height * scale)) };
}

/**
 * The world manifest's image builder for the site: finds a work image under
 * `/src/assets/works/<slug>/<file>` and renders it at the scaled width.
 *
 * @param files - Work image files (`import.meta.glob` of src/assets/works).
 * @param render - Output image builder.
 * @returns An {@link ImageResolver}; it rejects when the work has no image
 *   at that index or the file does not exist.
 */
export function assetImageResolver<M extends PixelSize>(files: ImageFiles<M>, render: ImageRenderer<M>): ImageResolver {
  return async (work: Work, index: number, longEdge: number) => {
    const image = work.images[index];
    if (!image) throw new Error(`[route] Work "${work.slug}" has no image ${index}`);
    const path = `/src/assets/works/${work.slug}/${image.src}`;
    const load = files[path];
    if (!load) throw new Error(`[route] Image "${path}" does not exist`);
    const source = (await load()).default;
    const size = scaledSize(source, longEdge);
    const output = await render(source, size.width);
    return { url: output.src, ...size };
  };
}
