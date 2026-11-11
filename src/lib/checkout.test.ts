import { describe, expect, it } from 'vitest';
import {
  EMPTY_FORM,
  FIELD_ORDER,
  orderNumber,
  STATES,
  validateCheckout,
  type CheckoutForm,
} from './checkout';

const GOOD: CheckoutForm = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+91 98450 12345',
  line1: '12, 4th Cross, Malleswaram',
  line2: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pin: '560003',
  payment: 'upi',
};

describe('checkout', () => {
  it('accepts a complete form, with or without the country code', () => {
    expect(validateCheckout(GOOD)).toEqual({});
    expect(validateCheckout({ ...GOOD, phone: '9845012345' })).toEqual({});
    expect(validateCheckout({ ...GOOD, phone: '09845012345' })).toEqual({});
  });

  it('explains every missing or wrong field in plain words', () => {
    const errors = validateCheckout(EMPTY_FORM);
    expect(Object.keys(errors).sort()).toEqual([
      'city',
      'email',
      'line1',
      'name',
      'payment',
      'phone',
      'pin',
      'state',
    ]);
    expect(errors.pin).toBe('A PIN code is six digits.');
    expect(validateCheckout({ ...GOOD, phone: '12345 67890' }).phone).toContain('ten-digit mobile');
    expect(validateCheckout({ ...GOOD, email: 'asha@' }).email).toContain('name@example.com');
    expect(validateCheckout({ ...GOOD, state: 'Atlantis' }).state).toBeDefined();
    expect(validateCheckout({ ...GOOD, pin: '900001' }).pin).toContain('Army Postal Service');
    expect(validateCheckout({ ...GOOD, payment: 'bitcoin' }).payment).toBeDefined();
  });

  it('lists every state and union territory once, and every field in page order', () => {
    expect(STATES).toHaveLength(36);
    expect(new Set(STATES).size).toBe(36);
    expect(FIELD_ORDER).toHaveLength(Object.keys(EMPTY_FORM).length);
  });

  it('numbers orders by date with four random digits', () => {
    expect(orderNumber(new Date(2026, 10, 11), 0.0421)).toBe('NR-261111-0421');
    expect(orderNumber(new Date(2026, 0, 5), 0.99999)).toBe('NR-260105-9999');
  });
});
