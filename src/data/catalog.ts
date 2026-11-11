import { getCollection } from 'astro:content';
import type { Product } from '../lib/catalog';
import { PRODUCTS } from '../lib/products';

/** Build-time access to the range: the only code that talks to astro:content. */
export async function getProducts(): Promise<Product[]> {
  const entries = await getCollection('products');
  // The collection comes back in id order; the range is shown in the house order, Meter Kaapi first.
  const rank = (product: Product) => PRODUCTS.findIndex((item) => item.id === product.id);
  return entries.map((entry) => entry.data).sort((a, b) => rank(a) - rank(b));
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return (await getProducts()).find((product) => product.id === id);
}
