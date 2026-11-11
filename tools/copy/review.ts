import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function generateReviewSheet(outputFile: string) {
  const copyDir = path.resolve(__dirname, '../../src/content/copy');
  const items: { file: string, pathKeys: string[], status: string, en: string, fr: string, sources: string[] }[] = [];

  function walk(obj: any, file: string, pathKeys: string[]) {
    if (typeof obj !== 'object' || obj === null) return;
    if (obj.status && ['draft', 'artist-edited', 'proofed'].includes(obj.status) && obj.fr && obj.en) {
      items.push({
        file,
        pathKeys,
        status: obj.status,
        en: obj.en,
        fr: obj.fr,
        sources: obj.sources || []
      });
    } else {
      for (const k of Object.keys(obj)) {
        walk(obj[k], file, [...pathKeys, k]);
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

const isMain = process.argv[1] && import.meta.url === `file://${fs.realpathSync(process.argv[1])}`;
if (isMain) {
  const out = path.resolve(__dirname, '../../docs/copy/REVIEW.md');
  generateReviewSheet(out);
  console.log(`Generated ${out}`);
}
