import QRCode from 'qrcode';

/**
 * Build-time QR code generator (wrapper around the `qrcode` package) for the
 * printable exhibition labels. Produces a self-contained SVG string, so the
 * labels page ships no JavaScript and no image files.
 */
export class QrCode {
  /** Longest text accepted (a work URL is far shorter). */
  static readonly MAX_LENGTH = 512;

  /**
   * Encodes text (a work URL) as an SVG QR code: error correction level M
   * (survives small print defects) and the standard 4-module quiet zone.
   *
   * @param text - Text to encode.
   * @returns The `<svg>` markup.
   * @throws Error when the text is empty or longer than {@link QrCode.MAX_LENGTH}.
   */
  static async svg(text: string): Promise<string> {
    if (text.length === 0) throw new Error('[QrCode] Nothing to encode');
    if (text.length > QrCode.MAX_LENGTH) {
      throw new Error(`[QrCode] Text too long for a label QR code (${text.length} > ${QrCode.MAX_LENGTH})`);
    }
    const svg = await QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'M', margin: 4 });
    return svg.trim();
  }
}
