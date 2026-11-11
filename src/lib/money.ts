/**
 * Money is held as a whole number of paise, so no price is ever a floating-point value.
 * The brand makes it a compile-time error to pass a plain number (rupees, a quantity, a
 * percentage) where an amount is expected.
 */
declare const paiseBrand: unique symbol;
export type Paise = number & { readonly [paiseBrand]: 'paise' };

export const PAISE_PER_RUPEE = 100;
export const ZERO = 0 as Paise;

const RUPEE_SIGN = '₹';
const MINUS_SIGN = '−';
const PERCENT_BASE = 100;
/** Tolerance for binary noise in a decimal rupee literal such as 79.8 (stored as 79.7999...). */
const DECIMAL_NOISE = 1e-6;

/** Wraps a whole number of paise. Throws when the value could not be an amount of money. */
export function paise(value: number): Paise {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Money must be a whole number of paise, received ${String(value)}.`);
  }
  return value as Paise;
}

/** Converts a rupee amount with at most two decimals into paise. */
export function rupees(value: number): Paise {
  if (!Number.isFinite(value)) {
    throw new RangeError(`A rupee amount must be a finite number, received ${String(value)}.`);
  }
  const scaled = value * PAISE_PER_RUPEE;
  const whole = Math.round(scaled);
  if (Math.abs(scaled - whole) > DECIMAL_NOISE) {
    throw new RangeError(`A rupee amount cannot have a fraction of a paisa, received ${value}.`);
  }
  return paise(whole);
}

export function toRupees(amount: Paise): number {
  return amount / PAISE_PER_RUPEE;
}

export function add(...amounts: readonly Paise[]): Paise {
  return paise(amounts.reduce((sum, amount) => sum + amount, 0));
}

export function subtract(amount: Paise, other: Paise): Paise {
  return paise(amount - other);
}

/** Unit price times a whole, non-negative quantity. */
export function multiply(amount: Paise, quantity: number): Paise {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError(`A quantity must be a whole number of zero or more, received ${quantity}.`);
  }
  return paise(amount * quantity);
}

/**
 * A whole-number percentage of an amount, rounded half up to the nearest paisa.
 * `percentOf(price, 190)` is the 1.9x multiplier; `percentOf(subtotal, 10)` is a 10% discount.
 * The arithmetic stays in integers: amount x percent is exact, and so is the division.
 */
export function percentOf(amount: Paise, percent: number): Paise {
  if (!Number.isSafeInteger(percent) || percent < 0) {
    throw new RangeError(
      `A percentage must be a whole number of zero or more, received ${percent}.`,
    );
  }
  return divideHalfUp(amount * percent, PERCENT_BASE);
}

export function roundToRupee(amount: Paise): Paise {
  return paise(divideHalfUp(amount, PAISE_PER_RUPEE) * PAISE_PER_RUPEE);
}

function divideHalfUp(numerator: number, denominator: number): Paise {
  const magnitude = Math.floor((Math.abs(numerator) * 2 + denominator) / (denominator * 2));
  return paise(numerator < 0 ? -magnitude : magnitude);
}

export interface FormatInrOptions {
  /** `auto` hides ".00" on whole rupees; `always` keeps two decimals so columns line up. */
  readonly paise?: 'auto' | 'always';
}

/**
 * Formats an amount as Indian rupees with Indian digit grouping (1,23,456).
 * Written by hand instead of through `Intl.NumberFormat` so that the build server and every
 * browser produce the same string, whatever locale data they ship.
 */
export function formatInr(amount: Paise, options: FormatInrOptions = {}): string {
  const magnitude = Math.abs(amount);
  const wholeRupees = Math.floor(magnitude / PAISE_PER_RUPEE);
  const remainder = magnitude % PAISE_PER_RUPEE;
  const showPaise = options.paise === 'always' || remainder !== 0;
  const decimals = showPaise ? `.${String(remainder).padStart(2, '0')}` : '';
  const sign = amount < 0 ? MINUS_SIGN : '';
  return `${sign}${RUPEE_SIGN}${groupIndian(String(wholeRupees))}${decimals}`;
}

/** Thousands first, then pairs: 123456789 becomes 12,34,56,789. */
function groupIndian(digits: string): string {
  const THOUSANDS = 3;
  if (digits.length <= THOUSANDS) return digits;
  const head = digits.slice(0, -THOUSANDS);
  const tail = digits.slice(-THOUSANDS);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}`;
}
