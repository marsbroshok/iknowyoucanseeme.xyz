import { TextureBudget, type Lod } from '../core/TextureBudget.js';

/** A level that has an image. */
export type LoadedLod = Exclude<Lod, 'none'>;

/** How the streamer fetches, frees and reports textures of type `T`. */
export interface StreamerOptions<T> {
  /** Fetches and decodes a texture (rejects on network or decode errors). */
  load: (url: string) => Promise<T>;
  /** Frees a texture's GPU memory. */
  release: (texture: T) => void;
  /** Image URL of a work at a level. */
  urlFor: (slug: string, lod: LoadedLod) => string;
  /** A work's displayed texture changed (`null` / `none`: back to its colour). */
  onChange: (slug: string, texture: T | null, lod: Lod) => void;
  /** A texture failed to load; it is not retried during this visit. */
  onError: (slug: string, url: string, error: unknown) => void;
  /** Loads running at once. */
  maxConcurrent: number;
}

/**
 * Applies {@link TextureBudget} plans to real textures (FR5 "LOD adapter"):
 * fetches what the plan adds, nearest first and a few at a time; swaps a
 * work's texture only when the new level has arrived; frees textures the
 * plan dropped; discards arrivals the plan no longer wants.
 *
 * Generic over the texture type, so the WebGL side passes Three.js loaders
 * while tests pass plain objects.
 */
export class TextureStreamer<T> {
  private wanted: Readonly<Record<string, Lod>> = {};
  private readonly shown = new Map<string, { lod: LoadedLod; texture: T }>();
  /** Level last requested per work while its load is running. */
  private readonly requested = new Map<string, LoadedLod>();
  private readonly failed = new Set<string>();
  private queue: { slug: string; lod: LoadedLod }[] = [];
  private running = 0;
  private disposed = false;

  /**
   * @param options - Loader, release, URLs, callbacks and concurrency.
   */
  constructor(private readonly options: StreamerOptions<T>) {}

  /** Level currently displayed per work (works without a texture omitted). */
  get loaded(): Record<string, LoadedLod> {
    return Object.fromEntries([...this.shown].map(([slug, s]) => [slug, s.lod]));
  }

  /**
   * Moves towards a new plan.
   *
   * @param plan - Level per work, in priority order (see `TextureBudget.plan`).
   */
  update(plan: Readonly<Record<string, Lod>>): void {
    if (this.disposed) return;
    this.wanted = plan;
    for (const [slug, s] of [...this.shown]) {
      if ((plan[slug] ?? 'none') === 'none') {
        this.shown.delete(slug);
        this.options.release(s.texture);
        this.options.onChange(slug, null, 'none');
      }
    }
    const current: Record<string, Lod> = Object.fromEntries([...this.shown].map(([slug, s]) => [slug, s.lod]));
    for (const [slug, lod] of this.requested) current[slug] = lod;
    this.queue = TextureBudget.diff(current, plan).load.filter((l) => !this.failed.has(this.options.urlFor(l.slug, l.lod)));
    this.pump();
  }

  /** Frees every texture; later arrivals are freed on arrival. */
  dispose(): void {
    this.disposed = true;
    this.queue = [];
    for (const s of this.shown.values()) this.options.release(s.texture);
    this.shown.clear();
  }

  /** Starts queued loads up to the concurrency limit. */
  private pump(): void {
    while (!this.disposed && this.running < this.options.maxConcurrent && this.queue.length > 0) {
      const { slug, lod } = this.queue.shift() as { slug: string; lod: LoadedLod };
      const url = this.options.urlFor(slug, lod);
      this.running++;
      this.requested.set(slug, lod);
      this.options.load(url).then(
        (texture) => this.arrived(slug, lod, texture),
        (error: unknown) => this.settled(slug, lod, () => {
          this.failed.add(url);
          this.options.onError(slug, url, error);
        }),
      );
    }
  }

  /**
   * Shows an arrived texture if the plan still wants it, else frees it.
   *
   * @param slug - Work.
   * @param lod - Level loaded.
   * @param texture - The texture.
   */
  private arrived(slug: string, lod: LoadedLod, texture: T): void {
    this.settled(slug, lod, () => {
      if (this.disposed || this.wanted[slug] !== lod) {
        this.options.release(texture);
        return;
      }
      const previous = this.shown.get(slug);
      this.shown.set(slug, { lod, texture });
      this.options.onChange(slug, texture, lod);
      if (previous) this.options.release(previous.texture);
    });
  }

  /**
   * Bookkeeping common to success and failure, then continues the queue.
   *
   * @param slug - Work.
   * @param lod - Level that settled.
   * @param handle - Outcome handling.
   */
  private settled(slug: string, lod: LoadedLod, handle: () => void): void {
    this.running--;
    if (this.requested.get(slug) === lod) this.requested.delete(slug);
    handle();
    this.pump();
  }
}
