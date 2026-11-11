import { describe, it, expect } from 'vitest';
import { readCatalogue, PdfThumbnailExtractor } from '../src/intake/CatalogueReader.js';
import fs from 'fs';
import path from 'path';

describe('CatalogueReader', () => {
  it('validates catalogue config schema and ensures no prices and 15 unique slugs', () => {
    const yamlPath = path.resolve(__dirname, '../intake-config/catalogue.yaml');
    const works = readCatalogue(yamlPath);
    
    expect(works).toHaveLength(15);
    const slugs = works.map(w => w.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(15);
    
    // Check French meaning in slugs
    expect(slugs).toContain('les-echos-du-passe');
    expect(slugs).toContain('la-frontiere-s-estompe');
    expect(slugs).toContain('un-etranger');
    
    // Check no prices
    works.forEach(w => {
      const keys = Object.keys(w);
      keys.forEach(k => {
        expect(k.toLowerCase()).not.toMatch(/price|prix|cost|eur/);
      });
    });
  });

  it('rejects invalid config', () => {
    const badConfig = `
works:
  - slug: test
    title_fr: "Test"
    zone: "unknown"
    pdf_index: 0
    `;
    const tempFile = path.resolve(__dirname, 'temp_cat.yaml');
    fs.writeFileSync(tempFile, badConfig);
    expect(() => readCatalogue(tempFile)).toThrow();
    fs.unlinkSync(tempFile);
  });

  it('fails if catalogue config not found', () => {
    expect(() => readCatalogue('does_not_exist.yaml')).toThrow(/Catalogue config not found/);
  });
});

describe('PdfThumbnailExtractor', () => {
  it('fails loudly if file is missing', async () => {
    const extractor = new PdfThumbnailExtractor();
    await expect(extractor.extract('does_not_exist.pdf', 'out_dir'))
      .rejects.toThrow(/PDF not found/);
  });
  
  it('handles pdfimages error', async () => {
    const extractor = new PdfThumbnailExtractor();
    const fakePdf = path.resolve(__dirname, 'fake4.pdf');
    fs.writeFileSync(fakePdf, 'not a real pdf');

    try {
      await expect(extractor.extract(fakePdf, 'out_dir4'))
        .rejects.toThrow(/Prerequisite pdfimages is not installed|Failed to extract images/);
    } finally {
      if (fs.existsSync(fakePdf)) {
        fs.unlinkSync(fakePdf);
      }
    }
  });
  
  it('handles command not found by throwing specific error', async () => {
    const fakeExec = async () => { throw new Error('command not found: pdfimages'); };
    const extractor = new PdfThumbnailExtractor(fakeExec as (cmd: string) => Promise<{ stdout: string; stderr: string }>);
    const fakePdf = path.resolve(__dirname, 'fake5.pdf');
    fs.writeFileSync(fakePdf, 'dummy');

    await expect(extractor.extract(fakePdf, 'out_dir5'))
      .rejects.toThrow(/Prerequisite pdfimages is not installed/);
    
    fs.unlinkSync(fakePdf);
  });
  
  it('handles execution success with existing and non-existing outputDir', async () => {
    const fakeExec = async () => ({ stdout: '', stderr: '' });
    const extractor = new PdfThumbnailExtractor(fakeExec as (cmd: string) => Promise<{ stdout: string; stderr: string }>);
    const fakePdf = path.resolve(__dirname, 'fake6.pdf');
    fs.writeFileSync(fakePdf, 'dummy');

    const newDir = path.resolve(__dirname, 'out_dir_brand_new_' + Math.random());
    await expect(extractor.extract(fakePdf, newDir)).resolves.toBeUndefined();
    
    const existingDir = path.resolve(__dirname, 'out_dir_existing_' + Math.random());
    fs.mkdirSync(existingDir, { recursive: true });
    await expect(extractor.extract(fakePdf, existingDir)).resolves.toBeUndefined();

    fs.unlinkSync(fakePdf);
    fs.rmSync(newDir, { recursive: true, force: true });
    fs.rmSync(existingDir, { recursive: true, force: true });
  });

  it('handles non-Error objects thrown by exec', async () => {
    const fakeExec = async () => { throw 'String error'; };
    const extractor = new PdfThumbnailExtractor(fakeExec as (cmd: string) => Promise<{ stdout: string; stderr: string }>);
    const fakePdf = path.resolve(__dirname, 'fake7.pdf');
    fs.writeFileSync(fakePdf, 'dummy');

    await expect(extractor.extract(fakePdf, 'out_dir7'))
      .rejects.toThrow(/Failed to extract images from PDF: String error/);
    
    fs.unlinkSync(fakePdf);
  });

  it('passes paths with spaces and quotes correctly to execFn', async () => {
    let capturedCmd: string | undefined;
    let capturedArgs: readonly string[] | undefined;
    const fakeExecFn = async (cmd: string, args: string[]) => {
      capturedCmd = cmd;
      capturedArgs = args;
      return { stdout: '', stderr: '' };
    };
    
    const extractor = new PdfThumbnailExtractor(fakeExecFn as (cmd: string, args: string[]) => Promise<{ stdout: string | Buffer; stderr: string | Buffer }>);
    const fakePdf = path.resolve(__dirname, 'fake pdf with spaces and "quotes".pdf');
    fs.writeFileSync(fakePdf, 'dummy');

    try {
      await extractor.extract(fakePdf, 'out dir with spaces');
      expect(capturedCmd).toBe('pdfimages');
      expect(capturedArgs).toBeDefined();
      expect(capturedArgs).toContain('-j');
      expect(capturedArgs).toContain(fakePdf);
      expect(capturedArgs).toContain('out dir with spaces/img');
    } finally {
      if (fs.existsSync(fakePdf)) {
        fs.unlinkSync(fakePdf);
      }
      if (fs.existsSync('out dir with spaces')) {
        fs.rmSync('out dir with spaces', { recursive: true, force: true });
      }
    }
  });
});
