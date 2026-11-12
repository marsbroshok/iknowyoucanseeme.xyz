import { describe, it, expect } from 'vitest';
import { territoryFragmentIds } from '../../../src/world/manifest/TerritoryFragments.js';
import { buildWorldManifest, type ImageResolver } from '../../../src/world/manifest/WorldManifestBuilder.js';
import { FragmentCatalog } from '../../../src/world/core/FragmentCatalog.js';
import { uiText } from '../../../src/i18n/UiCatalog.js';
import { fixtureWork, tb } from '../../pages/fixtures.js';

const dreamland = { slug: 'dreamland', title: { en: 'Dreamland', fr: 'Dreamland' }, statement: tb('One. Two. Three.', 'Un : deux. Trois.') };
const border = { slug: 'the-border-is-thin', title: { en: 'The border is thin', fr: 'La frontière est mince' } };
const works = [
  fixtureWork({ slug: 'a', fragment: tb('Return.', 'Retour.') }),
  fixtureWork({ slug: 'b' }),
  fixtureWork({ slug: 'c', territory: 'the-border-is-thin', fragment: tb('Edge.', 'Bord.') }),
];
const resolve: ImageResolver = async (work) => ({ url: `/_astro/${work.slug}.webp`, width: 10, height: 10 });

describe('territoryFragmentIds', () => {
  it('lists a territory\'s work fragments and statement sentences in the page language', () => {
    expect(territoryFragmentIds(dreamland, works, uiText('en'))).toEqual(['work:a', 'statement:dreamland:0', 'statement:dreamland:1', 'statement:dreamland:2']);
    expect(territoryFragmentIds(dreamland, works, uiText('fr'))).toEqual(['work:a', 'statement:dreamland:0', 'statement:dreamland:1']);
    expect(territoryFragmentIds(border, works, uiText('en'))).toEqual(['work:c']);
  });

  it('matches exactly the fragments the world can surface (same manifest, same rule)', async () => {
    for (const lang of ['en', 'fr'] as const) {
      const ui = uiText(lang);
      const m = await buildWorldManifest({ works, territories: [dreamland, border], zones: [], ui, resolve });
      const catalog = new FragmentCatalog(m.works, m.works, m.territories);
      for (const t of [dreamland, border]) expect(new Set(territoryFragmentIds(t, works, ui))).toEqual(new Set(catalog.idsOf(t.slug)));
    }
  });
});
