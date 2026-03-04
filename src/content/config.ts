import { defineCollection, z } from 'astro:content';

const atoms = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    subtitle: z.string().optional(),
    category: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']),
    maturity: z.number().int().min(1).max(5),
  }),
});

const properties = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const composites = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    maturity: z.number().int().min(1).max(5),
    atoms: z.array(z.string()),
    also_requires: z.array(z.string()).optional(),
  }),
});

export const collections = { atoms, properties, composites };
