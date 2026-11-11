import { describe, it, expect } from 'vitest';
import { generateContentFiles } from '../src/intake/ContentGenerator.js';
import { SelectionEntry } from '../src/intake/SelectionStore.js';
import { HashedIgImage } from '../src/intake/ProposalEngine.js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

describe('ContentGenerator', () => {
  it('generates content files correctly and handles originals swap', async () => {
    const srcDir = path.resolve(__dirname, 'temp_src');
    const intakeDir = path.resolve(__dirname, 'temp_intake');
    
    fs.mkdirSync(path.join(srcDir, 'content/works'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'assets/works/work-1'), { recursive: true });
    fs.mkdirSync(path.join(intakeDir, 'originals'), { recursive: true });
    fs.mkdirSync(path.join(intakeDir, 'review'), { recursive: true }); 
    
    const validJpeg = await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } } }).jpeg().toBuffer();
    
    fs.writeFileSync(path.join(intakeDir, 'originals', 'work-1.jpg'), validJpeg);
    fs.writeFileSync(path.join(intakeDir, 'originals', 'work-7.png'), validJpeg);
    
    // Create dummy instagram image
    const igPath = path.resolve(__dirname, 'temp_ig.jpg');
    fs.writeFileSync(igPath, validJpeg);
    
    const invalidIgPath = path.resolve(__dirname, 'temp_ig_invalid.jpg');
    fs.writeFileSync(invalidIgPath, 'invalid');
    
    const notInIgPath = path.resolve(__dirname, 'not_in_ig.jpg');
    fs.writeFileSync(notInIgPath, validJpeg);

    const selection: SelectionEntry[] = [
      { src: 'temp_ig.jpg', keep: true, slug: 'work-1', title_fr: 'w1', territory: 'dreamland', zone: 'arrival', people: { consent: 'confirmed' } },
      { src: 'not_in_ig.jpg', keep: true, slug: 'work-1', title_fr: 'w1', territory: 'dreamland', zone: 'arrival' }, // 2nd image for work-1
      { src: 'temp_ig.jpg', keep: true, slug: 'work-3', title_fr: 'w3', territory: 'dreamland', zone: 'arrival' }, // no original
      { src: 'temp_ig_invalid.jpg', keep: true, slug: 'work-4', title_fr: 'w4', territory: 'dreamland', zone: 'arrival' }, // invalid image throws
      { src: 'not_in_ig.jpg', keep: true, slug: 'work-5', title_fr: 'w5', territory: 't2' }, // missing from igImages
      { src: 'temp_ig.jpg', keep: true, slug: 'work-7', title_fr: 'w7', territory: 't7' }, // has .png
      { src: 'dropped.jpg', keep: false, slug: 'work-2', title_fr: 'w2', territory: 'dreamland' }
    ];
    
    const igImages: HashedIgImage[] = [
      { src: 'temp_ig.jpg', hash: 0n, postDate: '2025-01-01', postCaption: 'caption' },
      { src: 'temp_ig_invalid.jpg', hash: 0n, postDate: '2025-01-01', postCaption: '' },
      { src: 'origin1.jpg', hash: 0n, postDate: '2019-12-05', postCaption: 'Origin story 1' }
    ];
    
    // Test the generator
    await expect(generateContentFiles(selection, igImages, srcDir, intakeDir, intakeDir)).rejects.toThrow();
    fs.writeFileSync(invalidIgPath, validJpeg);
    await generateContentFiles(selection, igImages, srcDir, intakeDir, intakeDir);
    
    // Check works
    const workFile = path.join(srcDir, 'content/works/work-1.yaml');
    expect(fs.existsSync(workFile)).toBe(true);
    
    const content = fs.readFileSync(workFile, 'utf-8');
    expect(content).toContain('slug: work-1');
    expect(content).toContain('sourceNotes: |');
    expect(content).toContain('2025-01-01');
    expect(content).toContain('caption');
    expect(content).toContain('source: original'); // due to swap
    
    // Dropped work absent
    expect(fs.existsSync(path.join(srcDir, 'content/works/work-2.yaml'))).toBe(false);
    
    // Check origin
    const originFile = path.join(srcDir, 'content/sources/origin-2019.yaml');
    expect(fs.existsSync(originFile)).toBe(true);
    expect(fs.readFileSync(originFile, 'utf-8')).toContain('Origin story 1');
    
    // Check exhibitions
    expect(fs.existsSync(path.join(srcDir, 'content/exhibitions/mpaa-2019.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, 'content/exhibitions/atelier-51-2025.yaml'))).toBe(true);
    
    // Idempotency
    const contentBefore = fs.readFileSync(workFile, 'utf-8');
    await generateContentFiles(selection, igImages, srcDir, intakeDir, intakeDir);
    const contentAfter = fs.readFileSync(workFile, 'utf-8');
    expect(contentBefore).toBe(contentAfter);
    
    // Originals dir missing branch
    fs.rmSync(path.join(intakeDir, 'originals'), { recursive: true, force: true });
    await generateContentFiles([{ src: 'temp_ig.jpg', keep: true, slug: 'work-6', title_fr: 'w6', territory: 't6' }, { src: 'temp_ig.jpg', keep: true, slug: 'venise-portrait-1', title_fr: 'vp1', territory: 't' }, { src: 'temp_ig.jpg', keep: true, slug: 'esquisse-argile-1', title_fr: 'ea1', territory: 't' }], igImages, srcDir, intakeDir, intakeDir);
    const jpg = Buffer.from('ffd8ffe000104a46494600010101004800480000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103012200021101031101ffc4001500010100000000000000000000000000000008ffc40014100100000000000000000000000000000000ffc4001501010100000000000000000000000000000000ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00508fffd9', 'hex');
    fs.writeFileSync(path.join(intakeDir, 'temp_ig_inner.jpg'), jpg);
    await generateContentFiles([{ src: 'temp_ig_inner.jpg', keep: true, slug: 'work-7', title_fr: 'w7', territory: 't7' }], igImages, srcDir, intakeDir, intakeDir);
    
    // Cleanup
    fs.unlinkSync(igPath);
    fs.unlinkSync(invalidIgPath);
    fs.unlinkSync(notInIgPath);
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(intakeDir, { recursive: true, force: true });
  });
});
