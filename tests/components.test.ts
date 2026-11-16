import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BaseLayout from '../src/components/BaseLayout.astro';
import Header from '../src/components/Header.astro';
import Footer from '../src/components/Footer.astro';
import SkipLink from '../src/components/SkipLink.astro';
import WorkImage from '../src/components/WorkImage.astro';
import Fragment from '../src/components/Fragment.astro';
import Meta from '../src/components/Meta.astro';

describe('Astro Components Container', () => {
  let container: AstroContainer;

  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  describe('BaseLayout', () => {
    it('renders lang attr, canonical, hreflang, and no search/theme toggle', async () => {
      const result = await container.renderToString(BaseLayout, {
        props: {
          lang: 'en',
          routeKey: 'works',
          title: 'Test Title'
        },
        request: new Request('https://www.iknowyoucanseeme.xyz/en/works/')
      });

      expect(result).toContain('lang="en"');
      expect(result).toContain('<title>Test Title</title>');
      expect(result).toContain('rel="canonical" href="https://www.iknowyoucanseeme.xyz/en/works/"');
      expect(result).toContain('hreflang="fr"');
      expect(result).toContain('hreflang="en"');
      
      // Header & Footer inner 72rem alignment assertions
      expect(result).toContain('iknowyoucanseeme'); // signature
      expect(result).toContain('class="site-header-inner"');
      expect(result).toContain('class="site-footer-inner"');
      const headerCss = fs.readFileSync(path.resolve(__dirname, '../src/components/Header.astro'), 'utf8');
      const footerCss = fs.readFileSync(path.resolve(__dirname, '../src/components/Footer.astro'), 'utf8');
      expect(headerCss).toMatch(/\.site-header-inner\s*\{[\s\S]*?max-width:\s*72rem/);
      expect(footerCss).toMatch(/\.site-footer-inner\s*\{[\s\S]*?max-width:\s*72rem/);
      expect(result).not.toContain('search');
      expect(result).not.toContain('theme toggle');
      
      // Footer assertions
      expect(result).toContain('Alexander Usoltsev, all rights reserved');
    });
  });

  describe('Header', () => {
    it('renders localized links, 72rem inner container, and ?drift=1 portal on non-Home routes', async () => {
      const result = await container.renderToString(Header, {
        props: {
          lang: 'en',
          currentRouteKey: 'works'
        }
      });
      expect(result).toContain('class="site-header-inner"');
      expect(result).toContain('href="/fr/oeuvres/"');
      expect(result).toContain('iknowyoucanseeme');
      expect(result).toMatch(/<a[^>]*href="\/en\/\?drift=1"[^>]*data-header-drift[^>]*>Drift<\/a>/);
      expect(result).toMatch(/<a[^>]*href="\/en\/works\/"[^>]*aria-current="page"[^>]*>Works<\/a>/);
      expect(result).not.toContain('data-section-active="true"');
    });

    it('omits [data-header-drift] on Home and marks signature aria-current="page"', async () => {
      const result = await container.renderToString(Header, {
        props: {
          lang: 'fr',
          currentRouteKey: 'home'
        }
      });
      expect(result).not.toContain('data-header-drift');
      expect(result).toMatch(/class="signature"[^>]*aria-current="page"/);
    });

    it('links [data-header-drift] to ?w=<slug> on Work pages and sets data-section-active on Works nav', async () => {
      const workHeader = await container.renderToString(Header, {
        props: {
          lang: 'en',
          currentRouteKey: 'works',
          routeParams: { en: ['solitude'], fr: ['solitude'] }
        }
      });
      expect(workHeader).toMatch(/<a[^>]*href="\/en\/\?w=solitude"[^>]*data-header-drift[^>]*>Drift<\/a>/);
      expect(workHeader).toMatch(/<a[^>]*href="\/en\/works\/"[^>]*data-section-active="true"[^>]*>Works<\/a>/);
      expect(workHeader).not.toContain('aria-current="page"');

      const territoryHeader = await container.renderToString(Header, {
        props: {
          lang: 'fr',
          currentRouteKey: 'territories',
          routeParams: { en: ['dreamland'], fr: ['dreamland'] },
          driftHref: '/fr/?w=arrivee'
        }
      });
      expect(territoryHeader).toMatch(/<a[^>]*href="\/fr\/\?w=arrivee"[^>]*data-header-drift[^>]*>Dériver<\/a>/);
      expect(territoryHeader).toMatch(/<a[^>]*href="\/fr\/oeuvres\/"[^>]*data-section-active="true"[^>]*>Œuvres<\/a>/);
    });
  });

  describe('Footer', () => {
    it('renders localized colophon without inline style, with secondary links, territories, and language switch', async () => {
      const result = await container.renderToString(Footer, {
        props: {
          lang: 'fr',
          currentRouteKey: 'about'
        }
      });
      expect(result).not.toMatch(/<footer[^>]*\bstyle=/);
      expect(result).toContain('class="site-footer-inner"');
      expect(result).toContain('© ' + new Date().getFullYear() + ' Alexander Usoltsev, tous droits réservés.');
      expect(result).toMatch(/<a href="\/fr\/mentions-legales\/"[^>]*>Mentions légales<\/a>/);
      expect(result).toContain('href="/fr/oeuvres/"');
      expect(result).toContain('href="/fr/territoires/dreamland/"');
      expect(result).toContain('href="/fr/territoires/the-border-is-thin/"');
      expect(result).toContain("La frontière s&#39;efface");
      expect(result).toContain('href="/fr/expositions/"');
      expect(result).toContain('href="/fr/a-propos/"');
      expect(result).toContain('href="/fr/contact/"');
      expect(result).toContain('href="/en/about/"');
      const visibleText = result.replace(/<[^>]+>/g, ' ');
      expect(visibleText).not.toContain('iknowyoucanseeme');
      expect(visibleText).not.toContain('search');
      expect(result).not.toContain('all rights reserved');
      expect(result).not.toContain('Légales');
    });

    it('renders English footer text from ui.yaml on EN pages', async () => {
      const result = await container.renderToString(Footer, { props: { lang: 'en' } });
      expect(result).toContain('Alexander Usoltsev, all rights reserved.');
      expect(result).toContain('>Legal notice</a>');
      expect(result).toContain('The border is thin');
      expect(result).toContain('href="/fr/"');
      expect(result).not.toContain('tous droits réservés');
    });
  });

  describe('SkipLink', () => {
    it('renders skiplink', async () => {
      const result = await container.renderToString(SkipLink, {
        props: {
          targetId: 'main-content',
          label: 'Passer au contenu'
        }
      });
      expect(result).toContain('href="#main-content"');
      expect(result).toMatch(/<a[^>]*>Passer au contenu<\/a>/);
    });
  });

  describe('Header skip link', () => {
    it('is French on FR pages and English on EN pages (ui.yaml skip_content)', async () => {
      const fr = await container.renderToString(Header, { props: { lang: 'fr', currentRouteKey: 'works' } });
      expect(fr).toMatch(/class="skip-link"[^>]*>Passer au contenu<\/a>/);
      expect(fr).not.toContain('Skip to');
      const en = await container.renderToString(Header, { props: { lang: 'en', currentRouteKey: 'works' } });
      expect(en).toMatch(/class="skip-link"[^>]*>Skip to content<\/a>/);
      expect(en).not.toContain('Passer au contenu');
    });
  });

  describe('WorkImage', () => {
    it('renders picture with correct sources', async () => {
      const result = await container.renderToString(WorkImage, {
        props: {
          src: 'works/arrivee/0.jpg',
          alt: 'Test Alt',
          palette: ['#ff0000']
        }
      });
      expect(result).toContain('alt="Test Alt"');
      expect(result).toContain('background-color: #ff0000');
    });
  });

  describe('Fragment', () => {
    it('renders text with p tags and handles newlines', async () => {
      const result = await container.renderToString(Fragment, {
        props: {
          text: 'Hello\nWorld'
        }
      });
      expect(result).toMatch(/<p[^>]*>Hello<\/p>/);
      expect(result).toMatch(/<p[^>]*>World<\/p>/);
    });
  });

  describe('Meta', () => {
    it('renders meta tags for title and description', async () => {
      const result = await container.renderToString(Meta, {
        props: {
          width: 1200,
          height: 800,
          year: 2023
        }
      });
      expect(result).toContain('1200 × 800 · 2023');
    });
  });
});

