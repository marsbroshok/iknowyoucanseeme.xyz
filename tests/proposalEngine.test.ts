import { describe, it, expect } from 'vitest';
import { generateProposals, parseRules } from '../src/intake/ProposalEngine.js';
import path from 'path';
import fs from 'fs';

describe('ProposalEngine', () => {
  it('ranks catalogue matches by distance and limits to <= 3', () => {
    const rules = { territory2: [], leak: [], origin2019: { start: '2019', end: '' } };
    const catalogue = [
      { slug: 'work-1', title_fr: 'w1', zone: 'arrival' as const, pdf_index: 0, hash: 0n }
    ];
    const igImages = [
      { src: 'img1.jpg', hash: 10n, postDate: '2025-01-01', postCaption: '' }, // dist 2 (10 is binary 1010)
      { src: 'img2.jpg', hash: 0n, postDate: '2025-01-01', postCaption: '' },  // dist 0
      { src: 'img3.jpg', hash: 7n, postDate: '2025-01-01', postCaption: '' },  // dist 3 (111)
      { src: 'img4.jpg', hash: 15n, postDate: '2025-01-01', postCaption: '' }, // dist 4 (1111)
      { src: 'img5.jpg', hash: 10n, postDate: '2025-02-01', postCaption: '' }  // dist 2, same distance as img1
    ];
    
    const proposals = generateProposals(catalogue, igImages, rules);
    const w1 = proposals.catalogue.find(p => p.slug === 'work-1')!;
    
    expect(w1.matches.length).toBe(3); // limits to top 3 (best + 2 alternatives)
    expect(w1.matches[0].src).toBe('img2.jpg'); // dist 0
    expect(w1.matches[1].src).toBe('img5.jpg'); // dist 2, newer
    expect(w1.matches[2].src).toBe('img1.jpg'); // dist 2, older
  });

  it('selects candidates by rule dates and ignores incomplete rules', () => {
    const rulesPath = path.resolve(__dirname, '../intake-config/rules.yaml');
    const rules = parseRules(rulesPath);
    
    const catalogue: any[] = [];
    const igImages = [
      { src: 't2.jpg', hash: 0n, postDate: '2026-11-10T01:29:00', postCaption: '' },
      { src: 'leak.jpg', hash: 0n, postDate: '2025-05-02T12:00:00', postCaption: '' },
      { src: 'other.jpg', hash: 0n, postDate: '2020-01-01T00:00:00', postCaption: '' },
      { src: 'origin.jpg', hash: 0n, postDate: '2019-12-05T00:00:00', postCaption: 'Origin text' }
    ];
    
    const proposals = generateProposals(catalogue, igImages, rules);
    
    expect(proposals.territory2.map(m => m.src)).toContain('t2.jpg');
    expect(proposals.territory2.map(m => m.src)).not.toContain('leak.jpg');
    
    expect(proposals.leak.map(m => m.src)).toContain('leak.jpg');
    expect(proposals.origin2019.map(m => m.src)).toContain('origin.jpg');
    
    // Incomplete rule
    const incRules = { territory2: [], leak: [], origin2019: { start: '', end: '2020' } };
    const p2 = generateProposals(catalogue, igImages, incRules);
    expect(p2.origin2019.length).toBe(0);
    
    const incRules3 = { territory2: [], leak: [], origin2019: { start: '2019', end: '' } };
    const p4 = generateProposals(catalogue, igImages, incRules3);
    expect(p4.origin2019.length).toBe(0);
  });

  it('parseRules handles missing properties gracefully', () => {
    const tempFile = path.resolve(__dirname, 'empty_rules.yaml');
    fs.writeFileSync(tempFile, 'dummy: true');
    const r = parseRules(tempFile);
    expect(r.territory2).toEqual([]);
    expect(r.leak).toEqual([]);
    expect(r.origin2019.start).toBe('');
    expect(r.origin2019.end).toBe('');
    fs.unlinkSync(tempFile);
  });
  
  it('parseRules fails on missing config', () => {
    expect(() => parseRules('does_not_exist.yaml')).toThrow();
  });
});
