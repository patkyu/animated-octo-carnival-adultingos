import {
  makeRule, nextDueDate, occurrenceId, todayInZone, uuidv4, type LocalDate, type Priority, type RecurrenceRule, type TaskInput,
} from '@adultingos/shared';
import { all, first, tx, type DB } from './database';
import { patchRow, softDelete, upsertRow, nowIso } from './mutate';
import { getProfile } from './settings';
import { dataChanged } from '@/lib/events';

export type ObligationKind = 'task' | 'bill' | 'subscription';
export type SyncState = 'local' | 'pending' | 'synced';

export interface Obligation {
  id: string;
  kind: ObligationKind;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  dueTime: string | null;
  recurrence: RecurrenceRule;
  reminderOffsets: number[];
  tags: string[];
  notes: string;
  source: 'user' | 'guide' | 'ai' | 'template';
  sourceRef: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
}

export interface Occurrence {
  id: string;
  obligationId: string;
  scheduledDate: LocalDate;
  dueDate: LocalDate;
  status: 'open' | 'done' | 'skipped';
  completedOn: LocalDate | null;
  amountMinor: number | null;
  snoozedUntil: string | null;
  syncState: SyncState;
}

/** An occurrence joined with its obligation — what lists and the calendar show. */
export interface Item extends Occurrence {
  kind: ObligationKind;
  title: string;
  category: string;
  priority: Priority;
  dueTime: string | null;
  recurrence: RecurrenceRule;
  reminderOffsets: number[];
  tags: string[];
  archived: boolean;
  billAmountMinor: number | null;
  currency: string | null;
}

export interface ChecklistItem {
  id: string;
  obligationId: string;
  title: string;
  done: boolean;
  position: number;
}

/* ---------------- row mapping ---------------- */
type R = Record<string, unknown>;
const j = <T>(v: unknown, d: T): T => {
  if (typeof v !== 'string') return d;
  try {
    return JSON.parse(v) as T;
  } catch {
    return d;
  }
};
export function mapObligation(r: R): Obligation {
  return {
    id: String(r.id), kind: r.kind as ObligationKind, title: String(r.title), description: String(r.description ?? ''),
    category: String(r.category), priority: (r.priority as Priority) ?? 'medium', dueTime: (r.due_time as string) ?? null,
    recurrence: j(r.recurrence, { freq: 'none', interval: 1 }), reminderOffsets: j(r.reminder_offsets, [0]), tags: j(r.tags, []),
    notes: String(r.notes ?? ''), source: (r.source as Obligation['source']) ?? 'user', sourceRef: (r.source_ref as string) ?? null,
    archivedAt: (r.archived_at as string) ?? null, createdAt: String(r.created_at), updatedAt: String(r.client_updated_at), syncState: r.sync_state as SyncState,
  };
}
export function mapOccurrence(r: R): Occurrence {
  return {
    id: String(r.id), obligationId: String(r.obligation_id), scheduledDate: String(r.scheduled_date), dueDate: String(r.due_date),
    status: r.status as Occurrence['status'], completedOn: (r.completed_on as string) ?? null, amountMinor: (r.amount_minor as number) ?? null,
    snoozedUntil: (r.snoozed_until as string) ?? null, syncState: (r.occ_sync_state ?? r.sync_state) as SyncState,
  };
}
function mapItem(r: R): Item {
  return {
    ...mapOccurrence(r),
    kind: r.kind as ObligationKind, title: String(r.title), category: String(r.category), priority: (r.priority as Priority) ?? 'medium',
    dueTime: (r.due_time as string) ?? null, recurrence: j(r.recurrence, { freq: 'none', interval: 1 }), reminderOffsets: j(r.reminder_offsets, [0]),
    tags: j(r.tags, []), archived: !!r.archived_at, billAmountMinor: (r.bill_amount as number) ?? (r.sub_amount as number) ?? null,
    currency: (r.bill_currency as string) ?? (r.sub_currency as string) ?? null,
  };
}

const ITEM_SELECT = `
  SELECT oc.*, oc.sync_state AS occ_sync_state, ob.kind, ob.title, ob.category, ob.priority, ob.due_time, ob.recurrence,
         ob.reminder_offsets, ob.tags, ob.archived_at,
         b.amount_minor AS bill_amount, b.currency AS bill_currency, s.amount_minor AS sub_amount, s.currency AS sub_currency
  FROM obligation_occurrences oc
  JOIN obligations ob ON ob.id = oc.obligation_id
  LEFT JOIN bills b ON b.obligation_id = ob.id AND b.deleted_at IS NULL
  LEFT JOIN subscriptions s ON s.obligation_id = ob.id AND s.deleted_at IS NULL
  WHERE oc.deleted_at IS NULL AND ob.deleted_at IS NULL`;

export interface ItemFilter {
  status?: 'open' | 'done' | 'all';
  from?: LocalDate;
  to?: LocalDate;
  kinds?: ObligationKind[];
  categories?: string[];
  search?: string;
  archived?: boolean;
  sort?: 'due' | 'priority' | 'title' | 'recent';
  limit?: number;
}

export async function listItems(f: ItemFilter = {}): Promise<Item[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  where.push(f.archived ? 'ob.archived_at IS NOT NULL' : 'ob.archived_at IS NULL');
  if (f.status && f.status !== 'all') {
    where.push('oc.status = ?');
    params.push(f.status);
  }
  if (f.from) {
    where.push('oc.due_date >= ?');
    params.push(f.from);
  }
  if (f.to) {
    where.push('oc.due_date <= ?');
    params.push(f.to);
  }
  if (f.kinds?.length) {
    where.push(`ob.kind IN (${f.kinds.map(() => '?').join(',')})`);
    params.push(...f.kinds);
  }
  if (f.categories?.length) {
    where.push(`ob.category IN (${f.categories.map(() => '?').join(',')})`);
    params.push(...f.categories);
  }
  if (f.search?.trim()) {
    where.push("(ob.title LIKE ? ESCAPE '\\' OR ob.notes LIKE ? ESCAPE '\\' OR ob.tags LIKE ? ESCAPE '\\')");
    const q = `%${f.search.trim().replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    params.push(q, q, q);
  }
  const order =
    f.sort === 'priority'
      ? "CASE ob.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, oc.due_date"
      : f.sort === 'title'
        ? 'ob.title COLLATE NOCASE'
        : f.sort === 'recent'
          ? 'oc.completed_on DESC, oc.client_updated_at DESC'
          : "oc.due_date, COALESCE(ob.due_time, '99:99')";
  const sql = `${ITEM_SELECT} ${where.length ? 'AND ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT ${f.limit ?? 500}`;
  return (await all<R>(sql, ...params)).map(mapItem);
}

export async function getObligation(id: string): Promise<Obligation | null> {
  const r = await first<R>('SELECT * FROM obligations WHERE id = ? AND deleted_at IS NULL', id);
  return r ? mapObligation(r) : null;
}

export async function getOccurrence(id: string): Promise<Item | null> {
  const r = await first<R>(`${ITEM_SELECT} AND oc.id = ?`, id);
  return r ? mapItem(r) : null;
}

export async function occurrencesFor(obligationId: string): Promise<Occurrence[]> {
  return (await all<R>('SELECT * FROM obligation_occurrences WHERE obligation_id = ? AND deleted_at IS NULL ORDER BY scheduled_date DESC', obligationId)).map(mapOccurrence);
}

/** The occurrence a detail screen should focus on: earliest open one, else the latest. */
export async function currentOccurrence(obligationId: string): Promise<Occurrence | null> {
  const open = await first<R>("SELECT * FROM obligation_occurrences WHERE obligation_id = ? AND deleted_at IS NULL AND status = 'open' ORDER BY due_date LIMIT 1", obligationId);
  if (open) return mapOccurrence(open);
  const last = await first<R>('SELECT * FROM obligation_occurrences WHERE obligation_id = ? AND deleted_at IS NULL ORDER BY scheduled_date DESC LIMIT 1', obligationId);
  return last ? mapOccurrence(last) : null;
}

export async function checklistFor(obligationId: string): Promise<ChecklistItem[]> {
  return (await all<R>('SELECT * FROM task_checklist_items WHERE obligation_id = ? AND deleted_at IS NULL ORDER BY position', obligationId)).map((r) => ({
    id: String(r.id), obligationId: String(r.obligation_id), title: String(r.title), done: !!r.done, position: Number(r.position),
  }));
}

/* ---------------- writes ---------------- */

export interface CreateObligationOptions {
  id?: string;
  kind?: ObligationKind;
  source?: Obligation['source'];
  sourceRef?: string | null;
}

/** Inside a transaction: obligation + first occurrence + checklist. Returns ids. */
export async function insertObligation(db: DB, input: TaskInput, opts: CreateObligationOptions = {}): Promise<{ obligationId: string; occurrenceId: string }> {
  const id = opts.id ?? uuidv4();
  const rule = input.recurrence.freq === 'none' ? input.recurrence : { ...makeRule(input.recurrence.freq, input.dueDate, input.recurrence.interval, input.recurrence.unit), until: input.recurrence.until };
  await upsertRow(db, 'obligations', {
    id, kind: opts.kind ?? 'task', title: input.title, description: input.description ?? '', category: input.category, priority: input.priority,
    due_time: input.dueTime ?? null, recurrence: rule, reminder_offsets: input.reminderOffsets, tags: input.tags, notes: input.notes ?? '',
    source: opts.source ?? 'user', source_ref: opts.sourceRef ?? null, archived_at: null, deleted_at: null,
  });
  const occId = occurrenceId(id, input.dueDate);
  await upsertRow(db, 'obligation_occurrences', {
    id: occId, obligation_id: id, scheduled_date: input.dueDate, due_date: input.dueDate, status: 'open', completed_on: null, amount_minor: null, snoozed_until: null, deleted_at: null,
  });
  let pos = 0;
  for (const c of input.checklist ?? []) {
    await upsertRow(db, 'task_checklist_items', { id: uuidv4(), obligation_id: id, title: c.title, done: c.done, position: pos++, deleted_at: null });
  }
  return { obligationId: id, occurrenceId: occId };
}

export async function createTask(input: TaskInput, opts: CreateObligationOptions = {}): Promise<{ obligationId: string; occurrenceId: string }> {
  let res = { obligationId: '', occurrenceId: '' };
  await tx(async (db) => {
    res = await insertObligation(db, input, opts);
  });
  dataChanged('tasks');
  return res;
}

/** Edits the definition. If the due date changed, the current open occurrence is rescheduled. */
export async function updateTask(obligationId: string, input: TaskInput): Promise<void> {
  const current = await currentOccurrence(obligationId);
  const existing = await getObligation(obligationId);
  if (!existing) throw new Error('This item no longer exists.');
  await tx(async (db) => {
    const anchorDate = current?.scheduledDate ?? input.dueDate;
    const rule = input.recurrence.freq === 'none' ? input.recurrence : { ...makeRule(input.recurrence.freq, anchorDate, input.recurrence.interval, input.recurrence.unit), until: input.recurrence.until };
    await patchRow(db, 'obligations', obligationId, {
      title: input.title, description: input.description ?? '', category: input.category, priority: input.priority, due_time: input.dueTime ?? null,
      recurrence: rule, reminder_offsets: input.reminderOffsets, tags: input.tags, notes: input.notes ?? '',
    });
    if (current && current.status === 'open' && current.dueDate !== input.dueDate) {
      await patchRow(db, 'obligation_occurrences', current.id, { due_date: input.dueDate, snoozed_until: null });
    }
  });
  dataChanged('tasks');
}

/**
 * Completes an occurrence and creates exactly one next occurrence.
 * Idempotent: completing twice is a no-op, and the next occurrence's id is
 * derived from (obligation, scheduled date), so retries — or another device
 * doing the same offline — converge on one row.
 */
export async function completeOccurrence(occId: string, completedOn?: LocalDate): Promise<{ nextOccurrenceId: string | null }> {
  const { timezone } = await getProfile();
  const day = completedOn ?? todayInZone(timezone);
  let nextId: string | null = null;
  await tx(async (db) => {
    const occ = await db.getFirstAsync<R>('SELECT * FROM obligation_occurrences WHERE id = ? AND deleted_at IS NULL', [occId]);
    if (!occ) throw new Error('This item no longer exists.');
    const ob = await db.getFirstAsync<R>('SELECT * FROM obligations WHERE id = ?', [String(occ.obligation_id)]);
    if (!ob) throw new Error('This item no longer exists.');
    if (occ.status !== 'done') {
      await patchRow(db, 'obligation_occurrences', occId, { status: 'done', completed_on: day, snoozed_until: null });
    }
    const rule = j<RecurrenceRule>(ob.recurrence, { freq: 'none', interval: 1 });
    const next = ob.archived_at ? null : nextDueDate(rule, String(occ.scheduled_date));
    if (next) {
      nextId = occurrenceId(String(ob.id), next);
      const exists = await db.getFirstAsync<R>('SELECT id FROM obligation_occurrences WHERE obligation_id = ? AND scheduled_date = ?', [String(ob.id), next]);
      if (!exists) {
        await upsertRow(db, 'obligation_occurrences', {
          id: nextId, obligation_id: String(ob.id), scheduled_date: next, due_date: next, status: 'open', completed_on: null, amount_minor: null, snoozed_until: null, deleted_at: null,
        });
      } else {
        nextId = String(exists.id);
      }
    }
  });
  dataChanged('tasks');
  return { nextOccurrenceId: nextId };
}

/** Reopens an occurrence. An already-created next occurrence is kept (it is a real future obligation). */
export async function reopenOccurrence(occId: string): Promise<void> {
  await tx(async (db) => {
    await patchRow(db, 'obligation_occurrences', occId, { status: 'open', completed_on: null });
    // A reopened bill is no longer paid: tombstone its payment record.
    const pays = await db.getAllAsync<R>('SELECT id FROM bill_payments WHERE occurrence_id = ? AND deleted_at IS NULL', [occId]);
    for (const p of pays) await softDelete(db, 'bill_payments', String(p.id));
  });
  dataChanged('tasks');
}

export async function rescheduleOccurrence(occId: string, newDate: LocalDate): Promise<void> {
  await tx(async (db) => patchRow(db, 'obligation_occurrences', occId, { due_date: newDate, snoozed_until: null }));
  dataChanged('tasks');
}

/** Silences reminders for this occurrence until the given instant (the due date is unchanged). */
export async function snoozeOccurrence(occId: string, until: Date): Promise<void> {
  await tx(async (db) => patchRow(db, 'obligation_occurrences', occId, { snoozed_until: until.toISOString() }));
  dataChanged('tasks');
}

export async function skipOccurrence(occId: string): Promise<void> {
  // Skipping = "not this time": mark skipped and roll the schedule forward once.
  const occ = await getOccurrence(occId);
  if (!occ) return;
  await tx(async (db) => {
    await patchRow(db, 'obligation_occurrences', occId, { status: 'skipped' });
    const next = nextDueDate(occ.recurrence, occ.scheduledDate);
    if (next) {
      const exists = await db.getFirstAsync<R>('SELECT id FROM obligation_occurrences WHERE obligation_id = ? AND scheduled_date = ?', [occ.obligationId, next]);
      if (!exists) {
        await upsertRow(db, 'obligation_occurrences', {
          id: occurrenceId(occ.obligationId, next), obligation_id: occ.obligationId, scheduled_date: next, due_date: next, status: 'open', completed_on: null, amount_minor: null, snoozed_until: null, deleted_at: null,
        });
      }
    }
  });
  dataChanged('tasks');
}

export async function setArchived(obligationId: string, archived: boolean): Promise<void> {
  await tx(async (db) => patchRow(db, 'obligations', obligationId, { archived_at: archived ? nowIso() : null }));
  dataChanged('tasks');
}

/** Deletes an obligation and everything attached (tombstones sync the deletion). Reminders are cancelled by the reconciler. */
export async function deleteObligation(obligationId: string): Promise<void> {
  await tx(async (db) => {
    for (const t of ['obligation_occurrences', 'task_checklist_items', 'bills', 'subscriptions']) {
      const rows = await db.getAllAsync<R>(`SELECT id FROM ${t} WHERE obligation_id = ? AND deleted_at IS NULL`, [obligationId]);
      for (const r of rows) await softDelete(db, t, String(r.id));
    }
    const pays = await db.getAllAsync<R>('SELECT p.id FROM bill_payments p JOIN bills b ON b.id = p.bill_id WHERE b.obligation_id = ? AND p.deleted_at IS NULL', [obligationId]);
    for (const p of pays) await softDelete(db, 'bill_payments', String(p.id));
    await softDelete(db, 'obligations', obligationId);
  });
  dataChanged('tasks');
}

export async function bulk(action: 'complete' | 'archive' | 'delete', occurrenceIds: string[]): Promise<void> {
  for (const id of occurrenceIds) {
    const occ = await getOccurrence(id);
    if (!occ) continue;
    if (action === 'complete') await completeOccurrence(id);
    else if (action === 'archive') await setArchived(occ.obligationId, true);
    else await deleteObligation(occ.obligationId);
  }
}

/* ---------------- checklist ---------------- */
export async function toggleChecklistItem(id: string, done: boolean) {
  await tx(async (db) => patchRow(db, 'task_checklist_items', id, { done }));
  dataChanged('tasks');
}
export async function addChecklistItem(obligationId: string, title: string) {
  const max = await first<{ m: number | null }>('SELECT MAX(position) AS m FROM task_checklist_items WHERE obligation_id = ?', obligationId);
  await tx(async (db) => upsertRow(db, 'task_checklist_items', { id: uuidv4(), obligation_id: obligationId, title: title.trim().slice(0, 120), done: false, position: (max?.m ?? -1) + 1, deleted_at: null }));
  dataChanged('tasks');
}
export async function removeChecklistItem(id: string) {
  await tx(async (db) => softDelete(db, 'task_checklist_items', id));
  dataChanged('tasks');
}

/* ---------------- custom categories ---------------- */
export interface CustomCategory {
  id: string;
  name: string;
}
export async function listCustomCategories(): Promise<CustomCategory[]> {
  return (await all<R>('SELECT id, name FROM categories WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE')).map((r) => ({ id: String(r.id), name: String(r.name) }));
}
export async function createCustomCategory(name: string): Promise<string> {
  const id = uuidv4();
  await tx(async (db) => upsertRow(db, 'categories', { id, name: name.trim().slice(0, 40), color: 'mint', icon: 'tag', deleted_at: null }));
  dataChanged('categories');
  return id;
}
export async function deleteCustomCategory(id: string) {
  await tx(async (db) => {
    await softDelete(db, 'categories', id);
    const obs = await db.getAllAsync<R>('SELECT id FROM obligations WHERE category = ?', [`custom:${id}`]);
    for (const o of obs) await patchRow(db, 'obligations', String(o.id), { category: 'personal' });
  });
  dataChanged('categories');
}
