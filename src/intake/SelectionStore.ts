import fs from 'fs';
import yaml from 'yaml';

export interface SelectionEntry {
  src: string;
  keep: boolean;
  slug: string;
  title_fr: string;
  territory: string;
  zone?: string;
  people?: { consent: 'confirmed' };
}

export function mergeSelection(original: SelectionEntry[], proposed: SelectionEntry[]): SelectionEntry[] {
  const merged = [...original];
  const origSrcs = new Set(original.map(o => o.src));
  
  for (const p of proposed) {
    if (!origSrcs.has(p.src)) {
      merged.push(p);
    }
  }
  
  return merged;
}

export function readSelection(yamlPath: string): SelectionEntry[] {
  if (!fs.existsSync(yamlPath)) return [];
  const content = fs.readFileSync(yamlPath, 'utf-8');
  const parsed = yaml.parse(content);
  return parsed?.selection || [];
}

export function writeSelection(yamlPath: string, selection: SelectionEntry[]): void {
  const doc = new yaml.Document();
  doc.contents = doc.createNode({ selection });
  fs.writeFileSync(yamlPath, String(doc));
}
