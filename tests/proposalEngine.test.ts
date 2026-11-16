import { describe, it, expect, vi } from 'vitest';
import { parseRules, generateProposals, HashedCatalogueWork, HashedIgImage, Rules } from '../src/intake/ProposalEngine.js';
import * as PerceptualHasher from '../src/intake/PerceptualHasher.js';
import fs from 'fs';

vi.mock('fs');

describe('ProposalEngine', () => {
  it('ranks catalogue matches by distance and limits to <= 3', () => {
    const catalogue: HashedCatalogueWork[] = [
      { slug: 'work-1', title_fr: 'w1', zone: 'arrival', pdf_index: 0, size: {w:1,h:1}, hash: 0n }
    ];
    const igImages: HashedIgImage[] = [
      { src: 'img1.jpg', hash: 10n, postDate: '2026-01-01', postCaption: '' },
      { src: 'img2.jpg', hash: 0n, postDate: '2026-01-02', postCaption: '' }, // dist 0
      { src: 'img3.jpg', hash: 50n, postDate: '2026-01-03', postCaption: '' }, // dist 50
      { src: 'img4.jpg', hash: 2n, postDate: '2026-01-04', postCaption: '' }, // dist 2 (newer)
      { src: 'img5.jpg', hash: 2n, postDate: '2026-01-05', postCaption: '' }  // dist 2 (newest)
    ];
    const rules: Rules = { territory2: [], leak: [], origin2019: { start: '', end: '' } };
    
    // Fake hamming distance: we'll just use difference for testing
    vi.spyOn(PerceptualHasher, 'hammingDistance').mockImplementation((a, b) => Number(a > b ? a - b : b - a));

    const proposals = generateProposals(catalogue, igImages, rules);
    const w1 = proposals.catalogue.find(p => p.slug === 'work-1')!;
    
    expect(w1.matches.length).toBe(3);
    expect(w1.matches[0].src).toBe('img2.jpg');
    expect(w1.matches[1].src).toBe('img5.jpg');
    expect(w1.matches[2].src).toBe('img4.jpg');
  });

  it('selects candidates by rule dates and excludes matched/2019', () => {
    const catalogue: HashedCatalogueWork[] = [
      { slug: 'work-1', title_fr: 'w1', zone: 'arrival', pdf_index: 0, size: {w:1,h:1}, hash: 0n }
    ];
    const igImages: HashedIgImage[] = [
      { src: 'cat-match.jpg', hash: 0n, postDate: '2026-05-01T12', postCaption: '' }, // Will match catalogue exactly
      { src: 't2.jpg', hash: 99n, postDate: '2026-01-01T12', postCaption: '' },
      { src: 'leak.jpg', hash: 99n, postDate: '2026-02-01T12', postCaption: '' },
      { src: '2019.jpg', hash: 99n, postDate: '2019-05-01T12', postCaption: '' }
    ];
    const rules: Rules = {
      territory2: ['2026-01-01'],
      leak: ['2026-02-01'],
      origin2019: { start: '2019-01-01', end: '2019-12-31' }
    };
    
    vi.spyOn(PerceptualHasher, 'hammingDistance').mockImplementation((a, b) => Number(a > b ? a - b : b - a));

    const proposals = generateProposals(catalogue, igImages, rules);
    
    expect(proposals.territory2.map(m => m.src)).toContain('t2.jpg');
    expect(proposals.leak.map(m => m.src)).toContain('leak.jpg');
    expect(proposals.origin2019.map(m => m.src)).toContain('2019.jpg');
    expect(proposals.territory2.map(m => m.src)).not.toContain('cat-match.jpg');
  });

  it('parseRules fails on missing config', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(() => parseRules('missing.yaml')).toThrow();
  });

  it('parseRules handles partial properties gracefully', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('territory2: {}\nleak: {}\norigin2019: { date_range: {} }');
    const rules = parseRules('empty.yaml');
    expect(rules.territory2).toEqual([]);
  });

  it('parseRules handles missing properties gracefully', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('');
    const rules = parseRules('empty.yaml');
    expect(rules.territory2).toEqual([]);
    expect(rules.catalogueExcludeDates).toEqual([]);
    expect(rules.catalogueMaxDistance).toBeUndefined();
  });

  it('parseRules reads catalogue max_distance and exclude_dates', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('catalogue:\n  max_distance: 10\n  exclude_dates:\n    - "2026-10-19"');
    const rules = parseRules('rules.yaml');
    expect(rules.catalogueMaxDistance).toBe(10);
    expect(rules.catalogueExcludeDates).toEqual(['2026-10-19']);
  });

  it('excludes territory2 and catalogueExcludeDates from catalogue matching and enforces catalogueMaxDistance', () => {
    const catalogue: HashedCatalogueWork[] = [
      { slug: 'work-1', title_fr: 'w1', zone: 'arrival', pdf_index: 0, size: { w: 1, h: 1 }, hash: 0n }
    ];
    const igImages: HashedIgImage[] = [
      { src: 't2-swan.jpg', hash: 0n, postDate: '2026-11-10T01:29:00', postCaption: '' },
      { src: 'clay.jpg', hash: 0n, postDate: '2026-10-19T07:10:00', postCaption: '' },
      { src: 'far.jpg', hash: 15n, postDate: '2025-05-02T05:07:00', postCaption: '' }
    ];
    const rules: Rules = {
      territory2: ['2026-11-10'],
      leak: ['2026-10-19'],
      origin2019: { start: '2019-12-03', end: '2019-12-13' },
      catalogueExcludeDates: ['2026-10-19'],
      catalogueMaxDistance: 10
    };

    vi.spyOn(PerceptualHasher, 'hammingDistance').mockImplementation((a, b) => Number(a > b ? a - b : b - a));

    const proposals = generateProposals(catalogue, igImages, rules);
    expect(proposals.catalogue[0].matches).toEqual([]);
    expect(proposals.territory2.map(m => m.src)).toEqual(['t2-swan.jpg']);
    expect(proposals.leak.map(m => m.src)).toEqual(['clay.jpg']);
  });
});
