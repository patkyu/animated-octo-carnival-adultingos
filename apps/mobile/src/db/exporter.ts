import { formatMinor, minorToInput } from '@adultingos/shared';
import { all } from './database';
import { SYNC_TABLES } from './schema';
import { getNotificationPrefs, getPreferences, getProfile } from './settings';

type R = Record<string, unknown>;

/**
 * Local export in the documented format (docs/privacy/data-export-format.md).
 * Same top-level shape as the server's export_my_data(), so the two can be
 * merged. Internal sync columns are stripped.
 */
export async function buildLocalExport(): Promise<object> {
  const data: Record<string, unknown> = {
    profile: await getProfile(),
    preferences: await getPreferences(),
    notification_preferences: await getNotificationPrefs(),
  };
  for (const t of SYNC_TABLES) {
    const rows = await all<R>(`SELECT * FROM ${t.name} WHERE deleted_at IS NULL`);
    data[t.name] = rows.map((r) => {
      const out: R = {};
      for (const [k, v] of Object.entries(r)) {
        if (k === 'sync_state' || k === 'client_updated_at' || k === 'deleted_at') continue;
        if (t.json.includes(k) && typeof v === 'string') {
          try {
            out[k] = JSON.parse(v);
            continue;
          } catch {
            /* fall through */
          }
        }
        out[k] = t.bool.includes(k) ? !!v : v;
      }
      return out;
    });
  }
  return { format: 'adultingos-export', formatVersion: 1, exportedAt: new Date().toISOString(), source: 'device', data };
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formula injection and quote everything.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}
const csv = (header: string[], rows: unknown[][]) => [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');

export async function buildTasksCsv(): Promise<string> {
  const rows = await all<R>(
    `SELECT ob.title, ob.kind, ob.category, ob.priority, oc.due_date, ob.due_time, oc.status, oc.completed_on, ob.recurrence, ob.notes
     FROM obligation_occurrences oc JOIN obligations ob ON ob.id = oc.obligation_id
     WHERE oc.deleted_at IS NULL AND ob.deleted_at IS NULL ORDER BY oc.due_date`,
  );
  return csv(
    ['title', 'type', 'category', 'priority', 'due_date', 'due_time', 'status', 'completed_on', 'repeats', 'notes'],
    rows.map((r) => {
      let freq = 'none';
      try {
        freq = JSON.parse(String(r.recurrence)).freq;
      } catch {
        /* ignore */
      }
      return [r.title, r.kind, r.category, r.priority, r.due_date, r.due_time, r.status, r.completed_on, freq, r.notes];
    }),
  );
}

export async function buildBillsCsv(): Promise<string> {
  const rows = await all<R>(
    `SELECT ob.title, b.provider, b.bill_category, oc.due_date, oc.status, COALESCE(oc.amount_minor, b.amount_minor) AS amount, b.currency, p.paid_on, p.amount_minor AS paid
     FROM obligation_occurrences oc JOIN obligations ob ON ob.id = oc.obligation_id JOIN bills b ON b.obligation_id = ob.id
     LEFT JOIN bill_payments p ON p.occurrence_id = oc.id AND p.deleted_at IS NULL
     WHERE oc.deleted_at IS NULL AND ob.deleted_at IS NULL ORDER BY oc.due_date`,
  );
  return csv(
    ['bill', 'provider', 'category', 'due_date', 'status', 'amount', 'currency', 'paid_on', 'amount_paid'],
    rows.map((r) => [
      r.title, r.provider, r.bill_category, r.due_date, r.status, r.amount === null ? '' : minorToInput(Number(r.amount)), r.currency, r.paid_on ?? '',
      r.paid === null || r.paid === undefined ? '' : minorToInput(Number(r.paid)),
    ]),
  );
}

export { formatMinor };
