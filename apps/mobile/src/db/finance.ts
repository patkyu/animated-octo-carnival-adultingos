import {
  addDays, annualEquivalent, compareLocalDates, monthKey, monthlyEquivalent, paymentId, todayInZone, uuidv4,
  type BillInput, type LocalDate, type MinorUnits, type RecurrenceRule, type SubscriptionInput,
} from '@adultingos/shared';
import { all, first, tx } from './database';
import { patchRow, upsertRow } from './mutate';
import { completeOccurrence, currentOccurrence, insertObligation, mapObligation, type Obligation, type Occurrence, mapOccurrence } from './obligations';
import { getProfile } from './settings';
import { dataChanged } from '@/lib/events';

type R = Record<string, unknown>;

/* ============================== Bills ============================== */

export interface Bill {
  id: string;
  obligation: Obligation;
  provider: string;
  category: string;
  amountMinor: MinorUnits | null;
  variableAmount: boolean;
  currency: 'PHP' | 'USD';
  current: Occurrence | null;
}

export interface Payment {
  id: string;
  billId: string;
  occurrenceId: string;
  paidOn: LocalDate;
  amountMinor: MinorUnits;
  currency: string;
  note: string;
  dueDate: LocalDate | null;
}

export async function createBill(input: BillInput): Promise<string> {
  let obligationId = '';
  await tx(async (db) => {
    const res = await insertObligation(
      db,
      {
        title: input.name, description: '', category: 'bills', priority: 'medium', dueDate: input.dueDate, dueTime: null,
        recurrence: input.recurrence, reminderOffsets: input.reminderOffsets, tags: [], notes: input.notes ?? '', checklist: [],
      },
      { kind: 'bill' },
    );
    obligationId = res.obligationId;
    await upsertRow(db, 'bills', {
      id: uuidv4(), obligation_id: obligationId, provider: input.provider ?? '', bill_category: input.category,
      amount_minor: input.amountMinor, variable_amount: input.variableAmount, currency: input.currency, deleted_at: null,
    });
  });
  dataChanged('bills');
  return obligationId;
}

export async function updateBill(obligationId: string, input: BillInput): Promise<void> {
  const bill = await getBillByObligation(obligationId);
  if (!bill) throw new Error('This bill no longer exists.');
  await tx(async (db) => {
    await patchRow(db, 'obligations', obligationId, { title: input.name, reminder_offsets: input.reminderOffsets, notes: input.notes ?? '', recurrence: input.recurrence });
    await patchRow(db, 'bills', bill.id, { provider: input.provider ?? '', bill_category: input.category, amount_minor: input.amountMinor, variable_amount: input.variableAmount, currency: input.currency });
    if (bill.current && bill.current.status === 'open' && bill.current.dueDate !== input.dueDate) {
      await patchRow(db, 'obligation_occurrences', bill.current.id, { due_date: input.dueDate });
    }
  });
  dataChanged('bills');
}

function mapBill(r: R, ob: Obligation, current: Occurrence | null): Bill {
  return {
    id: String(r.id), obligation: ob, provider: String(r.provider ?? ''), category: String(r.bill_category), amountMinor: (r.amount_minor as number) ?? null,
    variableAmount: !!r.variable_amount, currency: (r.currency as 'PHP' | 'USD') ?? 'PHP', current,
  };
}

export async function getBillByObligation(obligationId: string): Promise<Bill | null> {
  const r = await first<R>('SELECT * FROM bills WHERE obligation_id = ? AND deleted_at IS NULL', obligationId);
  const ob = await first<R>('SELECT * FROM obligations WHERE id = ? AND deleted_at IS NULL', obligationId);
  if (!r || !ob) return null;
  return mapBill(r, mapObligation(ob), await currentOccurrence(obligationId));
}

export async function listBills(includeArchived = false): Promise<Bill[]> {
  const rows = await all<R>(
    `SELECT b.*, ob.id AS ob_id FROM bills b JOIN obligations ob ON ob.id = b.obligation_id
     WHERE b.deleted_at IS NULL AND ob.deleted_at IS NULL ${includeArchived ? '' : 'AND ob.archived_at IS NULL'}`,
  );
  const out: Bill[] = [];
  for (const r of rows) {
    const ob = await first<R>('SELECT * FROM obligations WHERE id = ?', String(r.ob_id));
    if (ob) out.push(mapBill(r, mapObligation(ob), await currentOccurrence(String(r.ob_id))));
  }
  return out.sort((a, b) => compareLocalDates(a.current?.dueDate ?? '9999-12-31', b.current?.dueDate ?? '9999-12-31'));
}

/**
 * Records a payment for an occurrence and advances the schedule — exactly once.
 * The payment id is derived from the occurrence id, so a double tap, a retry
 * or a second device can never create two payments for the same due date.
 */
export async function markBillPaid(occurrenceId: string, paidOn: LocalDate, amountMinor: MinorUnits, note = ''): Promise<{ nextOccurrenceId: string | null }> {
  const bill = await first<R>(
    'SELECT b.id, b.currency FROM bills b JOIN obligation_occurrences oc ON oc.obligation_id = b.obligation_id WHERE oc.id = ? AND b.deleted_at IS NULL',
    occurrenceId,
  );
  if (!bill) throw new Error('This bill no longer exists.');
  await tx(async (db) => {
    await upsertRow(db, 'bill_payments', {
      id: paymentId(occurrenceId), bill_id: String(bill.id), occurrence_id: occurrenceId, paid_on: paidOn, amount_minor: amountMinor,
      currency: String(bill.currency ?? 'PHP'), note: note.slice(0, 200), deleted_at: null,
    });
    await patchRow(db, 'obligation_occurrences', occurrenceId, { amount_minor: amountMinor });
  });
  return completeOccurrence(occurrenceId, paidOn);
}

export async function listPayments(opts: { billId?: string; from?: LocalDate; to?: LocalDate } = {}): Promise<Payment[]> {
  const where = ['p.deleted_at IS NULL'];
  const params: string[] = [];
  if (opts.billId) {
    where.push('p.bill_id = ?');
    params.push(opts.billId);
  }
  if (opts.from) {
    where.push('p.paid_on >= ?');
    params.push(opts.from);
  }
  if (opts.to) {
    where.push('p.paid_on <= ?');
    params.push(opts.to);
  }
  const rows = await all<R>(
    `SELECT p.*, oc.due_date FROM bill_payments p LEFT JOIN obligation_occurrences oc ON oc.id = p.occurrence_id WHERE ${where.join(' AND ')} ORDER BY p.paid_on DESC`,
    ...params,
  );
  return rows.map((r) => ({
    id: String(r.id), billId: String(r.bill_id), occurrenceId: String(r.occurrence_id), paidOn: String(r.paid_on),
    amountMinor: Number(r.amount_minor), currency: String(r.currency), note: String(r.note ?? ''), dueDate: (r.due_date as string) ?? null,
  }));
}

export interface FinanceOverview {
  currency: 'PHP';
  unpaidCount: number;
  unpaidTotalMinor: MinorUnits;
  unknownAmountCount: number;
  paidThisMonthMinor: MinorUnits;
  monthlyRecurringMinor: MinorUnits;
  byCategory: { category: string; totalMinor: MinorUnits }[];
  history: { month: string; totalMinor: MinorUnits }[];
}

/** Totals in PHP only (amounts in other currencies are listed but not summed). */
export async function financeOverview(): Promise<FinanceOverview> {
  const { timezone } = await getProfile();
  const today = todayInZone(timezone);
  const bills = await listBills();
  let unpaidTotal = 0;
  let unpaidCount = 0;
  let unknown = 0;
  let monthly = 0;
  for (const b of bills) {
    if (b.currency !== 'PHP') continue;
    if (b.amountMinor !== null) monthly += monthlyEquivalent(b.amountMinor, b.obligation.recurrence);
    const open = await all<R>(
      "SELECT amount_minor FROM obligation_occurrences WHERE obligation_id = ? AND status = 'open' AND deleted_at IS NULL AND due_date <= ?",
      b.obligation.id, addDays(today, 31),
    );
    for (const o of open) {
      unpaidCount++;
      const amt = (o.amount_minor as number | null) ?? b.amountMinor;
      if (amt === null) unknown++;
      else unpaidTotal += amt;
    }
  }
  const monthStart = `${monthKey(today)}-01`;
  const payments = await listPayments({ from: addDays(monthStart, -365) });
  const php = payments.filter((p) => p.currency === 'PHP');
  const paidThisMonth = php.filter((p) => p.paidOn >= monthStart).reduce((s, p) => s + p.amountMinor, 0);
  const hist = new Map<string, number>();
  for (const p of php) hist.set(monthKey(p.paidOn), (hist.get(monthKey(p.paidOn)) ?? 0) + p.amountMinor);
  const catRows = await all<R>(
    `SELECT b.bill_category AS category, SUM(p.amount_minor) AS total FROM bill_payments p JOIN bills b ON b.id = p.bill_id
     WHERE p.deleted_at IS NULL AND p.currency = 'PHP' AND p.paid_on >= ? GROUP BY b.bill_category ORDER BY total DESC`,
    addDays(monthStart, -90),
  );
  return {
    currency: 'PHP', unpaidCount, unpaidTotalMinor: unpaidTotal, unknownAmountCount: unknown, paidThisMonthMinor: paidThisMonth, monthlyRecurringMinor: monthly,
    byCategory: catRows.map((r) => ({ category: String(r.category), totalMinor: Number(r.total) })),
    history: [...hist.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12).map(([month, totalMinor]) => ({ month, totalMinor })),
  };
}

/* ============================== Subscriptions ============================== */

export interface Subscription {
  id: string;
  obligation: Obligation;
  category: string;
  amountMinor: MinorUnits;
  currency: 'PHP' | 'USD';
  trialEndsOn: LocalDate | null;
  status: 'active' | 'canceled';
  canceledOn: LocalDate | null;
  nextRenewal: LocalDate | null;
  monthlyMinor: MinorUnits;
  annualMinor: MinorUnits;
}

export async function createSubscription(input: SubscriptionInput): Promise<string> {
  let obligationId = '';
  await tx(async (db) => {
    const res = await insertObligation(
      db,
      {
        title: input.name, description: '', category: 'finance', priority: 'low', dueDate: input.nextRenewal, dueTime: null, recurrence: input.recurrence,
        reminderOffsets: input.reminderOffsets, tags: [], notes: input.notes ?? '', checklist: [],
      },
      { kind: 'subscription' },
    );
    obligationId = res.obligationId;
    await upsertRow(db, 'subscriptions', {
      id: uuidv4(), obligation_id: obligationId, sub_category: input.category, amount_minor: input.amountMinor, currency: input.currency,
      trial_ends_on: input.trialEndsOn ?? null, status: 'active', canceled_on: null, deleted_at: null,
    });
  });
  dataChanged('subscriptions');
  return obligationId;
}

function mapSub(r: R, ob: Obligation, current: Occurrence | null): Subscription {
  const amount = Number(r.amount_minor);
  const rule = ob.recurrence as RecurrenceRule;
  return {
    id: String(r.id), obligation: ob, category: String(r.sub_category), amountMinor: amount, currency: (r.currency as 'PHP' | 'USD') ?? 'PHP',
    trialEndsOn: (r.trial_ends_on as string) ?? null, status: (r.status as 'active' | 'canceled') ?? 'active', canceledOn: (r.canceled_on as string) ?? null,
    nextRenewal: current?.status === 'open' ? current.dueDate : null, monthlyMinor: monthlyEquivalent(amount, rule), annualMinor: annualEquivalent(amount, rule),
  };
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const rows = await all<R>('SELECT s.* FROM subscriptions s JOIN obligations ob ON ob.id = s.obligation_id WHERE s.deleted_at IS NULL AND ob.deleted_at IS NULL');
  const out: Subscription[] = [];
  for (const r of rows) {
    const ob = await first<R>('SELECT * FROM obligations WHERE id = ?', String(r.obligation_id));
    if (ob) out.push(mapSub(r, mapObligation(ob), await currentOccurrence(String(r.obligation_id))));
  }
  return out.sort((a, b) => (a.status === b.status ? compareLocalDates(a.nextRenewal ?? '9999', b.nextRenewal ?? '9999') : a.status === 'active' ? -1 : 1));
}

export async function getSubscriptionByObligation(obligationId: string): Promise<Subscription | null> {
  const r = await first<R>('SELECT * FROM subscriptions WHERE obligation_id = ? AND deleted_at IS NULL', obligationId);
  const ob = await first<R>('SELECT * FROM obligations WHERE id = ? AND deleted_at IS NULL', obligationId);
  if (!r || !ob) return null;
  return mapSub(r, mapObligation(ob), await currentOccurrence(obligationId));
}

/**
 * Records that the user cancelled the service themselves. AdultingOS cannot
 * cancel external subscriptions; this only stops tracking and reminders.
 */
export async function recordSubscriptionCanceled(obligationId: string, canceledOn: LocalDate): Promise<void> {
  const sub = await getSubscriptionByObligation(obligationId);
  if (!sub) return;
  await tx(async (db) => {
    await patchRow(db, 'subscriptions', sub.id, { status: 'canceled', canceled_on: canceledOn });
    await patchRow(db, 'obligations', obligationId, { archived_at: new Date().toISOString() });
  });
  dataChanged('subscriptions');
}

export async function reactivateSubscription(obligationId: string): Promise<void> {
  const sub = await getSubscriptionByObligation(obligationId);
  if (!sub) return;
  await tx(async (db) => {
    await patchRow(db, 'subscriptions', sub.id, { status: 'active', canceled_on: null });
    await patchRow(db, 'obligations', obligationId, { archived_at: null });
  });
  dataChanged('subscriptions');
}

export async function subscriptionHistory(obligationId: string): Promise<Occurrence[]> {
  return (await all<R>("SELECT * FROM obligation_occurrences WHERE obligation_id = ? AND deleted_at IS NULL AND status = 'done' ORDER BY scheduled_date DESC", obligationId)).map(mapOccurrence);
}
