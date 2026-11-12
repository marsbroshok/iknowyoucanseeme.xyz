/**
 * Whether the page asks for the exhibition mode (`?kiosk=1`, FR5).
 *
 * @param search - `location.search`.
 * @returns `true` for `kiosk=1` only.
 */
export function isKiosk(search: string): boolean {
  return new URLSearchParams(search).get('kiosk') === '1';
}
