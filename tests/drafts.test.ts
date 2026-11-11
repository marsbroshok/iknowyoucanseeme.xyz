import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { checkVocabularyAndTypography } from '../src/tools/CopyGuard.js';

function findTextBlocks(obj: any): any[] {
  let blocks: any[] = [];
  if (typeof obj !== 'object' || obj === null) return blocks;
  
  if (obj.status && ['draft', 'artist-edited', 'proofed'].includes(obj.status) && obj.fr && obj.en) {
    blocks.push(obj);
  } else {
    for (const key of Object.keys(obj)) {
      blocks = blocks.concat(findTextBlocks(obj[key]));
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
              checkVocabularyAndTypography(block);
            } catch (err: any) {
              err.message = `${err.message} (in ${fullPath})`;
              throw err;
            }
          }
        }
      }
    }
    
    walkDir(copyDir);
  });
});
