import { describe, it, expect } from 'vitest';
import { renderReviewSheet } from '../src/intake/ReviewSheetRenderer.js';
import fs from 'fs';
import path from 'path';

describe('ReviewSheetRenderer', () => {
  it('escapes HTML to prevent XSS and renders correctly', () => {
    const proposals = {
      catalogue: [
        {
          slug: 'work1',
          title_fr: 'w1',
          zone: 'arrival',
          matches: [
            { src: 'img1.jpg', distance: 0, postDate: '2026-01-01T00:00:00', postCaption: '<script>alert(1)</script>', hash: 0n },
            { src: 'img2.jpg', distance: 1, postDate: '2026-01-01T00:00:00', postCaption: 'safe', hash: 1n }
          ]
        }
      ],
      territory2: [],
      leak: [],
      origin2019: []
    };
    
    const outputPath = path.resolve(__dirname, 'new_dir_test/temp_review.html');
    renderReviewSheet(proposals, outputPath);
    
    const content = fs.readFileSync(outputPath, 'utf-8');
    
    // XSS check
    expect(content).not.toContain('<script>alert');
    expect(content).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    
    // Contains images
    expect(content).toContain('src="../img1.jpg"');
    
    fs.unlinkSync(outputPath);
    fs.rmdirSync(path.dirname(outputPath));
  });
});
