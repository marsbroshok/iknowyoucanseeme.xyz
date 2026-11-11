import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { PageSchema, type TextBlock } from '../content/schema/index.js';

export function loadUIStrings(uiYamlPath: string): Record<string, TextBlock> {
  const content = fs.readFileSync(uiYamlPath, 'utf-8');
  const parsed = yaml.parse(content);
  // Validates with PageSchema since ui is a page schema in intake?
  // Wait, let's look at PageSchema again:
  // export const PageSchema = z.object({ slug: z.enum(['about', ... 'ui']), blocks: z.record(z.string(), TextBlockSchema).optional(), ... })
  
  const parsedPage = PageSchema.parse(parsed);
  return parsedPage.blocks || {};
}

export function getUIString(uiStrings: Record<string, TextBlock>, key: string, lang: 'en' | 'fr'): string {
  const block = uiStrings[key];
  if (!block) {
    console.warn(`[UI] Missing UI string for key "${key}"`);
    return key;
  }
  const val = block[lang];
  if (!val) {
    console.warn(`[UI] Missing ${lang} translation for UI string "${key}", falling back to en`);
    return block.en || key;
  }
  return val;
}
