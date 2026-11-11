import { useEffect, useRef, useState } from 'preact/hooks';
import { GRIND_LABEL, inSentence, METHOD_LABEL, METHODS, type Method } from '../../lib/catalog';
import { formatInr } from '../../lib/money';
import { href } from '../../lib/paths';
import { SIZES, type SizeId } from '../../lib/pricing';
import { PRODUCTS } from '../../lib/products';
import {
  CADENCES,
  DRAFT_KEY,
  GRIND_FOR,
  MAX_BAGS,
  quote,
  type CadenceId,
  type SubscriptionDraft,
} from '../../lib/subscription';

/**
 * A subscription in three steps, with the price beside it the whole way. A builder rather than a
 * pricing table: the questions are the ones a person actually knows the answer to (how they brew),
 * and the coffee choices narrow to the ones that suit it.
 */

const STEPS = ['How you brew', 'Which coffee', 'How much, how often'] as const;

const METHOD_NOTE: Readonly<Record<Method, string>> = {
  'south-indian-filter': 'The brass filter and the davara.',
  'moka-pot': 'The little stovetop pot.',
  'pour-over': 'A paper filter and a slow pour.',
  'french-press': 'A plunger and four minutes.',
  espresso: 'A machine that hisses.',
  'cold-brew': 'A jar in the fridge overnight.',
};

const BEANS = PRODUCTS.filter((product) => product.kind === 'beans');

export default function SubscribeBuilder() {
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<Method>('south-indian-filter');
  const [coffee, setCoffee] = useState<string>('rotation');
  const [size, setSize] = useState<SizeId>('250g');
  const [bags, setBags] = useState(2);
  const [cadence, setCadence] = useState<CadenceId>('fortnightly');
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // After Next or Back, start reading at the new step's heading.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [step]);

  const go = (next: number) => {
    moved.current = true;
    setStep(next);
  };

  const suited = BEANS.filter((item) => item.greatFor.includes(method));
  const others = BEANS.filter((item) => !item.greatFor.includes(method));
  const chosen = BEANS.find((item) => item.id === coffee);
  const price = quote(chosen ?? 'rotation', size, bags, cadence);
  const sizeLabel = SIZES.find((item) => item.id === size)?.label ?? '';
  const cadenceLabel = CADENCES.find((item) => item.id === cadence)?.label ?? '';

  const finish = () => {
    const draft: SubscriptionDraft = { coffee, size, bags, cadence, method };
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Without storage the checkout cannot see the draft; it will say so.
    }
    window.location.assign(href('/checkout/?for=subscription'));
  };

  const option = (
    id: string,
    label: string,
    note: string,
    checked: boolean,
    choose: () => void,
    name: string,
  ) => (
    <label key={id} class="choice">
      <input type="radio" name={name} value={id} checked={checked} onChange={choose} />
      <span class="choice__label">{label}</span>
      <span class="choice__note">{note}</span>
    </label>
  );

  return (
    <div class="builder">
      <div class="builder__main">
        <ol class="builder__steps" aria-label="Steps">
          {STEPS.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? 'step' : undefined}
              class={index < step ? 'is-done' : ''}
            >
              <span class="builder__step-number">{index + 1}</span> {label}
            </li>
          ))}
        </ol>

        <h2 ref={heading} tabIndex={-1} class="builder__title">
          {step + 1}. {STEPS[step]}
        </h2>

        {step === 0 && (
          <fieldset class="choices">
            <legend class="visually-hidden">How you brew</legend>
            {METHODS.map((item) =>
              option(
                item,
                METHOD_LABEL[item],
                METHOD_NOTE[item],
                method === item,
                () => {
                  setMethod(item);
                },
                'method',
              ),
            )}
          </fieldset>
        )}

        {step === 1 && (
          <fieldset class="choices">
            <legend class="visually-hidden">Which coffee</legend>
            {option(
              'rotation',
              'The roaster’s rotation',
              'A different coffee each delivery, chosen to suit how you brew.',
              coffee === 'rotation',
              () => {
                setCoffee('rotation');
              },
              'coffee',
            )}
            {suited.map((item) =>
              option(
                item.id,
                item.name,
                item.notes.join(', '),
                coffee === item.id,
                () => {
                  setCoffee(item.id);
                },
                'coffee',
              ),
            )}
            {others.length > 0 && (
              <p class="choices__divider">
                Also in the range, though not made for {inSentence(METHOD_LABEL[method])}:
              </p>
            )}
            {others.map((item) =>
              option(
                item.id,
                item.name,
                item.notes.join(', '),
                coffee === item.id,
                () => {
                  setCoffee(item.id);
                },
                'coffee',
              ),
            )}
          </fieldset>
        )}

        {step === 2 && (
          <div class="builder__amounts">
            <fieldset class="choices choices--row">
              <legend class="field__label">Bag size</legend>
              {SIZES.map((item) =>
                option(
                  item.id,
                  item.label,
                  '',
                  size === item.id,
                  () => {
                    setSize(item.id);
                  },
                  'size',
                ),
              )}
            </fieldset>
            <div class="field">
              <span class="field__label" id="bags-label">
                Bags each delivery
              </span>
              <div class="quantity" role="group" aria-labelledby="bags-label">
                <button
                  type="button"
                  class="stepper"
                  aria-label="One bag fewer"
                  disabled={bags <= 1}
                  onClick={() => {
                    setBags(bags - 1);
                  }}
                >
                  −
                </button>
                <output class="quantity__value" aria-live="polite">
                  {bags}
                </output>
                <button
                  type="button"
                  class="stepper"
                  aria-label="One bag more"
                  disabled={bags >= MAX_BAGS}
                  onClick={() => {
                    setBags(bags + 1);
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <fieldset class="choices choices--row">
              <legend class="field__label">How often</legend>
              {CADENCES.map((item) =>
                option(
                  item.id,
                  item.label,
                  '',
                  cadence === item.id,
                  () => {
                    setCadence(item.id);
                  },
                  'cadence',
                ),
              )}
            </fieldset>
          </div>
        )}

        <div class="builder__nav">
          {step > 0 && (
            <button
              type="button"
              class="button button--ghost"
              onClick={() => {
                go(step - 1);
              }}
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              class="button"
              onClick={() => {
                go(step + 1);
              }}
            >
              Next: {STEPS[step + 1]}
            </button>
          ) : (
            <button type="button" class="button" onClick={finish}>
              Continue to checkout
            </button>
          )}
        </div>
      </div>

      <aside class="builder__summary" aria-labelledby="builder-summary-title">
        <h2 id="builder-summary-title">Your subscription</h2>
        <p class="builder__what">
          {bags} × {chosen?.name ?? 'the roaster’s rotation'}, {sizeLabel}
        </p>
        <p class="field__hint">
          Ground for {inSentence(GRIND_LABEL[GRIND_FOR[method]])}, {cadenceLabel.toLowerCase()}.
        </p>
        <dl class="cart__sums" aria-live="polite">
          <div>
            <dt>Each bag</dt>
            <dd class="price">{formatInr(price.perBag)}</dd>
          </div>
          <div>
            <dt>Each delivery</dt>
            <dd class="price">{formatInr(price.perDelivery)}</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd class="price">Free</dd>
          </div>
          <div class="cart__total">
            <dt>About a month</dt>
            <dd class="price">{formatInr(price.perMonth)}</dd>
          </div>
        </dl>
        <p class="builder__saving">
          You save {formatInr(price.saving)} on every delivery: ten per cent off every bag.
        </p>
        <p class="field__hint">Pause, skip or stop whenever you like. (In a real shop, that is.)</p>
      </aside>
    </div>
  );
}
