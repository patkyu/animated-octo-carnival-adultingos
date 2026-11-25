import type { DB } from './database';

type Value = string | number | null | boolean | object | undefined;
export type Row = Record<string, Value>;

export const nowIso = () => new Date().toISOString();

function encode(v: Value): string | number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

/**
 * Inserts or updates a syncable row inside a transaction and queues it for
 * sync. Every local write goes through here, which is what makes the outbox
 * durable: the row and its outbox entry commit together or not at all.
 */
export async function upsertRow(db: DB, table: string, row: Row & { id: string }): Promise<void> {
  const now = nowIso();
  const existing = await db.getFirstAsync<{ created_at: string }>(`SELECT created_at FROM ${table} WHERE id = ?`, [row.id]);
  const full: Row = { ...row, client_updated_at: now, sync_state: 'pending', created_at: existing?.created_at ?? (row.created_at as string) ?? now };
  const cols = Object.keys(full);
  const placeholders = cols.map(() => '?').join(', ');
  const updates = cols.filter((c) => c !== 'id' && c !== 'created_at').map((c) => `${c} = excluded.${c}`).join(', ');
  await db.runAsync(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
    cols.map((c) => encode(full[c])),
  );
  await enqueue(db, table, row.id);
}

/** Partial update of an existing row (also queued). */
export async function patchRow(db: DB, table: string, id: string, patch: Row): Promise<void> {
  const full: Row = { ...patch, client_updated_at: nowIso(), sync_state: 'pending' };
  const cols = Object.keys(full);
  await db.runAsync(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => encode(full[c])), id]);
  await enqueue(db, table, id);
}

/** Tombstone delete (syncs as deleted_at). */
export async function softDelete(db: DB, table: string, id: string): Promise<void> {
  await patchRow(db, table, id, { deleted_at: nowIso() });
}

export async function enqueue(db: DB, table: string, id: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO outbox (table_name, row_id, queued_at) VALUES (?, ?, ?) ON CONFLICT(table_name, row_id) DO UPDATE SET queued_at = excluded.queued_at, attempts = 0, last_error = NULL',
    [table, id, nowIso()],
  );
}
