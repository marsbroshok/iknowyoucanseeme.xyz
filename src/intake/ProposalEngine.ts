import fs from 'fs';
import yaml from 'yaml';
import { hammingDistance } from './PerceptualHasher.js';
import { CatalogueWork } from './CatalogueReader.js';

export interface Rules {
  territory2: string[]; // dates
  leak: string[]; // dates
  origin2019: { start: string; end: string };
}

export interface HashedIgImage {
  src: string;
  hash: bigint;
  postDate: string;
  postCaption: string;
}

export interface HashedCatalogueWork extends CatalogueWork {
  hash: bigint;
}

export interface CatalogueProposal {
  slug: string;
  title_fr: string;
  zone: string;
  pdf_index: number;
  matches: Array<{ src: string; distance: number; postDate: string; postCaption: string; hash: bigint }>;
}

export interface AllProposals {
  catalogue: CatalogueProposal[];
  territory2: HashedIgImage[];
  leak: HashedIgImage[];
  origin2019: HashedIgImage[];
}

/**
 * parseRules
 */
export function parseRules(yamlPath: string): Rules {
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`Rules config not found at ${yamlPath}`);
  }
  const content = fs.readFileSync(yamlPath, 'utf-8');
  const parsed = yaml.parse(content) || {};
  return {
    territory2: parsed.territory2?.dates || [],
    leak: parsed.leak?.dates || [],
    origin2019: {
      start: parsed.origin2019?.date_range?.start || '',
      end: parsed.origin2019?.date_range?.end || ''
    }
  };
}

/**
 * generateProposals
 */
export function generateProposals(
  catalogue: HashedCatalogueWork[],
  igImages: HashedIgImage[],
  rules: Rules
): AllProposals {
  // Catalogue matches
  const catalogueProposals: CatalogueProposal[] = catalogue.map(work => {
    const validIgImages = igImages.filter(img => {
      const ds = img.postDate.substring(0, 10);
      if (rules.origin2019.start && rules.origin2019.end) {
        if (ds >= rules.origin2019.start && ds <= rules.origin2019.end) return false;
      }
      return true;
    });
    const scored = validIgImages.map(img => ({
      ...img,
      distance: hammingDistance(work.hash, img.hash)
    }));
    
    // Sort by distance ASC, then by date DESC for deterministic tie-break
    scored.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return b.postDate.localeCompare(a.postDate);
    });
    
    return {
      slug: work.slug,
      title_fr: work.title_fr,
      zone: work.zone,
      pdf_index: work.pdf_index,
      matches: scored.slice(0, 3)
    };
  });

  const t2: HashedIgImage[] = [];
  const leak: HashedIgImage[] = [];
  const origin: HashedIgImage[] = [];

  const catalogueMatchedSrcs = new Set(catalogueProposals.map(c => c.matches[0]?.src).filter(Boolean));

  for (const img of igImages) {
    // dates in rules are YYYY-MM-DD. img.postDate is ISO like YYYY-MM-DDTHH:mm:ss
    const dateStr = img.postDate.substring(0, 10);
    if (!catalogueMatchedSrcs.has(img.src)) {
      if (rules.territory2.includes(dateStr)) {
        t2.push(img);
      }
      if (rules.leak.includes(dateStr)) {
        leak.push(img);
      }
    }
    if (rules.origin2019.start && rules.origin2019.end) {
      if (dateStr >= rules.origin2019.start && dateStr <= rules.origin2019.end) {
        origin.push(img);
      }
    }
  }

  return {
    catalogue: catalogueProposals,
    territory2: t2,
    leak,
    origin2019: origin
  };
}
