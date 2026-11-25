import { newlyUnlocked, uuidv4, type AchievementDef, type UserStats } from '@adultingos/shared';
import { all, first, tx } from './database';
import { upsertRow } from './mutate';
import { getPreferences } from './settings';

type R = Record<string, unknown>;

export async function computeStats(): Promise<UserStats> {
  const n = async (sql: string) => Number((await first<{ n: number }>(sql))?.n ?? 0);
  // A month counts as "fully paid" when it had ≥1 bill occurrence due and none remain open or skipped.
  const months = await all<R>(
    `SELECT substr(oc.due_date, 1, 7) AS m, SUM(CASE WHEN oc.status = 'done' THEN 1 ELSE 0 END) AS done, COUNT(*) AS total
     FROM obligation_occurrences oc JOIN obligations ob ON ob.id = oc.obligation_id
     WHERE ob.kind = 'bill' AND oc.deleted_at IS NULL AND ob.deleted_at IS NULL GROUP BY m`,
  );
  return {
    tasksCompleted: await n("SELECT COUNT(*) AS n FROM obligation_occurrences WHERE status = 'done' AND deleted_at IS NULL"),
    documentsTracked: await n('SELECT COUNT(*) AS n FROM documents WHERE deleted_at IS NULL'),
    fullyPaidBillMonths: months.filter((m) => Number(m.total) > 0 && Number(m.done) === Number(m.total)).length,
    distinctCategoriesUsed: await n('SELECT COUNT(DISTINCT category) AS n FROM obligations WHERE deleted_at IS NULL'),
    savingsGoals: 0,
    guideChecklistsAdded: await n("SELECT COUNT(DISTINCT source_ref) AS n FROM obligations WHERE source = 'guide' AND deleted_at IS NULL"),
    aiSuggestionsConfirmed: await n("SELECT COUNT(*) AS n FROM obligations WHERE source = 'ai' AND deleted_at IS NULL"),
  };
}

export async function unlockedKeys(): Promise<Set<string>> {
  return new Set((await all<R>('SELECT achievement_key FROM user_achievements WHERE deleted_at IS NULL')).map((r) => String(r.achievement_key)));
}

/** Evaluates and records newly earned achievements. Never revokes. Returns the new ones for celebration. */
export async function evaluateAchievements(): Promise<AchievementDef[]> {
  if (!(await getPreferences()).gamificationEnabled) return [];
  const earned = newlyUnlocked(await computeStats(), await unlockedKeys());
  if (!earned.length) return [];
  await tx(async (db) => {
    for (const a of earned) {
      // Random id: a deterministic id would collide across users (the server PK is global).
      // Duplicates for the same user are prevented by unique(achievement_key) locally and unique(user_id, key) on the server.
      await upsertRow(db, 'user_achievements', { id: uuidv4(), achievement_key: a.key, unlocked_at: new Date().toISOString(), deleted_at: null });
    }
  });
  return earned;
}
