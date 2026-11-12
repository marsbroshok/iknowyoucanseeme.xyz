import type { PreferenceStorage } from '../../src/world/core/ModePreference.js';

/** In-memory stand-in for `localStorage` / `sessionStorage` (tests only). */
export class MemoryStorage implements PreferenceStorage {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}
