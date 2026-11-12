import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { isLocalizedPage, sitemapLinks } from './src/seo/SitemapLinks.ts';
import { ogImages } from './tools/og/OgIntegration.ts';

export default defineConfig({
  output: 'static',
  site: 'https://www.iknowyoucanseeme.xyz',
  srcDir: './src',
  publicDir: './public',
  integrations: [
    sitemap({
      filter: isLocalizedPage,
      serialize: (item) => ({ ...item, links: sitemapLinks(item.url) }),
    }),
    ogImages(),
  ],
});
