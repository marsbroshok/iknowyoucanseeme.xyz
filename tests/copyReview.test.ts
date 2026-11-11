import { describe, it, expect } from 'vitest';
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
    
    const fakeYaml = path.resolve(__dirname, '../src/content/copy/fake.yaml');
    fs.writeFileSync(fakeYaml, 'status: draft\nen: en\nfr: fr\nsources: "not an array"\n');
    generateReviewSheet(outPath);
    if (fs.existsSync(fakeYaml)) fs.unlinkSync(fakeYaml);
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

    // cover !existsSync branch
    const realDir = path.resolve(__dirname, '../src/content/copy');
    fs.renameSync(realDir, realDir + '.bak');
    generateReviewSheet(outPath);
    fs.renameSync(realDir + '.bak', realDir);
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
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

