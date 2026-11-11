import { describe, it, expect, vi } from 'vitest';
import { generateReviewSheet, runMain } from '../tools/copy/review.js';
import { fileURLToPath } from 'url';

import fs from 'fs';
import path from 'path';
import os from 'os';

describe('copyReview script', () => {
  it('generates the review sheet markdown', () => {
    const outPath = path.resolve(os.tmpdir(), 'temp_review.md');
    generateReviewSheet(outPath);
    const content = fs.readFileSync(outPath, 'utf8');
    expect(content).toContain('# Copy Review Sheet');
    expect(content).toContain('| File | Path | Status | EN | FR | Sources |');
    expect(content).toContain('cygne-icm-1.yaml');
    
    // We cannot safely write to src/content/copy or rename it because tests run concurrently.
    // We mock fs.existsSync and fs.readdirSync to test those edge cases safely.
    const originalExists = fs.existsSync;
    const originalReaddir = fs.readdirSync;
    
    try {
      // Test missing directory
      fs.existsSync = vi.fn().mockReturnValue(false);
      generateReviewSheet(outPath);
      
      // Test fake yaml
      fs.existsSync = originalExists;
      // @ts-expect-error mock
      fs.readdirSync = (dir: fs.PathLike) => {
        if (dir.toString().endsWith('copy')) {
          return ['fake.yaml'];
        }
        return originalReaddir(dir);
      };
      
      // We also need to mock readFileSync and statSync for fake.yaml
      const originalStat = fs.statSync;
      const originalRead = fs.readFileSync;
      
      // @ts-expect-error mock
      fs.statSync = (p: fs.PathLike) => {
        if (p.toString().endsWith('fake.yaml')) return { isDirectory: () => false };
        return originalStat(p);
      };
      
      // @ts-expect-error mock
      fs.readFileSync = (p: fs.PathLike, enc: unknown) => {
        if (p.toString().endsWith('fake.yaml')) return 'status: draft\nen: en\nfr: fr\nsources: "not an array"\n';
        // @ts-expect-error mock
        return originalRead(p, enc);
      };
      
      generateReviewSheet(outPath);
      
      // @ts-expect-error mock
      fs.statSync = originalStat;
      fs.readFileSync = originalRead;
      
    } finally {
      fs.existsSync = originalExists;
      fs.readdirSync = originalReaddir;
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }
  });

  it('can be run directly from CLI', () => {
    const originalLog = console.log;
    let out = '';
    console.log = (msg: string) => { out += msg; };
    try {
      runMain(fileURLToPath(import.meta.url), import.meta.url);
      expect(out).toContain('Generated ');
    } finally {
      console.log = originalLog;
    }
  });
});




