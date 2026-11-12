import yaml from 'yaml';
import uiYaml from '../content/copy/pages/ui.yaml?raw';
import { PageSchema, type TextBlock } from '../content/schema/index.js';
import type { Locale } from './RouteMap.js';
import { UiText } from './UiText.js';

/**
 * Parses a UI copy YAML document (the `ui` page) into its text blocks.
 *
 * @param source - YAML source text.
 * @returns Text blocks keyed by id (empty when the page has none).
 * @throws ZodError when the document does not match `PageSchema`.
 */
export function parseUiBlocks(source: string): Record<string, TextBlock> {
  return PageSchema.parse(yaml.parse(source)).blocks ?? {};
}

/** All UI text blocks of the site, parsed once at module load. */
export const UI_BLOCKS: Readonly<Record<string, TextBlock>> = parseUiBlocks(uiYaml);

/**
 * Convenience factory for a {@link UiText} over the site's UI strings.
 *
 * @param lang - Locale.
 * @returns A strict UI text accessor.
 */
export function uiText(lang: Locale): UiText {
  return new UiText(UI_BLOCKS, lang);
}
