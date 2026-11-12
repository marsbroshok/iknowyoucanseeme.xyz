import { describe, it, expect } from 'vitest';
import { parseManifest } from '../../../src/world/core/WorldManifest.js';
import { sampleManifest } from '../fixtures.js';

describe('parseManifest', () => {
  it('accepts a well-formed manifest unchanged', () => {
    expect(parseManifest(JSON.parse(JSON.stringify(sampleManifest)))).toEqual(sampleManifest);
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
    ['a territory without title', { ...sampleManifest, territories: [{ slug: 'dreamland' }] }, /territories\[0\]\.title/],
  ])('rejects %s', (_label, input, message) => {
    expect(() => parseManifest(input)).toThrow(message);
  });
});
