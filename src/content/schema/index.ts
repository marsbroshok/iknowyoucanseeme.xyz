import { z } from 'zod';
import { ZONE_ORDER } from '../../domain/ZoneOrder.js';


export const TextBlockSchema = z.object({
  status: z.enum(['draft', 'artist-edited', 'proofed']),
  fr: z.string().min(1),
  en: z.string().min(1),
  sources: z.array(z.string()).min(1)
});
export type TextBlock = z.infer<typeof TextBlockSchema>;

export const TerritorySchema = z.object({
  statement: TextBlockSchema.optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.record(z.string(), z.string()).optional()
});

export const ZoneSchema = z.object({
  statement: TextBlockSchema.optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.record(z.string(), z.string()).optional()
});

export const ExhibitionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.record(z.string(), z.string()).optional(),
  /** Year the exhibition opened (orders the CV list). */
  year: z.number().int(),
  /** Venue name, e.g. "Atelier 51". */
  venue: z.string().min(1),
  /** Optional human-readable dates per locale, e.g. { en: "16–30 Oct 2025" }. */
  dates: z.record(z.string(), z.string()).optional()
});

export const WorkSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.object({
    fr: z.string().trim().min(1),
    en: z.string().optional()
  }),
  territory: z.string(),
  zone: z.enum(ZONE_ORDER).optional(),
  year: z.number(),
  medium: z.enum(['photo', 'ceramic']),
  techniques: z.array(z.string()).optional(),
  size: z.object({
    w: z.number(),
    h: z.number(),
    unit: z.literal('cm')
  }).optional(),
  availability: z.enum(['available', 'sold', 'not-for-sale', 'unknown']),
  people: z.object({
    consent: z.literal('confirmed')
  }).optional(),
  images: z.array(z.object({
    src: z.string(),
    source: z.enum(['instagram', 'original']),
    width: z.number(),
    height: z.number(),
    palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
  })),
  sourceNotes: z.string().optional(),
  fragment: TextBlockSchema.optional()
}).refine(data => {
  if (data.zone === 'leak' && data.territory !== 'dreamland') {
    return false;
  }
  return true;
}, {
  message: "Leak zone must be within Dreamland territory"
});

export type Work = z.infer<typeof WorkSchema>;
export type Territory = z.infer<typeof TerritorySchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type Exhibition = z.infer<typeof ExhibitionSchema>;

export const PageSchema = z.object({
  slug: z.enum(['about', 'gaze', 'threshold', 'contact', 'legal', 'ui']),
  blocks: z.record(z.string(), TextBlockSchema).optional(),
  title: z.record(z.string(), z.string()).optional()
});
export type Page = z.infer<typeof PageSchema>;
