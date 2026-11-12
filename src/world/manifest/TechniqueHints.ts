/** Technique keys the lens understands, in canonical (priority) order. */
export const TECHNIQUE_KEYS = ['mirror', 'filter', 'icm', 'multiple-exposure'] as const;

/** A technique key. */
export type TechniqueKey = (typeof TECHNIQUE_KEYS)[number];

/**
 * Words that name each technique in the artist's captions, titles and
 * declared techniques (English and French). "Gel" is left out: in French
 * it means frost. A key matches when any of its patterns does; "ND" is
 * matched in capitals only, so a stray "nd" names nothing.
 */
const PATTERNS: Readonly<Record<TechniqueKey, readonly RegExp[]>> = {
  mirror: [/\b(mirrors?|mirrored|miroirs?|reflections?|reflets?)\b/i],
  filter: [/\bND\b/, /\bneutral density\b|\b(filters?|filtres?)\b/i],
  icm: [/\bicm\b|\bintentional camera movement\b/i],
  'multiple-exposure': [/\bmultiple-exposure\b|\b(multiple|double) exposures?\b|\bexpositions? multiples?\b|\bdouble exposition\b|\bsurimpressions?\b/i],
};

/**
 * Techniques named in a work's texts, as keys for the lens (build time; the
 * texts themselves never reach the page). Matching is on whole words, so
 * "filtering" or "single exposure" name nothing.
 *
 * @param texts - Declared techniques, title, caption notes.
 * @returns Keys found, each once, in {@link TECHNIQUE_KEYS} order.
 */
export function techniqueHints(texts: readonly string[]): TechniqueKey[] {
  const all = texts.join('\n');
  return TECHNIQUE_KEYS.filter((key) => PATTERNS[key].some((pattern) => pattern.test(all)));
}
