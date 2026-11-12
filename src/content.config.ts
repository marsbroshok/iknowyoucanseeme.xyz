import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  WorkSchema,
  TerritorySchema,
  ZoneSchema,
  ExhibitionSchema,
  PageSchema,
  TextBlockSchema
} from './content/schema/index.js';

export const collections = {
  works: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/works" }),
    schema: WorkSchema
  }),
  territories: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/territories" }),
    schema: TerritorySchema
  }),
  zones: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/zones" }),
    schema: ZoneSchema
  }),
  exhibitions: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/exhibitions" }),
    schema: ExhibitionSchema
  }),
  pages: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/copy/pages" }),
    schema: PageSchema
  }),
  copyWorks: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/copy/works" }),
    schema: z.object({ fragment: TextBlockSchema.optional() }).passthrough()
  }),
  copyTerritories: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/copy/territories" }),
    schema: z.object({ statement: TextBlockSchema.optional() }).passthrough()
  }),
  copyZones: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/copy/zones" }),
    schema: z.object({ statement: TextBlockSchema.optional() }).passthrough()
  }),
  sources: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/sources" }),
    schema: z.object({
      posts: z.array(z.object({
        src: z.string(),
        hash: z.number().optional(),
        postDate: z.date().optional(),
        postCaption: z.string().optional()
      }))
    })
  }),
};
