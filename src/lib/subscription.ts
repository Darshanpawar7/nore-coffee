import type { Product } from './catalog';
import { add, multiply, percentOf, rupees, subtract, type Paise } from './money';
import { SIZES, variantsFor, type SizeId } from './pricing';

/** Subscribers pay 90% of the bag price, and every delivery ships free. */
export const SUBSCRIBER_PERCENT = 90;

export const CADENCES = [
  { id: 'fortnightly', label: 'Every two weeks', perMonth: 2 },
  { id: 'monthly', label: 'Every four weeks', perMonth: 1 },
] as const;
export type CadenceId = (typeof CADENCES)[number]['id'];

export const MAX_BAGS = 4;

/** The roaster's rotation is priced like a mid-range single origin: the 250 g price of Rs 560. */
export const ROTATION_PRICE = rupees(560);

export interface Quote {
  readonly perBag: Paise;
  readonly perDelivery: Paise;
  /** What the same bags would cost one at a time. */
  readonly regular: Paise;
  readonly saving: Paise;
  readonly perMonth: Paise;
}

export function quote(
  coffee: Product | 'rotation',
  sizeId: SizeId,
  bags: number,
  cadence: CadenceId,
): Quote {
  const size = SIZES.find((item) => item.id === sizeId) ?? SIZES[0];
  const regularBag =
    coffee === 'rotation'
      ? percentOf(ROTATION_PRICE, size.percent)
      : (variantsFor(coffee).find((variant) => variant.id === size.id)?.price ??
        rupees(coffee.price));
  const count = Math.min(MAX_BAGS, Math.max(1, Math.round(bags)));
  const perBag = percentOf(regularBag, SUBSCRIBER_PERCENT);
  const perDelivery = multiply(perBag, count);
  const regular = multiply(regularBag, count);
  const perMonth = multiply(
    perDelivery,
    CADENCES.find((item) => item.id === cadence)?.perMonth ?? 1,
  );
  return {
    perBag,
    perDelivery,
    regular,
    saving: subtract(regular, perDelivery),
    perMonth: add(perMonth),
  };
}
