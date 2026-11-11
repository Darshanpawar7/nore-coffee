import { describe, expect, it } from 'vitest';
import {
  ZERO,
  add,
  formatInr,
  multiply,
  paise,
  percentOf,
  roundToRupee,
  rupees,
  subtract,
  toRupees,
} from './money';

describe('constructing money', () => {
  it('holds a rupee amount as a whole number of paise', () => {
    expect(rupees(420)).toBe(42000);
  });

  it('accepts rupee amounts with up to two decimals', () => {
    expect(rupees(79.8)).toBe(7980);
    expect(rupees(0.05)).toBe(5);
  });

  it('rejects a rupee amount with a fraction of a paisa', () => {
    expect(() => rupees(1.005)).toThrow(RangeError);
  });

  it('rejects amounts that are not finite numbers', () => {
    expect(() => rupees(Number.NaN)).toThrow(RangeError);
    expect(() => rupees(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => paise(Number.NaN)).toThrow(RangeError);
  });

  it('rejects a fractional number of paise', () => {
    expect(() => paise(1.5)).toThrow(RangeError);
  });

  it('converts paise back to rupees for display maths', () => {
    expect(toRupees(paise(7980))).toBe(79.8);
  });

  it('has a single zero: negative zero is stored as plain zero', () => {
    expect(Object.is(paise(-0), 0)).toBe(true);
    expect(Object.is(rupees(-0), 0)).toBe(true);
  });
});

describe('arithmetic', () => {
  it('adds any number of amounts', () => {
    expect(add(rupees(420), rupees(560), rupees(60))).toBe(104000);
  });

  it('treats the sum of nothing as zero', () => {
    expect(add()).toBe(ZERO);
  });

  it('subtracts one amount from another', () => {
    expect(subtract(rupees(798), rupees(79.8))).toBe(71820);
  });

  it('multiplies a unit price by a whole quantity', () => {
    expect(multiply(rupees(420), 3)).toBe(126000);
    expect(multiply(rupees(420), 0)).toBe(0);
  });

  it('rejects a fractional or negative quantity', () => {
    expect(() => multiply(rupees(420), 1.5)).toThrow(RangeError);
    expect(() => multiply(rupees(420), -1)).toThrow(RangeError);
  });

  it('gives plain zero for none of a negative amount, such as a refund line', () => {
    expect(Object.is(multiply(paise(-500), 0), 0)).toBe(true);
  });
});

describe('percentages', () => {
  it('takes ten percent of a price exactly', () => {
    expect(percentOf(rupees(798), 10)).toBe(7980);
  });

  it('scales a price by a multiplier above one hundred percent', () => {
    expect(percentOf(rupees(420), 190)).toBe(79800);
    expect(percentOf(rupees(420), 360)).toBe(151200);
  });

  it('rounds half a paisa up', () => {
    expect(percentOf(paise(5), 10)).toBe(1);
    expect(percentOf(paise(15), 10)).toBe(2);
  });

  it('rounds less than half a paisa down', () => {
    expect(percentOf(paise(4), 10)).toBe(0);
    expect(percentOf(paise(14), 10)).toBe(1);
  });

  it('rejects a negative or fractional percentage', () => {
    expect(() => percentOf(rupees(100), -10)).toThrow(RangeError);
    expect(() => percentOf(rupees(100), 12.5)).toThrow(RangeError);
  });

  it('rounds an amount to the nearest whole rupee', () => {
    expect(roundToRupee(paise(1680))).toBe(1700);
    expect(roundToRupee(paise(1649))).toBe(1600);
    expect(roundToRupee(paise(1650))).toBe(1700);
  });

  it('rounds a negative amount as the mirror image of the positive one', () => {
    expect(percentOf(paise(-15), 10)).toBe(-2);
    expect(percentOf(paise(-14), 10)).toBe(-1);
    expect(percentOf(paise(-5), 10)).toBe(-1);
    expect(roundToRupee(paise(-1650))).toBe(-1700);
    expect(roundToRupee(paise(-1649))).toBe(-1600);
  });

  it('mirrors every refund against its charge, to the paisa', () => {
    for (let amount = 0; amount <= 250; amount += 1) {
      const charge = percentOf(paise(amount), 10);
      const refund = percentOf(paise(-amount), 10);

      expect(Object.is(refund, 0 - charge)).toBe(true);
    }
  });

  it('gives plain zero when a negative amount rounds to nothing', () => {
    expect(Object.is(percentOf(paise(-1), 10), 0)).toBe(true);
    expect(Object.is(percentOf(paise(-4), 10), 0)).toBe(true);
    expect(Object.is(roundToRupee(paise(-10)), 0)).toBe(true);
    expect(Object.is(roundToRupee(paise(-49)), 0)).toBe(true);
  });
});

describe('formatting rupees', () => {
  it('drops the paise when the amount is a whole rupee', () => {
    expect(formatInr(rupees(420))).toBe('₹420');
  });

  it('shows two decimals when there are paise', () => {
    expect(formatInr(rupees(79.8))).toBe('₹79.80');
    expect(formatInr(paise(5))).toBe('₹0.05');
  });

  it('groups thousands, then lakhs and crores in pairs', () => {
    expect(formatInr(rupees(1064))).toBe('₹1,064');
    expect(formatInr(rupees(123456))).toBe('₹1,23,456');
    expect(formatInr(rupees(123456789))).toBe('₹12,34,56,789');
  });

  it('can always show paise so that a column of totals lines up', () => {
    expect(formatInr(rupees(420), { paise: 'always' })).toBe('₹420.00');
  });

  it('writes zero without decimals', () => {
    expect(formatInr(ZERO)).toBe('₹0');
  });

  it('puts a true minus sign before a negative amount', () => {
    expect(formatInr(paise(-7980))).toBe('−₹79.80');
  });
});
