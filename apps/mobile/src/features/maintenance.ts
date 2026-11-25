import { todayInZone } from '@adultingos/shared';
import { all, kvGet } from '@/db/database';
import { completeOccurrence } from '@/db/obligations';
import { getProfile, updateProfile } from '@/db/settings';

/**
 * Runs at launch and whenever the app returns to the foreground.
 * Each step is idempotent, so running it often is safe.
 */
export async function runMaintenance(): Promise<void> {
  await syncTimeZone();
  await rollSubscriptionRenewals();
}

/** Follow the phone's time zone (travel, OFWs) unless the user pinned one in Settings. */
export async function syncTimeZone(): Promise<void> {
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!deviceTz) return;
  const p = await getProfile();
  if (p.timezone !== deviceTz && (await kvGet('tz_auto', true))) await updateProfile({ timezone: deviceTz });
}

/**
 * Active subscriptions renew on their own: a renewal date that has passed is
 * recorded as renewed (on its own date) and the next one is scheduled, instead
 * of showing as "overdue". Canceled subscriptions are archived and skipped.
 * completeOccurrence() is exactly-once, so repeated runs can't double-advance.
 */
export async function rollSubscriptionRenewals(): Promise<number> {
  const today = todayInZone((await getProfile()).timezone);
  let rolled = 0;
  for (let guard = 0; guard < 120; guard++) {
    const due = await all<{ id: string; due_date: string }>(
      `SELECT oc.id, oc.due_date FROM obligation_occurrences oc
       JOIN obligations ob ON ob.id = oc.obligation_id
       JOIN subscriptions s ON s.obligation_id = ob.id
       WHERE ob.kind = 'subscription' AND s.status = 'active' AND ob.archived_at IS NULL AND ob.deleted_at IS NULL
         AND oc.deleted_at IS NULL AND oc.status = 'open' AND oc.due_date < ?
       ORDER BY oc.due_date LIMIT 50`,
      today,
    );
    if (!due.length) break;
    for (const d of due) {
      await completeOccurrence(d.id, d.due_date);
      rolled++;
    }
  }
  return rolled;
}
