import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { isLocalizedPage, sitemapLinks } from './src/seo/SitemapLinks.ts';
import { ogImages } from './tools/og/OgIntegration.ts';

export default defineConfig({
  output: 'static',
  site: 'https://www.iknowyoucanseeme.xyz',
  srcDir: './src',
  publicDir: './public',
  // The e2e suite builds a second variant (contact form with a test key) into its own folder.
  outDir: process.env.ASTRO_OUT_DIR ?? './dist',
  integrations: [
    sitemap({
      filter: isLocalizedPage,
      serialize: (item) => ({ ...item, links: sitemapLinks(item.url) }),
    }),
    ogImages(),
  ],
});
