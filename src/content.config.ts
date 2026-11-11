import { defineCollection } from 'astro:content';
import { productSchema } from './lib/catalog-schema';
import { PRODUCTS } from './lib/products';

/** The range as a content collection: every product is validated against the schema at build time. */
export const collections = {
  products: defineCollection({
    loader: () => PRODUCTS.map((product) => ({ ...product })),
    schema: productSchema,
  }),
};
