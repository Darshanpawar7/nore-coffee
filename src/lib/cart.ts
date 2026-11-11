import type { Grind } from './catalog';

/**
 * The cart as a pure reducer. A line holds identifiers and a quantity, never a price: prices are
 * looked up in the catalogue whenever totals are worked out, so a cart saved last month cannot
 * carry last month's price.
 */

export interface CartLine {
  readonly productId: string;
  readonly variantId: string;
  /** Null for products that are not ground, such as the bottled decoction. */
  readonly grind: Grind | null;
  readonly quantity: number;
}

export interface RemovedLine {
  readonly line: CartLine;
  /** Where it was, so undo puts it back in the same place. */
  readonly index: number;
}

export interface CartState {
  readonly lines: readonly CartLine[];
  /** The code the shopper typed, upper-cased; whether it applies is decided with the totals. */
  readonly coupon: string | null;
  /** The last line removed, until it is restored or something else happens. */
  readonly removed: RemovedLine | null;
}

export type CartAction =
  | { readonly type: 'add'; readonly line: CartLine }
  | { readonly type: 'set-quantity'; readonly key: string; readonly quantity: number }
  | { readonly type: 'remove'; readonly key: string }
  | { readonly type: 'undo' }
  | { readonly type: 'apply-coupon'; readonly code: string }
  | { readonly type: 'remove-coupon' }
  | { readonly type: 'clear' };

export const EMPTY_CART: CartState = { lines: [], coupon: null, removed: null };

/** Enough of anything for one household; a larger order is a phone call. */
export const MAX_QUANTITY = 20;

/** Two lines are the same when product, variant and grind all match. */
export function lineKey(line: Pick<CartLine, 'productId' | 'variantId' | 'grind'>): string {
  return `${line.productId}/${line.variantId}/${line.grind ?? 'none'}`;
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(quantity)));
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const quantity = clampQuantity(action.line.quantity);
      if (quantity === 0) return state;
      const key = lineKey(action.line);
      const existing = state.lines.findIndex((line) => lineKey(line) === key);
      if (existing === -1) {
        return { ...state, lines: [...state.lines, { ...action.line, quantity }], removed: null };
      }
      return {
        ...state,
        lines: state.lines.map((line, index) =>
          index === existing
            ? { ...line, quantity: clampQuantity(line.quantity + quantity) }
            : line,
        ),
        removed: null,
      };
    }
    case 'set-quantity': {
      const quantity = clampQuantity(action.quantity);
      if (quantity === 0) return cartReducer(state, { type: 'remove', key: action.key });
      return {
        ...state,
        lines: state.lines.map((line) =>
          lineKey(line) === action.key ? { ...line, quantity } : line,
        ),
      };
    }
    case 'remove': {
      const index = state.lines.findIndex((line) => lineKey(line) === action.key);
      const line = state.lines[index];
      if (!line) return state;
      return {
        ...state,
        lines: state.lines.filter((_, at) => at !== index),
        removed: { line, index },
      };
    }
    case 'undo': {
      if (!state.removed) return state;
      const { line, index } = state.removed;
      const lines = [...state.lines];
      lines.splice(Math.min(index, lines.length), 0, line);
      return { ...state, lines, removed: null };
    }
    case 'apply-coupon': {
      const code = action.code.trim().toUpperCase();
      return { ...state, coupon: code === '' ? null : code };
    }
    case 'remove-coupon':
      return { ...state, coupon: null };
    case 'clear':
      return EMPTY_CART;
  }
}

/** Items in the cart, counting each unit: two bags of one coffee count as two. */
export function itemCount(state: CartState): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0);
}
