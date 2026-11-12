import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { splitSentences } from '../../../src/world/manifest/StatementSentences.js';

describe('splitSentences', () => {
  it('splits a statement into its sentences, keeping the end marks', () => {
    expect(splitSentences('A journey is a cycle. But I found myself adrift! Is home a place? No.')).toEqual([
      'A journey is a cycle.',
      'But I found myself adrift!',
      'Is home a place?',
      'No.',
    ]);
  });

  it('keeps French spacing before ? and ! inside the sentence, and a colon does not end a sentence', () => {
    expect(splitSentences("Ce travail est né de cette expérience : notre maison est le rêve. Où est-elle ? Ici\u00a0!")).toEqual([
      'Ce travail est né de cette expérience : notre maison est le rêve.',
      'Où est-elle ?',
      'Ici\u00a0!',
    ]);
  });

  it('joins wrapped lines and ignores extra spaces; a closing quote stays with its sentence', () => {
    expect(splitSentences('  One line\n wrapped.   « Two. »  Three…  Four  ')).toEqual(['One line wrapped.', '« Two. »', 'Three…', 'Four']);
  });

  it('gives nothing for empty text', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('  \n ')).toEqual([]);
  });

  it('splits the real Dreamland statement into 7 (EN) and 6 (FR) sentences', async () => {
    const { default: yaml } = await import('yaml');
    const fs = await import('node:fs');
    const doc = yaml.parse(fs.readFileSync('src/content/copy/territories/dreamland.yaml', 'utf8')) as { statement: { en: string; fr: string } };
    expect(splitSentences(doc.statement.en)).toHaveLength(7);
    expect(splitSentences(doc.statement.fr)).toHaveLength(6);
  });

  it('property: no words are lost or invented, and no sentence is empty', () => {
    const word = fc.stringMatching(/^[a-zéè]{1,8}$/);
    const sentence = fc.tuple(fc.array(word, { minLength: 1, maxLength: 6 }), fc.constantFrom('.', '!', '?', '…')).map(([w, end]) => w.join(' ') + end);
    fc.assert(
      fc.property(fc.array(sentence, { maxLength: 8 }), (sentences) => {
        const out = splitSentences(sentences.join(' '));
        expect(out).toEqual(sentences);
        expect(out.every((s) => s.trim().length > 0)).toBe(true);
      }),
    );
  });
});
