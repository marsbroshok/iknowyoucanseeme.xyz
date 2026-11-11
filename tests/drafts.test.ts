import { describe, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { checkVocabularyAndTypography } from '../src/tools/CopyGuard.js';

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
});
