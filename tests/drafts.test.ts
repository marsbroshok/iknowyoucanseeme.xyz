import { describe, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { checkVocabularyAndTypography, checkNarrativeCadence } from '../src/tools/CopyGuard.js';
import { LanguageGuard } from '../src/tools/LanguageGuard.js';
import { UI_BLOCKS } from '../src/i18n/UiCatalog.js';

function findTextBlocks(obj: unknown): Record<string, unknown>[] {
  let blocks: Record<string, unknown>[] = [];
  if (typeof obj !== 'object' || obj === null) return blocks;
  
  const record = obj as Record<string, unknown>;
  
  if (typeof record.status === 'string' && ['draft', 'artist-edited', 'proofed'].includes(record.status) && typeof record.fr === 'string' && typeof record.en === 'string') {
    blocks.push(record);
  } else {
    for (const key of Object.keys(record)) {
      blocks = blocks.concat(findTextBlocks(record[key]));
    }
  }
  return blocks;
}

describe('Draft contents', () => {
  it('passes vocabulary and typography guards', () => {
    const copyDir = path.resolve(__dirname, '../src/content/copy');
    
    function walkDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          walkDir(fullPath);
        } else if (fullPath.endsWith('.yaml')) {
          const content = yaml.parse(fs.readFileSync(fullPath, 'utf8'));
          const blocks = findTextBlocks(content);
          for (const block of blocks) {
            try {
              checkVocabularyAndTypography(block as unknown as Parameters<typeof checkVocabularyAndTypography>[0]);
            } catch (err: unknown) {
              if (err instanceof Error) { err.message = `${err.message} (in ${fullPath})`; }
              throw err;
            }
          }
        }
      }
    }
    
    walkDir(copyDir);
  });

  it('enforces Dreamland manifesto narrative cadence (>= 10 words/sentence average) on about, territories, and zones', () => {
    const copyDir = path.resolve(__dirname, '../src/content/copy');
    const about = yaml.parse(fs.readFileSync(path.join(copyDir, 'pages/about.yaml'), 'utf8'));
    for (const key of ['bio', 'origin'] as const) {
      checkNarrativeCadence(about.blocks[key]);
    }

    for (const subdir of ['territories', 'zones'] as const) {
      const dir = path.join(copyDir, subdir);
      for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'))) {
        const parsed = yaml.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        checkNarrativeCadence(parsed.statement);
      }
    }
  });

  it('enforces fragment word-count bounds (7..24 words) across all 43 works so flat labels cannot return', () => {
    const worksCopyDir = path.resolve(__dirname, '../src/content/copy/works');
    const files = fs.readdirSync(worksCopyDir).filter((f) => f.endsWith('.yaml'));
    for (const file of files) {
      const parsed = yaml.parse(fs.readFileSync(path.join(worksCopyDir, file), 'utf8'));
      const fragment = parsed.fragment;
      for (const lang of ['en', 'fr'] as const) {
        const words = String(fragment[lang]).trim().split(/\s+/).filter((w) => w.length > 0);
        if (words.length < 7 || words.length > 24) {
          throw new Error(`Work fragment ${file} (${lang}) has ${words.length} words; expected 7..24 words`);
        }
      }
    }
  });

  it('passes LanguageGuard across all non-UI copy blocks in EN and FR', () => {
    const guard = new LanguageGuard(UI_BLOCKS);
    const copyDir = path.resolve(__dirname, '../src/content/copy');
    const violations: string[] = [];

    function walkCopy(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkCopy(full);
        } else if (entry.name.endsWith('.yaml') && entry.name !== 'ui.yaml') {
          const blocks = findTextBlocks(yaml.parse(fs.readFileSync(full, 'utf8')));
          for (const block of blocks) {
            for (const lang of ['en', 'fr'] as const) {
              const found = guard.inspect(full, `<html lang="${lang}"><body>${String(block[lang])}</body></html>`);
              for (const v of found) violations.push(`${path.relative(copyDir, full)} (${lang}): ${v.detail}`);
            }
          }
        }
      }
    }

    walkCopy(copyDir);
    if (violations.length > 0) {
      throw new Error(`LanguageGuard copy collisions:\n${violations.join('\n')}`);
    }
  });
});
