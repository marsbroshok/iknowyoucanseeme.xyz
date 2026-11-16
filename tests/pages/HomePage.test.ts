import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import HomePage from '../../src/components/pages/HomePage.astro';
import { buildTerritoryTeaser } from '../../src/domain/TerritoryView.js';
import { uiText } from '../../src/i18n/UiCatalog.js';
import { PageSchema } from '../../src/content/schema/index.js';
import { requireBlock } from '../../src/content/PageBlocks.js';
import { fixtureWork, tb } from './fixtures.js';
import { sampleManifest } from '../world/fixtures.js';
import { scriptBytes } from '../../src/tools/DistGuard.js';

const thresholdPage = PageSchema.parse(
  yaml.parse(fs.readFileSync(path.resolve(__dirname, '../../src/content/copy/pages/threshold.yaml'), 'utf8')),
);
const thresholdLineOf = (lang: 'en' | 'fr') => requireBlock(thresholdPage, 'line', lang);

const works = [
  fixtureWork(),
  fixtureWork({ slug: 'solitude', title: { fr: 'Solitude' }, zone: 'lens' }),
  fixtureWork({ slug: 'dissonance', title: { fr: 'Dissonance' }, zone: 'leak' }),
  fixtureWork({ slug: 'un-etranger', title: { fr: 'Un étranger' }, zone: 'leak', year: 2024 }),
  fixtureWork({ slug: 'cygne-icm-1', title: { fr: 'Cygne 1' }, territory: 'the-border-is-thin', zone: undefined, year: 2026 }),
];
const territories = [
  { slug: 'dreamland', title: { en: 'Dreamland', fr: 'Dreamland' }, statement: tb('A dream. More.', 'Un rêve. Plus.') },
  { slug: 'the-border-is-thin', title: { en: 'The border is thin', fr: "La frontière s'efface" }, statement: tb('Thin.', 'Fine.') },
];

describe('HomePage', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  const render = (lang: 'en' | 'fr') =>
    container.renderToString(HomePage, {
      props: {
        lang,
        territories: territories.map((t) => buildTerritoryTeaser(t, works, uiText(lang))),
        thresholdLine: thresholdLineOf(lang),
      },
      request: new Request(`https://www.iknowyoucanseeme.xyz/${lang}/`),
    });

  it('renders artist h1, single signature, threshold border line, artist practice, territories, and never duplicates gaze (EN)', async () => {
    const html = await render('en');
    expect(html).toContain('<html lang="en"');
    expect(html).toMatch(/<h1[^>]*>Alexander Usoltsev<\/h1>/);
    expect(html).toContain(thresholdLineOf('en'));
    expect(html).toContain('Photographer &amp; ceramic artist');
    expect(html).not.toContain('I know you can see me');
    expect(html).not.toContain('Je sais que tu me vois');
    const bodyHtml = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? '';
    const visibleText = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
    expect(visibleText.match(/iknowyoucanseeme/g)).toHaveLength(1);
    expect(html).toContain('href="/en/territories/dreamland/"');
    expect(html).toContain('href="/en/territories/the-border-is-thin/"');
    expect(html).toContain('A dream. More.');
    const dreamland = html.split('data-territory="dreamland"')[1].split('</article>')[0];
    expect(dreamland.match(/class="work-card"/g)).toHaveLength(3);
    expect(dreamland).toContain('href="/en/works/arrivee/"');
    for (const href of ['/en/about/', '/en/exhibitions/', '/en/contact/', '/en/works/']) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('rel="canonical" href="https://www.iknowyoucanseeme.xyz/en/"');
    expect(html).toContain('hreflang="fr" href="https://www.iknowyoucanseeme.xyz/fr/"');
    // axe landmark-unique: only the header navigation is a <nav> landmark.
    expect(html.match(/<nav\b/g)).toHaveLength(1);
  });

  it('renders the French home with Alexander Usoltsev h1, single signature, French border line, and no gaze duplication', async () => {
    const html = await render('fr');
    expect(html).toContain('<html lang="fr"');
    expect(html).toMatch(/<h1[^>]*>Alexander Usoltsev<\/h1>/);
    expect(html).toContain("La frontière se trouble, les réalités se mêlent, et le Dreamland s'infiltre dans notre monde.".replace("'", '&#39;'));
    expect(html).toContain('Photographe et artiste céramiste');
    expect(html).not.toContain('Je sais que tu me vois');
    expect(html).not.toContain('I know you can see me');
    const bodyHtml = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? '';
    const visibleText = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
    expect(visibleText.match(/iknowyoucanseeme/g)).toHaveLength(1);
    expect(html).toContain("La frontière s'efface".replace("'", '&#39;'));
    expect(html).toContain('href="/fr/a-propos/"');
    expect(html).toContain('href="/fr/expositions/"');
    expect(html).toContain('href="/fr/oeuvres/arrivee/"');
    expect(html).not.toContain('€');
  });

  describe('with the drift world', () => {
    const renderWorld = (lang: 'en' | 'fr') =>
      container.renderToString(HomePage, {
        props: {
          lang,
          territories: territories.map((t) => buildTerritoryTeaser(t, works, uiText(lang))),
          thresholdLine: thresholdLineOf(lang),
          world: { ...sampleManifest, lang },
        },
        request: new Request(`https://www.iknowyoucanseeme.xyz/${lang}/`),
      });

    it('adds the hidden world layer after the footer (outside main), and keeps the awake page whole', async () => {
      const html = await renderWorld('en');
      const layer = html.indexOf('data-drift ');
      expect(layer).toBeGreaterThan(html.indexOf('</footer>'));
      expect(html.slice(layer - 40, layer + 120)).toMatch(/<section class="drift" data-drift hidden tabindex="-1" aria-label="The drift"/);
      expect(html).toContain('data-territory="dreamland"');
      expect(html).toContain('>Wake up</button>');
      expect(html).toContain('aria-label="Works around you"');
      expect(html).toContain('data-zone-banner');
      expect(html).toContain('data-zones-label="Zones and territories"');
      expect(html).toContain('data-drift-onboarding');
      expect(html).toContain('data-drift-dock');
      expect(html).toContain('data-drift-prev');
      expect(html).toContain('data-drift-current');
      expect(html).toContain('data-drift-next');
      expect(html).toContain('data-lens-cycle');
      expect(html).toContain('data-drift-help-toggle');
      expect(html).toContain('data-drift-help-panel');
      expect(html.indexOf('data-drift-dock')).toBeGreaterThan(html.indexOf('data-drift-works'));
      expect(html.indexOf('data-drift-help-panel')).toBeGreaterThan(html.indexOf('data-drift-works'));
      expect(html.indexOf('data-drift-compass')).toBeGreaterThan(html.indexOf('data-drift-works'));
      expect(html).toMatch(/<canvas[^>]*data-drift-canvas[^>]*aria-hidden="true"/);
    });

    it('has the focus dialog, labelled by its title, with context header, curatorial meta, in-place stepper, light dismiss, and localized links', async () => {
      const html = await renderWorld('fr');
      expect(html).toMatch(/<dialog class="drift-focus" data-drift-focus closedby="any" aria-labelledby="drift-focus-title"/);
      expect(html).toContain('data-focus-context');
      expect(html).toContain('data-focus-meta');
      expect(html).toContain('data-focus-prev');
      expect(html).toContain('data-focus-next');
      expect(html).toContain('>Voir la page de l&#39;œuvre</a>');
      expect(html).toContain('>Demander au sujet de cette œuvre</a>');
      expect(html).toContain('data-focus-close');
    });

    it('offers a hidden "Drift" button and hidden [data-awake-resume] link in the intro (shown by the boot script on the awake layer), with no [data-header-drift] on Home', async () => {
      const html = await renderWorld('fr');
      expect(html).toMatch(/<button type="button" class="drift-start"[^>]*data-drift-start[^>]*hidden[^>]*>Dériver<\/button>/);
      expect(html).toMatch(/<a[^>]*data-awake-resume[^>]*data-resume-template="[^"]*\{title\}"[^>]*hidden/);
      expect(html).not.toContain('data-header-drift');
      expect(html).toContain('>Se réveiller</button>');
      expect(html).toContain('Bouger avec le téléphone');
    });

    it('embeds the world manifest as JSON data (not executable script)', async () => {
      const html = await renderWorld('fr');
      const json = /<script type="application\/json" id="drift-manifest">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
      expect(JSON.parse(json)).toEqual({ ...sampleManifest, lang: 'fr' });
      expect(scriptBytes(html).inlineBytes).toBe(0);
    });

    it('keeps the manifest inside its script element even when a fragment holds </script>', async () => {
      const fragment = 'Avant </script><script>alert(1)</script> & après <!-- fin';
      const world = { ...sampleManifest, works: sampleManifest.works.map((w, i) => (i === 0 ? { ...w, fragment } : w)) };
      const html = await container.renderToString(HomePage, {
        props: {
          lang: 'fr',
          territories: territories.map((t) => buildTerritoryTeaser(t, works, uiText('fr'))),
          thresholdLine: thresholdLineOf('fr'),
          world,
        },
        request: new Request('https://www.iknowyoucanseeme.xyz/fr/'),
      });
      const json = /<script type="application\/json" id="drift-manifest">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
      expect(JSON.parse(json).works[0].fragment).toBe(fragment);
      expect(html).not.toContain('<script>alert(1)');
    });

    it('renders threshold border line on [data-threshold] and reserves gaze strictly for [data-drift-gaze]', async () => {
      for (const [lang, gaze, otherGaze] of [
        ['en', 'I know you can see me', 'Je sais que tu me vois'],
        ['fr', 'Je sais que tu me vois', 'I know you can see me'],
      ] as const) {
        const html = await renderWorld(lang);
        const thresholdBlock = /<div class="drift-threshold"[^>]*data-threshold[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
        const expectedLine = thresholdLineOf(lang).replace("'", '&#39;');
        expect(thresholdBlock, lang).toContain(expectedLine);
        expect(thresholdBlock, lang).not.toContain(gaze);
        expect(thresholdBlock, lang).not.toContain(otherGaze);

        const mainBlock = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? '';
        expect(mainBlock, lang).not.toContain(gaze);
        expect(mainBlock, lang).not.toContain(otherGaze);

        const gazeElements = [...html.matchAll(/<p[^>]*data-drift-gaze[^>]*>([\s\S]*?)<\/p>/g)];
        expect(gazeElements, lang).toHaveLength(1);
        expect(gazeElements[0][1], lang).toBe(gaze);
        expect(html.split(gaze).length - 1, lang).toBe(1);
      }
    });

    it('names the six lenses in the page language and explains the lens controls (live caption)', async () => {
      for (const [lang, names, help] of [
        ['en', ['Colour filter', 'Mirror fold', 'Multiple exposure', 'Fracture and collage', 'Light leak', 'Motion blur'], 'Hold Shift or tap with two fingers'],
        ['fr', ['Filtre coloré', 'Pli de miroir', 'Exposition multiple', 'Fracture et collage', 'Fuite de lumière', 'Flou de mouvement'], 'Maintenez Maj ou touchez avec deux doigts'],
      ] as const) {
        const html = await renderWorld(lang);
        const caption = /<p class="drift-lens" data-drift-lens aria-live="polite" data-lens-names="([^"]*)"[^>]*><\/p>/.exec(html);
        expect(caption, lang).not.toBeNull();
        const parsed = JSON.parse((caption?.[1] ?? '').replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n))).replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
        expect(Object.keys(parsed)).toEqual(['gel', 'mirror', 'exposure', 'fracture', 'flare', 'icm']);
        expect(Object.values(parsed)).toEqual(names);
        expect(html).toContain(help);
      }
    });

    it('renders no world without a manifest', async () => {
      const html = await render('en');
      expect(html).not.toContain('data-drift');
      expect(html).not.toContain('drift-manifest');
    });
  });
});
