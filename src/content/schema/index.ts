import { z } from 'zod';

export const TerritorySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.record(z.string(), z.string()).optional()
});

export const ZoneSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.record(z.string(), z.string()).optional()
});

export const ExhibitionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.record(z.string(), z.string()).optional()
});

export const WorkSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.object({
    fr: z.string().trim().min(1),
    en: z.string().optional()
  }),
  territory: z.string(),
  zone: z.enum(['arrival', 'lens', 'leak']).optional(),
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
  sourceNotes: z.string().optional()
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
