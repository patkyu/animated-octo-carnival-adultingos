import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { all, first, getDb, kvGet, kvSet, run, withTx } from '@/db/database';
import { SYNC_TABLES, type SyncTableSpec } from '@/db/schema';
import { getAppState, getNotificationPrefs, getPreferences, getProfile, updateAppState, type NotificationPrefs, type Preferences, type Profile } from '@/db/settings';
import { dataChanged } from '@/lib/events';
import { supabase } from './supabase';

type R = Record<string, unknown>;

export type SyncStatus = 'disabled' | 'signed_out' | 'idle' | 'syncing' | 'offline' | 'error';
interface SyncStore {
  status: SyncStatus;
  pending: number;
  lastSyncAt: string | null;
  lastError: string | null;
  set: (p: Partial<SyncStore>) => void;
}
export const useSyncStore = create<SyncStore>((set) => ({ status: 'disabled', pending: 0, lastSyncAt: null, lastError: null, set: (p) => set(p) }));

const PAGE = 500;
/** Tables with a natural unique key besides id: (obligation_id, scheduled_date) / (user_id, achievement_key). */
const NATURAL_KEY_TABLES = new Set(['obligation_occurrences', 'user_achievements']);
let running: Promise<void> | null = null;
const columnCache = new Map<string, Set<string>>();

async function localColumns(table: string): Promise<Set<string>> {
  let cols = columnCache.get(table);
  if (!cols) {
    const rows = await all<{ name: string }>(`PRAGMA table_info(${table})`);
    cols = new Set(rows.map((r) => r.name));
    columnCache.set(table, cols);
  }
  return cols;
}

function toServer(spec: SyncTableSpec, row: R, userId: string): R {
  const out: R = { user_id: userId };
  for (const [k, v] of Object.entries(row)) {
    if (k === 'sync_state') continue;
    if (spec.json.includes(k) && typeof v === 'string') out[k] = JSON.parse(v);
    else if (spec.bool.includes(k)) out[k] = !!v;
    else out[k] = v;
  }
  return out;
}

function toLocal(spec: SyncTableSpec, row: R, cols: Set<string>): R {
  const out: R = {};
  for (const [k, v] of Object.entries(row)) {
    if (!cols.has(k)) continue; // drops user_id, server_seq, updated_at
    if (spec.json.includes(k)) out[k] = JSON.stringify(v ?? null);
    else if (spec.bool.includes(k)) out[k] = v ? 1 : 0;
    else out[k] = v as never;
  }
  out.sync_state = 'synced';
  return out;
}

export async function pendingCount(): Promise<number> {
  return Number((await first<{ n: number }>('SELECT COUNT(*) AS n FROM outbox'))?.n ?? 0);
}

/** Queues every local row — used when a guest's data is adopted into a new account. */
export async function enqueueEverything(): Promise<void> {
  const now = new Date().toISOString();
  for (const t of SYNC_TABLES) {
    await run(`INSERT OR IGNORE INTO outbox (table_name, row_id, queued_at) SELECT '${t.name}', id, ? FROM ${t.name}`, now);
  }
  await kvSet('profile_dirty', true);
}

async function pushTable(spec: SyncTableSpec, userId: string): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const queued = await all<{ row_id: string; queued_at: string }>('SELECT row_id, queued_at FROM outbox WHERE table_name = ? ORDER BY seq LIMIT 200', spec.name);
  if (!queued.length) return;
  const rows: R[] = [];
  const pushedAt = new Map<string, string>();
  for (const q of queued) {
    const r = await first<R>(`SELECT * FROM ${spec.name} WHERE id = ?`, q.row_id);
    if (!r) {
      await run('DELETE FROM outbox WHERE table_name = ? AND row_id = ?', spec.name, q.row_id);
      continue;
    }
    pushedAt.set(String(r.id), String(r.client_updated_at));
    rows.push(toServer(spec, r, userId));
  }
  if (!rows.length) return;

  const markDone = async (ids: string[]) => {
    for (const id of ids) {
      const ts = pushedAt.get(id);
      // Only clear if nothing changed locally while we were pushing.
      await run("UPDATE outbox SET attempts = 0 WHERE table_name = ? AND row_id = ?", spec.name, id);
      await run(
        `DELETE FROM outbox WHERE table_name = ? AND row_id = ? AND EXISTS (SELECT 1 FROM ${spec.name} WHERE id = ? AND client_updated_at = ?)`,
        spec.name, id, id, ts ?? '',
      );
      await run(`UPDATE ${spec.name} SET sync_state = 'synced' WHERE id = ? AND client_updated_at = ?`, id, ts ?? '');
    }
  };

  const { error } = await sb.from(spec.name).upsert(rows, { onConflict: 'id' });
  if (!error) {
    await markDone(rows.map((r) => String(r.id)));
    if (queued.length === 200) await pushTable(spec, userId);
    return;
  }
  // Batch failed: retry row by row so one bad row can't block the rest.
  for (const row of rows) {
    const { error: e } = await sb.from(spec.name).upsert(row, { onConflict: 'id' });
    const id = String(row.id);
    if (!e) {
      await markDone([id]);
    } else if (e.code === '23505' && NATURAL_KEY_TABLES.has(spec.name)) {
      // The server already has this row under another id (an occurrence created by an AI
      // confirmation, or an achievement unlocked on another device). Server wins; drop the
      // local duplicate — the pull brings the canonical row.
      await run('DELETE FROM outbox WHERE table_name = ? AND row_id = ?', spec.name, id);
      await run(`DELETE FROM ${spec.name} WHERE id = ?`, id);
    } else {
      await run('UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE table_name = ? AND row_id = ?', e.code ?? 'error', spec.name, id);
    }
  }
}

async function pushSettings(userId: string): Promise<void> {
  const sb = supabase();
  if (!sb || !(await kvGet('profile_dirty', false))) return;
  const p = await getProfile();
  const pr = await getPreferences();
  const n = await getNotificationPrefs();
  const now = new Date().toISOString();
  const app = await getAppState();
  const r1 = await sb.from('profiles').upsert({
    id: userId, preferred_name: p.preferredName || null, country: p.country, language: p.language, timezone: p.timezone,
    employment_status: p.employmentStatus, living_arrangement: p.livingArrangement, responsibility_areas: p.responsibilityAreas,
    favorite_mascot: p.favoriteMascot, avatar: p.avatar, onboarding_completed_at: app.onboardingComplete ? now : null, client_updated_at: now,
  });
  const r2 = await sb.from('user_preferences').upsert({
    user_id: userId, theme: pr.theme, reduced_motion: pr.reducedMotion, show_mascots: pr.showMascots, mascot_animations: pr.mascotAnimations,
    gamification_enabled: pr.gamificationEnabled, ai_include_records: pr.aiIncludeRecords, client_updated_at: now,
  });
  const r3 = await sb.from('notification_preferences').upsert({
    user_id: userId, enabled: n.enabled, categories: n.categories, reminder_time: n.reminderTime, quiet_hours_enabled: n.quietHoursEnabled,
    quiet_start: n.quietStart, quiet_end: n.quietEnd, weekly_summary_day: n.weeklySummaryDay, show_details_on_lock_screen: n.showDetailsOnLockScreen,
    mascot_notifications: n.mascotNotifications, client_updated_at: now,
  });
  if (!r1.error && !r2.error && !r3.error) await kvSet('profile_dirty', false);
}

async function pullSettings(): Promise<void> {
  const sb = supabase();
  if (!sb || (await kvGet('profile_dirty', false))) return; // local edits pending: local wins
  const [{ data: p }, { data: pr }, { data: n }] = await Promise.all([
    sb.from('profiles').select('*').maybeSingle(),
    sb.from('user_preferences').select('*').maybeSingle(),
    sb.from('notification_preferences').select('*').maybeSingle(),
  ]);
  if (p) {
    const cur = await getProfile();
    const next: Profile = {
      ...cur, preferredName: p.preferred_name ?? cur.preferredName, country: p.country, language: p.language, timezone: p.timezone,
      employmentStatus: p.employment_status, livingArrangement: p.living_arrangement, responsibilityAreas: p.responsibility_areas ?? [],
      favoriteMascot: p.favorite_mascot, avatar: p.avatar,
    };
    await kvSet('profile', next);
  }
  if (pr) {
    const next: Preferences = {
      theme: pr.theme, reducedMotion: pr.reduced_motion, showMascots: pr.show_mascots, mascotAnimations: pr.mascot_animations,
      gamificationEnabled: pr.gamification_enabled, aiIncludeRecords: pr.ai_include_records,
    };
    await kvSet('preferences', next);
  }
  if (n) {
    const cur = await getNotificationPrefs();
    const next: NotificationPrefs = {
      ...cur, enabled: n.enabled, categories: { ...cur.categories, ...n.categories }, reminderTime: String(n.reminder_time).slice(0, 5),
      quietHoursEnabled: n.quiet_hours_enabled, quietStart: String(n.quiet_start).slice(0, 5), quietEnd: String(n.quiet_end).slice(0, 5),
      weeklySummaryDay: n.weekly_summary_day, showDetailsOnLockScreen: n.show_details_on_lock_screen, mascotNotifications: n.mascot_notifications,
    };
    await kvSet('notification_prefs', next);
  }
}

async function pullTable(spec: SyncTableSpec): Promise<number> {
  const sb = supabase();
  if (!sb) return 0;
  const cols = await localColumns(spec.name);
  let cursor = await kvGet<number>(`cursor:${spec.name}`, 0);
  let applied = 0;
  for (;;) {
    const { data, error } = await sb.from(spec.name).select('*').gt('server_seq', cursor).order('server_seq', { ascending: true }).limit(PAGE);
    if (error) throw new Error(`pull ${spec.name}: ${error.code ?? 'error'}`);
    if (!data?.length) break;
    const db = await getDb();
    await withTx(db, async (txn) => {
      for (const row of data as R[]) {
        const local = await txn.getFirstAsync<R>(`SELECT client_updated_at, sync_state FROM ${spec.name} WHERE id = ?`, [String(row.id)]);
        // A newer, unpushed local edit wins; it will be pushed next.
        if (local && local.sync_state === 'pending' && String(local.client_updated_at) > String(row.client_updated_at)) continue;
        const values = toLocal(spec, row, cols);
        const keys = Object.keys(values);
        await txn.runAsync(
          `INSERT OR REPLACE INTO ${spec.name} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          keys.map((k) => values[k] as string | number | null),
        );
        await txn.runAsync('DELETE FROM outbox WHERE table_name = ? AND row_id = ?', [spec.name, String(row.id)]);
        applied++;
      }
    });
    cursor = Number((data[data.length - 1] as R).server_seq);
    await kvSet(`cursor:${spec.name}`, cursor);
    if (data.length < PAGE) break;
  }
  return applied;
}

/** One full sync pass. Concurrent calls share the same run. */
export function syncNow(): Promise<void> {
  if (running) return running;
  running = (async () => {
    const store = useSyncStore.getState();
    const sb = supabase();
    if (!sb) {
      store.set({ status: 'disabled', pending: await pendingCount() });
      return;
    }
    const { data: session } = await sb.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) {
      store.set({ status: 'signed_out', pending: await pendingCount() });
      return;
    }
    const net = await NetInfo.fetch();
    if (net.isConnected === false) {
      store.set({ status: 'offline', pending: await pendingCount() });
      return;
    }
    store.set({ status: 'syncing', lastError: null });
    try {
      for (const spec of SYNC_TABLES) await pushTable(spec, userId);
      await pushSettings(userId);
      let applied = 0;
      for (const spec of SYNC_TABLES) applied += await pullTable(spec);
      await pullSettings();
      const at = new Date().toISOString();
      await updateAppState({ lastSyncAt: at });
      store.set({ status: 'idle', lastSyncAt: at, pending: await pendingCount() });
      if (applied) dataChanged('sync');
    } catch (e) {
      store.set({ status: 'error', lastError: e instanceof Error ? e.message : 'Sync failed', pending: await pendingCount() });
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Resets cursors so the next pull re-reads everything (after adopting an account). */
export async function resetCursors(): Promise<void> {
  for (const t of SYNC_TABLES) await kvSet(`cursor:${t.name}`, 0);
}

