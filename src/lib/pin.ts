/** Indian PIN codes, and a coarse delivery estimate from Bengaluru by the first digit. */

export type PinCheck =
  | {
      readonly ok: true;
      readonly pin: string;
      readonly zone: 'south' | 'india';
      readonly days: string;
    }
  | { readonly ok: false; readonly reason: string };

export function checkPin(input: string): PinCheck {
  const pin = input.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(pin)) return { ok: false, reason: 'A PIN code is six digits.' };
  const first = pin.charAt(0);
  if (first === '0') return { ok: false, reason: 'No Indian PIN code starts with 0.' };
  if (first === '9') {
    return {
      ok: false,
      reason:
        'PIN codes that start with 9 belong to the Army Postal Service, which we cannot reach.',
    };
  }
  // 5 is Karnataka, Andhra Pradesh and Telangana; 6 is Tamil Nadu and Kerala: a short drive away.
  if (first === '5' || first === '6') return { ok: true, pin, zone: 'south', days: '1 to 3 days' };
  return { ok: true, pin, zone: 'india', days: '4 to 7 days' };
}
