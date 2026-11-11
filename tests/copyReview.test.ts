import { describe, it, expect } from 'vitest';
import { generateReviewSheet } from '../tools/copy/review.js';
import fs from 'fs';
import path from 'path';

describe('copyReview script', () => {
  it('generates the review sheet markdown', () => {
    const outPath = path.resolve(__dirname, 'temp_review.md');
    generateReviewSheet(outPath);
    const content = fs.readFileSync(outPath, 'utf8');
    expect(content).toContain('# Copy Review Sheet');
    expect(content).toContain('| File | Path | Status | EN | FR | Sources |');
    // Ensure one of the works is in the file
    expect(content).toContain('cygne-icm-1.yaml');
    fs.unlinkSync(outPath);
  });
});
