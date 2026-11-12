/**
 * Small deterministic random source seeded by a string (a work slug), so the
 * field looks scattered but is identical on every build and every visit.
 * FNV-1a hashes the seed; mulberry32 generates the sequence.
 */
export class SeededRandom {
  private state: number;

  /**
   * @param seed - Any string, e.g. a work slug.
   */
  constructor(seed: string) {
    this.state = SeededRandom.hash(seed);
  }

  /**
   * 32-bit FNV-1a hash of a string.
   *
   * @param text - Input text.
   * @returns Unsigned 32-bit hash.
   */
  static hash(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /**
   * Next number of the sequence (mulberry32).
   *
   * @returns A float in [0, 1).
   */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Next number scaled to a range.
   *
   * @param min - Lower bound (inclusive).
   * @param max - Upper bound (exclusive).
   * @returns A float in [min, max).
   */
  between(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}
