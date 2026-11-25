import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonthsAnchored,
  annualEquivalent,
  completionRatio,
  companionMessage,
  computeReminderInstants,
  dayOfWeek,
  daysBetween,
  documentStatus,
  expandOccurrences,
  formatMinor,
  isLocalDate,
  makeRule,
  maskReference,
  monthlyEquivalent,
  newlyUnlocked,
  nextDueDate,
  parseAmountToMinor,
  reminderCopy,
  shiftOutOfQuietHours,
  summarizeToday,
  suggestDashboardAreas,
  taskInputSchema,
  documentInputSchema,
  aiAnswerSchema,
  todayInZone,
  uuidv4,
  zonedTimeToUtc,
  addMinor,
  looksLikeSensitiveNumber,
  type UserStats,
} from '../index';

describe('local dates', () => {
  it('validates dates including leap days', () => {
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('2027-02-29')).toBe(false);
    expect(isLocalDate('2027-13-01')).toBe(false);
    expect(isLocalDate('27-01-01')).toBe(false);
  });
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });
  it('knows weekdays', () => {
    expect(dayOfWeek('2026-11-25')).toBe(3); // Wednesday
    expect(dayOfWeek('1970-01-01')).toBe(4);
  });
  it('computes today in Asia/Manila (UTC+8)', () => {
    // 2026-11-25T17:30Z is 01:30 on Nov 26 in Manila
    expect(todayInZone('Asia/Manila', new Date('2026-11-25T17:30:00Z'))).toBe('2026-11-26');
    expect(todayInZone('UTC', new Date('2026-11-25T17:30:00Z'))).toBe('2026-11-25');
  });
  it('converts wall-clock time in a zone to UTC', () => {
    expect(zonedTimeToUtc('2026-11-26', '09:00', 'Asia/Manila').toISOString()).toBe('2026-11-26T01:00:00.000Z');
    // DST: New York on 2026-07-01 is UTC-4, on 2026-12-01 UTC-5
    expect(zonedTimeToUtc('2026-07-01', '09:00', 'America/New_York').toISOString()).toBe('2026-07-01T13:00:00.000Z');
    expect(zonedTimeToUtc('2026-12-01', '09:00', 'America/New_York').toISOString()).toBe('2026-12-01T14:00:00.000Z');
  });
});

describe('recurrence', () => {
  it('monthly rule anchored on the 31st clamps and recovers', () => {
    const rule = makeRule('monthly', '2026-01-31');
    expect(rule.anchorDay).toBe(31);
    expect(expandOccurrences(rule, '2026-01-31', '2026-08-31')).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31', '2026-08-31',
    ]);
  });
  it('monthly rule in a leap year hits Feb 29', () => {
    const rule = makeRule('monthly', '2028-01-30');
    expect(nextDueDate(rule, '2028-01-30')).toBe('2028-02-29');
    expect(nextDueDate(rule, '2028-02-29')).toBe('2028-03-30');
  });
  it('yearly rule anchored on Feb 29', () => {
    const rule = makeRule('yearly', '2028-02-29');
    expect(expandOccurrences(rule, '2028-02-29', '2032-12-31')).toEqual([
      '2028-02-29', '2029-02-28', '2030-02-28', '2031-02-28', '2032-02-29',
    ]);
  });
  it('quarterly and custom rules', () => {
    expect(nextDueDate(makeRule('quarterly', '2026-11-30'), '2026-11-30')).toBe('2027-02-28');
    expect(nextDueDate(makeRule('custom', '2026-11-25', 10, 'day'), '2026-11-25')).toBe('2026-12-05');
    expect(nextDueDate(makeRule('custom', '2026-11-25', 2, 'week'), '2026-11-25')).toBe('2026-12-09');
    expect(nextDueDate(makeRule('weekly', '2026-11-25'), '2026-11-25')).toBe('2026-12-02');
    expect(nextDueDate(makeRule('daily', '2026-12-31'), '2026-12-31')).toBe('2027-01-01');
  });
  it('non-recurring and ended series return null', () => {
    expect(nextDueDate(makeRule('none', '2026-11-25'), '2026-11-25')).toBeNull();
    const r = { ...makeRule('monthly', '2026-11-25'), until: '2026-12-31' };
    expect(nextDueDate(r, '2026-11-25')).toBe('2026-12-25');
    expect(nextDueDate(r, '2026-12-25')).toBeNull();
  });
  it('is deterministic (basis for idempotent next-occurrence creation)', () => {
    const rule = makeRule('monthly', '2026-01-31');
    const a = nextDueDate(rule, '2026-02-28');
    const b = nextDueDate(rule, '2026-02-28');
    expect(a).toBe(b);
    expect(a).toBe('2026-03-31');
  });
  it('addMonthsAnchored handles negative months', () => {
    expect(addMonthsAnchored('2026-03-31', -1)).toBe('2026-02-28');
  });
});

describe('money', () => {
  it('parses user input to integer centavos without float error', () => {
    expect(parseAmountToMinor('0.1')).toBe(10);
    expect(parseAmountToMinor('0.29')).toBe(29);
    expect(parseAmountToMinor('1,234.5')).toBe(123450);
    expect(parseAmountToMinor('₱ 99')).toBe(9900);
    expect(parseAmountToMinor('1.005')).toBeNull();
    expect(parseAmountToMinor('-5')).toBeNull();
    expect(parseAmountToMinor('abc')).toBeNull();
  });
  it('sums exactly', () => {
    expect(addMinor(10, 20)).toBe(30); // 0.10 + 0.20 === 0.30 exactly
    expect(() => addMinor(0.1)).toThrow();
  });
  it('formats PHP', () => {
    expect(formatMinor(123450)).toBe('₱1,234.50');
    expect(formatMinor(9900, 'PHP', { compact: true })).toBe('₱99');
    expect(formatMinor(5)).toBe('₱0.05');
  });
  it('computes monthly and annual equivalents', () => {
    expect(monthlyEquivalent(79900, makeRule('yearly', '2026-01-01'))).toBe(6658); // 799/12 = 66.583 → 66.58
    expect(annualEquivalent(9900, makeRule('monthly', '2026-01-01'))).toBe(118800);
    expect(monthlyEquivalent(10000, makeRule('weekly', '2026-01-01'))).toBe(43333);
    expect(monthlyEquivalent(30000, makeRule('quarterly', '2026-01-01'))).toBe(10000);
    expect(monthlyEquivalent(30000, makeRule('none', '2026-01-01'))).toBe(0);
  });
});

describe('documents', () => {
  const today = '2026-11-25';
  it('derives statuses', () => {
    expect(documentStatus({ stage: 'obtained', expiryDate: '2026-11-24' }, today)).toBe('expired');
    expect(documentStatus({ stage: 'obtained', expiryDate: '2026-12-25' }, today)).toBe('expiring_soon');
    expect(documentStatus({ stage: 'obtained', expiryDate: '2027-06-01' }, today)).toBe('active');
    expect(documentStatus({ stage: 'obtained', expiryDate: null }, today)).toBe('no_expiration');
    expect(documentStatus({ stage: 'in_progress', expiryDate: null }, today)).toBe('in_progress');
    expect(documentStatus({ stage: 'not_obtained', expiryDate: null }, today)).toBe('not_obtained');
    expect(documentStatus({ stage: 'obtained', expiryDate: '2026-12-01', archivedAt: 'x' }, today)).toBe('archived');
  });
  it('expiring-soon window follows the earliest reminder', () => {
    expect(documentStatus({ stage: 'obtained', expiryDate: '2027-02-01', reminderOffsets: [30, 7] }, today)).toBe('active');
    expect(documentStatus({ stage: 'obtained', expiryDate: '2026-12-20', reminderOffsets: [30, 7] }, today)).toBe('expiring_soon');
  });
  it('masks references', () => {
    expect(maskReference('1234-5678-9012')).toBe('•••• 9012');
  });
  it('rejects full ID numbers in document notes and accepts last-4', () => {
    const base = { templateKey: 'passport', name: 'Passport', stage: 'obtained' as const, expiryDate: '2030-01-01' };
    expect(documentInputSchema.safeParse({ ...base, referenceLast4: '9012' }).success).toBe(true);
    expect(documentInputSchema.safeParse({ ...base, referenceLast4: 'P1234567A' }).success).toBe(false);
    expect(documentInputSchema.safeParse({ ...base, notes: 'number 1234 5678 9012 34' }).success).toBe(false);
    expect(documentInputSchema.safeParse({ ...base, issueDate: '2031-01-01' }).success).toBe(false);
  });
});

describe('reminders', () => {
  const now = new Date('2026-11-25T00:00:00Z');
  it('computes reminder instants in Manila time and drops past ones', () => {
    const r = computeReminderInstants({ dueDate: '2026-12-25', offsetsDays: [90, 30, 7, 0], timeZone: 'Asia/Manila', now });
    expect(r.map((x) => x.localDate)).toEqual(['2026-11-25', '2026-12-18', '2026-12-25']);
    expect(r[0]!.fireAt.toISOString()).toBe('2026-11-25T01:00:00.000Z');
  });
  it('fires an hour before a timed due date', () => {
    const r = computeReminderInstants({ dueDate: '2026-12-01', dueTime: '14:30', offsetsDays: [0], timeZone: 'Asia/Manila', now });
    expect(r[0]!.localTime).toBe('13:30');
  });
  it('respects quiet hours', () => {
    const quiet = { enabled: true, start: '22:00', end: '07:00' };
    expect(shiftOutOfQuietHours('2026-12-01', '23:00', quiet)).toEqual({ date: '2026-12-02', time: '07:00' });
    expect(shiftOutOfQuietHours('2026-12-01', '06:00', quiet)).toEqual({ date: '2026-12-01', time: '07:00' });
    expect(shiftOutOfQuietHours('2026-12-01', '09:00', quiet)).toEqual({ date: '2026-12-01', time: '09:00' });
    const r = computeReminderInstants({ dueDate: '2026-12-10', offsetsDays: [1], reminderTime: '23:30', timeZone: 'Asia/Manila', quietHours: quiet, now });
    expect(r[0]!.localDate).toBe('2026-12-10');
    expect(r[0]!.localTime).toBe('07:00');
  });
  it('deduplicates offsets that collapse to the same instant', () => {
    const quiet = { enabled: true, start: '00:00', end: '23:59' };
    const r = computeReminderInstants({ dueDate: '2026-12-10', offsetsDays: [0, 0, 1], timeZone: 'Asia/Manila', quietHours: quiet, now });
    expect(new Set(r.map((x) => x.fireAt.getTime())).size).toBe(r.length);
  });
  it('keeps lock-screen copy generic by default', () => {
    const c = reminderCopy({ kind: 'bill', title: 'Meralco', offsetDays: 3, showDetails: false, amountLabel: '₱2,100.00' });
    expect(c.body).not.toContain('Meralco');
    expect(c.body).not.toContain('₱');
    expect(c.title).toBe('AdultingOS');
    const d = reminderCopy({ kind: 'bill', title: 'Meralco', offsetDays: 3, showDetails: true, amountLabel: '₱2,100.00' });
    expect(d.body).toContain('₱2,100.00');
  });
});

describe('progress and companion', () => {
  const today = '2026-11-25';
  const items = [
    { dueDate: '2026-11-20', status: 'open' as const },
    { dueDate: '2026-11-25', status: 'open' as const },
    { dueDate: '2026-11-25', status: 'done' as const, completedOn: '2026-11-25' },
    { dueDate: '2026-11-28', status: 'open' as const },
    { dueDate: '2026-12-20', status: 'open' as const },
  ];
  it('summarizes the day', () => {
    expect(summarizeToday(items, today)).toEqual({ overdue: 1, dueToday: 1, upcomingWeek: 1, completedToday: 1 });
  });
  it('returns null progress when nothing was due (no fabricated numbers)', () => {
    expect(completionRatio(items, '2027-01-01', '2027-01-31')).toBeNull();
    expect(completionRatio(items, '2026-11-01', '2026-11-30')).toEqual({ done: 1, total: 4, ratio: 0.25 });
  });
  it('companion message reflects data', () => {
    expect(companionMessage(summarizeToday([], today), false).mood).toBe('empty');
    expect(companionMessage(summarizeToday(items, today), true).mood).toBe('overdue');
    expect(companionMessage({ overdue: 0, dueToday: 0, upcomingWeek: 3, completedToday: 0 }, true).text).toBe(
      'You have 3 things coming up this week.',
    );
    expect(companionMessage({ overdue: 0, dueToday: 0, upcomingWeek: 0, completedToday: 0 }, true).mood).toBe('all_clear');
  });
});

describe('achievements', () => {
  const zero: UserStats = {
    tasksCompleted: 0, documentsTracked: 0, fullyPaidBillMonths: 0, distinctCategoriesUsed: 0,
    savingsGoals: 0, guideChecklistsAdded: 0, aiSuggestionsConfirmed: 0,
  };
  it('unlocks only released, newly earned achievements', () => {
    expect(newlyUnlocked(zero, new Set())).toEqual([]);
    const got = newlyUnlocked({ ...zero, tasksCompleted: 1, savingsGoals: 3 }, new Set());
    expect(got.map((a) => a.key)).toEqual(['first_step']); // future_ready is unreleased
    expect(newlyUnlocked({ ...zero, tasksCompleted: 1 }, new Set(['first_step']))).toEqual([]);
  });
});

describe('validation', () => {
  it('validates task input and rejects sensitive numbers in titles', () => {
    const ok = taskInputSchema.safeParse({
      title: 'Renew NBI clearance', category: 'government', dueDate: '2026-12-01', recurrence: { freq: 'none', interval: 1 },
    });
    expect(ok.success).toBe(true);
    const bad = taskInputSchema.safeParse({
      title: 'SSS 3412345678', category: 'government', dueDate: '2026-12-01', recurrence: { freq: 'none', interval: 1 },
    });
    expect(bad.success).toBe(false);
    expect(looksLikeSensitiveNumber('call 0917 123 4567')).toBe(true);
    expect(looksLikeSensitiveNumber('Room 1203')).toBe(false);
  });
  it('validates AI answer contract', () => {
    const answer = {
      conversationId: uuidv4(), messageId: uuidv4(), answer: 'x', grounding: 'unverified', citations: [], proposal: null, disclaimer: 'd',
    };
    expect(aiAnswerSchema.safeParse(answer).success).toBe(true);
    expect(aiAnswerSchema.safeParse({ ...answer, grounding: 'made_up' }).success).toBe(false);
  });
  it('generates v4 uuids', () => {
    expect(uuidv4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('personalization', () => {
  it('suggests dashboard areas from answers', () => {
    const areas = suggestDashboardAreas({ employment: 'freelancer', living: 'renting' });
    expect(areas).toContain('finances');
    expect(areas).toContain('household');
    expect(areas).toContain('documents');
  });
});

import { stableUuid, occurrenceId } from '../index';
describe('stable ids', () => {
  it('are deterministic, distinct and UUID-shaped', () => {
    const a = occurrenceId('11111111-1111-4111-8111-111111111111', '2026-12-31');
    expect(a).toBe(occurrenceId('11111111-1111-4111-8111-111111111111', '2026-12-31'));
    expect(a).not.toBe(occurrenceId('11111111-1111-4111-8111-111111111111', '2027-01-31'));
    expect(stableUuid('x')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const many = new Set(Array.from({ length: 5000 }, (_, i) => stableUuid('occ', 'o', String(i))));
    expect(many.size).toBe(5000);
  });
});

import { relativeDayPhrase } from '../index';
describe('relative phrases', () => {
  it('reads naturally mid-sentence', () => {
    expect(relativeDayPhrase('2026-11-26', '2026-11-25')).toBe('tomorrow');
    expect(relativeDayPhrase('2026-11-28', '2026-11-25')).toBe('in 3 days');
    expect(relativeDayPhrase('2026-12-06', '2026-11-25')).toBe('on Dec 6, 2026');
  });
});
