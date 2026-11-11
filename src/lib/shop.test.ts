import { describe, expect, it } from 'vitest';
import { filterRecipe, coffeeFor, RATIOS } from './brew';
import {
  cartReducer,
  EMPTY_CART,
  itemCount,
  lineKey,
  MAX_QUANTITY,
  type CartLine,
  type CartState,
} from './cart';
import { parseCartState, serialiseCartState } from './cart-storage';
import { productSchema } from './catalog-schema';
import { roastRank } from './catalog';
import { bestInk, contrast, luminance } from './contrast';
import { formatInr, rupees } from './money';
import { href } from './paths';
import { checkPin } from './pin';
import { pricePerCup, variantOf, variantsFor } from './pricing';
import { PRODUCTS, productById } from './products';
import { quote, SUBSCRIBER_PERCENT } from './subscription';
import { checkCoupon, shippingFor, shippingProgress, totalsFor } from './totals';

const product = (id: string) => {
  const found = productById(id);
  if (!found) throw new Error(id);
  return found;
};
const bag = (productId: string, quantity = 1, variantId = '250g'): CartLine => ({
  productId,
  variantId,
  grind: 'south-indian-filter',
  quantity,
});
const withLines = (...lines: CartLine[]): CartState =>
  lines.reduce((state, line) => cartReducer(state, { type: 'add', line }), EMPTY_CART);

describe('the catalogue', () => {
  it('passes its own schema, with unique ids and one accent per coffee', () => {
    for (const item of PRODUCTS) expect(productSchema.safeParse(item).success, item.id).toBe(true);
    expect(new Set(PRODUCTS.map((item) => item.id)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((item) => item.accent)).size).toBe(PRODUCTS.length);
    expect(PRODUCTS.map((item) => item.price)).toEqual([420, 560, 520, 640, 620, 480, 600, 350]);
    expect(product('meter-kaapi')).toMatchObject({ kind: 'beans', chicory: 20, roast: 'dark' });
    expect(productById('nothing')).toBeUndefined();
    expect(roastRank('light')).toBeLessThan(roastRank('dark'));
  });

  it('rejects a product that breaks the rules', () => {
    const broken = { ...product('baba-budan'), price: -1, accent: 'neon' };
    expect(productSchema.safeParse(broken).success).toBe(false);
  });
});

describe('pricing', () => {
  it('prices 500 g at 1.9 times and 1 kg at 3.6 times the 250 g bag', () => {
    expect(variantsFor(product('baba-budan')).map((variant) => formatInr(variant.price))).toEqual([
      '₹560',
      '₹1,064',
      '₹2,016',
    ]);
    expect(variantsFor(product('decoction-no-1'))).toEqual([
      { id: 'bottle', label: '500 ml bottle', price: rupees(350), grams: null },
    ]);
    expect(variantOf(product('baba-budan'), '2kg')).toBeUndefined();
  });

  it('works out about how much a cup costs at 10 g a cup', () => {
    const quarter = variantOf(product('meter-kaapi'), '250g');
    expect(quarter && formatInr(pricePerCup(quarter) ?? rupees(0))).toBe('₹16.80');
    const bottle = variantOf(product('decoction-no-1'), 'bottle');
    expect(bottle && pricePerCup(bottle)).toBeNull();
  });
});

describe('the cart', () => {
  it('adds, merges matching lines and keeps different grinds apart', () => {
    let state = withLines(bag('baba-budan'), bag('baba-budan', 2));
    expect(state.lines).toEqual([bag('baba-budan', 3)]);
    state = cartReducer(state, {
      type: 'add',
      line: { ...bag('baba-budan'), grind: 'whole-bean' },
    });
    expect(state.lines).toHaveLength(2);
    expect(itemCount(state)).toBe(4);
    expect(cartReducer(state, { type: 'add', line: bag('baba-budan', 0) })).toBe(state);
  });

  it('caps quantities, and setting zero removes the line', () => {
    const key = lineKey(bag('nilgiri-mist'));
    let state = withLines(bag('nilgiri-mist', 50));
    expect(state.lines[0]?.quantity).toBe(MAX_QUANTITY);
    state = cartReducer(state, { type: 'set-quantity', key, quantity: 3.7 });
    expect(state.lines[0]?.quantity).toBe(3);
    state = cartReducer(state, { type: 'set-quantity', key, quantity: 0 });
    expect(state.lines).toEqual([]);
    expect(state.removed?.line.productId).toBe('nilgiri-mist');
    expect(cartReducer(withLines(bag('a', Number.NaN)), { type: 'clear' })).toEqual(EMPTY_CART);
  });

  it('removes with undo, putting the line back where it was', () => {
    const state = withLines(bag('baba-budan'), bag('araku-dawn'), bag('nilgiri-mist'));
    const removed = cartReducer(state, { type: 'remove', key: lineKey(bag('araku-dawn')) });
    expect(removed.lines.map((line) => line.productId)).toEqual(['baba-budan', 'nilgiri-mist']);
    expect(cartReducer(removed, { type: 'undo' }).lines).toEqual(state.lines);
    expect(cartReducer(state, { type: 'undo' })).toBe(state);
    expect(cartReducer(state, { type: 'remove', key: 'nope' })).toBe(state);
  });

  it('keeps the coupon as typed, upper-cased, until removed', () => {
    let state = cartReducer(EMPTY_CART, { type: 'apply-coupon', code: ' bytwo ' });
    expect(state.coupon).toBe('BYTWO');
    state = cartReducer(state, { type: 'apply-coupon', code: '  ' });
    expect(state.coupon).toBeNull();
    expect(cartReducer({ ...state, coupon: 'X' }, { type: 'remove-coupon' }).coupon).toBeNull();
  });
});

describe('totals, coupon and shipping', () => {
  it('turns BYTWO down with a reason for one bag, and gives 10% off for two', () => {
    const one = totalsFor(
      cartReducer(withLines(bag('baba-budan')), { type: 'apply-coupon', code: 'bytwo' }),
      PRODUCTS,
    );
    expect(one.coupon).toMatchObject({
      status: 'rejected',
      reason: expect.stringContaining('two or more bags') as string,
    });
    expect(one.discount).toBe(0);
    const two = totalsFor(
      cartReducer(withLines(bag('baba-budan'), bag('araku-dawn')), {
        type: 'apply-coupon',
        code: 'BYTWO',
      }),
      PRODUCTS,
    );
    expect(two.coupon).toMatchObject({ status: 'applied', percent: 10 });
    expect(formatInr(two.subtotal)).toBe('₹1,180');
    expect(formatInr(two.discount)).toBe('₹118');
    expect(formatInr(two.total)).toBe('₹1,062');
  });

  it('does not count the bottled decoction as a bag', () => {
    const cart = cartReducer(
      withLines(bag('baba-budan'), {
        productId: 'decoction-no-1',
        variantId: 'bottle',
        grind: null,
        quantity: 1,
      }),
      {
        type: 'apply-coupon',
        code: 'BYTWO',
      },
    );
    const totals = totalsFor(cart, PRODUCTS);
    expect(totals.bags).toBe(1);
    expect(totals.items).toBe(2);
    expect(totals.coupon.status).toBe('rejected');
    expect(checkCoupon('FREEBIE', 3)).toMatchObject({
      status: 'rejected',
      reason: expect.stringContaining('not one of ours') as string,
    });
    expect(checkCoupon('BYTWO', 0)).toMatchObject({
      reason: expect.stringContaining('none yet') as string,
    });
  });

  it('ships free from Rs 999, judged before the coupon', () => {
    expect(shippingFor(rupees(0))).toBe(0);
    expect(formatInr(shippingFor(rupees(998)))).toBe('₹60');
    expect(shippingFor(rupees(999))).toBe(0);
    expect(formatInr(shippingProgress(rupees(560)).remaining)).toBe('₹439');
    expect(shippingProgress(rupees(2000))).toEqual({ remaining: 0, ratio: 1 });
    const totals = totalsFor(
      cartReducer(withLines(bag('nilgiri-mist'), bag('baba-budan')), {
        type: 'apply-coupon',
        code: 'BYTWO',
      }),
      PRODUCTS,
    );
    expect(totals.shipping).toBe(0); // 1,160 before the coupon, 1,044 after: still free
  });

  it('drops lines whose product or size has gone, instead of pricing them', () => {
    const totals = totalsFor(
      withLines(bag('retired-coffee'), bag('baba-budan', 1, '5kg'), bag('baba-budan')),
      PRODUCTS,
    );
    expect(totals.lines).toHaveLength(1);
  });
});

describe('the cart in storage', () => {
  it('round-trips, and forgets an undo offer', () => {
    const state = cartReducer(
      cartReducer(withLines(bag('baba-budan', 2), bag('araku-dawn')), {
        type: 'apply-coupon',
        code: 'BYTWO',
      }),
      {
        type: 'remove',
        key: lineKey(bag('araku-dawn')),
      },
    );
    expect(parseCartState(serialiseCartState(state))).toEqual({ ...state, removed: null });
  });

  it('keeps the good lines of a damaged cart and drops the rest', () => {
    const text = JSON.stringify({
      lines: [
        bag('baba-budan'),
        { ...bag('x'), quantity: 999 },
        { ...bag('y'), grind: 'dust' },
        'nonsense',
        { ...bag('Bad Id') },
      ],
      coupon: '<script>',
    });
    expect(parseCartState(text)).toEqual({
      lines: [bag('baba-budan')],
      coupon: null,
      removed: null,
    });
    for (const broken of [null, undefined, '', '{', '[]', '{"lines":5}'])
      expect(parseCartState(broken)).toEqual(EMPTY_CART);
  });
});

describe('PIN codes', () => {
  it('estimates delivery by the first digit, and refuses what it cannot reach', () => {
    expect(checkPin('560 001')).toEqual({
      ok: true,
      pin: '560001',
      zone: 'south',
      days: '1 to 3 days',
    });
    expect(checkPin('600028')).toMatchObject({ zone: 'south' });
    expect(checkPin('110001')).toMatchObject({ zone: 'india', days: '4 to 7 days' });
    expect(checkPin('900001')).toMatchObject({
      ok: false,
      reason: expect.stringContaining('Army Postal Service') as string,
    });
    expect(checkPin('012345')).toMatchObject({ ok: false });
    expect(checkPin('56001')).toEqual({ ok: false, reason: 'A PIN code is six digits.' });
    expect(checkPin('56000a')).toMatchObject({ ok: false });
  });
});

describe('the brew guide', () => {
  it('scales powder, water, decoction and milk with cups and strength', () => {
    expect(filterRecipe(2, 'classic')).toEqual({
      cups: 2,
      powder: 20,
      water: 120,
      decoction: 80,
      milk: 240,
      milkParts: 3,
    });
    expect(filterRecipe(1, 'mild').milk).toBe(160);
    expect(filterRecipe(1, 'strong').milk).toBe(80);
    expect(filterRecipe(9, 'classic').cups).toBe(6);
    expect(filterRecipe(0, 'classic').cups).toBe(1);
    expect(coffeeFor(250, 16)).toBe(16);
    expect(RATIOS.map((card) => card.ratio)).toEqual([8, 16, 15, 8]);
  });
});

describe('subscriptions', () => {
  it('takes 10% off every bag and counts deliveries a month', () => {
    const fortnightly = quote(product('baba-budan'), '250g', 2, 'fortnightly');
    expect(SUBSCRIBER_PERCENT).toBe(90);
    expect(formatInr(fortnightly.perBag)).toBe('₹504');
    expect(formatInr(fortnightly.perDelivery)).toBe('₹1,008');
    expect(formatInr(fortnightly.saving)).toBe('₹112');
    expect(formatInr(fortnightly.perMonth)).toBe('₹2,016');
    expect(formatInr(quote('rotation', '500g', 1, 'monthly').perBag)).toBe('₹957.60');
    expect(quote(product('nilgiri-mist'), '1kg', 9, 'monthly').perDelivery).toBe(
      quote(product('nilgiri-mist'), '1kg', 4, 'monthly').perDelivery,
    );
  });
});

describe('contrast and paths', () => {
  it('computes WCAG contrast and picks the better ink', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(luminance('#ffffff')).toBeCloseTo(1, 9);
    expect(contrast('#1F1410', '#F4EADB')).toBeGreaterThan(14);
    expect(bestInk('#D99A1C', '#FBF6EE', '#1F1410')).toBe('#1F1410');
    expect(bestInk('#2E5E4A', '#FBF6EE', '#1F1410')).toBe('#FBF6EE');
    expect(() => luminance('red')).toThrow(RangeError);
  });

  it('joins paths onto the base, with or without its slash', () => {
    expect(href('/shop/', '/nore-coffee/')).toBe('/nore-coffee/shop/');
    expect(href('shop/', '/nore-coffee')).toBe('/nore-coffee/shop/');
    expect(href('/', '/')).toBe('/');
  });
});
