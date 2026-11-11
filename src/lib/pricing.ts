import type { Product } from './catalog';
import { divide, percentOf, rupees, type Paise } from './money';

/** Bags come in three sizes. 500 g is 1.9 times the 250 g price and 1 kg is 3.6 times. */
export const SIZES = [
  { id: '250g', label: '250 g', grams: 250, percent: 100 },
  { id: '500g', label: '500 g', grams: 500, percent: 190 },
  { id: '1kg', label: '1 kg', grams: 1000, percent: 360 },
] as const;

export type SizeId = (typeof SIZES)[number]['id'];

/** A buyable form of a product: a bag size, or the one bottle. */
export interface Variant {
  readonly id: string;
  readonly label: string;
  readonly price: Paise;
  /** Grams of coffee, for bags; used for the price per cup. */
  readonly grams: number | null;
}

/** The variant every product page starts on. */
export const DEFAULT_VARIANT = '250g';

/** The working figure behind "about Rs X a cup": 10 g of ground coffee per cup of filter coffee. */
export const GRAMS_PER_CUP = 10;

export function variantsFor(product: Product): readonly Variant[] {
  const base = rupees(product.price);
  if (product.kind === 'decoction') {
    return [
      { id: 'bottle', label: `${String(product.volumeMl)} ml bottle`, price: base, grams: null },
    ];
  }
  return SIZES.map((size) => ({
    id: size.id,
    label: size.label,
    price: percentOf(base, size.percent),
    grams: size.grams,
  }));
}

export function variantOf(product: Product, variantId: string): Variant | undefined {
  return variantsFor(product).find((variant) => variant.id === variantId);
}

/** About how much one cup costs, to the nearest paisa; null for the bottle, which is not weighed in cups. */
export function pricePerCup(variant: Variant): Paise | null {
  if (variant.grams === null) return null;
  return divide(variant.price, variant.grams / GRAMS_PER_CUP);
}
