import { describe, it, expect } from 'vitest';
import { buildLabelViews } from '../../src/domain/LabelView.js';
import { UiText } from '../../src/i18n/UiText.js';
import { UI_BLOCKS } from '../../src/i18n/UiCatalog.js';
import type { Work } from '../../src/content/schema/index.js';

const SITE = 'https://www.iknowyoucanseeme.xyz';
const work = (over: Partial<Work>): Work =>
  ({
    slug: 'arrivee',
    title: { fr: 'Arrivée', en: 'Arrival' },
    territory: 'dreamland',
    year: 2025,
    medium: 'photo',
    availability: 'unknown',
    images: [],
    ...over,
  }) as Work;

describe('buildLabelViews', () => {
  const works = [
    work({ slug: 'un-etranger', title: { fr: 'Un Étranger' }, size: { w: 30, h: 40, unit: 'cm' } }),
    work({ slug: 'arrivee' }),
    work({ slug: 'esquisse-argile-1', title: { fr: 'Esquisse argile 1' }, medium: 'ceramic', year: 2024 }),
  ];

  it('one label per work, sorted by French title, with the French title even on the EN sheet', () => {
    const labels = buildLabelViews(works, new UiText(UI_BLOCKS, 'en'), SITE);
    expect(labels.map((l) => l.title)).toEqual(['Arrivée', 'Esquisse argile 1', 'Un Étranger']);
  });

  it('size, year and medium in the sheet language; size only when known', () => {
    const fr = buildLabelViews(works, new UiText(UI_BLOCKS, 'fr'), SITE);
    expect(fr.map((l) => l.meta)).toEqual(['2025 · photographie', '2024 · céramique', '30 × 40 cm · 2025 · photographie']);
    const en = buildLabelViews(works, new UiText(UI_BLOCKS, 'en'), SITE);
    expect(en[2].meta).toBe('30 × 40 cm · 2025 · photograph');
  });

  it('points the QR code at the canonical work page of the sheet language', () => {
    expect(buildLabelViews(works, new UiText(UI_BLOCKS, 'fr'), SITE)[0].url).toBe(`${SITE}/fr/oeuvres/arrivee/`);
    expect(buildLabelViews(works, new UiText(UI_BLOCKS, 'en'), `${SITE}/`)[0].url).toBe(`${SITE}/en/works/arrivee/`);
    expect(buildLabelViews(works, new UiText(UI_BLOCKS, 'en'), SITE)[0].displayUrl).toBe('iknowyoucanseeme.xyz/en/works/arrivee/');
  });
});
