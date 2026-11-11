import { useEffect, useState } from 'preact/hooks';
import { href } from '../../lib/paths';
import { ORDER_KEY, type PlacedOrder } from './CheckoutForm';

function isOrder(value: unknown): value is PlacedOrder {
  if (typeof value !== 'object' || value === null) return false;
  const order = value as Record<string, unknown>;
  return (
    typeof order.number === 'string' && typeof order.name === 'string' && Array.isArray(order.lines)
  );
}

/** The last order placed in this tab, read back from session storage. */
export default function OrderConfirmation() {
  const [order, setOrder] = useState<PlacedOrder | null | undefined>(undefined);

  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(window.sessionStorage.getItem(ORDER_KEY) ?? 'null');
      setOrder(isOrder(parsed) ? parsed : null);
    } catch {
      setOrder(null);
    }
  }, []);

  if (order === undefined) return <p class="field__hint">Finding your order…</p>;
  if (order === null) {
    return (
      <div class="confirmation">
        <p class="serif">There is no recent order in this tab to show.</p>
        <a class="button" href={href('/shop/')}>
          Back to the shop
        </a>
      </div>
    );
  }
  return (
    <div class="confirmation">
      <p class="confirmation__number">
        Order <strong>{order.number}</strong>
      </p>
      <p class="serif confirmation__thanks">
        Thank you, {order.name.split(' ')[0]}. Had this been real, it would reach {order.city} in{' '}
        {order.days}. Payment: {order.payment}.
      </p>
      <ul class="confirmation__lines">
        {order.lines.map((line) => (
          <li key={`${line.name}${line.detail}`}>
            <span>
              {line.quantity} × {line.name} <span class="checkout__detail">{line.detail}</span>
            </span>
            <span class="price">{line.total}</span>
          </li>
        ))}
        <li class="confirmation__total">
          <span>Total</span>
          <span class="price">{order.total}</span>
        </li>
      </ul>
      <p class="confirmation__concept">
        This was a demo. Nore is a concept brand designed and built by Darshan Pawar: nothing was
        charged, nothing will be delivered, and your details were never sent anywhere. Your cart has
        been emptied.
      </p>
      <a class="button button--ghost" href={href('/shop/')}>
        Back to the shop
      </a>
    </div>
  );
}
