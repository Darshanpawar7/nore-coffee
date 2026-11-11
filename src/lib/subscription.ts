import {
  inSentence,
  METHOD_LABEL,
  METHODS,
  type Grind,
  type Method,
  type Product,
} from './catalog';
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

/** What the builder hands to the checkout, through session storage. */
export interface SubscriptionDraft {
  readonly coffee: string;
  readonly size: SizeId;
  readonly bags: number;
  readonly cadence: CadenceId;
  readonly method: Method;
}

export const DRAFT_KEY = 'nore-subscription';

/** The grind that suits each way of brewing; cold brew wants it coarse, like a French press. */
export const GRIND_FOR: Readonly<Record<Method, Grind>> = {
  'south-indian-filter': 'south-indian-filter',
  'moka-pot': 'moka-pot',
  'pour-over': 'pour-over',
  'french-press': 'french-press',
  espresso: 'espresso',
  'cold-brew': 'french-press',
};

/** Reads a draft back from storage, where anything may have been written. */
export function parseDraft(
  value: unknown,
  catalogue: readonly Product[],
): SubscriptionDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const draft = value as Record<string, unknown>;
  const coffeeOk =
    draft.coffee === 'rotation' ||
    catalogue.some((item) => item.id === draft.coffee && item.kind === 'beans');
  const sizeOk = SIZES.some((size) => size.id === draft.size);
  const bagsOk =
    typeof draft.bags === 'number' &&
    Number.isInteger(draft.bags) &&
    draft.bags >= 1 &&
    draft.bags <= MAX_BAGS;
  const cadenceOk = CADENCES.some((cadence) => cadence.id === draft.cadence);
  const methodOk =
    typeof draft.method === 'string' && (METHODS as readonly string[]).includes(draft.method);
  if (!coffeeOk || !sizeOk || !bagsOk || !cadenceOk || !methodOk) return null;
  return draft as unknown as SubscriptionDraft;
}

/** One line for the order summary: what arrives, how often, and what each delivery costs. */
export function describeDraft(draft: SubscriptionDraft, catalogue: readonly Product[]) {
  const coffee = catalogue.find((item) => item.id === draft.coffee);
  const size = SIZES.find((item) => item.id === draft.size) ?? SIZES[0];
  const cadence = CADENCES.find((item) => item.id === draft.cadence) ?? CADENCES[0];
  const price = quote(coffee ?? 'rotation', draft.size, draft.bags, draft.cadence);
  return {
    name: `Subscription: ${coffee?.name ?? 'The roaster’s rotation'}`,
    detail: `${String(draft.bags)} × ${size.label}, ${cadence.label.toLowerCase()}, ground for ${inSentence(METHOD_LABEL[draft.method])}`,
    quote: price,
  };
}
