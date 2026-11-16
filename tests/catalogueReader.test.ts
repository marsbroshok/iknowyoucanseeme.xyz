import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readCatalogue, PdfThumbnailExtractor } from '../src/intake/CatalogueReader.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Every file and folder these tests write lives in one fresh folder under the
 * OS temp directory, removed after the suite: nothing is left in the working
 * directory (out_dir4/5/7 used to be).
 */
let tmp: string;
const inTmp = (name: string) => path.join(tmp, name);
const strayOutputs = ['out_dir', 'out_dir4', 'out_dir5', 'out_dir7', 'out dir with spaces', 'temp_cat.yaml'];

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogue-reader-'));
});

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  expect(strayOutputs.filter((entry) => fs.existsSync(path.join(process.cwd(), entry)))).toEqual([]);
});

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

    // Check pdf_index matches pdfimages extraction order (column-major across the 3 PDF pages)
    const indexBySlug = Object.fromEntries(works.map(w => [w.slug, w.pdf_index]));
    expect(indexBySlug).toEqual({
      'immersion-i': 0,
      'solitude': 1,
      'immersion-ii': 2,
      'rever-en-rose': 3,
      'perdu-dans-les-etoiles': 4,
      'la-decouverte': 5,
      'les-echos-du-passe': 6,
      'dissonance': 7,
      'nouveau-soleil': 8,
      'arrivee': 9,
      'les-reflets-i': 10,
      'la-frontiere-s-estompe': 11,
      'un-etranger': 12,
      'les-reflets-ii': 13,
      'les-reflets-iii': 14
    });
    
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
    const tempFile = inTmp('temp_cat.yaml');
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
    await expect(extractor.extract(inTmp('does_not_exist.pdf'), inTmp('out_dir')))
      .rejects.toThrow(/PDF not found/);
  });
  
  it('handles pdfimages error', async () => {
    const extractor = new PdfThumbnailExtractor();
    const fakePdf = inTmp('fake4.pdf');
    fs.writeFileSync(fakePdf, 'not a real pdf');

    try {
      await expect(extractor.extract(fakePdf, inTmp('out_dir4')))
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
    const fakePdf = inTmp('fake5.pdf');
    fs.writeFileSync(fakePdf, 'dummy');

    await expect(extractor.extract(fakePdf, inTmp('out_dir5')))
      .rejects.toThrow(/Prerequisite pdfimages is not installed/);
    
    fs.unlinkSync(fakePdf);
  });
  
  it('handles execution success with existing and non-existing outputDir', async () => {
    const fakeExec = async () => ({ stdout: '', stderr: '' });
    const extractor = new PdfThumbnailExtractor(fakeExec as (cmd: string) => Promise<{ stdout: string; stderr: string }>);
    const fakePdf = inTmp('fake6.pdf');
    fs.writeFileSync(fakePdf, 'dummy');

    const newDir = inTmp('out_dir_brand_new');
    await expect(extractor.extract(fakePdf, newDir)).resolves.toBeUndefined();
    
    const existingDir = inTmp('out_dir_existing');
    fs.mkdirSync(existingDir, { recursive: true });
    await expect(extractor.extract(fakePdf, existingDir)).resolves.toBeUndefined();

    fs.unlinkSync(fakePdf);
    fs.rmSync(newDir, { recursive: true, force: true });
    fs.rmSync(existingDir, { recursive: true, force: true });
  });

  it('handles non-Error objects thrown by exec', async () => {
    const fakeExec = async () => { throw 'String error'; };
    const extractor = new PdfThumbnailExtractor(fakeExec as (cmd: string) => Promise<{ stdout: string; stderr: string }>);
    const fakePdf = inTmp('fake7.pdf');
    fs.writeFileSync(fakePdf, 'dummy');

    await expect(extractor.extract(fakePdf, inTmp('out_dir7')))
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
    const fakePdf = inTmp('fake pdf with spaces and "quotes".pdf');
    fs.writeFileSync(fakePdf, 'dummy');

    try {
      await extractor.extract(fakePdf, inTmp('out dir with spaces'));
      expect(capturedCmd).toBe('pdfimages');
      expect(capturedArgs).toBeDefined();
      expect(capturedArgs).toContain('-j');
      expect(capturedArgs).toContain(fakePdf);
      expect(capturedArgs).toContain(`${inTmp('out dir with spaces')}/img`);
    } finally {
      if (fs.existsSync(fakePdf)) {
        fs.unlinkSync(fakePdf);
      }
    }
  });
});
