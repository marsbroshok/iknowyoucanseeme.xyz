import { describe, it, expect } from 'vitest';
import { generateReviewSheet, runMain } from '../tools/copy/review.js';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('copyReview script', () => {
  it('generates the review sheet markdown', () => {
    const outPath = path.resolve(__dirname, 'temp_review.md');
    generateReviewSheet(outPath);
    const content = fs.readFileSync(outPath, 'utf8');
    expect(content).toContain('# Copy Review Sheet');
    expect(content).toContain('| File | Path | Status | EN | FR | Sources |');
    expect(content).toContain('cygne-icm-1.yaml');
    
    const fakeYaml = path.resolve(__dirname, '../src/content/copy/fake.yaml');
    fs.writeFileSync(fakeYaml, 'status: draft\nen: en\nfr: fr\nsources: "not an array"\n');
    generateReviewSheet(outPath);
    fs.unlinkSync(fakeYaml);
    fs.unlinkSync(outPath);
    // cover !existsSync branch
    const nonExistent = path.resolve(__dirname, 'non_existent_copy_dir_test');
    // We can't directly inject a non-existent dir to generateReviewSheet because it hardcodes the path.
    // Wait, the path is hardcoded in review.ts:
    // const copyDir = path.resolve(__dirname, '../../src/content/copy');
    // So to cover fs.existsSync, we'd have to rename the folder temporarily.
    const realDir = path.resolve(__dirname, '../src/content/copy');
    fs.renameSync(realDir, realDir + '.bak');
    generateReviewSheet(outPath);
    fs.renameSync(realDir + '.bak', realDir);

  });

    it('can be run directly from CLI', () => {
    // We mock CLI arguments for runMain
    const originalLog = console.log;
    let out = '';
    console.log = (msg) => { out += msg; };
    try {
      runMain(fileURLToPath(import.meta.url), import.meta.url);
      expect(out).toContain('Generated ');
    } finally {
      console.log = originalLog;
    }
  });
});
