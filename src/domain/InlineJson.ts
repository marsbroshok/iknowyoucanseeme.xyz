/** Characters that could end or confuse an inline `<script>` element. */
const UNSAFE = /[<>&\u2028\u2029]/g;

/**
 * JSON for an inline `<script type="application/json">` (or `ld+json`)
 * element. `<`, `>` and `&` are written as `\u003c`, `\u003e` and `\u0026`,
 * so no string in the data (a copy text holding `</script>` or `<!--`) can
 * close the element or open a comment; U+2028 and U+2029 are escaped as
 * well. `JSON.parse` returns exactly the original value.
 *
 * @param value - Any JSON-serialisable value.
 * @returns The escaped JSON text.
 * @throws Error when `value` has no JSON form (e.g. `undefined`).
 */
export function inlineJson(value: unknown): string {
  const json = JSON.stringify(value) as string | undefined;
  if (json === undefined) throw new Error('[inlineJson] The value cannot be written as JSON');
  return json.replace(UNSAFE, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}
