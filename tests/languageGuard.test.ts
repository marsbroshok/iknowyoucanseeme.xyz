import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BaseLayout from '../src/components/BaseLayout.astro';
import { LanguageGuard } from '../src/tools/LanguageGuard.js';
import { pageText } from '../src/tools/PageText.js';
import { UI_BLOCKS } from '../src/i18n/UiCatalog.js';
import type { TextBlock } from '../src/content/schema/index.js';

const block = (en: string, fr: string): TextBlock => ({ status: 'draft', en, fr, sources: ['spec'] }) as TextBlock;
const html = (lang: string, body: string, head = '') =>
  `<!DOCTYPE html><html lang="${lang}"><head>${head}</head><body>${body}</body></html>`;

describe('pageText', () => {
  it('keeps body text, title, meta description and accessible-name attributes', () => {
    const text = pageText(
      html(
        'fr',
        '<p>Bonjour <b>le</b> monde</p><img alt="Texte alt"><a aria-label="Nom accessible" title="Info bulle" href="#">x</a><input placeholder="Indice">',
        '<title>Titre</title><meta name="description" content="Résumé">',
      ),
    );
    for (const part of ['Bonjour', 'le', 'monde', 'Texte alt', 'Nom accessible', 'Info bulle', 'Indice', 'Titre', 'Résumé']) {
      expect(text).toContain(part);
    }
  });

  it('drops scripts, styles, JSON data, other markup and elements marked with a lang', () => {
    const text = pageText(
      html(
        'fr',
        '<script>var Sold = 1;</script><style>.Sold{}</style><script type="application/ld+json">{"x":"Sold"}</script><a lang="en" href="/en/">EN Switch language</a><span class="Sold">Vendu</span>',
      ),
    );
    expect(text).not.toContain('Sold');
    expect(text).not.toContain('Switch language');
    expect(text).toContain('Vendu');
  });

  it('keeps elements marked with the page language and tolerates pages without head or body', () => {
    expect(pageText(html('fr', '<span lang="fr">Bonjour</span>'))).toBe('Bonjour');
    expect(pageText('<html lang="fr"></html>')).toBe('');
  });

  it('leaves unknown named entities untouched', () => {
    expect(pageText(html('fr', '<p>a &bogus; b</p>'))).toBe('a &bogus; b');
  });

  it('decodes the HTML entities Astro emits', () => {
    expect(pageText(html('fr', '<p>d&#39;une &amp; l&#x27;autre &quot;x&quot;&nbsp;y &lt;z&gt;</p>'))).toContain(
      `d'une & l'autre "x" y <z>`,
    );
  });
});

describe('LanguageGuard', () => {
  const guard = new LanguageGuard({ sold: block('Sold', 'Vendu'), same: block('Contact', 'Contact'), rights: block('all rights reserved', 'tous droits réservés') });

  it('flags an English UI string on a French page and vice versa', () => {
    expect(guard.inspect('fr/a/index.html', html('fr', '<p>© Alexander, all rights reserved.</p>'))).toEqual([
      { file: 'fr/a/index.html', rule: 'wrong-language', detail: 'en UI string "all rights reserved" on a fr page' },
    ]);
    expect(guard.inspect('en/a/index.html', html('en', '<p>Vendu</p>')).map((v) => v.detail)).toEqual([
      'fr UI string "Vendu" on a en page',
    ]);
  });

  it('ignores strings that are the same in both languages and the page language itself', () => {
    expect(guard.inspect('fr/a/index.html', html('fr', '<p>Contact · Vendu · tous droits réservés</p>'))).toEqual([]);
    expect(guard.inspect('en/a/index.html', html('en', '<p>Contact · Sold · all rights reserved</p>'))).toEqual([]);
  });

  it('matches whole words only, case-insensitively', () => {
    expect(guard.inspect('fr/a/index.html', html('fr', '<p>Soldes, Soldat</p>'))).toEqual([]);
    expect(guard.inspect('fr/a/index.html', html('fr', '<p>SOLD</p>'))).toHaveLength(1);
  });

  it('accepts other-language text inside an element marked with its lang (WCAG 3.1.2)', () => {
    expect(guard.inspect('fr/a/index.html', html('fr', '<cite lang="en">Sold</cite>'))).toEqual([]);
  });

  it('skips pages without an en/fr html lang (root chooser is bilingual by design)', () => {
    expect(guard.inspect('index.html', '<html><body>Sold Vendu</body></html>')).toEqual([]);
  });

  it('property: any other-language UI string in body text is flagged; marked with lang it is not', () => {
    const entries = Object.entries(UI_BLOCKS).filter(([, b]) => b.en.toLowerCase() !== b.fr.toLowerCase());
    const real = new LanguageGuard(UI_BLOCKS);
    fc.assert(
      fc.property(fc.constantFrom(...entries), fc.constantFrom('en' as const, 'fr' as const), ([, b], lang) => {
        const other = lang === 'en' ? 'fr' : 'en';
        const leaked = real.inspect('x/index.html', html(lang, `<p>${b[other]}</p>`));
        expect(leaked.length).toBeGreaterThan(0);
        expect(real.inspect('x/index.html', html(lang, `<p lang="${other}">${b[other]}</p>`))).toEqual([]);
      }),
    );
  });
});

describe('Rendered layout chrome is in the page language', () => {
  it('a FR page shell has no English UI string and an EN shell no French one', async () => {
    const container = await AstroContainer.create();
    const guard = new LanguageGuard(UI_BLOCKS);
    for (const lang of ['fr', 'en'] as const) {
      const page = await container.renderToString(BaseLayout, {
        props: { lang, routeKey: 'works', title: 'iknowyoucanseeme' },
        request: new Request(`https://www.iknowyoucanseeme.xyz/${lang}/`),
      });
      expect(guard.inspect(`${lang}/index.html`, page)).toEqual([]);
    }
  });
});
