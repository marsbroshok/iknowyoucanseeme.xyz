import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import {
  WorkSchema,
  TerritorySchema,
  ZoneSchema,
  ExhibitionSchema,
  PageSchema
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
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/pages" }),
    schema: PageSchema
  }),
  sources: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/sources" }),
    schema: z.object({
      posts: z.array(z.object({
        src: z.string(),
        hash: z.number().optional(),
        postDate: z.string().optional(),
        postCaption: z.string().optional()
      }))
    })
  }),
};
