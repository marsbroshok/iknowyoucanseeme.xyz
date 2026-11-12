import type { TextBlock, Work } from '../content/schema/index.js';
import type { UiText } from '../i18n/UiText.js';
import { localizedPath } from '../i18n/LocalizedPath.js';
import { ZONE_ORDER, getWorksByTerritory, pickSpread, type ZoneSlug } from './WorkQueries.js';
import { buildWorkView, type WorkView } from './WorkView.js';
import { excerpt } from './TextExcerpt.js';

/** Territory or zone data after `withCopy` (title and statement from copy files). */
export interface TitledEntry {
  slug: string;
  title?: Record<string, string>;
  statement?: TextBlock;
}

/** Works of one zone (or the zone-less remainder) on a territory page. */
export interface ZoneGroupView {
  /** Zone slug; `undefined` for works without a zone. */
  slug?: ZoneSlug;
  title?: string;
  statement?: string;
  works: WorkView[];
}

/** Display model of a territory page. */
export interface TerritoryView {
  slug: string;
  title: string;
  statement?: string;
  href: string;
  /** Zone groups in narrative order; empty groups are omitted. */
  groups: ZoneGroupView[];
}

/** A territory as an entry block on the home page. */
export interface TerritoryTeaserView {
  slug: string;
  title: string;
  /** Statement shortened to whole sentences. */
  excerpt?: string;
  href: string;
  /** Three works spread across the territory's zones. */
  featured: WorkView[];
}

/** Maximum statement excerpt length on the home page. */
export const TEASER_EXCERPT_CHARS = 220;

/**
 * Localized title of a territory/zone.
 *
 * @throws Error when the entry has no title in this locale (copy missing).
 */
function titleOf(entry: TitledEntry, ui: UiText): string {
  const title = entry.title?.[ui.lang];
  if (!title) throw new Error(`[content] Missing ${ui.lang} title for "${entry.slug}"`);
  return title;
}

/**
 * Builds the territory page model: statement, then works grouped by zone in
 * the order Arrival → Lens → Leak, then works without a zone.
 *
 * @param territory - Territory data (with copy).
 * @param zones - All zones (with copy).
 * @param works - All works (with copy).
 * @param ui - UI strings of the target locale.
 * @returns The view model.
 * @throws Error when a title is missing for a territory or used zone.
 */
export function buildTerritoryView(
  territory: TitledEntry,
  zones: readonly TitledEntry[],
  works: readonly Work[],
  ui: UiText,
): TerritoryView {
  const own = getWorksByTerritory(works, territory.slug);
  const groupSlugs: (ZoneSlug | undefined)[] = [...ZONE_ORDER, undefined];
  const groups = groupSlugs
    .map((zoneSlug): ZoneGroupView => {
      const zoneWorks = own.filter((w) => w.zone === zoneSlug).map((w) => buildWorkView(w, ui));
      if (zoneSlug === undefined) return { works: zoneWorks };
      const zone = zones.find((z) => z.slug === zoneSlug);
      if (!zone) throw new Error(`[content] Unknown zone "${zoneSlug}"`);
      return { slug: zoneSlug, title: titleOf(zone, ui), statement: zone.statement?.[ui.lang], works: zoneWorks };
    })
    .filter((g) => g.works.length > 0);

  return {
    slug: territory.slug,
    title: titleOf(territory, ui),
    statement: territory.statement?.[ui.lang],
    href: localizedPath('territories', ui.lang, [territory.slug]),
    groups,
  };
}

/**
 * Builds the home-page entry block of a territory.
 *
 * @param territory - Territory data (with copy).
 * @param works - All works.
 * @param ui - UI strings of the target locale.
 * @returns The teaser model.
 */
export function buildTerritoryTeaser(territory: TitledEntry, works: readonly Work[], ui: UiText): TerritoryTeaserView {
  const statement = territory.statement?.[ui.lang];
  return {
    slug: territory.slug,
    title: titleOf(territory, ui),
    excerpt: statement === undefined ? undefined : excerpt(statement, TEASER_EXCERPT_CHARS),
    href: localizedPath('territories', ui.lang, [territory.slug]),
    featured: pickSpread(getWorksByTerritory(works, territory.slug), 3).map((w) => buildWorkView(w, ui)),
  };
}
