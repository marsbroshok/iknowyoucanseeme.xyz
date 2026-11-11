import { parseArgs } from 'util';
import fs from 'fs';
import path from 'path';
import { readCatalogue, PdfThumbnailExtractor } from '../../src/intake/CatalogueReader.js';
import { parseIgPosts } from '../../src/intake/IgExportParser.js';
import { hashImageBuffer } from '../../src/intake/PerceptualHasher.js';
import { generateProposals, parseRules } from '../../src/intake/ProposalEngine.js';
import { renderReviewSheet } from '../../src/intake/ReviewSheetRenderer.js';
import { readSelection, writeSelection, mergeSelection } from '../../src/intake/SelectionStore.js';
import { generateContentFiles } from '../../src/intake/ContentGenerator.js';

export async function runCli(args: string[]) {
  const options = {
    help: { type: 'boolean' as const, short: 'h' },
    export: { type: 'string' as const, default: 'intake/your_instagram_activity' },
    config: { type: 'string' as const, default: 'intake-config' },
    intake: { type: 'string' as const, default: 'intake' },
    src: { type: 'string' as const, default: 'src' }
  };
  
  const parsed = parseArgs({ args, options, allowPositionals: true });
  
  const helpText = `Usage: intake <command> [options]
Commands:
  catalogue  Extract catalogue thumbnails
  propose    Match catalogue and run rules -> generates review sheet & selection.yaml
  generate   Generate final content from selection.yaml
Options:
  --export <dir>   Instagram export directory (default: intake/your_instagram_activity)
  --config <dir>   Config directory (default: intake-config)
  --intake <dir>   Intake directory (default: intake)
  --src <dir>      Src directory (default: src)
`;

  if (parsed.values.help || parsed.positionals.length === 0) {
    throw new Error(helpText);
  }
  
  const cmd = parsed.positionals[0];
  const intakeDir = path.resolve(parsed.values.intake!);
  const configDir = path.resolve(parsed.values.config!);
  const exportDir = path.resolve(parsed.values.export!);
  const srcDir = path.resolve(parsed.values.src!);

  if (cmd === 'catalogue') {
    const extractor = new PdfThumbnailExtractor();
    const pdfPath = path.join(intakeDir, 'catalogue/Dreamland_artifacts_and_texts.pdf');
    const outDir = path.join(intakeDir, 'catalogue');
    await extractor.extract(pdfPath, outDir);
    console.log('Catalogue thumbnails extracted.');
  } 
  else if (cmd === 'propose') {
    if (!fs.existsSync(exportDir)) {
      throw new Error(`Missing export directory: ${exportDir}`);
    }
    
    console.log('Reading catalogue...');
    const catWorks = readCatalogue(path.join(configDir, 'catalogue.yaml'));
    
    // Hash catalogue thumbnails
    const catHashed = [];
    for (const w of catWorks) {
      const imgPath = path.join(intakeDir, `catalogue/img-00${w.pdf_index}.jpg`); // naive formatting for 0-14
      const p = fs.existsSync(imgPath) ? imgPath : path.join(intakeDir, `catalogue/img-0${w.pdf_index < 10 ? '0'+w.pdf_index : w.pdf_index}.jpg`);
      let hash = 0n;
      if (fs.existsSync(p)) {
        hash = await hashImageBuffer(fs.readFileSync(p));
      }
      catHashed.push({ ...w, hash });
    }

    console.log('Parsing IG export...');
    const postsHtml = path.join(exportDir, 'media/posts_1.html');
    const reelsHtml = path.join(exportDir, 'media/reels.html');
    const posts = parseIgPosts({
      postsHtml: fs.existsSync(postsHtml) ? postsHtml : undefined,
      reelsHtml: fs.existsSync(reelsHtml) ? reelsHtml : undefined
    });

    console.log('Hashing IG media...');
    const igHashed = [];
    for (const post of posts) {
      for (const m of post.media) {
        if (m.endsWith('.mp4')) continue; // skip videos
        
        // m is like "media/posts/202611/img1.jpg" relative to exportDir
        // But our parser checks whitelist 'media/...' or 'your_instagram_activity/media/...'
        // The file is actually at exportDir/m or exportDir.parent/m
        // Let's resolve it
        let p = path.join(exportDir, m);
        if (!fs.existsSync(p)) {
          // If export is 'intake/your_instagram_activity', maybe m is 'your_instagram_activity/media/...'
          p = path.join(exportDir, '..', m);
        }
        if (fs.existsSync(p)) {
          const hash = await hashImageBuffer(fs.readFileSync(p));
          igHashed.push({ src: m, hash, postDate: post.date, postCaption: post.caption });
        }
      }
    }

    const rules = parseRules(path.join(configDir, 'rules.yaml'));
    const proposals = generateProposals(catHashed, igHashed, rules);
    
    // Review sheet
    renderReviewSheet(proposals, path.join(intakeDir, 'review/index.html'));
    
    // Merge selection
    const selPath = path.join(configDir, 'selection.yaml');
    const original = readSelection(selPath);
    const newProposals = [
      ...proposals.catalogue.map(c => ({
        src: c.matches[0]?.src || '',
        keep: true,
        slug: c.slug,
        title_fr: c.title_fr,
        territory: 'dreamland',
        zone: c.zone
      })),
      ...proposals.territory2.map((m, i) => ({ src: m.src, keep: true, slug: `t2-${i}`, title_fr: '', territory: 'the-border-is-thin' })),
      ...proposals.leak.map((m, i) => ({ src: m.src, keep: true, slug: `leak-${i}`, title_fr: '', territory: 'dreamland', zone: 'leak' }))
    ].filter(p => p.src);
    
    const merged = mergeSelection(original, newProposals);
    writeSelection(selPath, merged);
    
    console.log('Propose complete. Check intake/review/index.html and intake-config/selection.yaml');
  } 
  else if (cmd === 'generate') {
    const selPath = path.join(configDir, 'selection.yaml');
    const selection = readSelection(selPath);
    
    const igHashed = [];
    const postsP = path.join(exportDir, 'media/posts_1.html');
    const reelsP = path.join(exportDir, 'media/reels.html');
    const posts = parseIgPosts({
      postsHtml: fs.existsSync(postsP) ? postsP : undefined,
      reelsHtml: fs.existsSync(reelsP) ? reelsP : undefined
    });
    for (const post of posts) {
      for (const m of post.media) {
        igHashed.push({ src: m, hash: 0n, postDate: post.date, postCaption: post.caption });
      }
    }
    
    await generateContentFiles(selection, igHashed, srcDir, intakeDir);
    console.log('Generate complete.');
  }
}

// execute if run directly

/* v8 ignore start */
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runCli(process.argv.slice(2)).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
