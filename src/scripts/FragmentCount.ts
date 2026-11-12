/**
 * Storage key of the fragments read, as written by the world's
 * `FragmentProgress` (src/world/core). Kept here rather than imported: an
 * import would make a chunk shared with the world and turn this page's
 * small inline script into an external module (ADR 0007, DistGuard). The
 * unit test writes with `FragmentProgress` and reads with this function,
 * so the two cannot drift apart.
 */
export const FRAGMENTS_KEY = 'iknowyoucanseeme:fragments';

/** The part of `window` the counter reads. */
export interface FragmentCountWindow {
  readonly localStorage: { getItem(key: string): string | null };
}

/**
 * "Fragments found: n / N" on an awake territory page (FR3), a JavaScript-
 * only enhancement: the element (`[data-fragments-found]`, with the
 * territory's fragment ids in `data-ids` and the text in `data-template`
 * with `{n}` and `{total}`) is rendered hidden and shown only here, with
 * the count of fragments read in the world (localStorage). Without
 * JavaScript, without fragments, with storage blocked, or with malformed
 * build-time ids (fails closed, with a warning), it stays hidden;
 * an unreadable stored value counts as nothing read (with a warning, the
 * world replaces it on the next fragment).
 *
 * @param doc - The document.
 * @param win - Window-like provider of `localStorage`.
 * @returns `true` when the count is shown.
 * @throws Error when the element lacks `data-ids` or `data-template` (a page bug).
 */
export function showFragmentCount(doc: Document, win: FragmentCountWindow): boolean {
  const el = doc.querySelector<HTMLElement>('[data-fragments-found]');
  if (!el) return false;
  const { ids: rawIds, template } = el.dataset;
  if (rawIds === undefined || template === undefined) throw new Error('[fragments] [data-fragments-found] needs data-ids and data-template');
  const ids = stringList(rawIds, 'The territory fragment ids (data-ids)');
  if (ids === null || ids.length === 0) return false;
  let raw: string | null;
  try {
    raw = win.localStorage.getItem(FRAGMENTS_KEY);
  } catch (error) {
    console.warn('[fragments] localStorage is blocked; the fragments found are not shown.', error);
    return false;
  }
  const found = new Set(raw === null ? [] : (stringList(raw, 'The stored fragment progress') ?? []));
  const n = ids.filter((id) => found.has(id)).length;
  el.textContent = template.replace('{n}', String(n)).replace('{total}', String(ids.length));
  el.hidden = false;
  return true;
}

/**
 * A JSON list of strings, validated.
 *
 * @param raw - JSON text.
 * @param what - What the text is, for the warning.
 * @returns The strings, or `null` (with a warning) when the text is not valid JSON or not a list of strings.
 */
function stringList(raw: string, what: string): string[] | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    console.warn(`[fragments] ${what} is not valid JSON; counting nothing.`, error);
    return null;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return value;
  console.warn(`[fragments] ${what} is not a list of ids; counting nothing.`, value);
  return null;
}
