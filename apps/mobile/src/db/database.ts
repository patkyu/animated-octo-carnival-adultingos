import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { IS_DEMO } from '@/config/env';
import { MIGRATIONS, SCHEMA_VERSION, USER_DATA_TABLES } from './schema';

export type DB = SQLite.SQLiteDatabase;
type Bindable = string | number | null;

let dbPromise: Promise<DB> | null = null;

/** Demo builds use a separate file so synthetic data never mixes with real data. */
export const DB_NAME = IS_DEMO ? 'adultingos-demo.db' : 'adultingos.db';

async function migrate(db: DB): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
    const sql = MIGRATIONS[v];
    if (!sql) continue;
    await withTx(db, async (txn) => {
      await txn.execAsync(sql);
      await txn.execAsync(`PRAGMA user_version = ${v}`);
    });
  }
}

export function getDb(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    })();
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

export async function all<T>(sql: string, ...params: Bindable[]): Promise<T[]> {
  return (await getDb()).getAllAsync<T>(sql, params);
}
export async function first<T>(sql: string, ...params: Bindable[]): Promise<T | null> {
  return (await getDb()).getFirstAsync<T>(sql, params);
}
export async function run(sql: string, ...params: Bindable[]): Promise<void> {
  await (await getDb()).runAsync(sql, params);
}
/**
 * Runs work in a transaction. Android uses an exclusive transaction (other
 * queries wait); expo-sqlite on web only supports the plain form, which is fine
 * for the single-tab web build used for previews.
 */
export async function withTx(db: DB, work: (txn: DB) => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') await db.withTransactionAsync(() => work(db));
  else await db.withExclusiveTransactionAsync(async (txn) => work(txn as unknown as DB));
}

export async function tx(work: (db: DB) => Promise<void>): Promise<void> {
  await withTx(await getDb(), work);
}

/* ---------------- key/value settings ---------------- */
export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const row = await first<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  await run('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, JSON.stringify(value));
}

/** Erases all personal data on this device (sign-out of a different account, account deletion, "delete local data"). */
export async function wipeAllUserData(): Promise<void> {
  await tx(async (db) => {
    // Children first because of FK cascades on some platforms.
    for (const t of [...USER_DATA_TABLES].reverse()) await db.execAsync(`DELETE FROM ${t}`);
    await db.execAsync('DELETE FROM kv');
  });
}
