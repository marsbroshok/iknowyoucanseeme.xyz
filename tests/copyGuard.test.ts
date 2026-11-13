import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  CopyGuard,
  checkVocabularyAndTypography,
  checkNarrativeCadence,
  clearDenyListCache,
  MAX_WORDS_EN,
  MAX_WORDS_FR,
  MIN_NARRATIVE_AVG_WORDS,
} from '../src/tools/CopyGuard.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('CopyGuard', () => {
  it('fails on literary words', () => {
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: 'Une lumière normale.',
      en: 'A liminal space.',
      sources: ['x']
    })).toThrow(/literary word in en: liminal/i);
    
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: "La frontière semble s'amincir.",
      en: 'Normal english.',
      sources: ['x']
    })).toThrow(/literary word in fr: s'amincir/i);
  });

  it('works when deny-list file is missing or omits locale keys', () => {
    const missingGuard = new CopyGuard(path.join(os.tmpdir(), 'nonexistent-vocabulary-deny.yaml'));
    expect(() =>
      missingGuard.checkVocabularyAndTypography({
        status: 'draft',
        fr: 'Normal',
        en: 'Normal',
        sources: [],
      }),
    ).not.toThrow();

    const emptyYaml = path.join(os.tmpdir(), `empty-deny-${process.pid}.yaml`);
    fs.writeFileSync(emptyYaml, '{}', 'utf-8');
    try {
      const partialGuard = new CopyGuard(emptyYaml);
      expect(() =>
        partialGuard.checkVocabularyAndTypography({
          status: 'draft',
          fr: 'Normal',
          en: 'Normal',
          sources: [],
        }),
      ).not.toThrow();
      partialGuard.clearCache();
    } finally {
      if (fs.existsSync(emptyYaml)) fs.unlinkSync(emptyYaml);
    }

    clearDenyListCache();
  });

  it('enforces calibrated manifesto sentence limits (EN <= 38, FR <= 42)', () => {
    expect(MAX_WORDS_EN).toBe(38);
    expect(MAX_WORDS_FR).toBe(42);

    // Authentic Dreamland manifesto sentences (~27-32 words) must pass
    const manifestoEn =
      "As memory and present experience begin to merge, the very concept of 'home' evolves—the alien begins to feel familiar, while the familiar takes on a strange new light.";
    const manifestoFr =
      "À mesure que la mémoire et l'expérience présente commencent à se confondre, l'idée même de «\u00A0chez-soi\u00A0» évolue\u00A0: l'étranger devient familier, tandis que le familier prend une lumière neuve et singulière.";
    expect(() =>
      checkVocabularyAndTypography({
        status: 'draft',
        fr: manifestoFr,
        en: manifestoEn,
        sources: ['manifesto'],
      }),
    ).not.toThrow();

    // Exact 38 EN and 42 FR pass
    const exact38En = Array.from({ length: 38 }, () => 'stone').join(' ') + '.';
    const exact42Fr = Array.from({ length: 42 }, () => 'pierre').join(' ') + '.';
    expect(() =>
      checkVocabularyAndTypography({
        status: 'draft',
        fr: exact42Fr,
        en: exact38En,
        sources: ['x'],
      }),
    ).not.toThrow();

    // 39 EN fails
    const over38En = Array.from({ length: 39 }, () => 'stone').join(' ') + '.';
    expect(() =>
      checkVocabularyAndTypography({
        status: 'draft',
        fr: 'Normale.',
        en: over38En,
        sources: ['x'],
      }),
    ).toThrow(/sentence too long in en: 39 words > 38 limit/i);

    // 43 FR fails
    const over42Fr = Array.from({ length: 43 }, () => 'pierre').join(' ') + '.';
    expect(() =>
      checkVocabularyAndTypography({
        status: 'draft',
        fr: over42Fr,
        en: 'Normal.',
        sources: ['x'],
      }),
    ).toThrow(/sentence too long in fr: 43 words > 42 limit/i);
  });

  it('fails on missing non-breaking spaces before French punctuation', () => {
    // Failing ASCII space
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: 'Quoi ?',
      en: 'What?',
      sources: ['x']
    })).toThrow(/missing non-breaking space before \?/i);

    // Failing no-space case (letter directly before)
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: 'Quoi?',
      en: 'What?',
      sources: ['x']
    })).toThrow(/missing non-breaking space before \?/i);
    
    // Failing no-space case (digit directly before)
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: '10!',
      en: '10!',
      sources: ['x']
    })).toThrow(/missing non-breaking space before !/i);

    // Failing no-space case (closing quote directly before)
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: '« mot »!',
      en: '"word"!',
      sources: ['x']
    })).toThrow(/missing non-breaking space before !/i);

    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: 'Non!',
      en: 'No!',
      sources: ['x']
    })).toThrow(/missing non-breaking space before !/i);

    for (const badColon of [':debut', 'fin:', 'Note: mot', '10:a']) {
      expect(() =>
        checkVocabularyAndTypography({
          status: 'draft',
          fr: badColon,
          en: 'Note.',
          sources: ['x'],
        }),
      ).toThrow(/missing non-breaking space before :/i);
    }
  });

  it('passes on valid exceptions for French punctuation', () => {
    // Passes URL
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: 'Visitez https://example.com ou http://test.com',
      en: 'Visit https://example.com',
      sources: ['x']
    })).not.toThrow();

    // Passes time
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: 'Il est 10:30.',
      en: 'It is 10:30.',
      sources: ['x']
    })).not.toThrow();

    // Passes NNBSP
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: 'Quoi\u202F?',
      en: 'What?',
      sources: ['x']
    })).not.toThrow();
  });

  it('fails on straight quotes in French', () => {
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: '"Bonjour"',
      en: '"Hello"',
      sources: ['x']
    })).toThrow(/use « » for quotes in fr/i);
  });

  it('passes on valid text', () => {
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: 'Bonjour\u00A0! C\'est «\u00A0bien\u00A0»\u00A0?',
      en: 'Hello! Is this "good"?',
      sources: ['x']
    })).not.toThrow();
  });

  describe('checkNarrativeCadence', () => {
    it('rejects choppy telegraphic blocks (< 10 words/sentence average) in EN and FR', () => {
      expect(MIN_NARRATIVE_AVG_WORDS).toBe(10);

      expect(() =>
        checkNarrativeCadence({
          en: 'I am a photographer and ceramic artist. I live in France. I left my country. Since then I ask myself what home is.',
          fr: "Photographe et céramiste établi en France après avoir quitté mon pays d'origine, j'explore ce qu'est un chez-soi lorsque l'ancrage d'un lieu disparaît.",
        }),
      ).toThrow(/telegraphic narrative cadence in en/i);

      expect(() =>
        checkNarrativeCadence({
          en: 'A journey is traditionally defined as a cycle whose final step is the return home, yet changing countries leaves us adrift from that story.',
          fr: "Je suis photographe. Je vis en France. J'ai quitté mon pays.",
        }),
      ).toThrow(/telegraphic narrative cadence in fr/i);
    });

    it('rejects empty narrative blocks', () => {
      expect(() =>
        checkNarrativeCadence({
          en: '   ',
          fr: 'Une phrase narrative suffisamment longue pour dépasser dix mots sans difficulté.',
        }),
      ).toThrow(/telegraphic narrative cadence in en/i);
    });

    it('accepts Dreamland manifesto prose and exact 10-word average boundary', () => {
      expect(() =>
        checkNarrativeCadence({
          en: 'A journey is traditionally defined as a cycle whose final step is the return home. But as someone who has changed countries, I found myself adrift from the classic story of voyage and return.',
          fr: "Un voyage se définit traditionnellement comme un cycle dont l'ultime étape est le retour chez soi. Mais ayant changé de pays, je me suis trouvé à la dérive hors de ce récit classique de départ et de retour.",
        }),
      ).not.toThrow();

      const tenWordsEn = Array.from({ length: 10 }, () => 'horizon').join(' ') + '.';
      const tenWordsFr = Array.from({ length: 10 }, () => 'horizon').join(' ') + '.';
      expect(() => checkNarrativeCadence({ en: tenWordsEn, fr: tenWordsFr })).not.toThrow();
    });

    it('property: enforces exact >= 10 average sentence word count invariant across arbitrary multi-sentence blocks', () => {
      const sentenceArb = fc.integer({ min: 1, max: 25 }).map((n) => Array.from({ length: n }, () => 'light').join(' ') + '.');
      fc.assert(
        fc.property(
          fc.array(sentenceArb, { minLength: 1, maxLength: 5 }),
          fc.array(sentenceArb, { minLength: 1, maxLength: 5 }),
          (enSentences, frSentences) => {
            const countAvg = (arr: string[]) =>
              arr.reduce((sum, s) => sum + s.replace('.', '').trim().split(/\s+/).length, 0) / arr.length;
            const enAvg = countAvg(enSentences);
            const frAvg = countAvg(frSentences);
            const block = { en: enSentences.join(' '), fr: frSentences.join(' ') };
            if (enAvg >= 10 && frAvg >= 10) {
              expect(() => checkNarrativeCadence(block)).not.toThrow();
            } else {
              expect(() => checkNarrativeCadence(block)).toThrow(/telegraphic narrative cadence/i);
            }
          },
        ),
      );
    });
  });
});
