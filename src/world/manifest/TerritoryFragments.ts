import type { Work } from '../../content/schema/index.js';
import type { UiText } from '../../i18n/UiText.js';
import type { TitledEntry } from '../../domain/TerritoryView.js';
import { buildWorkView } from '../../domain/WorkView.js';
import { FragmentCatalog } from '../core/FragmentCatalog.js';
import { splitSentences } from './StatementSentences.js';

/**
 * Fragment ids of a territory for its awake page ("fragments found: n / N",
 * FR3), computed at build time from the same texts as the world manifest:
 * work fragments and statement sentences in the page language.
 *
 * @param territory - Territory with copy.
 * @param works - All works with copy.
 * @param ui - UI strings of the page language.
 * @returns Fragment ids (works' fragments first).
 */
export function territoryFragmentIds(territory: TitledEntry, works: readonly Work[], ui: UiText): string[] {
  const fragmentWorks = works.map((w) => ({ slug: w.slug, territory: w.territory, fragment: buildWorkView(w, ui).fragment ?? null }));
  return FragmentCatalog.territoryIds(territory.slug, fragmentWorks, splitSentences(territory.statement?.[ui.lang] ?? '').length);
}
