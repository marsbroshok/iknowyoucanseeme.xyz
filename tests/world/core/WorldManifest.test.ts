import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseManifest } from '../../../src/world/core/WorldManifest.js';
import { sampleManifest } from '../fixtures.js';

describe('parseManifest', () => {
  it('accepts a well-formed manifest unchanged, including curatorial metadata and sequence fields', () => {
    const parsed = parseManifest(JSON.parse(JSON.stringify(sampleManifest)));
    expect(parsed).toEqual(sampleManifest);
    expect(parsed.works[0]).toMatchObject({
      metaLine: '30 × 40 cm · 2025 · photographie',
      availabilityLabel: 'Disponibilité sur demande',
      contextLabel: 'Dreamland · Arrivée',
      positionIndex: 1,
      positionTotal: 2,
    });
    expect(parsed.works[1]).toMatchObject({
      metaLine: '2026 · photographie · ICM',
      availabilityLabel: 'Vendu',
      contextLabel: 'La frontière est mince',
      positionIndex: 2,
      positionTotal: 2,
    });
  });

  it('property: accepts any positive integer sequence 1 <= positionIndex <= positionTotal and rejects out-of-range indices', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 1, max: 200 }),
        (a, b) => {
          const total = Math.max(a, b);
          const index = Math.min(a, b);
          const valid = {
            ...sampleManifest,
            works: [{ ...sampleManifest.works[0], positionIndex: index, positionTotal: total }],
          };
          const parsed = parseManifest(JSON.parse(JSON.stringify(valid)));
          expect(parsed.works[0].positionIndex).toBe(index);
          expect(parsed.works[0].positionTotal).toBe(total);

          const overflow = {
            ...sampleManifest,
            works: [{ ...sampleManifest.works[0], positionIndex: total + 1, positionTotal: total }],
          };
          expect(() => parseManifest(overflow)).toThrow(/works\[0\]\.positionIndex/);
        },
      ),
    );
  });

  it('accepts a specimen label on a Leak-zone work', () => {
    const leak = { ...sampleManifest.works[0], zone: 'leak' as const, specimen: 'spécimen 01 · Venise · 2025' };
    expect(parseManifest(JSON.parse(JSON.stringify({ ...sampleManifest, works: [leak] }))).works[0].specimen).toBe('spécimen 01 · Venise · 2025');
  });

  it('accepts a zone excerpt string or null and normalizes omitted excerpt to null', () => {
    const withExcerpt = {
      ...sampleManifest,
      zones: [
        { slug: 'arrival', title: 'Arrivée', excerpt: 'Une arrivée dans le rêve.' },
        { slug: 'lens', title: 'La Loupe' },
      ],
    };
    expect(parseManifest(JSON.parse(JSON.stringify(withExcerpt))).zones).toEqual([
      { slug: 'arrival', title: 'Arrivée', excerpt: 'Une arrivée dans le rêve.' },
      { slug: 'lens', title: 'La Loupe', excerpt: null },
    ]);
  });

  it.each([
    ['not an object', 42, /manifest must be an object/],
    ['a wrong language', { ...sampleManifest, lang: 'de' }, /lang/],
    ['territories missing', { ...sampleManifest, territories: undefined }, /territories/],
    ['a zone outside the list', { ...sampleManifest, works: [{ ...sampleManifest.works[0], zone: 'moon' }] }, /works\[0\]\.zone/],
    ['a bad colour', { ...sampleManifest, works: [{ ...sampleManifest.works[0], color: 'blue' }] }, /works\[0\]\.color/],
    ['a missing image size', { ...sampleManifest, works: [{ ...sampleManifest.works[0], images: { ...sampleManifest.works[0].images, mid: { url: '/a.webp', width: 0, height: 10 } } }] }, /works\[0\]\.images\.mid/],
    ['an empty title', { ...sampleManifest, works: [{ ...sampleManifest.works[0], title: '' }] }, /works\[0\]\.title/],
    ['a fragment that is not text', { ...sampleManifest, works: [{ ...sampleManifest.works[0], fragment: 3 }] }, /works\[0\]\.fragment/],
    ['a contact link that is not text', { ...sampleManifest, works: [{ ...sampleManifest.works[0], contactHref: false }] }, /works\[0\]\.contactHref/],
    ['a work of an unknown territory', { ...sampleManifest, works: [{ ...sampleManifest.works[0], territory: 'moon' }] }, /works\[0\]\.territory/],
    ['an off-site link', { ...sampleManifest, works: [{ ...sampleManifest.works[0], href: 'https://evil.example/' }] }, /works\[0\]\.href/],
    ['a work that is not an object', { ...sampleManifest, works: [null] }, /works\[0\] must be an object/],
    ['techniques that are not a list', { ...sampleManifest, works: [{ ...sampleManifest.works[0], techniques: 'icm' }] }, /works\[0\]\.techniques must be an array/],
    ['a technique that is not text', { ...sampleManifest, works: [{ ...sampleManifest.works[0], techniques: [7] }] }, /works\[0\]\.techniques\[0\]/],
    ['a palette that is not a list', { ...sampleManifest, works: [{ ...sampleManifest.works[0], palette: null }] }, /works\[0\]\.palette must be an array/],
    ['a palette entry that is not a colour', { ...sampleManifest, works: [{ ...sampleManifest.works[0], palette: ['#123456', 'red'] }] }, /works\[0\]\.palette\[1\] must be #rrggbb/],
    ['a specimen label that is not text', { ...sampleManifest, works: [{ ...sampleManifest.works[0], specimen: 3 }] }, /works\[0\]\.specimen/],
    ['an off-site QR code', { ...sampleManifest, works: [{ ...sampleManifest.works[0], qr: 'https://evil.example/qr.svg' }] }, /works\[0\]\.qr/],
    ['a territory without title', { ...sampleManifest, territories: [{ slug: 'dreamland', sentences: [] }] }, /territories\[0\]\.title/],
    ['a territory without sentences', { ...sampleManifest, territories: [{ slug: 'dreamland', title: 'Dreamland' }] }, /territories\[0\]\.sentences must be an array/],
    ['an empty sentence', { ...sampleManifest, territories: [{ slug: 'dreamland', title: 'Dreamland', sentences: [''] }] }, /territories\[0\]\.sentences\[0\]/],
    ['a non-string zone excerpt', { ...sampleManifest, zones: [{ slug: 'arrival', title: 'Arrivée', excerpt: 42 }] }, /zones\[0\]\.excerpt/],
    ['an empty zone excerpt', { ...sampleManifest, zones: [{ slug: 'arrival', title: 'Arrivée', excerpt: '' }] }, /zones\[0\]\.excerpt/],
    ['an empty metaLine', { ...sampleManifest, works: [{ ...sampleManifest.works[0], metaLine: '' }] }, /works\[0\]\.metaLine/],
    ['a non-string availabilityLabel', { ...sampleManifest, works: [{ ...sampleManifest.works[0], availabilityLabel: null }] }, /works\[0\]\.availabilityLabel/],
    ['an empty contextLabel', { ...sampleManifest, works: [{ ...sampleManifest.works[0], contextLabel: '' }] }, /works\[0\]\.contextLabel/],
    ['a zero positionTotal', { ...sampleManifest, works: [{ ...sampleManifest.works[0], positionTotal: 0 }] }, /works\[0\]\.positionTotal/],
    ['a fractional positionTotal', { ...sampleManifest, works: [{ ...sampleManifest.works[0], positionTotal: 2.5 }] }, /works\[0\]\.positionTotal/],
    ['a zero positionIndex', { ...sampleManifest, works: [{ ...sampleManifest.works[0], positionIndex: 0, positionTotal: 2 }] }, /works\[0\]\.positionIndex/],
    ['a non-integer positionIndex', { ...sampleManifest, works: [{ ...sampleManifest.works[0], positionIndex: '1', positionTotal: 2 }] }, /works\[0\]\.positionIndex/],
  ])('rejects %s', (_label, input, message) => {
    expect(() => parseManifest(input)).toThrow(message);
  });
});
