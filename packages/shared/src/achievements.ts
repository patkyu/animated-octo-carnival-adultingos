/**
 * Adulting Milestones — rewards for meaningful accomplishments only.
 * No streaks, no penalties, no leaderboards. Achievements are evaluated from
 * the user's own stats and never revoked.
 */
import type { MascotId } from './catalog';

export interface UserStats {
  tasksCompleted: number;
  documentsTracked: number;
  /** Months (YYYY-MM) in which every tracked bill occurrence was paid. */
  fullyPaidBillMonths: number;
  distinctCategoriesUsed: number;
  savingsGoals: number;
  guideChecklistsAdded: number;
  aiSuggestionsConfirmed: number;
}

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  mascot: MascotId;
  xp: number;
  released: boolean; // false → depends on an unreleased module and stays hidden
  test: (s: UserStats) => boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { key: 'first_step', title: 'First Step', description: 'Complete your first task.', mascot: 'adu', xp: 10, released: true, test: (s) => s.tasksCompleted >= 1 },
  { key: 'paperwork_pro', title: 'Paperwork Pro', description: 'Track five documents.', mascot: 'doki', xp: 25, released: true, test: (s) => s.documentsTracked >= 5 },
  { key: 'bill_boss', title: 'Bill Boss', description: 'Pay every tracked bill in a month.', mascot: 'piso', xp: 25, released: true, test: (s) => s.fullyPaidBillMonths >= 1 },
  { key: 'organized_mind', title: 'Organized Mind', description: 'Organize tasks across three categories.', mascot: 'tiki', xp: 15, released: true, test: (s) => s.distinctCategoriesUsed >= 3 },
  { key: 'know_next_step', title: 'Know Your Next Step', description: 'Add steps from a guide to your tasks.', mascot: 'doki', xp: 15, released: true, test: (s) => s.guideChecklistsAdded >= 1 },
  { key: 'team_adu', title: 'Team Adu', description: 'Confirm a task suggested by Ask Adu.', mascot: 'adu', xp: 10, released: true, test: (s) => s.aiSuggestionsConfirmed >= 1 },
  { key: 'ten_done', title: 'Getting Things Done', description: 'Complete ten tasks.', mascot: 'sunny', xp: 20, released: true, test: (s) => s.tasksCompleted >= 10 },
  { key: 'future_ready', title: 'Future Ready', description: 'Create a savings goal.', mascot: 'piso', xp: 15, released: false, test: (s) => s.savingsGoals >= 1 },
];

export const RELEASED_ACHIEVEMENTS = ACHIEVEMENTS.filter((a) => a.released);

/** Keys newly earned given what's already unlocked. */
export function newlyUnlocked(stats: UserStats, alreadyUnlocked: ReadonlySet<string>): AchievementDef[] {
  return RELEASED_ACHIEVEMENTS.filter((a) => !alreadyUnlocked.has(a.key) && a.test(stats));
}

export function totalXp(unlocked: ReadonlySet<string>): number {
  return ACHIEVEMENTS.filter((a) => unlocked.has(a.key)).reduce((n, a) => n + a.xp, 0);
}
