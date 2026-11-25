/**
 * On-device SQLite schema. Column names match the Postgres schema
 * (supabase/migrations) so sync is a straight copy. Arrays/JSON are stored as
 * TEXT (JSON) and booleans as INTEGER 0/1 — see SYNC_TABLES for the mapping.
 *
 * Every syncable row has:
 *   client_updated_at  device time of the last local edit (drives LWW)
 *   deleted_at         tombstone, so deletions sync
 *   sync_state         'pending' (in outbox) | 'synced' (server confirmed) | 'local' (guest)
 */
export const SCHEMA_VERSION = 1;

const syncCols = `
  created_at TEXT NOT NULL,
  client_updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_state TEXT NOT NULL DEFAULT 'local'`;

export const MIGRATIONS: Record<number, string> = {
  1: `
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT 'mint', icon TEXT NOT NULL DEFAULT 'tag', ${syncCols});

CREATE TABLE IF NOT EXISTS obligations (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL DEFAULT 'task',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'personal',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_time TEXT,
  recurrence TEXT NOT NULL DEFAULT '{"freq":"none","interval":1}',
  reminder_offsets TEXT NOT NULL DEFAULT '[0]',
  tags TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'user',
  source_ref TEXT,
  archived_at TEXT, ${syncCols});

CREATE TABLE IF NOT EXISTS obligation_occurrences (
  id TEXT PRIMARY KEY NOT NULL,
  obligation_id TEXT NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  scheduled_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  completed_on TEXT,
  amount_minor INTEGER,
  snoozed_until TEXT, ${syncCols},
  UNIQUE (obligation_id, scheduled_date));
CREATE INDEX IF NOT EXISTS occ_due ON obligation_occurrences (due_date, status);

CREATE TABLE IF NOT EXISTS task_checklist_items (
  id TEXT PRIMARY KEY NOT NULL,
  obligation_id TEXT NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0, ${syncCols});

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY NOT NULL,
  template_key TEXT NOT NULL, name TEXT NOT NULL, issuer TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'obtained', issue_date TEXT, expiry_date TEXT,
  reference_last4 TEXT NOT NULL DEFAULT '', official_url TEXT NOT NULL DEFAULT '',
  reminder_offsets TEXT NOT NULL DEFAULT '[90,30,7]', notes TEXT NOT NULL DEFAULT '', archived_at TEXT, ${syncCols});

CREATE TABLE IF NOT EXISTS document_renewals (
  id TEXT PRIMARY KEY NOT NULL,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  previous_issue_date TEXT, previous_expiry_date TEXT, new_issue_date TEXT, new_expiry_date TEXT,
  renewed_on TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', ${syncCols});

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY NOT NULL,
  obligation_id TEXT NOT NULL UNIQUE REFERENCES obligations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT '', bill_category TEXT NOT NULL DEFAULT 'other',
  amount_minor INTEGER, variable_amount INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'PHP', ${syncCols});

CREATE TABLE IF NOT EXISTS bill_payments (
  id TEXT PRIMARY KEY NOT NULL,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  occurrence_id TEXT NOT NULL UNIQUE REFERENCES obligation_occurrences(id) ON DELETE CASCADE,
  paid_on TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'PHP', note TEXT NOT NULL DEFAULT '', ${syncCols});

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  obligation_id TEXT NOT NULL UNIQUE REFERENCES obligations(id) ON DELETE CASCADE,
  sub_category TEXT NOT NULL DEFAULT 'other', amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'PHP',
  trial_ends_on TEXT, status TEXT NOT NULL DEFAULT 'active', canceled_on TEXT, ${syncCols});

CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY NOT NULL, achievement_key TEXT NOT NULL UNIQUE, unlocked_at TEXT NOT NULL, ${syncCols});

CREATE TABLE IF NOT EXISTS outbox (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL, row_id TEXT NOT NULL, queued_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT,
  UNIQUE (table_name, row_id));
`,
};

/** Tables pushed/pulled by the sync engine, in dependency order (parents first). */
export interface SyncTableSpec {
  name: string;
  json: string[];
  bool: string[];
  /** Columns that exist locally only. */
  localOnly?: string[];
}

export const SYNC_TABLES: SyncTableSpec[] = [
  { name: 'categories', json: [], bool: [] },
  { name: 'obligations', json: ['recurrence', 'reminder_offsets', 'tags'], bool: [] },
  { name: 'obligation_occurrences', json: [], bool: [] },
  { name: 'task_checklist_items', json: [], bool: ['done'] },
  { name: 'documents', json: ['reminder_offsets'], bool: [] },
  { name: 'document_renewals', json: [], bool: [] },
  { name: 'bills', json: [], bool: ['variable_amount'] },
  { name: 'bill_payments', json: [], bool: [] },
  { name: 'subscriptions', json: [], bool: [] },
  { name: 'user_achievements', json: [], bool: [] },
];

export const USER_DATA_TABLES = [...SYNC_TABLES.map((t) => t.name), 'outbox'];
