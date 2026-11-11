import type { CartState } from './cart';
import { lineKey } from './cart';
import type { Product } from './catalog';
import { add, multiply, percentOf, rupees, subtract, ZERO, type Paise } from './money';
import { variantOf, type Variant } from './pricing';

/** Coupons, shipping and the totals that follow from a cart and the catalogue. */

export const FREE_SHIPPING_FROM = rupees(999);
export const SHIPPING_FEE = rupees(60);

/** BYTWO: splitting one coffee between two people, "by-two", is a Bengaluru habit. */
export const BYTWO = { code: 'BYTWO', percent: 10, minimumBags: 2 } as const;

export type CouponCheck =
  | { readonly status: 'none' }
  | { readonly status: 'applied'; readonly code: string; readonly percent: number }
  | { readonly status: 'rejected'; readonly code: string; readonly reason: string };

/** Whether a typed code applies to a cart holding this many bags of coffee. */
export function checkCoupon(code: string | null, bags: number): CouponCheck {
  if (code === null) return { status: 'none' };
  if (code !== BYTWO.code) {
    return {
      status: 'rejected',
      code,
      reason: 'That code is not one of ours. Check the spelling?',
    };
  }
  if (bags < BYTWO.minimumBags) {
    const have = bags === 0 ? 'none yet' : 'one';
    return {
      status: 'rejected',
      code,
      reason: `BYTWO needs two or more bags of coffee in the cart, and there is ${have}.`,
    };
  }
  return { status: 'applied', code, percent: BYTWO.percent };
}

/**
 * Free over Rs 999, else Rs 60. The threshold is judged before any coupon, so applying a coupon
 * can never take free shipping away.
 */
export function shippingFor(subtotal: Paise): Paise {
  return subtotal === ZERO || subtotal >= FREE_SHIPPING_FROM ? ZERO : SHIPPING_FEE;
}

/** How far the cart is from free shipping: what is left to spend, and the share already spent. */
export function shippingProgress(subtotal: Paise): { remaining: Paise; ratio: number } {
  const remaining = subtotal >= FREE_SHIPPING_FROM ? ZERO : subtract(FREE_SHIPPING_FROM, subtotal);
  return { remaining, ratio: Math.min(1, subtotal / FREE_SHIPPING_FROM) };
}

export interface PricedLine {
  readonly key: string;
  readonly product: Product;
  readonly variant: Variant;
  readonly grind: string | null;
  readonly quantity: number;
  readonly lineTotal: Paise;
}

export interface Totals {
  readonly lines: readonly PricedLine[];
  /** Units in the cart. */
  readonly items: number;
  /** Bags of coffee, which is what BYTWO counts; the bottle is not a bag. */
  readonly bags: number;
  readonly subtotal: Paise;
  readonly coupon: CouponCheck;
  readonly discount: Paise;
  readonly shipping: Paise;
  readonly total: Paise;
}

/** Prices every line from the catalogue. Lines whose product or size no longer exists are dropped. */
export function totalsFor(cart: CartState, catalogue: readonly Product[]): Totals {
  const lines = cart.lines.flatMap((line): PricedLine[] => {
    const product = catalogue.find((item) => item.id === line.productId);
    const variant = product ? variantOf(product, line.variantId) : undefined;
    if (!product || !variant) return [];
    return [
      {
        key: lineKey(line),
        product,
        variant,
        grind: line.grind,
        quantity: line.quantity,
        lineTotal: multiply(variant.price, line.quantity),
      },
    ];
  });
  const subtotal = add(...lines.map((line) => line.lineTotal));
  const items = lines.reduce((sum, line) => sum + line.quantity, 0);
  const bags = lines.reduce(
    (sum, line) => sum + (line.product.kind === 'beans' ? line.quantity : 0),
    0,
  );
  const coupon = checkCoupon(cart.coupon, bags);
  const discount = coupon.status === 'applied' ? percentOf(subtotal, coupon.percent) : ZERO;
  const shipping = shippingFor(subtotal);
  return {
    lines,
    items,
    bags,
    subtotal,
    coupon,
    discount,
    shipping,
    total: add(subtract(subtotal, discount), shipping),
  };
}
