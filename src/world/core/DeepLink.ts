/**
 * Deep links into the world (FR6): `/{lang}/?w=<slug>` starts the camera in
 * front of a work, and the address follows the work the visitor settles in
 * front of, so every view can be shared.
 */
export class DeepLink {
  /** Query parameter holding the work slug. */
  static readonly PARAM = 'w';

  /**
   * The work named in a query string, if it exists.
   *
   * @param search - `location.search`.
   * @param slugs - Works of the world.
   * @returns The slug, or `null` when absent or unknown.
   */
  static parse(search: string, slugs: ReadonlySet<string>): string | null {
    const slug = new URLSearchParams(search).get(DeepLink.PARAM);
    return slug && slugs.has(slug) ? slug : null;
  }

  /**
   * The current address with `?w=` set to a work (other parameters and the
   * hash kept), as a site-relative URL for `history.replaceState`.
   *
   * @param href - `location.href`.
   * @param slug - Work slug.
   * @returns Path, query and hash.
   */
  static withWork(href: string, slug: string): string {
    const url = new URL(href);
    url.searchParams.set(DeepLink.PARAM, slug);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  /**
   * The "See it in the drift" link of a work page.
   *
   * @param homePath - Home path of the locale (e.g. `/fr/`).
   * @param slug - Work slug.
   * @returns The link.
   */
  static href(homePath: string, slug: string): string {
    return `${homePath}?${DeepLink.PARAM}=${encodeURIComponent(slug)}`;
  }
}
