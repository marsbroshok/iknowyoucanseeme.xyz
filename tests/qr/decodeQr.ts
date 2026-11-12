import sharp from 'sharp';
import { createRequire } from 'node:module';

/** jsQR's decoder signature (the parts used here). */
type JsQr = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
/**
 * jsQR is a CommonJS bundle whose typings only resolve as a default import
 * under the bundler; `require` behaves the same under Vitest and Playwright.
 */
const jsQR = (createRequire(import.meta.url)('jsqr') as { default: JsQr }).default;

/**
 * Test helper: rasterizes an SVG QR code (as a phone camera would see the
 * printed label) and decodes it with jsQR, an independent decoder.
 *
 * @param svg - `<svg>` markup.
 * @param size - Raster width/height in pixels.
 * @returns The decoded text, or `null` when no QR code is found.
 */
export async function decodeQrSvg(svg: string, size = 400): Promise<string | null> {
  const { data, info } = await sharp(Buffer.from(svg))
    .resize(size, size, { kernel: 'nearest' })
    .flatten({ background: '#ffffff' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), info.width, info.height)?.data ?? null;
}
