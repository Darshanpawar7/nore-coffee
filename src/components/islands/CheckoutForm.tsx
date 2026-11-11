import { useStore } from '@nanostores/preact';
import type { InputHTMLAttributes, TargetedEvent } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { GRIND_LABEL, GRINDS, type Grind } from '../../lib/catalog';
import {
  EMPTY_FORM,
  FIELD_ORDER,
  orderNumber,
  PAYMENTS,
  STATES,
  validateCheckout,
  type CheckoutForm as Form,
  type Field,
} from '../../lib/checkout';
import { formatInr } from '../../lib/money';
import { href } from '../../lib/paths';
import { checkPin } from '../../lib/pin';
import { PRODUCTS } from '../../lib/products';
import {
  describeDraft,
  DRAFT_KEY,
  parseDraft,
  type SubscriptionDraft,
} from '../../lib/subscription';
import { $cart, $totals, dispatch } from '../../stores/cart';

/** The order as the confirmation page shows it, kept for this browser tab only. */
export interface PlacedOrder {
  readonly number: string;
  readonly name: string;
  readonly city: string;
  readonly days: string;
  readonly payment: string;
  readonly lines: readonly {
    readonly name: string;
    readonly detail: string;
    readonly quantity: number;
    readonly total: string;
  }[];
  readonly total: string;
}

export const ORDER_KEY = 'nore-last-order';

const LABELS: Record<Field, string> = {
  name: 'Full name',
  email: 'Email',
  phone: 'Mobile number',
  line1: 'House and street',
  line2: 'Area or landmark (optional)',
  city: 'Town or city',
  state: 'State',
  pin: 'PIN code',
  payment: 'Payment method',
};

const AUTOCOMPLETE: Partial<Record<Field, string>> = {
  name: 'name',
  email: 'email',
  phone: 'tel',
  line1: 'address-line1',
  line2: 'address-line2',
  city: 'address-level2',
  state: 'address-level1',
  pin: 'postal-code',
};

function grindLabel(grind: string | null): string {
  return grind !== null && (GRINDS as readonly string[]).includes(grind)
    ? `, ${GRIND_LABEL[grind as Grind]}`
    : '';
}

export default function CheckoutForm() {
  const cart = useStore($cart);
  const totals = useStore($totals);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionDraft | 'missing' | null>(null);
  const summary = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Arriving from the subscription builder: check out the subscription, not the cart.
    if (new URLSearchParams(window.location.search).get('for') === 'subscription') {
      let draft: SubscriptionDraft | null;
      try {
        draft = parseDraft(
          JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? 'null'),
          PRODUCTS,
        );
      } catch {
        draft = null;
      }
      setSubscription(draft ?? 'missing');
    }
    setMounted(true);
  }, []);

  if (!mounted) return <p class="field__hint">Opening the checkout…</p>;

  if (subscription === 'missing') {
    return (
      <div class="checkout-empty">
        <p class="serif">That subscription has gone missing. Build it again?</p>
        <a class="button" href={href('/subscribe/')}>
          Build a subscription
        </a>
      </div>
    );
  }

  const plan = subscription ? describeDraft(subscription, PRODUCTS) : null;

  if (!plan && totals.lines.length === 0) {
    return (
      <div class="checkout-empty">
        <p class="serif">There is nothing in your cart to check out yet.</p>
        <a class="button" href={href('/shop/')}>
          Browse the coffee
        </a>
      </div>
    );
  }

  const set = (field: Field) => (event: TargetedEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...form, [field]: event.currentTarget.value };
    setForm(next);
    // Once the shopper has tried to submit, errors update as they are fixed.
    if (submitted) setErrors(validateCheckout(next));
  };

  const submit = (event: TargetedEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateCheckout(form);
    setErrors(found);
    setSubmitted(true);
    if (Object.keys(found).length > 0) {
      window.requestAnimationFrame(() => {
        summary.current?.focus();
      });
      return;
    }
    const pin = checkPin(form.pin);
    const random = new Uint32Array(1);
    window.crypto.getRandomValues(random);
    const order: PlacedOrder = {
      number: orderNumber(new Date(), (random[0] ?? 0) / 2 ** 32),
      name: form.name.trim(),
      city: form.city.trim(),
      days: pin.ok ? pin.days : '',
      payment: PAYMENTS[form.payment as keyof typeof PAYMENTS],
      lines: plan
        ? [
            {
              name: plan.name,
              detail: plan.detail,
              quantity: 1,
              total: formatInr(plan.quote.perDelivery),
            },
          ]
        : totals.lines.map((line) => ({
            name: line.product.name,
            detail: `${line.variant.label}${grindLabel(line.grind)}`,
            quantity: line.quantity,
            total: formatInr(line.lineTotal),
          })),
      total: formatInr(plan ? plan.quote.perDelivery : totals.total),
    };
    try {
      window.sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
    } catch {
      // Storage refused: the confirmation page will say the order could not be shown.
    }
    if (plan) {
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nothing to tidy up.
      }
    } else {
      dispatch({ type: 'clear' });
    }
    window.location.assign(href('/checkout/done/'));
  };

  const problems = FIELD_ORDER.filter((field) => errors[field]);

  const input = (field: Field, extra: InputHTMLAttributes = {}) => (
    <label class="field" key={field}>
      <span class="field__label">{LABELS[field]}</span>
      <input
        id={`field-${field}`}
        class="input"
        name={field}
        value={form[field]}
        autoComplete={AUTOCOMPLETE[field]}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={errors[field] ? `error-${field}` : undefined}
        onInput={set(field)}
        {...extra}
      />
      {errors[field] && (
        <span id={`error-${field}`} class="error">
          {errors[field]}
        </span>
      )}
    </label>
  );

  return (
    <div class="checkout">
      <form class="checkout__form" noValidate onSubmit={submit}>
        {problems.length > 0 && (
          <div
            ref={summary}
            class="error-summary"
            tabIndex={-1}
            role="alert"
            aria-labelledby="error-summary-title"
          >
            <h2 id="error-summary-title">
              There{' '}
              {problems.length === 1 ? 'is a problem' : `are ${String(problems.length)} problems`}{' '}
              to fix
            </h2>
            <ul>
              {problems.map((field) => (
                <li key={field}>
                  <a href={`#field-${field}`}>{errors[field]}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <fieldset class="checkout__group">
          <legend>Contact</legend>
          {input('name')}
          {input('email', { type: 'email', inputMode: 'email' })}
          {input('phone', { type: 'tel', inputMode: 'tel' })}
        </fieldset>

        <fieldset class="checkout__group">
          <legend>Delivery address</legend>
          {input('line1')}
          {input('line2')}
          <div class="checkout__pair">
            {input('city')}
            <label class="field">
              <span class="field__label">{LABELS.state}</span>
              <select
                id="field-state"
                class="select"
                name="state"
                value={form.state}
                autoComplete={AUTOCOMPLETE.state}
                aria-invalid={errors.state ? true : undefined}
                aria-describedby={errors.state ? 'error-state' : undefined}
                onChange={set('state')}
              >
                <option value="">Choose…</option>
                {STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.state && (
                <span id="error-state" class="error">
                  {errors.state}
                </span>
              )}
            </label>
          </div>
          {input('pin', { inputMode: 'numeric', maxLength: 7 })}
          {(() => {
            const pin = checkPin(form.pin);
            return pin.ok ? <p class="field__hint">Arrives in {pin.days} from Bengaluru.</p> : null;
          })()}
        </fieldset>

        <fieldset
          class="checkout__group"
          aria-describedby={errors.payment ? 'error-payment payment-note' : 'payment-note'}
        >
          <legend id="field-payment" tabIndex={-1}>
            {LABELS.payment}
          </legend>
          <div class="checkout__payments">
            {Object.entries(PAYMENTS).map(([value, label]) => (
              <label key={value} class="chip">
                <input
                  type="radio"
                  name="payment"
                  value={value}
                  checked={form.payment === value}
                  onChange={set('payment')}
                />
                {label}
              </label>
            ))}
          </div>
          {errors.payment && (
            <span id="error-payment" class="error">
              {errors.payment}
            </span>
          )}
          <p id="payment-note" class="checkout__note">
            Payment is skipped in this demo. Nore is a concept: no card details are asked for,
            nothing is charged, and no order is placed.
          </p>
        </fieldset>

        <button type="submit" class="button checkout__submit">
          Place the order (a demo)
        </button>
      </form>

      <aside class="checkout__summary" aria-labelledby="summary-title">
        <h2 id="summary-title">{plan ? 'Your subscription' : 'Your order'}</h2>
        {plan ? (
          <>
            <p>
              <strong>{plan.name}</strong>
              <span class="checkout__detail">{plan.detail}</span>
            </p>
            <dl class="cart__sums">
              <div>
                <dt>Each delivery</dt>
                <dd class="price">{formatInr(plan.quote.perDelivery)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd class="price">Free</dd>
              </div>
              <div class="cart__total">
                <dt>About a month</dt>
                <dd class="price">{formatInr(plan.quote.perMonth)}</dd>
              </div>
            </dl>
            <p class="field__hint">Ten per cent off every bag. Prices include all taxes.</p>
          </>
        ) : (
          <>
            <ul>
              {totals.lines.map((line) => (
                <li key={line.key}>
                  <span>
                    {line.quantity} × {line.product.name}
                    <span class="checkout__detail">
                      {line.variant.label}
                      {grindLabel(line.grind)}
                    </span>
                  </span>
                  <span class="price">{formatInr(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl class="cart__sums">
              <div>
                <dt>Subtotal</dt>
                <dd class="price">{formatInr(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 && (
                <div>
                  <dt>{cart.coupon}</dt>
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
          </>
        )}
      </aside>
    </div>
  );
}
