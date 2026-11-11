import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runCli } from '../tools/intake/cli.js';
import * as CatalogueReader from '../src/intake/CatalogueReader.js';
import * as IgExportParser from '../src/intake/IgExportParser.js';
import * as PerceptualHasher from '../src/intake/PerceptualHasher.js';
import * as ProposalEngine from '../src/intake/ProposalEngine.js';
import * as ReviewSheetRenderer from '../src/intake/ReviewSheetRenderer.js';
import * as SelectionStore from '../src/intake/SelectionStore.js';
import * as ContentGenerator from '../src/intake/ContentGenerator.js';
import fs from 'fs';

vi.mock('fs');
vi.mock('../src/intake/CatalogueReader.js');
vi.mock('../src/intake/IgExportParser.js');
vi.mock('../src/intake/PerceptualHasher.js');
vi.mock('../src/intake/ProposalEngine.js');
vi.mock('../src/intake/ReviewSheetRenderer.js');
vi.mock('../src/intake/SelectionStore.js');
vi.mock('../src/intake/ContentGenerator.js');

describe('CLI', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws on missing subcommand', async () => {
    await expect(runCli([])).rejects.toThrow(/Usage:/);
  });
  
  it('handles help flag', async () => {
    await expect(runCli(['--help'])).rejects.toThrow(/Usage:/);
  });

  it('fails loudly on missing export for propose', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    await expect(runCli(['propose', '--export', 'does_not_exist'])).rejects.toThrow(/Missing export directory/);
  });

  it('runs catalogue', async () => {
    const extractMock = vi.fn();
    vi.mocked(CatalogueReader.PdfThumbnailExtractor).mockImplementation(() => {
      return { extract: extractMock } as unknown as CatalogueReader.PdfThumbnailExtractor;
    });
    
    await runCli(['catalogue']);
    expect(extractMock).toHaveBeenCalled();
  });

  it('runs propose with everything missing', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p: string) => {
      if (p.endsWith('your_instagram_activity')) return true; // export dir exists
      return false; // all files inside missing
    });
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from(''));
    vi.mocked(CatalogueReader.readCatalogue).mockReturnValue([
      { slug: 'work-1', title_fr: 'w1', zone: 'arrival', pdf_index: 5, size: {w:1,h:1} }
    ]);
    vi.mocked(IgExportParser.parseIgPosts).mockReturnValue([]);
    vi.mocked(ProposalEngine.parseRules).mockReturnValue({ territory2: [], leak: [], origin2019: { start: '', end: '' } });
    vi.mocked(ProposalEngine.generateProposals).mockReturnValue({ catalogue: [], territory2: [], leak: [], origin2019: [] });
    vi.mocked(SelectionStore.readSelection).mockReturnValue([]);
    vi.mocked(SelectionStore.mergeSelection).mockReturnValue([]);
    await runCli(['propose']);
  });

  it('runs propose', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from(''));
    vi.mocked(CatalogueReader.readCatalogue).mockReturnValue([
      { slug: 'work-1', title_fr: 'w1', zone: 'arrival', pdf_index: 0, size: {w:1,h:1} },
      { slug: 'work-2', title_fr: 'w2', zone: 'arrival', pdf_index: 10, size: {w:1,h:1} },
      { slug: 'work-missing', title_fr: 'missing', zone: 'arrival', pdf_index: 15, size: {w:1,h:1} }
    ]);
    vi.mocked(PerceptualHasher.hashImageBuffer).mockResolvedValue(0n);
    vi.mocked(IgExportParser.parseIgPosts).mockReturnValue([
      { id: '1', date: '2026-01-01', caption: '', media: ['media/posts/202611/img1.jpg', 'video.mp4'] },
      { id: '2', date: '2026-01-01', caption: '', media: ['missing.jpg'] }
    ]);
    
    vi.mocked(fs.existsSync).mockImplementation((p: string) => {
      if (p.includes('missing')) return false;
      if (p.includes('img-015')) return false; // force missing hash for catalogue
      if (p.includes('img-0010')) return false; // force fallback path in catalogue
      if (p.includes('your_instagram_activity/media/posts_1.html')) return true;
      if (p.includes('reels.html')) return false; // missing reels
      return true; // pretend all other files exist
    });

    vi.mocked(ProposalEngine.parseRules).mockReturnValue({ territory2: [], leak: [], origin2019: { start: '', end: '' } });
    vi.mocked(ProposalEngine.generateProposals).mockReturnValue({
      catalogue: [
        { slug: 'work-1', title_fr: 'w1', zone: 'arrival', matches: [{ src: 'img1.jpg', distance: 0, postDate: '', postCaption: '', hash: 0n }] },
        { slug: 'work-no-match', title_fr: 'no match', zone: 'arrival', matches: [] }
      ],
      territory2: [{ src: 't2.jpg', hash: 0n, postDate: '2026-11-10T12', postCaption: '' }, { src: 't3.jpg', hash: 0n, postDate: '2026-08-29T12', postCaption: '' }],
      leak: [{ src: 'l1.jpg', hash: 0n, postDate: '2025-05-02T12', postCaption: '' }, { src: 'l2.jpg', hash: 0n, postDate: '2026-10-19T12', postCaption: '' }],
      origin2019: []
    });
    vi.mocked(SelectionStore.readSelection).mockReturnValue([]);
    vi.mocked(SelectionStore.mergeSelection).mockReturnValue([]);

    await runCli(['propose']);
    expect(ReviewSheetRenderer.renderReviewSheet).toHaveBeenCalled();
    expect(SelectionStore.writeSelection).toHaveBeenCalled();
  });
  
  it('runs propose and falls back to exportDir/../m for ig paths', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p: string) => {
      // Mock that `exportDir/m` does not exist, but `exportDir/../m` does
      if (p.includes('missing')) return false;
      if (p.includes('your_instagram_activity/media')) return true;
      if (p === 'export/media/posts/202611/img1.jpg') return false; // force fallback
      return true;
    });
    vi.mocked(CatalogueReader.readCatalogue).mockReturnValue([]);
    vi.mocked(IgExportParser.parseIgPosts).mockReturnValue([
      { id: '1', date: '2026-01-01', caption: '', media: ['media/posts/202611/img1.jpg', 'video.mp4'] }
    ]);
    vi.mocked(ProposalEngine.parseRules).mockReturnValue({ territory2: [], leak: [], origin2019: { start: '', end: '' } });
    vi.mocked(ProposalEngine.generateProposals).mockReturnValue({
      catalogue: [], territory2: [], leak: [], origin2019: []
    });
    vi.mocked(SelectionStore.readSelection).mockReturnValue([]);
    vi.mocked(SelectionStore.mergeSelection).mockReturnValue([]);
    
    await runCli(['propose', '--export', 'export']);
  });

  it('runs generate', async () => {
    vi.mocked(SelectionStore.readSelection).mockReturnValue([]);
    vi.mocked(IgExportParser.parseIgPosts).mockReturnValue([
      { id: '1', date: '2026-01-01', caption: '', media: ['media/posts/202611/img1.jpg', 'video.mp4'] }
    ]);
    vi.mocked(fs.existsSync).mockImplementation((p: string) => {
      if (p.includes('posts_1.html')) return true;
      if (p.includes('reels.html')) return true;
      return true;
    });

    await runCli(['generate']);
    expect(ContentGenerator.generateContentFiles).toHaveBeenCalled();
  });
  
  it('runs generate with missing posts/reels', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false); // missing
    vi.mocked(SelectionStore.readSelection).mockReturnValue([]);
    vi.mocked(IgExportParser.parseIgPosts).mockReturnValue([]);
    await runCli(['generate']);
    expect(ContentGenerator.generateContentFiles).toHaveBeenCalled();
  });
});

  it('runs main when executed as script', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true); // missing
    vi.mocked(SelectionStore.readSelection).mockReturnValue([]);
    vi.mocked(IgExportParser.parseIgPosts).mockReturnValue([]);
    const { main } = await import('../tools/intake/cli.js');
    await main(['generate'], await import('url').then(m => m.fileURLToPath(import.meta.url)), import.meta.url);
    expect(ContentGenerator.generateContentFiles).toHaveBeenCalled();
  });
  
  it('runs main and catches errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { main } = await import('../tools/intake/cli.js');
    await main(['--help'], await import('url').then(m => m.fileURLToPath(import.meta.url)), import.meta.url);
    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    process.exitCode = 0; // reset
  });
