import { useEffect, useRef, useState } from 'preact/hooks';
import { MAX_QUANTITY } from '../../lib/cart';
import { GRIND_LABEL, GRINDS, type Grind } from '../../lib/catalog';
import { formatInr, multiply } from '../../lib/money';
import { DEFAULT_VARIANT, GRAMS_PER_CUP, pricePerCup, variantsFor } from '../../lib/pricing';
import { productById } from '../../lib/products';
import { $drawerOpen, dispatch } from '../../stores/cart';

/**
 * Size, grind and quantity, the price as it changes, and Add to cart. The grind starts on South
 * Indian filter, because that is how most people here will brew it. Adding never moves the page:
 * the cart count ticks and a short note confirms what went in.
 */
export default function ProductOptions({ productId }: { productId: string }) {
  const product = productById(productId);
  const variants = product ? variantsFor(product) : [];
  const [variantId, setVariantId] = useState(
    variants.some((item) => item.id === DEFAULT_VARIANT)
      ? DEFAULT_VARIANT
      : (variants[0]?.id ?? ''),
  );
  const [grind, setGrind] = useState<Grind>('south-indian-filter');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState<string | null>(null);
  const timer = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  if (!product) return null;
  const variant = variants.find((item) => item.id === variantId) ?? variants[0];
  if (!variant) return null;
  const perCup = pricePerCup(variant);
  const ground = product.kind === 'beans';

  const add = () => {
    dispatch({
      type: 'add',
      line: {
        productId: product.id,
        variantId: variant.id,
        grind: ground ? grind : null,
        quantity,
      },
    });
    const what = [product.name, variant.label, ground ? GRIND_LABEL[grind] : null]
      .filter(Boolean)
      .join(', ');
    setAdded(`Added to your cart: ${String(quantity)} × ${what}.`);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setAdded(null);
    }, 6000);
  };

  return (
    <form
      class="options"
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      {variants.length > 1 && (
        <fieldset class="options__sizes">
          <legend class="field__label">Size</legend>
          {variants.map((item) => (
            <label key={item.id} class="size">
              <input
                type="radio"
                name="size"
                value={item.id}
                checked={item.id === variant.id}
                onChange={() => {
                  setVariantId(item.id);
                }}
              />
              <span class="size__label">{item.label}</span>
              <span class="size__price price">{formatInr(item.price)}</span>
            </label>
          ))}
        </fieldset>
      )}

      {ground && (
        <label class="field">
          <span class="field__label">Grind</span>
          <select
            class="select"
            value={grind}
            onChange={(event) => {
              setGrind(event.currentTarget.value as Grind);
            }}
          >
            {GRINDS.map((option) => (
              <option key={option} value={option}>
                {GRIND_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
      )}

      <div class="options__row">
        <div class="field">
          <span class="field__label" id="quantity-label">
            Quantity
          </span>
          <div class="quantity" role="group" aria-labelledby="quantity-label">
            <button
              type="button"
              class="stepper"
              aria-label="One fewer"
              disabled={quantity <= 1}
              onClick={() => {
                setQuantity(Math.max(1, quantity - 1));
              }}
            >
              −
            </button>
            <output class="quantity__value" aria-live="polite">
              {quantity}
            </output>
            <button
              type="button"
              class="stepper"
              aria-label="One more"
              disabled={quantity >= MAX_QUANTITY}
              onClick={() => {
                setQuantity(Math.min(MAX_QUANTITY, quantity + 1));
              }}
            >
              +
            </button>
          </div>
        </div>
        <p class="options__price">
          <span class="price">{formatInr(multiply(variant.price, quantity))}</span>
          {perCup !== null && (
            <span class="options__cup">
              About {formatInr(perCup)} a cup, at {GRAMS_PER_CUP} g a cup
            </span>
          )}
        </p>
      </div>

      <button type="submit" class="button options__add">
        Add to cart
      </button>
      <p class="options__added" role="status">
        {added && (
          <>
            {added}{' '}
            <button
              type="button"
              class="link-button"
              onClick={() => {
                $drawerOpen.set(true);
              }}
            >
              Open the cart
            </button>
          </>
        )}
      </p>
    </form>
  );
}
