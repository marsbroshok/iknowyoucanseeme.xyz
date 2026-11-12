import fs from 'node:fs/promises';
import opentype from 'opentype.js';
import sharp from 'sharp';
import subsetFont from 'subset-font';

/** Content of one Open Graph card. */
export interface OgCard {
  /** Work image file; omitted → text-only card. */
  imagePath?: string;
  /** Main title (the original French title). */
  title: string;
  /** Optional second line (the English title). */
  subtitle?: string;
}

/**
 * Greedy word wrap.
 *
 * @param text - Text to wrap.
 * @param measure - Width of a string in the target font/size.
 * @param maxWidth - Maximum line width.
 * @param maxLines - Maximum number of lines; overflow ends the last line with `…`.
 * @returns The lines (a single word wider than `maxWidth` gets its own line).
 */
export function wrapLines(text: string, measure: (s: string) => number, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measure(candidate) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
  return kept;
}

/** Characters kept when converting the web font for rendering (Latin + French). */
const CHARSET =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~" +
  '«»‹›‘’“”–—…·×°ÀÂÄÆÇÉÈÊËÎÏÔŒÙÛÜŸàâäæçéèêëîïôœùûüÿ';

/**
 * Renders 1200×630 Open Graph JPEGs: the work image on the right, on the
 * site's `--ink` night blue, with the title set in Fraunces on the left.
 * Text is converted to SVG paths from the embedded font file, so output does
 * not depend on system fonts and is byte-for-byte deterministic.
 */
export class OgImageRenderer {
  static readonly WIDTH = 1200;
  static readonly HEIGHT = 630;
  static readonly INK = '#0b1030';
  static readonly TEXT = '#f0f0f5';
  static readonly MUTED = '#a0a5b5';

  private constructor(private readonly font: opentype.Font) {}

  /**
   * Loads the renderer from the site's WOFF2 font.
   *
   * @param fontPath - Path to `Fraunces.woff2`.
   * @returns A ready renderer.
   * @throws When the font file is missing or unreadable.
   */
  static async fromWoff2(fontPath: string): Promise<OgImageRenderer> {
    const woff2 = await fs.readFile(fontPath);
    const sfnt: Buffer = await subsetFont(woff2, CHARSET, { targetFormat: 'sfnt' });
    const font = opentype.parse(sfnt.buffer.slice(sfnt.byteOffset, sfnt.byteOffset + sfnt.byteLength));
    return new OgImageRenderer(font);
  }

  /**
   * Renders one card.
   *
   * @param card - Title, optional subtitle and image.
   * @returns JPEG bytes.
   * @throws When the image cannot be read.
   */
  async render(card: OgCard): Promise<Buffer> {
    const { WIDTH, HEIGHT, INK } = OgImageRenderer;
    const layers: sharp.OverlayOptions[] = [];
    if (card.imagePath) {
      const image = await sharp(card.imagePath)
        .resize({ width: 540, height: HEIGHT, fit: 'cover' })
        .toBuffer();
      layers.push({ input: image, left: WIDTH - 540, top: 0 });
    }
    layers.push({ input: Buffer.from(this.textSvg(card)), left: 0, top: 0 });
    return sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: INK } })
      .composite(layers)
      .jpeg({ quality: 82, chromaSubsampling: '4:4:4' })
      .toBuffer();
  }

  private textSvg(card: OgCard): string {
    const maxWidth = 560;
    const titleSize = 64;
    const measure = (size: number) => (s: string) => this.font.getAdvanceWidth(s, size);
    const titleLines = wrapLines(card.title, measure(titleSize), maxWidth, 3);
    const subLines = card.subtitle ? wrapLines(card.subtitle, measure(36), maxWidth, 2) : [];

    const paths: string[] = [];
    let y = 150;
    for (const line of titleLines) {
      paths.push(this.path(line, 64, y, titleSize, OgImageRenderer.TEXT));
      y += titleSize * 1.15;
    }
    y += 12;
    for (const line of subLines) {
      paths.push(this.path(line, 64, y, 36, OgImageRenderer.MUTED));
      y += 36 * 1.25;
    }
    paths.push(this.path('iknowyoucanseeme', 64, OgImageRenderer.HEIGHT - 64, 28, OgImageRenderer.MUTED));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${OgImageRenderer.WIDTH}" height="${OgImageRenderer.HEIGHT}">${paths.join('')}</svg>`;
  }

  private path(text: string, x: number, y: number, size: number, fill: string): string {
    return `<path fill="${fill}" d="${this.font.getPath(text, x, y, size).toPathData(2)}"/>`;
  }
}
