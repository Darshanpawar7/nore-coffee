import { checkPin } from './pin';

/**
 * The checkout form's rules, kept out of the component so they can be tested. Every message says
 * what to do, not just what is wrong. No payment details are ever asked for: this is a concept shop.
 */

export const STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export const PAYMENTS = {
  upi: 'UPI',
  card: 'Card',
  cod: 'Cash on delivery',
} as const;
export type Payment = keyof typeof PAYMENTS;

export interface CheckoutForm {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly line1: string;
  readonly line2: string;
  readonly city: string;
  readonly state: string;
  readonly pin: string;
  readonly payment: string;
}

export type Field = keyof CheckoutForm;

export const EMPTY_FORM: CheckoutForm = {
  name: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pin: '',
  payment: '',
};

/** Fields in the order they appear, so the error summary lists problems top to bottom. */
export const FIELD_ORDER: readonly Field[] = [
  'name',
  'email',
  'phone',
  'line1',
  'line2',
  'city',
  'state',
  'pin',
  'payment',
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** An Indian mobile number: ten digits starting 6 to 9, with an optional +91 or 0 in front. */
const MOBILE = /^(?:\+?91|0)?[6-9]\d{9}$/;

export function validateCheckout(form: CheckoutForm): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (form.name.trim().length < 2) errors.name = 'Enter the name to deliver to.';
  if (!EMAIL.test(form.email.trim()))
    errors.email = 'Enter an email address like name@example.com.';
  if (!MOBILE.test(form.phone.replace(/[\s()-]/g, ''))) {
    errors.phone = 'Enter a ten-digit mobile number, so the courier can call.';
  }
  if (form.line1.trim().length < 3) errors.line1 = 'Enter the house number and street.';
  if (form.city.trim().length < 2) errors.city = 'Enter the town or city.';
  if (!(STATES as readonly string[]).includes(form.state))
    errors.state = 'Choose a state or union territory.';
  const pin = checkPin(form.pin);
  if (!pin.ok) errors.pin = pin.reason;
  if (!(form.payment in PAYMENTS)) errors.payment = 'Choose how you would pay.';
  return errors;
}

/** An order number that reads well on the phone: NR, the date, and four random digits. */
export function orderNumber(date: Date, random: number): string {
  const yy = String(date.getFullYear() % 100).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const tail = String(Math.floor(Math.abs(random) * 10_000) % 10_000).padStart(4, '0');
  return `NR-${yy}${mm}${dd}-${tail}`;
}
