import { z } from 'zod';
import { ACCENTS, METHODS, PROCESSES, ROASTS, type Product } from './catalog';

/**
 * Validates the catalogue: at build time through the content collection, and in the unit tests.
 * It is typed against `Product`, so the schema and the types cannot drift apart.
 */

const score = z.number().int().min(1).max(5);

const shared = {
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2),
  accent: z.enum(ACCENTS),
  notes: z.tuple([z.string().min(2), z.string().min(2), z.string().min(2)]),
  story: z.string().min(40),
  price: z.number().int().positive(),
  roast: z.enum(ROASTS),
  greatFor: z.array(z.enum(METHODS)).min(1),
  profile: z.object({
    acidity: score,
    body: score,
    sweetness: score,
    bitterness: score,
    aroma: score,
  }),
  origin: z.object({ region: z.string(), state: z.string(), altitude: z.string().optional() }),
  process: z.enum(PROCESSES),
  variety: z.string(),
};

export const productSchema: z.ZodType<Product> = z.discriminatedUnion('kind', [
  z.object({ ...shared, kind: z.literal('beans'), chicory: z.number().int().min(0).max(40) }),
  z.object({ ...shared, kind: z.literal('decoction'), volumeMl: z.number().int().positive() }),
]);
