import { EMPTY_CART, MAX_QUANTITY, type CartLine, type CartState } from './cart';
import { GRINDS, type Grind } from './catalog';

/**
 * Reads a cart back from storage. What comes back is untrusted: another version of the site, a
 * browser extension or a hand edit may have written it. Anything that does not fit is dropped,
 * line by line, so one bad line never empties a whole cart.
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VARIANT = /^[a-z0-9]+$/;
const COUPON = /^[A-Z0-9]{1,24}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGrind(value: unknown): value is Grind {
  return typeof value === 'string' && (GRINDS as readonly string[]).includes(value);
}

function parseLine(value: unknown): CartLine | null {
  if (!isRecord(value)) return null;
  const { productId, variantId, grind, quantity } = value;
  if (typeof productId !== 'string' || !SLUG.test(productId)) return null;
  if (typeof variantId !== 'string' || !VARIANT.test(variantId)) return null;
  if (grind !== null && !isGrind(grind)) return null;
  if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity)) return null;
  if (quantity < 1 || quantity > MAX_QUANTITY) return null;
  return { productId, variantId, grind, quantity };
}

export function parseCartState(text: string | undefined | null): CartState {
  if (!text) return EMPTY_CART;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return EMPTY_CART;
  }
  if (!isRecord(value) || !Array.isArray(value.lines)) return EMPTY_CART;
  const lines = value.lines.map(parseLine).filter((line): line is CartLine => line !== null);
  const coupon =
    typeof value.coupon === 'string' && COUPON.test(value.coupon) ? value.coupon : null;
  // An undo offer does not survive a reload: it belongs to the moment of removal.
  return { lines, coupon, removed: null };
}

export function serialiseCartState(state: CartState): string {
  return JSON.stringify({ lines: state.lines, coupon: state.coupon });
}
