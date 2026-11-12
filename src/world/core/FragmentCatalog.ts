/** A work as the fragment catalog needs it (fragment in the page language). */
export interface FragmentWork {
  slug: string;
  territory: string;
  fragment: string | null;
}

/** A stop on the drift path (DriftSession.stops order: territory by territory). */
export interface FragmentStop {
  slug: string;
  territory: string;
}

/** A territory's statement, split into sentences. */
export interface FragmentTerritory {
  slug: string;
  sentences: readonly string[];
}

/** One fragment that can surface in the world. */
export interface FragmentEntry {
  /** Language-independent id (stored as read). */
  id: string;
  /** Text in the page language. */
  text: string;
  /** Work it surfaces near. */
  slug: string;
  territory: string;
  /** A work's own fragment, or a sentence of its territory's statement. */
  kind: 'work' | 'statement';
}

/**
 * All fragments of the world and where they surface (FR3): each work's
 * fragment near the work itself, and each territory's statement sentences
 * spread evenly over that territory's part of the path (sentence `i` of
 * `n` near stop `⌊(i + ½) · m / n⌋` of the territory's `m` works). A
 * territory without works has nowhere to surface its sentences, so they are
 * not part of it. Reading them all rebuilds the statement.
 */
export class FragmentCatalog {
  /** Every fragment, works' first (path order), then sentences (territory order). */
  readonly entries: readonly FragmentEntry[];
  private readonly bySlug = new Map<string, FragmentEntry[]>();

  /**
   * @param stops - Works in path order.
   * @param works - Works with their fragment.
   * @param territories - Statements split into sentences.
   */
  constructor(stops: readonly FragmentStop[], works: readonly FragmentWork[], territories: readonly FragmentTerritory[]) {
    const fragments = new Map(works.map((w) => [w.slug, w.fragment]));
    const all: FragmentEntry[] = [];
    for (const stop of stops) {
      const text = fragments.get(stop.slug);
      if (text) all.push({ id: FragmentCatalog.workId(stop.slug), text, slug: stop.slug, territory: stop.territory, kind: 'work' });
    }
    for (const t of territories) {
      const own = stops.filter((s) => s.territory === t.slug);
      if (own.length === 0) continue;
      t.sentences.forEach((text, i) => {
        const at = own[Math.floor(((i + 0.5) * own.length) / t.sentences.length)] as FragmentStop;
        all.push({ id: FragmentCatalog.sentenceId(t.slug, i), text, slug: at.slug, territory: t.slug, kind: 'statement' });
      });
    }
    for (const e of all) this.bySlug.set(e.slug, [...(this.bySlug.get(e.slug) ?? []), e]);
    this.entries = all;
  }

  /**
   * Id of a work's fragment.
   *
   * @param slug - Work slug.
   * @returns `work:<slug>`.
   */
  static workId(slug: string): string {
    return `work:${slug}`;
  }

  /**
   * Id of a statement sentence.
   *
   * @param territory - Territory slug.
   * @param index - Sentence index (0-based).
   * @returns `statement:<territory>:<index>`.
   */
  static sentenceId(territory: string, index: number): string {
    return `statement:${territory}:${index}`;
  }

  /**
   * Fragment ids of a territory without building the world (awake
   * territory page, "fragments found: n / N"); same rule as the catalog.
   *
   * @param territory - Territory slug.
   * @param works - All works with their fragment in the page language.
   * @param sentenceCount - Sentences in the territory's statement (page language).
   * @returns Ids, works' fragments first.
   */
  static territoryIds(territory: string, works: readonly FragmentWork[], sentenceCount: number): string[] {
    const own = works.filter((w) => w.territory === territory);
    const sentences = own.length === 0 ? [] : Array.from({ length: sentenceCount }, (_, i) => FragmentCatalog.sentenceId(territory, i));
    return [...own.filter((w) => w.fragment).map((w) => FragmentCatalog.workId(w.slug)), ...sentences];
  }

  /**
   * Fragments that surface near a work, its own fragment first.
   *
   * @param slug - Work slug.
   * @returns Entries (empty for none).
   */
  near(slug: string): readonly FragmentEntry[] {
    return this.bySlug.get(slug) ?? [];
  }

  /**
   * Fragment ids of one territory.
   *
   * @param territory - Territory slug.
   * @returns Ids, works' fragments first.
   */
  idsOf(territory: string): string[] {
    return this.entries.filter((e) => e.territory === territory).map((e) => e.id);
  }
}
