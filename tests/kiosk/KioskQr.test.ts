import { describe, it, expect } from 'vitest';
import { qrPath } from '../../src/kiosk/KioskQr.js';

describe('qrPath', () => {
  it('gives the site-relative address of a work\'s QR code in one language', () => {
    expect(qrPath('fr', 'venise-portrait-5')).toBe('/qr/fr/venise-portrait-5.svg');
    expect(qrPath('en', 'arrivee')).toBe('/qr/en/arrivee.svg');
  });

  it('refuses a slug that is not a plain slug', () => {
    expect(() => qrPath('en', '../x')).toThrow(/\[kiosk\]/);
  });
});
