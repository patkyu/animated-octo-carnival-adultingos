import { isRecurring, periodsPerYear, ruleStep, type RecurrenceRule } from './recurrence';

/**
 * Money is stored as integer minor units (centavos for PHP). No binary
 * floating point is ever used to hold or add amounts: parsing works on the
 * string digits, sums are integer additions, and the only rounding step
 * (converting e.g. a yearly price to a monthly equivalent) is an explicit
 * integer division with half-up rounding.
 */
export type MinorUnits = number;

export const SUPPORTED_CURRENCIES = ['PHP', 'USD'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: CurrencyCode = 'PHP';

const SYMBOLS: Record<CurrencyCode, string> = { PHP: '₱', USD: '$' };
export const MAX_AMOUNT_MINOR = 99_999_999_999; // ₱999,999,999.99

/** Parses user input such as "1,234.5", "₱ 99", "0.05" to minor units. Returns null if invalid. */
export function parseAmountToMinor(input: string): MinorUnits | null {
  const cleaned = input.replace(/[₱$,\s]/g, '').replace(/^PHP|^USD/i, '');
  if (!/^\d{1,12}(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole = '0', frac = ''] = cleaned.split('.');
  const minor = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isSafeInteger(minor) || minor > MAX_AMOUNT_MINOR) return null;
  return minor;
}

export function addMinor(...amounts: MinorUnits[]): MinorUnits {
  let total = 0;
  for (const a of amounts) {
    if (!Number.isInteger(a)) throw new TypeError(`Amount must be integer minor units, got ${a}`);
    total += a;
  }
  return total;
}

/** Integer division with half-up rounding (for non-negative values). */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  if (denominator <= 0) throw new RangeError('denominator must be positive');
  const q = Math.floor(numerator / denominator);
  const r = numerator - q * denominator;
  return r * 2 >= denominator ? q + 1 : q;
}

export function formatMinor(amount: MinorUnits, currency: CurrencyCode = DEFAULT_CURRENCY, opts: { compact?: boolean } = {}): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = opts.compact && cents === 0 ? grouped : `${grouped}.${String(cents).padStart(2, '0')}`;
  return `${negative ? '-' : ''}${SYMBOLS[currency]}${body}`;
}

/** Minor units → plain editable string, e.g. 123450 → "1234.50". */
export function minorToInput(amount: MinorUnits | null | undefined): string {
  if (amount === null || amount === undefined) return '';
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}`;
}

/**
 * Annual cost of a recurring amount, exact for month/year/week units and
 * rounded half-up for day-based schedules (365/n periods).
 */
export function annualEquivalent(amount: MinorUnits, rule: RecurrenceRule | null | undefined): MinorUnits {
  if (!isRecurring(rule)) return 0;
  const step = ruleStep(rule);
  if (!step) return 0;
  switch (step.unit) {
    case 'month':
      return divRoundHalfUp(amount * 12, step.step);
    case 'year':
      return divRoundHalfUp(amount, step.step);
    case 'week':
      return divRoundHalfUp(amount * 52, step.step);
    case 'day':
      return divRoundHalfUp(amount * 365, step.step);
  }
}

export function monthlyEquivalent(amount: MinorUnits, rule: RecurrenceRule | null | undefined): MinorUnits {
  if (!isRecurring(rule)) return 0;
  const step = ruleStep(rule);
  if (!step) return 0;
  if (step.unit === 'month') return divRoundHalfUp(amount, step.step);
  if (step.unit === 'year') return divRoundHalfUp(amount, 12 * step.step);
  return divRoundHalfUp(annualEquivalent(amount, rule), 12);
}

export { periodsPerYear };
