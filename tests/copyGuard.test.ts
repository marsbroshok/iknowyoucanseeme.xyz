import { describe, it, expect } from 'vitest';
import { checkVocabularyAndTypography, clearDenyListCache } from '../src/tools/CopyGuard.js';
import fs from 'fs';
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

  it('works when deny-list file is missing', () => {
    const p = path.resolve(__dirname, '../content-config/vocabulary-deny.yaml');
    fs.renameSync(p, p + '.bak');
    clearDenyListCache();
    try {
      expect(() => checkVocabularyAndTypography({
        status: 'draft',
        fr: 'Normal',
        en: 'Normal',
        sources: []
      })).not.toThrow();
    } finally {
      fs.renameSync(p + '.bak', p);
    }
  });

  it('fails on long sentences', () => {
    const longEn = 'This is a very very very very very very very very very very very very very very very very very very very very very very long sentence.';
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: 'Normale.',
      en: longEn,
      sources: ['x']
    })).toThrow(/sentence too long in en/i);

    const longFr = 'Ceci est une phrase très très très très très très très très très très très très très très très très très très très très très très très très longue.';
    expect(() => checkVocabularyAndTypography({
      status: 'draft',
      fr: longFr,
      en: 'Normal.',
      sources: ['x']
    })).toThrow(/sentence too long in fr/i);
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
});
