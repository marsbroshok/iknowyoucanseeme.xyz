import { describe, it, expect, beforeAll } from 'vitest';
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
      
      // Header assertions
      expect(result).toContain('iknowyoucanseeme'); // signature
      expect(result).not.toContain('search');
      expect(result).not.toContain('theme toggle');
      
      // Footer assertions
      expect(result).toContain('Alexander Usoltsev, all rights reserved');
    });
  });

  describe('Header', () => {
    it('renders localized links', async () => {
      const result = await container.renderToString(Header, {
        props: {
          lang: 'en',
          currentRouteKey: 'works'
        }
      });
      expect(result).toContain('href="/fr/oeuvres/"');
      expect(result).toContain('iknowyoucanseeme');
    });
  });

  describe('Footer', () => {
    it('renders localized footer text', async () => {
      const result = await container.renderToString(Footer, {
        props: {
          lang: 'fr'
        }
      });
      expect(result).toContain('© ' + new Date().getFullYear() + ' Alexander Usoltsev, tous droits réservés.');
      expect(result).toMatch(/<a href="\/fr\/mentions-legales\/"[^>]*>Mentions légales<\/a>/);
      expect(result).not.toContain('all rights reserved');
      expect(result).not.toContain('Légales');
    });

    it('renders English footer text from ui.yaml on EN pages', async () => {
      const result = await container.renderToString(Footer, { props: { lang: 'en' } });
      expect(result).toContain('Alexander Usoltsev, all rights reserved.');
      expect(result).toContain('>Legal notice</a>');
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

