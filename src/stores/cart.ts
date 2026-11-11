import { persistentAtom } from '@nanostores/persistent';
import { atom, computed } from 'nanostores';
import { cartReducer, EMPTY_CART, itemCount, type CartAction, type CartState } from '../lib/cart';
import { parseCartState, serialiseCartState } from '../lib/cart-storage';
import { PRODUCTS } from '../lib/products';
import { totalsFor } from '../lib/totals';

/**
 * The cart, shared by every island. It is kept in localStorage, so it survives reloads and page
 * navigations, and the storage event keeps open tabs in step. Whatever is read back is parsed as
 * untrusted. Islands never work out prices: they dispatch actions and render the totals.
 */
export const $cart = persistentAtom<CartState>('nore-cart', EMPTY_CART, {
  encode: serialiseCartState,
  decode: parseCartState,
});

export const $totals = computed($cart, (cart) => totalsFor(cart, PRODUCTS));
export const $itemCount = computed($cart, itemCount);

export function dispatch(action: CartAction): void {
  $cart.set(cartReducer($cart.get(), action));
}

/** Whether the cart drawer is open: the header button and the product page both open it. */
export const $drawerOpen = atom(false);
