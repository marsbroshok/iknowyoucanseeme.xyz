import type { Work } from '../../content/schema/index.js';
import type { UiText } from '../../i18n/UiText.js';
import { buildWorkView } from '../../domain/WorkView.js';
import { titleOf, type TitledEntry } from '../../domain/TerritoryView.js';
import { NIGHT_BLUE } from '../core/StageSettings.js';
import type { ManifestImage, ManifestWork, WorldManifest } from '../core/WorldManifest.js';
import { FieldLayout, type ZoneSlug } from '../core/FieldLayout.js';
import { lensTechniques } from './TechniqueHints.js';
import { splitSentences } from './StatementSentences.js';
import { specimenLabels } from '../../domain/SpecimenLabel.js';
import { qrPath } from '../../kiosk/KioskQr.js';

/** Long edge (px) of the three image sizes the world streams. */
export const IMAGE_EDGES = { low: 480, mid: 1200, high: 2400 } as const;

/**
 * Builds one size of a work image at build time (astro:assets `getImage()`
 * in the page; a fake in tests). Never upscales beyond the source.
 */
export type ImageResolver = (work: Work, imageIndex: number, longEdge: number) => Promise<ManifestImage>;

/** Inputs of {@link buildWorldManifest}. */
export interface ManifestSources {
  /** Works with their copy merged in (`withCopy`). */
  works: readonly Work[];
  /** Territories with copy, in layout order (the first holds the start). */
  territories: readonly TitledEntry[];
  /** Zones with copy. */
  zones: readonly TitledEntry[];
  /** UI strings of the page language. */
  ui: UiText;
  /** Image size builder. */
  resolve: ImageResolver;
}

interface WorkManifestContext {
  readonly specimen: string | null;
  readonly territoryTitle: string;
  readonly zoneTitles: ReadonlyMap<string, string>;
  readonly positionIndex: number;
  readonly positionTotal: number;
}

/**
 * The world manifest embedded in the home page of one language: names of
 * territories (with their statement split into sentences, for the
 * fragments) and zones, and for every work its title, fragment, curatorial
 * metadata (`metaLine`, `availabilityLabel`, `contextLabel`, `positionIndex`,
 * `positionTotal`), links, dominant colour and palette, the techniques it
 * declares (or, without declared ones, that its title and caption name; for
 * the lens), its specimen label, its QR code (exhibition mode) and three
 * image sizes (FR5 low/full levels).
 *
 * @param sources - Content, UI strings and image builder.
 * @returns The manifest.
 * @throws Error when a work has no image, references an unknown zone, or a title is missing in this language.
 */
export async function buildWorldManifest(sources: ManifestSources): Promise<WorldManifest> {
  const { ui } = sources;
  const territories = sources.territories.map((t) => ({
    slug: t.slug,
    title: titleOf(t, ui),
    sentences: splitSentences(t.statement?.[ui.lang] ?? ''),
  }));
  const zones = sources.zones.map((z) => ({
    slug: z.slug,
    title: titleOf(z, ui),
    excerpt: splitSentences(z.statement?.[ui.lang] ?? '')[0] ?? null,
  }));
  const territoryTitles = new Map(territories.map((t) => [t.slug, t.title]));
  const zoneTitles = new Map(zones.map((z) => [z.slug, z.title]));
  const territoryOrder = territories.map((t) => t.slug);
  const layout = FieldLayout.compute(
    sources.works.map((w) => ({ slug: w.slug, territory: w.territory, zone: w.zone })),
    territoryOrder,
  );
  const stops = [...layout.placements].sort(
    (a, b) => territoryOrder.indexOf(a.territory) - territoryOrder.indexOf(b.territory) || a.progress - b.progress,
  );
  const positionBySlug = new Map(stops.map((s, idx) => [s.slug, idx + 1]));
  const positionTotal = stops.length;

  // Numbered per territory, exactly like the awake territory page.
  const specimens = new Map(
    sources.territories.flatMap((t) => [...specimenLabels(sources.works.filter((w) => w.territory === t.slug), ui)]),
  );
  const works = await Promise.all(
    sources.works.map((w) =>
      manifestWork(w, sources, {
        specimen: specimens.get(w.slug) ?? null,
        territoryTitle: territoryTitles.get(w.territory) as string,
        zoneTitles,
        positionIndex: positionBySlug.get(w.slug) as number,
        positionTotal,
      }),
    ),
  );
  return {
    lang: ui.lang,
    territories,
    zones,
    works,
  };
}

/**
 * One work of the manifest.
 *
 * @param work - Work with copy.
 * @param sources - Shared inputs.
 * @param meta - Precomputed specimen tag, localized context, and sequence position.
 * @returns The manifest entry.
 * @throws Error when the work has no image or references an unknown zone.
 */
async function manifestWork(work: Work, sources: ManifestSources, meta: WorkManifestContext): Promise<ManifestWork> {
  const first = work.images[0];
  if (!first) throw new Error(`[manifest] Work "${work.slug}" has no image`);
  const zoneTitle = work.zone ? meta.zoneTitles.get(work.zone) : undefined;
  const contextLabel = zoneTitle ? `${meta.territoryTitle} · ${zoneTitle}` : meta.territoryTitle;
  const view = buildWorkView(work, sources.ui);
  const [low, mid, high] = await Promise.all([IMAGE_EDGES.low, IMAGE_EDGES.mid, IMAGE_EDGES.high].map((edge) => sources.resolve(work, 0, edge)));
  return {
    slug: work.slug,
    territory: work.territory,
    zone: (work.zone ?? null) as ZoneSlug | null,
    title: view.displayTitle,
    fragment: view.fragment ?? null,
    metaLine: view.metaLine,
    availabilityLabel: view.availabilityLabel,
    contextLabel,
    positionIndex: meta.positionIndex,
    positionTotal: meta.positionTotal,
    href: view.href,
    contactHref: view.enquirable ? view.contactHref : null,
    color: first.palette[0] ?? NIGHT_BLUE,
    palette: [...first.palette],
    techniques: lensTechniques(work.techniques ?? [], [work.title.fr, work.title.en ?? '', work.sourceNotes ?? '']),
    specimen: meta.specimen,
    qr: qrPath(sources.ui.lang, work.slug),
    images: { low, mid, high },
  };
}
