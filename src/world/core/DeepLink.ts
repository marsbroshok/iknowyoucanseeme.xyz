/**
 * Deep links and explicit Drift portal intents into the world (FR6):
 * - `/{lang}/?w=<slug>` starts the camera in front of a work, and the address
 *   follows the work the visitor settles in front of, so every view can be shared.
 * - `/{lang}/?drift=1` signals an explicit 1-click portal jump from a non-Home
 *   Awake route into the Drift world, overriding a stored `'awake'` preference
 *   and cleaning `?drift=1` via `history.replaceState`.
 */
export class DeepLink {
  /** Query parameter holding the work slug. */
  static readonly PARAM = 'w';

  /** Query parameter signalling an explicit portal jump into the Drift world. */
  static readonly DRIFT_PARAM = 'drift';

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

  /**
   * The global "Drift / Dériver" portal link from non-Home Awake routes.
   *
   * @param homePath - Home path of the locale (e.g. `/en/`).
   * @returns Site-relative portal URL (`/{lang}/?drift=1`).
   */
  static driftHref(homePath: string): string {
    return `${homePath}?${DeepLink.DRIFT_PARAM}=1`;
  }

  /**
   * Whether `search` carries an explicit `?drift=1` portal intent.
   *
   * @param search - `location.search`.
   * @returns `true` strictly when `drift=1` is present.
   */
  static hasDriftIntent(search: string): boolean {
    return new URLSearchParams(search).get(DeepLink.DRIFT_PARAM) === '1';
  }

  /**
   * Strips `?drift` from `href` while preserving pathname, remaining query
   * parameters, and hash for `history.replaceState`.
   *
   * @param href - Full URL (`location.href`).
   * @returns Clean site-relative URL (`pathname + search + hash`).
   */
  static withoutDriftIntent(href: string): string {
    const url = new URL(href);
    url.searchParams.delete(DeepLink.DRIFT_PARAM);
    return `${url.pathname}${url.search}${url.hash}`;
  }
}
