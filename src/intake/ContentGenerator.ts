import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { SelectionEntry } from './SelectionStore.js';
import { HashedIgImage } from './ProposalEngine.js';
import { processImage } from './ImageProcessor.js';
import { extractPalette } from './PaletteExtractor.js';
import { Work, WorkSchema, TerritorySchema, ZoneSchema, ExhibitionSchema } from '../content/schema/index.js';

import sharp from 'sharp';

/**
 * generateContentFiles
 */
export async function generateContentFiles(
  selection: SelectionEntry[],
  igImages: HashedIgImage[],
  srcDir: string,
  intakeDir: string,
  exportDir: string
) {
  const worksDir = path.join(srcDir, 'content/works');
  const territoriesDir = path.join(srcDir, 'content/territories');
  const zonesDir = path.join(srcDir, 'content/zones');
  const exhibitionsDir = path.join(srcDir, 'content/exhibitions');
  const sourcesDir = path.join(srcDir, 'content/sources');
  const assetsWorksDir = path.join(srcDir, 'assets/works');
  const originalsDir = path.join(intakeDir, 'originals');

  [worksDir, territoriesDir, zonesDir, exhibitionsDir, sourcesDir, assetsWorksDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const kept = selection.filter(s => s.keep);
  
  const worksBySlug = new Map<string, Work>();
  const territories = new Set<string>();
  const zones = new Set<string>();

  // Process works
  for (const s of kept) {
    territories.add(s.territory);
    if (s.zone) zones.add(s.zone);

    const ig = igImages.find(img => img.src === s.src);
    const postDate = ig ? ig.postDate : '';
    const postCaption = ig ? ig.postCaption : '';

    let work = worksBySlug.get(s.slug);
    if (!work) {
      work = {
        slug: s.slug,
        title: { fr: s.title_fr },
        territory: s.territory,
        zone: s.zone as "arrival" | "lens" | "leak" | undefined,
        year: s.slug.startsWith('venise-portrait') ? 2025 : 2026,
        medium: s.slug.startsWith('esquisse-argile') ? 'ceramic' : 'photo',
        techniques: [...(s.techniques ?? [])],
        availability: 'unknown',
        images: [],
        sourceNotes: `${postDate}\n${postCaption}`
      };
      if (s.people?.consent) {
        work.people = { consent: 'confirmed' };
      }
      worksBySlug.set(s.slug, work);
    }
    
    // Process image
    const imgIndex = work.images.length;
    let inputBuf: Buffer;
    let source: 'instagram' | 'original' = 'instagram';
    
    // Check original swap
    const baseName = imgIndex === 0 ? s.slug : `${s.slug}-${imgIndex}`;
    let originalPath = '';
    const pJpg = path.join(originalsDir, `${baseName}.jpg`);
    if (fs.existsSync(pJpg)) originalPath = pJpg;
    const pPng = path.join(originalsDir, `${baseName}.png`);
    if (!originalPath && fs.existsSync(pPng)) originalPath = pPng;
    
    if (originalPath) {
      inputBuf = fs.readFileSync(originalPath);
      source = 'original';
    } else {
      let srcPath = path.resolve(exportDir, s.src);
      if (!fs.existsSync(srcPath)) {
        srcPath = path.resolve(exportDir, '..', s.src);
      }
      inputBuf = fs.readFileSync(srcPath);
    }

    const processed: Buffer = await processImage(inputBuf);
    
    const assetDir = path.join(assetsWorksDir, s.slug);
    if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });
    
    const outFilename = `${imgIndex}.jpg`;
    fs.writeFileSync(path.join(assetDir, outFilename), processed);
    
    const palette: string[] = await extractPalette(processed);

    // Try to get dimensions if it was really processed
    let w = 800, h = 800;
    const meta = await sharp(processed).metadata();
    if (meta.width) w = meta.width;
    if (meta.height) h = meta.height;

    work.images.push({
      src: outFilename,
      source,
      width: w,
      height: h,
      palette
    });
  }

  // Write works
  for (const work of worksBySlug.values()) {
    // Validate
    // Ensure year is derived somehow if needed, but we hardcoded 2026. Wait!
    // "Dreamland catalogue works = 2025; territory 2 = 2026; Venice = 2025; clay sketches = 2026"
    // I can infer from territory or date.
    if (work.territory === 'dreamland' && !work.zone?.includes('leak')) {
      work.year = 2025;
    }
    
    WorkSchema.parse(work);
    
    const doc = new yaml.Document();
    doc.contents = doc.createNode(work);
    fs.writeFileSync(path.join(worksDir, `${work.slug}.yaml`), String(doc));
  }

  // Write territories
  for (const t of territories) {
    const data = { slug: t };
    TerritorySchema.parse(data);
    fs.writeFileSync(path.join(territoriesDir, `${t}.yaml`), String(new yaml.Document(data)));
  }

  // Write zones
  for (const z of zones) {
    const data = { slug: z };
    ZoneSchema.parse(data);
    fs.writeFileSync(path.join(zonesDir, `${z}.yaml`), String(new yaml.Document(data)));
  }

  // Write exhibitions
  // Facts from conductor/product.md (also stated in the About copy).
  const mpaa = { slug: 'mpaa-2019', title: { fr: "L'Emprunt, la Citation" }, year: 2019, venue: 'MPAA', dates: { en: 'Dec 2019', fr: 'déc. 2019' } };
  const atelier = {
    slug: 'atelier-51-2025',
    title: { fr: 'Dreamland' },
    year: 2025,
    venue: 'Atelier 51',
    dates: { en: '16–30 Oct 2025', fr: '16–30 oct. 2025' }
  };
  ExhibitionSchema.parse(mpaa);
  ExhibitionSchema.parse(atelier);
  fs.writeFileSync(path.join(exhibitionsDir, 'mpaa-2019.yaml'), String(new yaml.Document(mpaa)));
  fs.writeFileSync(path.join(exhibitionsDir, 'atelier-51-2025.yaml'), String(new yaml.Document(atelier)));

  // Write origins
  const origins = igImages.filter(img => img.postDate.startsWith('2019-12'));
  if (origins.length > 0) {
    fs.writeFileSync(path.join(sourcesDir, 'origin-2019.yaml'), String(new yaml.Document({ posts: origins })));
  }
}
