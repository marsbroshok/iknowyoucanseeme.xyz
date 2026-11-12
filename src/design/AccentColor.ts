/**
 * Contrast calculation and accent color generator.
 */

const INK_HEX = '#0b1030';

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// WCAG relative luminance
function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function contrast(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = luminance(r1, g1, b1);
  const l2 = luminance(r2, g2, b2);
  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (lightest + 0.05) / (darkest + 0.05);
}

/**
 * Adjusts the lightness of the given hex color (in HSL space) until it meets
 * at least 4.5:1 contrast ratio against the INK color.
 * For night-blue INK, this generally means lightening the color.
 */
export function accentFor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  
  if (contrast(rgbToHex(r, g, b), INK_HEX) >= 4.5) {
    return hex;
  }

  // Convert to HSL, increase L until contrast >= 4.5
  const r_ = r / 255, g_ = g / 255, b_ = b / 255;
  const max = Math.max(r_, g_, b_), min = Math.min(r_, g_, b_);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r_: h = (g_ - b_) / d + (g_ < b_ ? 6 : 0); break;
      case g_: h = (b_ - r_) / d + 2; break;
      case b_: h = (r_ - g_) / d + 4; break;
    }
    h /= 6;
  }

  // Increase lightness step by step
  for (let newL = l; newL <= 1.0; newL += 0.01) {
    let newR, newG, newB;
    if (s === 0) {
      newR = newG = newB = newL;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
      const p = 2 * newL - q;
      newR = hue2rgb(p, q, h + 1/3);
      newG = hue2rgb(p, q, h);
      newB = hue2rgb(p, q, h - 1/3);
    }
    const testHex = rgbToHex(Math.round(newR * 255), Math.round(newG * 255), Math.round(newB * 255));
    if (contrast(testHex, INK_HEX) >= 4.5) {
      return testHex;
    }
  }

  return '#ffffff';
}
