import { describe, it, expect } from 'vitest';
import { inspectPage, scriptBytes, jsBudgetFor, CONTACT_JS_BUDGET } from '../src/tools/DistGuard.js';

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
