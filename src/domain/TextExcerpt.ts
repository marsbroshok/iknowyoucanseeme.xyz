/**
 * Shortens a text to whole sentences that fit in `maxChars`. When even the
 * first sentence is too long, it is cut at the last word boundary (or hard,
 * for a single long word) and an ellipsis `…` is appended.
 *
 * @param text - Source text.
 * @param maxChars - Maximum length before the optional ellipsis (≥ 1).
 * @returns The excerpt; at most `maxChars + 1` characters.
 */
export function excerpt(text: string, maxChars: number): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;

  let end = 0;
  for (const match of clean.matchAll(/[^.!?]+[.!?]+/g)) {
    const sentenceEnd = match.index + match[0].length;
    if (sentenceEnd > maxChars) break;
    end = sentenceEnd;
  }
  if (end > 0) return clean.slice(0, end);

  const head = clean.slice(0, maxChars);
  const lastSpace = head.lastIndexOf(' ');
  const cut = lastSpace > 0 ? head.slice(0, lastSpace) : head;
  return `${cut.trimEnd()}…`;
}
