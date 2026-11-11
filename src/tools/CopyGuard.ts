import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TextBlock {
  status: 'draft' | 'artist-edited' | 'proofed';
  fr: string;
  en: string;
  sources: string[];
}

let denyList: { en: string[], fr: string[] } | null = null;

function loadDenyList() {
  if (denyList) return denyList;
  const configPath = path.resolve(__dirname, '../../content-config/vocabulary-deny.yaml');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    denyList = yaml.parse(content);
  } else {
    denyList = { en: [], fr: [] };
  }
  return denyList;
}

export function clearDenyListCache() { denyList = null; }

export function checkVocabularyAndTypography(block: TextBlock) {
  const lists = loadDenyList();

  if (lists && lists.en) {
    for (const word of lists.en) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(block.en)) {
        throw new Error(`Literary word in EN: ${word}`);
      }
    }
  }

  if (lists && lists.fr) {
    for (const word of lists.fr) {
      if (new RegExp(`\\b${word.replace("'", "\\'")}\\b`, 'i').test(block.fr)) {
        throw new Error(`Literary word in FR: ${word}`);
      }
    }
  }

  // Max sentence length check
  const checkLength = (text: string, max: number, lang: string) => {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    for (const s of sentences) {
      const words = s.split(/\s+/);
      if (words.length > max) {
        throw new Error(`Sentence too long in ${lang}: ${words.length} words > ${max} limit`);
      }
    }
  };

  checkLength(block.en, 22, 'EN');
  checkLength(block.fr, 24, 'FR');

  // Typography guard for FR
  // missing non-breaking space before : ; ? !
  // Straight quotes
  const invalidPunctuationRegex = /(?<![\u00A0\u202F])([:;?!])/g;
  let matchPunct;
  while ((matchPunct = invalidPunctuationRegex.exec(block.fr)) !== null) {
    const punct = matchPunct[1];
    const index = matchPunct.index;
    
    // Allow http:// or https://
    if (punct === ':' && (block.fr.slice(Math.max(0, index - 5), index) === 'https' || block.fr.slice(Math.max(0, index - 4), index) === 'http')) {
      continue;
    }
    
    // Allow time formats like 10:30
    if (punct === ':' && index > 0 && index < block.fr.length - 1) {
      const prevChar = block.fr[index - 1];
      const nextChar = block.fr[index + 1];
      if (/\d/.test(prevChar) && /\d/.test(nextChar)) {
        continue;
      }
    }

    throw new Error(`Missing non-breaking space before ${punct} in FR`);
  }

  if (/"/.test(block.fr)) {
    throw new Error(`Use « » for quotes in FR instead of straight quotes`);
  }
}