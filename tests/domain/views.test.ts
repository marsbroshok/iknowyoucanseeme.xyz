import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildWorkView } from '../../src/domain/WorkView.js';
import { excerpt } from '../../src/domain/TextExcerpt.js';
import { sortExhibitions } from '../../src/domain/ExhibitionQueries.js';
import { pickSpread } from '../../src/domain/WorkQueries.js';
import { uiText } from '../../src/i18n/UiCatalog.js';
import type { Work } from '../../src/content/schema/index.js';

const work = (over: Partial<Work> = {}): Work => ({
  slug: 'arrivee',
  title: { fr: 'Arrivée' },
  territory: 'dreamland',
  zone: 'arrival',
  year: 2025,
  medium: 'photo',
  availability: 'unknown',
  images: [{ src: '0.jpg', source: 'instagram', width: 1440, height: 1800, palette: ['#112233'] }],
  ...over,
});

describe('buildWorkView', () => {
  it('EN site: FR title + EN subtitle, localized medium, contact link with ?work=', () => {
    const v = buildWorkView(
      work({ title: { fr: 'Un étranger', en: 'A Stranger' }, size: { w: 30, h: 40, unit: 'cm' }, techniques: ['ICM', 'colour filter'] }),
      uiText('en'),
    );
    expect(v.title).toBe('Un étranger');
    expect(v.year).toBe(2025);
    expect(v.subtitle).toBe('A Stranger');
    expect(v.displayTitle).toBe('Un étranger (A Stranger)');
    expect(v.metaLine).toBe('30 × 40 cm · 2025 · photograph · ICM, colour filter');
    expect(v.href).toBe('/en/works/arrivee/');
    expect(v.driftHref).toBe('/en/?w=arrivee');
    expect(v.medium).toBe('photo');
    expect(v.mediumLabel).toBe('photograph');
    expect(v.zone).toBe('arrival');
    expect(v.contactHref).toBe('/en/contact/?work=arrivee');
    expect(v.availabilityLabel).toBe('Contact for availability');
    expect(v.enquirable).toBe(true);
  });

  it('FR site: never shows the EN subtitle; ceramic label; no size/techniques', () => {
    const v = buildWorkView(work({ title: { fr: 'Bol', en: 'Bowl' }, medium: 'ceramic', techniques: [] }), uiText('fr'));
    expect(v.subtitle).toBeUndefined();
    expect(v.displayTitle).toBe('Bol');
    expect(v.metaLine).toBe('2025 · céramique');
    expect(v.href).toBe('/fr/oeuvres/arrivee/');
    expect(v.contactHref).toBe('/fr/contact/?work=arrivee');
  });

  it('names declared techniques in the page language (FR pages stay French), and fails the build for an unnamed one', () => {
    expect(buildWorkView(work({ techniques: ['colour filter'] }), uiText('fr')).metaLine).toBe('2025 · photographie · filtre coloré');
    expect(buildWorkView(work({ techniques: ['Colour  Filter'] }), uiText('en')).metaLine).toBe('2025 · photograph · colour filter');
    expect(() => buildWorkView(work({ techniques: ['cyanotype'] }), uiText('fr'))).toThrow('[UiText] Missing UI string "technique_cyanotype"');
  });

  it('EN site without EN title shows only the FR title', () => {
    const v = buildWorkView(work(), uiText('en'));
    expect(v.subtitle).toBeUndefined();
    expect(v.displayTitle).toBe('Arrivée');
    expect(v.alt).toBe('Arrivée');
  });

  it('sold works are not enquirable and the fragment follows the locale', () => {
    const fragment = { status: 'draft' as const, en: 'The return.', fr: 'Le retour.', sources: ['x'] };
    const v = buildWorkView(work({ availability: 'sold', fragment }), uiText('fr'));
    expect(v.enquirable).toBe(false);
    expect(v.fragment).toBe('Le retour.');
    expect(buildWorkView(work(), uiText('fr')).fragment).toBeUndefined();
  });

  it('never contains a currency sign for any availability', () => {
    for (const availability of ['available', 'sold', 'not-for-sale', 'unknown'] as const) {
      const v = buildWorkView(work({ availability }), uiText('en'));
      expect(JSON.stringify(v)).not.toMatch(/€|\$|£/);
    }
  });
});

describe('excerpt', () => {
  it('keeps whole sentences within the limit', () => {
    expect(excerpt('One two. Three four. Five six.', 20)).toBe('One two. Three four.');
  });

  it('returns the text unchanged when short enough', () => {
    expect(excerpt('Short.', 100)).toBe('Short.');
  });

  it('cuts a too-long first sentence at a word boundary with an ellipsis', () => {
    expect(excerpt('Alpha beta gamma delta epsilon', 15)).toBe('Alpha beta…');
  });

  it('cuts a single long word hard', () => {
    expect(excerpt('Supercalifragilistic', 5)).toBe('Super…');
  });

  it('property: output never exceeds max + 1 chars and is a prefix (minus ellipsis)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 300 }), fc.integer({ min: 1, max: 200 }), (text, max) => {
        const out = excerpt(text, max);
        expect(out.length).toBeLessThanOrEqual(max + 1);
        expect(text.trim().startsWith(out.replace(/…$/, '').trimEnd())).toBe(true);
      }),
    );
  });
});

describe('sortExhibitions', () => {
  it('orders newest year first, then slug descending', () => {
    const sorted = sortExhibitions([
      { slug: 'mpaa-2019', year: 2019 },
      { slug: 'a-2025', year: 2025 },
      { slug: 'b-2025', year: 2025 },
    ]);
    expect(sorted.map((e) => e.slug)).toEqual(['b-2025', 'a-2025', 'mpaa-2019']);
  });
});

describe('pickSpread', () => {
  const list = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  it('spreads picks from first to last', () => {
    expect(pickSpread(list, 3)).toEqual(['a', 'd', 'g']);
  });
  it('returns everything when n >= length, and handles n <= 1', () => {
    expect(pickSpread(['a', 'b'], 3)).toEqual(['a', 'b']);
    expect(pickSpread(list, 1)).toEqual(['a']);
    expect(pickSpread(list, 0)).toEqual([]);
  });
  it('property: picks are distinct, ordered, and min(n, length) long', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer(), { maxLength: 50 }), fc.integer({ min: 0, max: 10 }), (xs, n) => {
        const out = pickSpread(xs, n);
        expect(out).toHaveLength(Math.min(n, xs.length));
        expect(new Set(out).size).toBe(out.length);
        const idx = out.map((x) => xs.indexOf(x));
        expect([...idx].sort((a, b) => a - b)).toEqual(idx);
      }),
    );
  });
});
