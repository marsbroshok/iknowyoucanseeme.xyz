import sharp from 'sharp';
import jsQR from 'jsqr';

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
