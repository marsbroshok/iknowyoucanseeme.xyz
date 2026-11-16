import type { TextBlock, Work } from '../content/schema/index.js';
import type { UiText } from '../i18n/UiText.js';
import { localizedPath } from '../i18n/LocalizedPath.js';
import { DeepLink } from '../world/core/DeepLink.js';
import {
  ZONE_ORDER,
  getWorkSequence,
  getWorksByTerritory,
  pickSpread,
  type WorkSequence,
  type ZoneSlug,
} from './WorkQueries.js';
import { buildWorkView, type WorkView } from './WorkView.js';
import { excerpt } from './TextExcerpt.js';
import { specimenLabels } from './SpecimenLabel.js';

/** Territory or zone data after `withCopy` (title and statement from copy files). */
export interface TitledEntry {
  slug: string;
  title?: Record<string, string>;
  statement?: TextBlock;
}

/** In-page jump link and Drift portal for a zone on a territory page. */
export interface ZoneJumpView {
  slug: ZoneSlug;
  /** Anchor id on the zone `<section>` (`zone-<slug>`). */
  anchorId: string;
  title: string;
  count: number;
  /** Deep link into the 3D Drift facing the first work of this zone. */
  driftHref: string;
}

/** Sibling territory continuation card rendered at the end of a territory page. */
export interface TerritoryContinuationView {
  slug: string;
  title: string;
  excerpt?: string;
  href: string;
  count: number;
  driftHref: string;
}

/** Works of one zone (or the zone-less remainder) on a territory page. */
export interface ZoneGroupView {
  /** Zone slug; `undefined` for works without a zone. */
  slug?: ZoneSlug;
  /** HTML `id` (`zone-<slug>`) for in-page jump navigation when zoned. */
  anchorId?: string;
  title?: string;
  statement?: string;
  count: number;
  /** Drift deep-link to the first work of this group when non-empty. */
  driftHref?: string;
  works: WorkView[];
  /** Museum-tag label by work slug, for the Leak zone's specimen grid (FR4); absent elsewhere. */
  specimens?: Readonly<Record<string, string>>;
}

/** Display model of a territory page. */
export interface TerritoryView {
  slug: string;
  title: string;
  statement?: string;
  href: string;
  count: number;
  /** Deep link into the Drift facing the territory's opening work (`undefined` if empty). */
  driftHref?: string;
  /** Zone groups in narrative order; empty groups are omitted. */
  groups: ZoneGroupView[];
  /** Jump bar items for zoned groups (`Arrival`, `Lens`, `Leak`). */
  zoneJumps: ZoneJumpView[];
  /** Cross-territory continuation targets (non-empty sibling territories). */
  otherTerritories: TerritoryContinuationView[];
}

/** Breadcrumb hierarchy and sequence context for a Work detail page (FR3). */
export interface WorkBreadcrumb {
  readonly worksHref: string;
  readonly worksLabel: string;
  readonly territoryHref: string;
  readonly territoryTitle: string;
  readonly zoneHref?: string;
  readonly zoneTitle?: string;
  readonly sequence?: WorkSequence;
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

/** Maximum statement excerpt length on the home page and continuation cards. */
export const TEASER_EXCERPT_CHARS = 220;

/**
 * Localized title of a territory/zone.
 *
 * @param entry - Territory or zone (with copy).
 * @param ui - UI strings of the target locale.
 * @returns The title.
 * @throws Error when the entry has no title in this locale (copy missing).
 */
export function titleOf(entry: TitledEntry, ui: UiText): string {
  const title = entry.title?.[ui.lang];
  if (!title) throw new Error(`[content] Missing ${ui.lang} title for "${entry.slug}"`);
  return title;
}

/**
 * Builds the territory page model: statement, works grouped by zone in the
 * order Arrival → Lens → Leak → no zone, zone jump descriptors, first-work
 * Drift portal links, and sibling-territory continuation cards.
 *
 * @param territory - Territory data (with copy).
 * @param zones - All zones (with copy).
 * @param works - All works (with copy).
 * @param ui - UI strings of the target locale.
 * @param allTerritories - Optional full territory list for cross-territory continuation.
 * @returns The view model.
 * @throws Error when a title is missing for a territory or used zone.
 */
export function buildTerritoryView(
  territory: TitledEntry,
  zones: readonly TitledEntry[],
  works: readonly Work[],
  ui: UiText,
  allTerritories: readonly TitledEntry[] = [],
): TerritoryView {
  const homeHref = localizedPath('home', ui.lang);
  const own = getWorksByTerritory(works, territory.slug);
  const labels = specimenLabels(own, ui);
  const groupSlugs: (ZoneSlug | undefined)[] = [...ZONE_ORDER, undefined];
  const groups = groupSlugs
    .map((zoneSlug): ZoneGroupView => {
      const zoneWorks = own.filter((w) => w.zone === zoneSlug).map((w) => buildWorkView(w, ui));
      if (zoneSlug === undefined) {
        return {
          count: zoneWorks.length,
          driftHref: zoneWorks[0]?.driftHref,
          works: zoneWorks,
        };
      }
      const zone = zones.find((z) => z.slug === zoneSlug);
      if (!zone) throw new Error(`[content] Unknown zone "${zoneSlug}"`);
      const group: ZoneGroupView = {
        slug: zoneSlug,
        anchorId: `zone-${zoneSlug}`,
        title: titleOf(zone, ui),
        statement: zone.statement?.[ui.lang],
        count: zoneWorks.length,
        driftHref: zoneWorks[0]?.driftHref,
        works: zoneWorks,
      };
      if (zoneSlug === 'leak') {
        group.specimens = Object.fromEntries(zoneWorks.map((w) => [w.slug, labels.get(w.slug) as string]));
      }
      return group;
    })
    .filter((g) => g.works.length > 0);

  const zoneJumps: ZoneJumpView[] = groups
    .filter(
      (g): g is ZoneGroupView & { slug: ZoneSlug; anchorId: string; title: string; driftHref: string } =>
        g.slug !== undefined,
    )
    .map((g) => ({
      slug: g.slug,
      anchorId: g.anchorId,
      title: g.title,
      count: g.count,
      driftHref: g.driftHref,
    }));

  const otherTerritories: TerritoryContinuationView[] = allTerritories
    .filter((other) => other.slug !== territory.slug)
    .map((other) => ({ other, otherWorks: getWorksByTerritory(works, other.slug) }))
    .filter(({ otherWorks }) => otherWorks.length > 0)
    .map(({ other, otherWorks }) => {
      const stmt = other.statement?.[ui.lang];
      return {
        slug: other.slug,
        title: titleOf(other, ui),
        excerpt: stmt === undefined ? undefined : excerpt(stmt, TEASER_EXCERPT_CHARS),
        href: localizedPath('territories', ui.lang, [other.slug]),
        count: otherWorks.length,
        driftHref: DeepLink.href(homeHref, otherWorks[0].slug),
      };
    });

  return {
    slug: territory.slug,
    title: titleOf(territory, ui),
    statement: territory.statement?.[ui.lang],
    href: localizedPath('territories', ui.lang, [territory.slug]),
    count: own.length,
    driftHref: own.length > 0 ? DeepLink.href(homeHref, own[0].slug) : undefined,
    groups,
    zoneJumps,
    otherTerritories,
  };
}

/**
 * Builds the top-of-page hierarchy breadcrumb (`Works → Territory → #zone-*`)
 * and `index / total` sequence counter for a Work detail page.
 *
 * @param work - Current work.
 * @param territory - Parent territory entry (with copy).
 * @param zones - All zones (with copy).
 * @param allWorks - Full work catalogue (for sequence position).
 * @param ui - Localized UI strings.
 * @returns Breadcrumb model.
 * @throws Error when `work.zone` is unknown or lacks localized copy.
 */
export function buildWorkBreadcrumb(
  work: Work,
  territory: TitledEntry,
  zones: readonly TitledEntry[],
  allWorks: readonly Work[],
  ui: UiText,
): WorkBreadcrumb {
  const territoryHref = localizedPath('territories', ui.lang, [territory.slug]);
  const sequence = getWorkSequence(allWorks, work.slug, territory.slug) ?? undefined;
  const base: WorkBreadcrumb = {
    worksHref: localizedPath('works', ui.lang),
    worksLabel: ui.t('nav_works'),
    territoryHref,
    territoryTitle: titleOf(territory, ui),
    sequence,
  };
  if (!work.zone) return base;
  const zone = zones.find((z) => z.slug === work.zone);
  if (!zone) throw new Error(`[content] Unknown zone "${work.zone}"`);
  return {
    ...base,
    zoneHref: `${territoryHref}#zone-${work.zone}`,
    zoneTitle: titleOf(zone, ui),
  };
}

/** One zone (or unzoned) sub-group inside a territory section of the works index. */
export interface IndexZoneSubgroupView {
  slug?: ZoneSlug;
  title?: string;
  href?: string;
  driftHref: string;
  count: number;
  hasPhoto: boolean;
  hasCeramic: boolean;
  works: WorkView[];
}

/** One territory section of the works index. */
export interface IndexSectionView {
  slug: string;
  title: string;
  href: string;
  driftHref: string;
  count: number;
  hasPhoto: boolean;
  hasCeramic: boolean;
  works: WorkView[];
  subgroups: IndexZoneSubgroupView[];
}

/**
 * Builds the works-index sections: one per territory that has works, in
 * territory-slug order (same as `sortWorksForIndex`), works in zone order,
 * enriched with territory/zone links, counts, Drift deep links, and static
 * medium-presence flags for CSS `:has()` filtering.
 *
 * @param territories - Territories (with copy).
 * @param works - All works.
 * @param ui - UI strings of the target locale.
 * @param zones - Optional zone entries (with copy) for zone sub-group headers.
 * @returns Non-empty sections.
 */
export function buildIndexSections(
  territories: readonly TitledEntry[],
  works: readonly Work[],
  ui: UiText,
  zones: readonly TitledEntry[] = [],
): IndexSectionView[] {
  return [...territories]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((t) => ({ t, rawWorks: getWorksByTerritory(works, t.slug) }))
    .filter(({ rawWorks }) => rawWorks.length > 0)
    .map(({ t, rawWorks }): IndexSectionView => {
      const territoryHref = localizedPath('territories', ui.lang, [t.slug]);
      const sectionWorks = rawWorks.map((w) => buildWorkView(w, ui));
      const hasZones = zones.length > 0 && sectionWorks.some((w) => w.zone !== undefined);
      const groupSlugs: (ZoneSlug | undefined)[] = hasZones ? [...ZONE_ORDER, undefined] : [undefined];
      const subgroups = groupSlugs
        .map((zoneSlug): IndexZoneSubgroupView | null => {
          const items = hasZones ? sectionWorks.filter((w) => w.zone === zoneSlug) : sectionWorks;
          if (items.length === 0) return null;
          if (zoneSlug === undefined) {
            return {
              driftHref: items[0].driftHref,
              count: items.length,
              hasPhoto: items.some((w) => w.medium === 'photo'),
              hasCeramic: items.some((w) => w.medium === 'ceramic'),
              works: items,
            };
          }
          const zone = zones.find((z) => z.slug === zoneSlug);
          if (!zone) throw new Error(`[content] Unknown zone "${zoneSlug}"`);
          return {
            slug: zoneSlug,
            title: titleOf(zone, ui),
            href: `${territoryHref}#zone-${zoneSlug}`,
            driftHref: items[0].driftHref,
            count: items.length,
            hasPhoto: items.some((w) => w.medium === 'photo'),
            hasCeramic: items.some((w) => w.medium === 'ceramic'),
            works: items,
          };
        })
        .filter((sg): sg is IndexZoneSubgroupView => sg !== null);

      return {
        slug: t.slug,
        title: titleOf(t, ui),
        href: territoryHref,
        driftHref: sectionWorks[0].driftHref,
        count: sectionWorks.length,
        hasPhoto: sectionWorks.some((w) => w.medium === 'photo'),
        hasCeramic: sectionWorks.some((w) => w.medium === 'ceramic'),
        works: sectionWorks,
        subgroups,
      };
    });
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
