import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { PageSchema, type TextBlock } from '../../src/content/schema/index.js';

/**
 * The site's UI strings (`src/content/copy/pages/ui.yaml`), read from disk.
 * Playwright cannot load the Vite `?raw` import used by `UiCatalog`, so the
 * e2e suite parses the same file with the same schema.
 *
 * @returns UI text blocks keyed by id.
 * @throws ZodError when ui.yaml does not match `PageSchema`.
 */
export function loadUiBlocks(): Record<string, TextBlock> {
  const source = fs.readFileSync(path.resolve('src/content/copy/pages/ui.yaml'), 'utf8');
  return PageSchema.parse(yaml.parse(source)).blocks ?? {};
}
