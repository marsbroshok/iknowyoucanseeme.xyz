import type { QualityTier } from './DeviceProfile.js';

/** Level of detail of a work's texture. */
export type Lod = 'none' | 'low' | 'full';

/** A work competing for texture memory. */
export interface TextureCandidate {
  slug: string;
  /** Distance from the camera. */
  distance: number;
  /** Estimated GPU bytes of each level (see {@link TextureBudget.textureBytes}). */
  bytes: { low: number; full: number };
}

/** Streaming limits. */
export interface BudgetConfig {
  /** Works farther than this get no texture. */
  radius: number;
  /** Works within this distance may get the full texture. */
  fullRadius: number;
  /** GPU memory cap for all work textures. */
  budgetBytes: number;
}

/** Streaming limits of a quality tier, and which image serves as "full". */
export interface TierBudget extends BudgetConfig {
  /** Image variant used as the full level: `high` (≤ 2400 px) or `mid` (≤ 1200 px). */
  fullVariant: 'high' | 'mid';
}

const MB = 1024 * 1024;

/** Limits per tier: phones (`low`) get smaller full textures and less memory. */
export const TIER_BUDGETS: Readonly<Record<QualityTier, TierBudget>> = {
  high: { radius: 44, fullRadius: 11, budgetBytes: 192 * MB, fullVariant: 'high' },
  low: { radius: 35, fullRadius: 8, budgetBytes: 64 * MB, fullVariant: 'mid' },
};

/** Changes needed to go from the loaded textures to a plan. */
export interface TextureDiff {
  /** Textures to fetch, nearest first. */
  load: { slug: string; lod: Exclude<Lod, 'none'> }[];
  /** Works whose current texture must be disposed. */
  dispose: string[];
}

/**
 * Texture streaming plan (FR5): only works within `radius` get a texture;
 * the low-res image first, the full one when close, and the total never
 * exceeds the tier's GPU memory budget.
 *
 * Works are served nearest first. Once a full texture no longer fits, no
 * farther work gets one; once even a low texture does not fit, no farther
 * work gets anything. So a nearer work never has less detail than a farther
 * one.
 */
export class TextureBudget {
  /**
   * Estimated GPU memory of an RGBA8 texture with its mip chain.
   *
   * @param width - Pixels.
   * @param height - Pixels.
   * @returns Bytes (rounded up).
   */
  static textureBytes(width: number, height: number): number {
    return Math.ceil((width * height * 4 * 4) / 3);
  }

  /**
   * Plans the level of detail of every candidate.
   *
   * @param candidates - Works with their distances and texture sizes.
   * @param config - Streaming limits.
   * @returns Level per slug (every candidate present).
   */
  static plan(candidates: readonly TextureCandidate[], config: BudgetConfig): Record<string, Lod> {
    const plan: Record<string, Lod> = {};
    const ordered = [...candidates].sort((a, b) => a.distance - b.distance || (a.slug < b.slug ? -1 : 1));
    let used = 0;
    let fullAllowed = true;
    let stopped = false;
    for (const c of ordered) {
      let lod: Lod = 'none';
      if (!stopped && c.distance <= config.radius) {
        if (fullAllowed && c.distance <= config.fullRadius && used + c.bytes.full <= config.budgetBytes) {
          lod = 'full';
        } else if (used + c.bytes.low <= config.budgetBytes) {
          lod = 'low';
          fullAllowed = false;
        } else {
          stopped = true;
        }
      }
      if (lod !== 'none') used += c.bytes[lod];
      plan[c.slug] = lod;
    }
    return plan;
  }

  /**
   * GPU bytes of a plan.
   *
   * @param plan - Level per slug.
   * @param candidates - The candidates the plan was made for.
   * @returns Total bytes.
   */
  static bytes(plan: Readonly<Record<string, Lod>>, candidates: readonly TextureCandidate[]): number {
    return candidates.reduce((sum, c) => {
      const lod = plan[c.slug];
      return lod === 'low' || lod === 'full' ? sum + c.bytes[lod] : sum;
    }, 0);
  }

  /**
   * What to load and dispose to go from the current textures to a plan.
   *
   * @param current - Loaded level per slug.
   * @param next - Planned level per slug (in plan order).
   * @returns Loads (in `next` order) and disposals.
   */
  static diff(current: Readonly<Record<string, Lod>>, next: Readonly<Record<string, Lod>>): TextureDiff {
    const levelOf = (r: Readonly<Record<string, Lod>>, slug: string): Lod => r[slug] ?? 'none';
    const load: TextureDiff['load'] = [];
    for (const [slug, lod] of Object.entries(next)) {
      if (lod !== 'none' && lod !== levelOf(current, slug)) load.push({ slug, lod });
    }
    const dispose = Object.keys(current).filter((slug) => current[slug] !== 'none' && current[slug] !== levelOf(next, slug));
    return { load, dispose };
  }
}
