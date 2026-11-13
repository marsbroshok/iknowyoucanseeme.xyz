import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Maximum words per sentence in English copy, calibrated to the Dreamland manifesto register. */
export const MAX_WORDS_EN = 38;

/** Maximum words per sentence in French copy, calibrated to the Dreamland manifesto register. */
export const MAX_WORDS_FR = 42;

/** Minimum average words per sentence required across narrative prose blocks. */
export const MIN_NARRATIVE_AVG_WORDS = 10;

/** Bilingual copy block validated by CopyGuard. */
export interface CopyTextBlock {
  status: 'draft' | 'artist-edited' | 'proofed';
  fr: string;
  en: string;
  sources: string[];
}

/** Bilingual text pair checked for narrative prose cadence. */
export interface NarrativeBlock {
  en: string;
  fr: string;
}

/** Vocabulary deny-list loaded from `content-config/vocabulary-deny.yaml`. */
interface DenyList {
  en: string[];
  fr: string[];
}

/**
 * Validates bilingual copy blocks against the vocabulary deny-list, sentence-length
 * bounds, French typography rules, and the anti-telegraphic narrative cadence floor.
 */
export class CopyGuard {
  private denyList: DenyList | null = null;
  private readonly configPath: string;

  /**
   * @param configPath - Path to `vocabulary-deny.yaml`.
   */
  constructor(configPath = path.resolve(__dirname, '../../content-config/vocabulary-deny.yaml')) {
    this.configPath = configPath;
  }

  /**
   * Clears the cached vocabulary deny-list so subsequent checks reload from disk.
   */
  clearCache(): void {
    this.denyList = null;
  }

  /**
   * Validates vocabulary, max sentence length (EN <= 38, FR <= 42), and French typography.
   *
   * @param block - Bilingual copy block to inspect.
   * @throws Error when a denied word, overlong sentence, missing French NBSP, or straight quote is found.
   */
  checkVocabularyAndTypography(block: CopyTextBlock): void {
    const lists = this.loadDenyList();

    for (const word of lists.en) {
      if (matchesDeniedTerm(block.en, word)) {
        throw new Error(`Literary word in EN: ${word}`);
      }
    }

    for (const word of lists.fr) {
      if (matchesDeniedTerm(block.fr, word)) {
        throw new Error(`Literary word in FR: ${word}`);
      }
    }

    assertMaxSentenceWords(block.en, MAX_WORDS_EN, 'EN');
    assertMaxSentenceWords(block.fr, MAX_WORDS_FR, 'FR');
    assertFrenchTypography(block.fr);
  }

  /**
   * Rejects choppy, telegraphic narrative prose whose average sentence length falls below
   * 10 words in either English or French.
   *
   * @param block - Bilingual narrative prose block (`bio`, `origin`, or territory/zone `statement`).
   * @throws Error when average sentence length is `< 10` words in EN or FR.
   */
  checkNarrativeCadence(block: NarrativeBlock): void {
    assertMinAverageWords(block.en, MIN_NARRATIVE_AVG_WORDS, 'EN');
    assertMinAverageWords(block.fr, MIN_NARRATIVE_AVG_WORDS, 'FR');
  }

  private loadDenyList(): DenyList {
    if (this.denyList !== null) {
      return this.denyList;
    }
    if (fs.existsSync(this.configPath)) {
      const parsed = yaml.parse(fs.readFileSync(this.configPath, 'utf-8')) as Partial<DenyList>;
      this.denyList = {
        en: parsed.en ?? [],
        fr: parsed.fr ?? [],
      };
    } else {
      this.denyList = { en: [], fr: [] };
    }
    return this.denyList;
  }
}

/**
 * Escapes RegExp metacharacters in a literal deny-list entry.
 *
 * @param value - Raw deny-list term.
 * @returns Escaped pattern safe for interpolation into `new RegExp(...)`.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tests whether `text` contains `term` bounded by non-letter Unicode boundaries.
 *
 * @param text - Copy text to inspect.
 * @param term - Deny-list word or phrase.
 * @returns `true` when `term` appears as a standalone token or phrase.
 */
function matchesDeniedTerm(text: string, term: string): boolean {
  return new RegExp(`(?<!\\p{L})${escapeRegExp(term)}(?!\\p{L})`, 'iu').test(text);
}

/**
 * Splits a text into non-empty sentences and counts whitespace-delimited words per sentence.
 *
 * @param text - Prose text in EN or FR.
 * @returns Word count of each non-empty sentence.
 */
function sentenceWordCounts(text: string): number[] {
  return text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .map((sentence) => sentence.split(/\s+/).length);
}

/**
 * Asserts no sentence exceeds `max` words.
 *
 * @param text - Prose text.
 * @param max - Word ceiling per sentence.
 * @param lang - Locale label for error messages.
 */
function assertMaxSentenceWords(text: string, max: number, lang: 'EN' | 'FR'): void {
  for (const count of sentenceWordCounts(text)) {
    if (count > max) {
      throw new Error(`Sentence too long in ${lang}: ${count} words > ${max} limit`);
    }
  }
}

/**
 * Asserts narrative prose maintains at least `minAvg` words per sentence on average.
 *
 * @param text - Narrative prose text.
 * @param minAvg - Minimum average words per sentence.
 * @param lang - Locale label for error messages.
 */
function assertMinAverageWords(text: string, minAvg: number, lang: 'EN' | 'FR'): void {
  const counts = sentenceWordCounts(text);
  const avg = counts.length === 0 ? 0 : counts.reduce((sum, count) => sum + count, 0) / counts.length;
  if (avg < minAvg) {
    throw new Error(
      `Telegraphic narrative cadence in ${lang}: average ${avg.toFixed(1)} words/sentence < ${minAvg} minimum`,
    );
  }
}

/**
 * Enforces French spacing before `: ; ? !` (excluding URLs and `HH:MM` times) and guillemets `« »`.
 *
 * @param fr - French text to validate.
 */
function assertFrenchTypography(fr: string): void {
  const invalidPunctuationRegex = /(?<![\u00A0\u202F])([:;?!])/g;
  let matchPunct: RegExpExecArray | null;
  while ((matchPunct = invalidPunctuationRegex.exec(fr)) !== null) {
    const punct = matchPunct[1];
    const index = matchPunct.index;

    if (
      punct === ':' &&
      (fr.slice(Math.max(0, index - 5), index) === 'https' || fr.slice(Math.max(0, index - 4), index) === 'http')
    ) {
      continue;
    }

    if (punct === ':' && index > 0 && index < fr.length - 1 && /\d/.test(fr[index - 1]) && /\d/.test(fr[index + 1])) {
      continue;
    }

    throw new Error(`Missing non-breaking space before ${punct} in FR`);
  }

  if (/"/.test(fr)) {
    throw new Error('Use « » for quotes in FR instead of straight quotes');
  }
}

const defaultGuard = new CopyGuard();

/**
 * Clears the default CopyGuard deny-list cache.
 */
export function clearDenyListCache(): void {
  defaultGuard.clearCache();
}

/**
 * Checks a bilingual copy block against vocabulary, sentence-length, and French typography rules.
 *
 * @param block - Bilingual copy block.
 */
export function checkVocabularyAndTypography(block: CopyTextBlock): void {
  defaultGuard.checkVocabularyAndTypography(block);
}

/**
 * Checks a bilingual narrative prose block against the anti-telegraphic cadence floor (>= 10 words/sentence).
 *
 * @param block - Bilingual narrative prose block.
 */
export function checkNarrativeCadence(block: NarrativeBlock): void {
  defaultGuard.checkNarrativeCadence(block);
}
