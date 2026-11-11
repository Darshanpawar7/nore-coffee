import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { href } from '../../lib/paths';
import { $drawerOpen, $itemCount } from '../../stores/cart';
import CartContents from './CartContents';

/**
 * The header's cart: a plain link to the cart page that, once this island has loaded, opens a
 * slide-over drawer instead. The drawer is a modal <dialog>, so focus stays inside it and Escape
 * closes it. The count is shown only after mounting, because the server cannot see localStorage.
 */
export default function Cart() {
  const count = useStore($itemCount);
  const open = useStore($drawerOpen);
  const dialog = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  const [bump, setBump] = useState(false);
  const previous = useRef(count);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  // The count ticks when something is added: a small bump, skipped under reduced motion by CSS.
  useEffect(() => {
    if (count > previous.current) {
      setBump(true);
      const timer = window.setTimeout(() => {
        setBump(false);
      }, 400);
      previous.current = count;
      return () => {
        window.clearTimeout(timer);
      };
    }
    previous.current = count;
    return undefined;
  }, [count]);

  const label = mounted ? `Cart, ${String(count)} ${count === 1 ? 'item' : 'items'}` : 'Cart';

  return (
    <>
      <a
        class="cart-button"
        href={href('/cart/')}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          $drawerOpen.set(true);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="cart-button__icon">
          <path d="M5 8h14l-1.4 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8z M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
        <span class="cart-button__word">Cart</span>
        {mounted && count > 0 && (
          <span class={bump ? 'cart-button__count is-bumped' : 'cart-button__count'}>{count}</span>
        )}
      </a>
      {/* Escape closes a modal dialog from the keyboard; the click handler adds the pointer's way out, a click on the backdrop. */}
      {/* eslint-disable-next-line jsx-a11y-x/click-events-have-key-events, jsx-a11y-x/no-noninteractive-element-interactions */}
      <dialog
        ref={dialog}
        class="drawer"
        aria-labelledby="drawer-title"
        onClose={() => {
          $drawerOpen.set(false);
        }}
        onClick={(event) => {
          // A click on the backdrop lands on the dialog itself: close it.
          if (event.target === dialog.current) $drawerOpen.set(false);
        }}
      >
        <div class="drawer__inner">
          <header class="drawer__head">
            <h2 id="drawer-title">Your cart</h2>
            <button
              type="button"
              class="drawer__close"
              aria-label="Close the cart"
              onClick={() => {
                $drawerOpen.set(false);
              }}
            >
              ×
            </button>
          </header>
          {open && (
            <CartContents
              onNavigate={() => {
                $drawerOpen.set(false);
              }}
            />
          )}
        </div>
      </dialog>
    </>
  );
}
