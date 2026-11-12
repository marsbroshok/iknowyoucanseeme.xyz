/**
 * Splits a statement into sentences (FR3: statement sentences surface one
 * by one along the drift path). A sentence ends at `.`, `!`, `?` or `…`
 * (with any closing quote or bracket after it, also after a French space)
 * followed by a space. Colons and semicolons do not end a sentence. Line
 * wraps of the YAML source become single spaces; non-breaking spaces (French
 * typography before `?`, `!`, `:`) are kept.
 *
 * @param text - Statement in one language.
 * @returns Sentences in order, trimmed; empty for blank text.
 */
export function splitSentences(text: string): string[] {
  const flat = text.replace(/[ \t\r\n]+/g, ' ').trim();
  if (flat === '') return [];
  return flat.split(/(?<=[.!?…](?:[ \u00a0]?[»”’")])*) +(?=[^ »”’")])/);
}
