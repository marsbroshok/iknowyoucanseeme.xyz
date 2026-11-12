import { describe, it, expect } from 'vitest';
import { inspectPage, scriptBytes, jsBudgetFor, isAllowedExternalScript, CONTACT_JS_BUDGET } from '../src/tools/DistGuard.js';

const page = (body: string, head = '') => `<!DOCTYPE html><html lang="en"><head>
<link rel="canonical" href="https://x/en/a/">
<link rel="alternate" hreflang="en" href="https://x/en/a/">
<link rel="alternate" hreflang="fr" href="https://x/fr/a/">
<link rel="alternate" hreflang="x-default" href="https://x/en/a/">${head}</head><body>${body}</body></html>`;

describe('inspectPage', () => {
  it('accepts a clean localized page', () => {
    expect(inspectPage('en/a/index.html', page('<p>Contact for availability</p>'))).toEqual([]);
  });

  it.each([['12 €'], ['EUR 300'], ['Price on request'], ['prix sur demande'], ['$450']])('flags price content: %s', (text) => {
    const v = inspectPage('en/a/index.html', page(`<p>${text}</p>`));
    expect(v.map((x) => x.rule)).toContain('no-price');
  });

  it('flags missing lang, canonical and hreflang alternates', () => {
    const v = inspectPage('fr/b/index.html', '<html><head></head><body></body></html>');
    expect(v.map((x) => x.rule).sort()).toEqual(['canonical', 'hreflang-en', 'hreflang-fr', 'hreflang-x-default', 'lang']);
  });

  it('flags a duplicated canonical', () => {
    const v = inspectPage('en/a/index.html', page('', '<link rel="canonical" href="https://x/other/">'));
    expect(v.map((x) => x.rule)).toEqual(['canonical']);
  });

  it('only requires lang on the root chooser', () => {
    expect(inspectPage('index.html', '<html lang="en"><head></head><body></body></html>')).toEqual([]);
    expect(inspectPage('index.html', '<html><head></head></html>').map((x) => x.rule)).toEqual(['lang']);
  });

  it('enforces the JavaScript budget per page', () => {
    const js = '<script type="module">' + 'x'.repeat(100) + '</script>';
    expect(inspectPage('en/a/index.html', page(js)).map((x) => x.rule)).toEqual(['js-budget']);
    expect(inspectPage('en/contact/index.html', page(js))).toEqual([]);
    const big = '<script type="module">' + 'x'.repeat(CONTACT_JS_BUDGET + 1) + '</script>';
    expect(inspectPage('fr/contact/index.html', page(big)).map((x) => x.rule)).toEqual(['js-budget']);
    expect(inspectPage('en/a/index.html', page('<script src="/_astro/x.js"></script>')).map((x) => x.rule)).toEqual(['js-budget']);
  });
});

describe('inspectPage: redirect pages of old addresses', () => {
  const redirect = (head: string) => `<!DOCTYPE html><html lang="en"><head>${head}</head><body><a href="/en/">Go</a></body></html>`;
  const good = '<meta http-equiv="refresh" content="0; url=/en/territories/dreamland/"><link rel="canonical" href="https://x/en/territories/dreamland/"><meta name="robots" content="noindex">';

  it('accepts a refresh to the canonical page, not indexed, without hreflang', () => {
    expect(inspectPage('dreamland/index.html', redirect(good))).toEqual([]);
  });

  it('flags a refresh that disagrees with the canonical, a missing noindex or a missing canonical', () => {
    const other = good.replace('url=/en/territories/dreamland/', 'url=/en/');
    expect(inspectPage('dreamland/index.html', redirect(other)).map((v) => v.rule)).toEqual(['redirect']);
    expect(inspectPage('blog/index.html', redirect(good.replace('<meta name="robots" content="noindex">', ''))).map((v) => v.detail)).toEqual([
      'redirect page must be noindex',
    ]);
    expect(inspectPage('uses/index.html', redirect(good.replace(/<link[^>]*>/, ''))).map((v) => v.rule)).toEqual(['canonical', 'redirect']);
  });

  it('still requires hreflang alternates on localized pages, even with a refresh', () => {
    expect(inspectPage('en/x/index.html', redirect(good)).map((v) => v.rule)).toEqual(['hreflang-en', 'hreflang-fr', 'hreflang-x-default']);
  });
});

describe('inspectPage: analytics script', () => {
  const goatcounter = '<script async data-goatcounter="https://site.goatcounter.com/count" src="https://gc.zgo.at/count.js"></script>';

  it('allows GoatCounter\'s external script on any page, on top of the inline budget', () => {
    expect(inspectPage('en/a/index.html', page(goatcounter))).toEqual([]);
    expect(inspectPage('index.html', `<html lang="en"><body>${goatcounter}<script>${'x'.repeat(10)}</script></body></html>`)).toEqual([]);
  });

  it('still flags any other external script, and inline code next to GoatCounter', () => {
    const other = '<script async src="https://cdn.example.com/count.js"></script>';
    expect(inspectPage('en/a/index.html', page(goatcounter + other)).map((x) => x.detail)).toEqual([
      'inline 0 B (budget 0 B), external https://cdn.example.com/count.js',
    ]);
    expect(inspectPage('en/a/index.html', page(`${goatcounter}<script>track()</script>`)).map((x) => x.rule)).toEqual(['js-budget']);
  });
});

describe('scriptBytes', () => {
  it('counts executable scripts and ignores JSON data blocks', () => {
    const html =
      '<script type="application/ld+json">{"a":1}</script><script type="application/json" id="t">{}</script>' +
      '<script>abc</script><script type="module">de</script><script src="/x.js"></script>';
    expect(scriptBytes(html)).toEqual({ inlineBytes: 5, external: ['/x.js'] });
  });
});

describe('jsBudgetFor', () => {
  it('allows the contact enhancement and the root chooser only', () => {
    expect(jsBudgetFor('en/contact/index.html')).toBe(CONTACT_JS_BUDGET);
    expect(jsBudgetFor('index.html')).toBeGreaterThan(0);
    expect(jsBudgetFor('fr/oeuvres/arrivee/index.html')).toBe(0);
  });
});

describe('inspectPage: drift world modules (ADR 0007)', () => {
  const boot = '<script type="module" src="/_astro/DriftIsland.astro_astro_type_script_index_0_lang.BMdQS50T.js"></script>';

  it('allows the site\'s own module scripts from /_astro/ on the two home pages', () => {
    expect(inspectPage('en/index.html', page(boot))).toEqual([]);
    expect(inspectPage('fr/index.html', page(boot))).toEqual([]);
    expect(isAllowedExternalScript('fr/index.html', '/_astro/a.js')).toBe(true);
  });

  it('still flags them anywhere else (awake pages ship no JavaScript)', () => {
    expect(inspectPage('en/works/arrivee/index.html', page(boot)).map((v) => v.rule)).toEqual(['js-budget']);
    expect(isAllowedExternalScript('en/about/index.html', '/_astro/a.js')).toBe(false);
  });

  it('flags other origins, other folders and non-JS files on the home pages too', () => {
    for (const src of ['https://cdn.example.com/three.js', '//cdn.example.com/a.js', '/scripts/a.js', '/_astro/sub/a.js', '/_astro/a.css']) {
      expect(isAllowedExternalScript('en/index.html', src), src).toBe(false);
    }
  });

  it('keeps the home pages\' inline budget at zero', () => {
    expect(jsBudgetFor('en/index.html')).toBe(0);
    expect(inspectPage('en/index.html', page(`${boot}<script>x()</script>`)).map((v) => v.rule)).toEqual(['js-budget']);
  });
});
