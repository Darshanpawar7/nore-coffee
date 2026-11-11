import { useEffect, useState } from 'preact/hooks';
import CartContents from './CartContents';

/** The full cart page: the same contents as the drawer, shown once the cart has been read from storage. */
export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? <CartContents /> : <p class="field__hint js-only">Opening your cart…</p>;
}
