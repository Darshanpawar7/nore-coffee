import { useStore } from '@nanostores/preact';
import { useMemo, useState } from 'preact/hooks';
import { GRIND_LABEL, GRINDS, type Grind } from '../../lib/catalog';
import { kolam } from '../../lib/kolam/kolam';
import { formatInr, toRupees } from '../../lib/money';
import { href } from '../../lib/paths';
import { checkPin, type PinCheck } from '../../lib/pin';
import { productById } from '../../lib/products';
import { FREE_SHIPPING_FROM, shippingProgress, type PricedLine } from '../../lib/totals';
import { $cart, $totals, dispatch } from '../../stores/cart';

/** The cart's insides, shared by the drawer and the cart page. */

function grindLabel(grind: string | null): string | null {
  return grind !== null && (GRINDS as readonly string[]).includes(grind)
    ? GRIND_LABEL[grind as Grind]
    : null;
}

function MiniKolam({ name }: { name: string }) {
  const figure = useMemo(() => kolam(name, { unit: 4 }), [name]);
  return (
    <svg class="line__kolam" viewBox={figure.viewBox} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
        {figure.paths.map((path) => (
          <path key={path} d={path} />
        ))}
      </g>
    </svg>
  );
}

function Line({ line }: { line: PricedLine }) {
  const grind = grindLabel(line.grind);
  const name = `${line.product.name}, ${line.variant.label}${grind ? `, ${grind}` : ''}`;
  return (
    <li class={`line accent-${line.product.accent}`}>
      <MiniKolam name={line.product.name} />
      <div class="line__text">
        <a class="line__name" href={href(`/coffee/${line.product.id}/`)}>
          {line.product.name}
        </a>
        <span class="line__meta">
          {line.variant.label}
          {grind ? ` · ${grind}` : ''}
        </span>
      </div>
      <div class="line__quantity" role="group" aria-label={`Quantity of ${name}`}>
        <button
          type="button"
          class="stepper"
          aria-label={`One fewer: ${name}`}
          onClick={() => {
            dispatch({ type: 'set-quantity', key: line.key, quantity: line.quantity - 1 });
          }}
        >
          −
        </button>
        <output class="line__count" aria-live="polite">
          {line.quantity}
        </output>
        <button
          type="button"
          class="stepper"
          aria-label={`One more: ${name}`}
          onClick={() => {
            dispatch({ type: 'set-quantity', key: line.key, quantity: line.quantity + 1 });
          }}
        >
          +
        </button>
      </div>
      <span class="line__total price">{formatInr(line.lineTotal)}</span>
      <button
        type="button"
        class="line__remove"
        onClick={() => {
          dispatch({ type: 'remove', key: line.key });
        }}
      >
        Remove<span class="visually-hidden"> {name}</span>
      </button>
    </li>
  );
}

function Coupon() {
  const totals = useStore($totals);
  const [code, setCode] = useState('');
  const { coupon } = totals;
  if (coupon.status === 'applied') {
    return (
      <p class="cart__coupon-applied">
        <span>
          <strong>{coupon.code}</strong>: {coupon.percent}% off for two or more bags.
        </span>
        <button
          type="button"
          class="link-button"
          onClick={() => {
            dispatch({ type: 'remove-coupon' });
          }}
        >
          Remove code
        </button>
      </p>
    );
  }
  return (
    <form
      class="cart__inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: 'apply-coupon', code });
      }}
    >
      <label class="field">
        <span class="field__label">Coupon code</span>
        <span class="cart__inline">
          <input
            class="input"
            value={code}
            autoComplete="off"
            autoCapitalize="characters"
            spellcheck={false}
            aria-invalid={coupon.status === 'rejected'}
            aria-describedby={coupon.status === 'rejected' ? 'coupon-error' : undefined}
            onInput={(event) => {
              setCode(event.currentTarget.value);
            }}
          />
          <button type="submit" class="button button--ghost">
            Apply
          </button>
        </span>
      </label>
      {coupon.status === 'rejected' && (
        <p id="coupon-error" class="error" role="alert">
          {coupon.reason}
        </p>
      )}
    </form>
  );
}

function Delivery() {
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<PinCheck | null>(null);
  return (
    <form
      class="cart__inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        setResult(checkPin(pin));
      }}
    >
      <label class="field">
        <span class="field__label">When will it arrive?</span>
        <span class="cart__inline">
          <input
            class="input"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={7}
            placeholder="PIN code"
            value={pin}
            aria-invalid={result?.ok === false}
            aria-describedby="pin-result"
            onInput={(event) => {
              setPin(event.currentTarget.value);
            }}
          />
          <button type="submit" class="button button--ghost">
            Check
          </button>
        </span>
      </label>
      <p id="pin-result" class={result?.ok === false ? 'error' : 'field__hint'} aria-live="polite">
        {result === null
          ? 'Roasted and packed in Bengaluru.'
          : result.ok
            ? `To ${result.pin}: ${result.days} from Bengaluru.`
            : result.reason}
      </p>
    </form>
  );
}

export default function CartContents({ onNavigate }: { onNavigate?: () => void }) {
  const cart = useStore($cart);
  const totals = useStore($totals);
  const progress = shippingProgress(totals.subtotal);

  if (totals.lines.length === 0) {
    return (
      <div class="cart cart--empty">
        <p class="cart__empty serif">Your cart is empty. The davara is waiting.</p>
        {cart.removed && <Undo />}
        <a class="button" href={href('/shop/')} onClick={onNavigate}>
          Browse the coffee
        </a>
      </div>
    );
  }

  return (
    <div class="cart">
      <ul class="cart__lines">
        {totals.lines.map((line) => (
          <Line key={line.key} line={line} />
        ))}
      </ul>
      {cart.removed && <Undo />}
      <div class="cart__shipping">
        <p>
          {progress.remaining === 0
            ? 'Shipping is on us.'
            : `${formatInr(progress.remaining)} more and shipping is free.`}
        </p>
        <progress
          max={toRupees(FREE_SHIPPING_FROM)}
          value={Math.min(toRupees(FREE_SHIPPING_FROM), toRupees(totals.subtotal))}
          aria-label="Progress towards free shipping"
        />
      </div>
      <Coupon />
      <Delivery />
      <dl class="cart__sums">
        <div>
          <dt>Subtotal</dt>
          <dd class="price">{formatInr(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div>
            <dt>BYTWO</dt>
            <dd class="price">−{formatInr(totals.discount)}</dd>
          </div>
        )}
        <div>
          <dt>Shipping</dt>
          <dd class="price">{totals.shipping === 0 ? 'Free' : formatInr(totals.shipping)}</dd>
        </div>
        <div class="cart__total">
          <dt>Total</dt>
          <dd class="price">{formatInr(totals.total)}</dd>
        </div>
      </dl>
      <p class="field__hint">Prices include all taxes.</p>
      <a class="button cart__checkout" href={href('/checkout/')} onClick={onNavigate}>
        Go to checkout
      </a>
    </div>
  );
}

function Undo() {
  const cart = useStore($cart);
  if (!cart.removed) return null;
  return (
    <p class="cart__undo" role="status">
      Removed {productById(cart.removed.line.productId)?.name ?? 'that line'}.{' '}
      <button
        type="button"
        class="link-button"
        onClick={() => {
          dispatch({ type: 'undo' });
        }}
      >
        Undo
      </button>
    </p>
  );
}
