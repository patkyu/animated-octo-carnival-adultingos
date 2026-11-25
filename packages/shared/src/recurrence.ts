import { z } from 'zod';
import { addDays, addMonthsAnchored, compareLocalDates, parseLocalDate, type LocalDate } from './dates';

/**
 * Recurrence rules.
 *
 * Schedules advance from the *due date*, not the completion date, so paying
 * the March 15 electricity bill on March 20 still makes the next one due
 * April 15. Month-based rules keep an `anchorDay` so that a rule created on the
 * 31st clamps to the last day of shorter months and returns to the 31st when
 * possible (see addMonthsAnchored). Yearly rules anchored on Feb 29 fall on
 * Feb 28 in common years and Feb 29 in leap years.
 */
export const RECURRENCE_FREQUENCIES = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const CUSTOM_UNITS = ['day', 'week', 'month', 'year'] as const;
export type CustomUnit = (typeof CUSTOM_UNITS)[number];

export const recurrenceRuleSchema = z
  .object({
    freq: z.enum(RECURRENCE_FREQUENCIES),
    interval: z.number().int().min(1).max(365).default(1),
    unit: z.enum(CUSTOM_UNITS).optional(),
    anchorDay: z.number().int().min(1).max(31).optional(),
    /** Last allowed due date (inclusive). */
    until: z.string().optional(),
  })
  .refine((r) => r.freq !== 'custom' || r.unit !== undefined, { message: 'Custom recurrence needs a unit' });

export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

export const NO_RECURRENCE: RecurrenceRule = { freq: 'none', interval: 1 };

export function isRecurring(rule: RecurrenceRule | null | undefined): rule is RecurrenceRule {
  return !!rule && rule.freq !== 'none';
}

/** Normalise any rule to (unit, step) so all frequencies share one code path. */
export function ruleStep(rule: RecurrenceRule): { unit: CustomUnit; step: number } | null {
  switch (rule.freq) {
    case 'none':
      return null;
    case 'daily':
      return { unit: 'day', step: rule.interval };
    case 'weekly':
      return { unit: 'week', step: rule.interval };
    case 'monthly':
      return { unit: 'month', step: rule.interval };
    case 'quarterly':
      return { unit: 'month', step: 3 * rule.interval };
    case 'yearly':
      return { unit: 'year', step: rule.interval };
    case 'custom':
      return rule.unit ? { unit: rule.unit, step: rule.interval } : null;
  }
}

/** Builds a rule, capturing the anchor day from the first due date for month-based rules. */
export function makeRule(freq: RecurrenceFrequency, firstDue: LocalDate, interval = 1, unit?: CustomUnit): RecurrenceRule {
  const rule: RecurrenceRule = { freq, interval: Math.max(1, Math.floor(interval)) };
  if (freq === 'custom') rule.unit = unit ?? 'day';
  const step = ruleStep(rule);
  if (step && (step.unit === 'month' || step.unit === 'year')) {
    rule.anchorDay = parseLocalDate(firstDue).day;
  }
  return rule;
}

/**
 * The next due date after `due`, or null when the rule doesn't repeat or the
 * series has ended. Pure and deterministic: given the same input it always
 * yields the same date, which is what makes "create exactly one next
 * occurrence" idempotent (the database has a unique key on
 * (obligation_id, due_date)).
 */
export function nextDueDate(rule: RecurrenceRule | null | undefined, due: LocalDate): LocalDate | null {
  if (!isRecurring(rule)) return null;
  const step = ruleStep(rule);
  if (!step) return null;
  let next: LocalDate;
  switch (step.unit) {
    case 'day':
      next = addDays(due, step.step);
      break;
    case 'week':
      next = addDays(due, 7 * step.step);
      break;
    case 'month':
      next = addMonthsAnchored(due, step.step, rule.anchorDay);
      break;
    case 'year':
      next = addMonthsAnchored(due, 12 * step.step, rule.anchorDay);
      break;
  }
  if (rule.until && compareLocalDates(next, rule.until) > 0) return null;
  return next;
}

/** Up to `limit` due dates starting at `first` (inclusive) and not after `end`. */
export function expandOccurrences(
  rule: RecurrenceRule | null | undefined,
  first: LocalDate,
  end: LocalDate,
  limit = 400,
): LocalDate[] {
  const out: LocalDate[] = [];
  let cur: LocalDate | null = first;
  while (cur && compareLocalDates(cur, end) <= 0 && out.length < limit) {
    out.push(cur);
    cur = nextDueDate(rule, cur);
  }
  return out;
}

/** How many times the rule repeats per year — used for cost equivalents. */
export function periodsPerYear(rule: RecurrenceRule | null | undefined): number {
  if (!isRecurring(rule)) return 0;
  const step = ruleStep(rule);
  if (!step) return 0;
  switch (step.unit) {
    case 'day':
      return 365 / step.step;
    case 'week':
      return 52 / step.step;
    case 'month':
      return 12 / step.step;
    case 'year':
      return 1 / step.step;
  }
}

export function describeRule(rule: RecurrenceRule | null | undefined): string {
  if (!isRecurring(rule)) return 'Does not repeat';
  const n = rule.interval;
  const every = (unit: string) => (n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`);
  switch (rule.freq) {
    case 'daily':
      return n === 1 ? 'Daily' : every('day');
    case 'weekly':
      return n === 1 ? 'Weekly' : every('week');
    case 'monthly':
      return n === 1 ? 'Monthly' : every('month');
    case 'quarterly':
      return n === 1 ? 'Quarterly' : every('quarter');
    case 'yearly':
      return n === 1 ? 'Yearly' : every('year');
    case 'custom':
      return every(rule.unit ?? 'day');
    default:
      return 'Repeats';
  }
}
