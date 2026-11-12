import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { QrCode } from '../../src/qr/QrCode.js';
import { decodeQrSvg } from './decodeQr.js';

describe('QrCode.svg', () => {
  it('round-trips a work URL through an independent decoder', async () => {
    const url = 'https://www.iknowyoucanseeme.xyz/fr/oeuvres/la-frontiere-s-estompe/';
    const svg = await QrCode.svg(url);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox');
    expect(await decodeQrSvg(svg)).toBe(url);
  });

  it('property: any site URL decodes back to itself', async () => {
    await fc.assert(
      fc.asyncProperty(fc.webUrl({ withQueryParameters: true, withFragments: true }), async (url) => {
        expect(await decodeQrSvg(await QrCode.svg(url))).toBe(url);
      }),
      { numRuns: 15 },
    );
  });

  it('refuses empty and over-long text', async () => {
    await expect(QrCode.svg('')).rejects.toThrow(/Nothing to encode/);
    await expect(QrCode.svg('x'.repeat(QrCode.MAX_LENGTH + 1))).rejects.toThrow(/too long/);
    await expect(QrCode.svg('x'.repeat(QrCode.MAX_LENGTH))).resolves.toContain('<svg');
  });
});

describe('decodeQrSvg (test helper)', () => {
  it('returns null for an image without a QR code', async () => {
    expect(await decodeQrSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#fff"/></svg>')).toBeNull();
  });
});
