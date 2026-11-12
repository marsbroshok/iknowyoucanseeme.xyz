import type { TextBlock } from '../content/schema/index.js';
import type { Locale } from './RouteMap.js';

/**
 * Strict, locale-bound accessor for UI strings (`src/content/copy/pages/ui.yaml`).
 *
 * Unlike the lenient `getUIString`, a missing key is a build error: pages must
 * never ship with a raw key or a wrong-language fallback.
 */
export class UiText {
  /**
   * @param blocks - UI text blocks keyed by string id.
   * @param lang - Locale to read.
   */
  constructor(
    private readonly blocks: Readonly<Record<string, TextBlock>>,
    readonly lang: Locale,
  ) {}

  /**
   * Returns the string for `key` in this locale.
   *
   * @param key - UI string id.
   * @returns The localized string.
   * @throws Error when the key does not exist.
   */
  t(key: string): string {
    const block = this.blocks[key];
    if (!block) {
      throw new Error(`[UiText] Missing UI string "${key}"`);
    }
    return block[this.lang];
  }
}
