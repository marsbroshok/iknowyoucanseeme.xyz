import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function generateReviewSheet(outputFile: string) {
  const copyDir = path.resolve(__dirname, '../../src/content/copy');
  const items: { file: string, pathKeys: string[], status: string, en: string, fr: string, sources: string[] }[] = [];

  function walk(obj: unknown, file: string, pathKeys: string[]) {
    if (typeof obj !== 'object' || obj === null) return;
    const record = obj as Record<string, unknown>;
    if (typeof record.status === 'string' && ['draft', 'artist-edited', 'proofed'].includes(record.status) && typeof record.fr === 'string' && typeof record.en === 'string') {
      items.push({
        file,
        pathKeys,
        status: record.status,
        en: record.en,
        fr: record.fr,
        sources: Array.isArray(record.sources) ? (record.sources as string[]) : []
      });
    } else {
      for (const k of Object.keys(record)) {
        walk(record[k], file, [...pathKeys, k]);
      }
    }
  }

  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walkDir(fullPath);
      } else if (fullPath.endsWith('.yaml')) {
        const content = yaml.parse(fs.readFileSync(fullPath, 'utf8'));
        const rel = path.relative(copyDir, fullPath);
        walk(content, rel, []);
      }
    }
  }

  walkDir(copyDir);

  let md = '# Copy Review Sheet\n\n';
  md += '| File | Path | Status | EN | FR | Sources |\n';
  md += '|---|---|---|---|---|---|\n';

  for (const item of items) {
    const en = item.en.replace(/\n/g, '<br>');
    const fr = item.fr.replace(/\n/g, '<br>');
    const sources = item.sources.join(', ');
    md += `| ${item.file} | ${item.pathKeys.join('.')} | ${item.status} | ${en} | ${fr} | ${sources} |\n`;
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, md);
}


export function runMain(argv: string[], currentUrl: string) {
  if (argv && argv === fileURLToPath(currentUrl)) {
    const out = path.resolve(__dirname, '../../docs/copy/REVIEW.md');
    generateReviewSheet(out);
    console.log(`Generated ${out}`);
  }
}
runMain(process.argv[1] as string, import.meta.url);
