import { compareLocalDates, daysBetween, type LocalDate } from './dates';

export type OccurrenceStatus = 'open' | 'done' | 'skipped';

export interface OccurrenceLike {
  dueDate: LocalDate;
  status: OccurrenceStatus;
  completedOn?: LocalDate | null;
}

export interface TodaySummary {
  overdue: number;
  dueToday: number;
  upcomingWeek: number;
  completedToday: number;
}

export function summarizeToday(items: readonly OccurrenceLike[], today: LocalDate): TodaySummary {
  const s: TodaySummary = { overdue: 0, dueToday: 0, upcomingWeek: 0, completedToday: 0 };
  for (const it of items) {
    if (it.status === 'done') {
      if (it.completedOn === today) s.completedToday++;
      continue;
    }
    if (it.status !== 'open') continue;
    const d = daysBetween(today, it.dueDate);
    if (d < 0) s.overdue++;
    else if (d === 0) s.dueToday++;
    else if (d <= 7) s.upcomingWeek++;
  }
  return s;
}

/**
 * Real progress for a window: share of occurrences due in [from, to] that are
 * done. Returns null when nothing was due — the UI shows no ring rather than an
 * invented 0% or 100%.
 */
export function completionRatio(items: readonly OccurrenceLike[], from: LocalDate, to: LocalDate): { done: number; total: number; ratio: number } | null {
  let done = 0;
  let total = 0;
  for (const it of items) {
    if (it.status === 'skipped') continue;
    if (compareLocalDates(it.dueDate, from) < 0 || compareLocalDates(it.dueDate, to) > 0) continue;
    total++;
    if (it.status === 'done') done++;
  }
  if (total === 0) return null;
  return { done, total, ratio: done / total };
}

export type CompanionMood = 'all_clear' | 'overdue' | 'busy_today' | 'upcoming' | 'empty';

/** Picks the companion message from actual data — never canned optimism. */
export function companionMessage(summary: TodaySummary, hasAnyItems: boolean, nextDocument?: { name: string; daysLeft: number } | null): { mood: CompanionMood; text: string } {
  if (!hasAnyItems) return { mood: 'empty', text: "Let's add your first responsibility. One step at a time." };
  if (summary.overdue > 0) {
    return {
      mood: 'overdue',
      text: summary.overdue === 1
        ? 'One item needs attention. Reschedule it or mark it done — no stress.'
        : `${summary.overdue} items need attention. Pick one to reschedule or finish.`,
    };
  }
  if (nextDocument && nextDocument.daysLeft <= 30) {
    return { mood: 'upcoming', text: `Your ${nextDocument.name} renewal is coming up in ${nextDocument.daysLeft} days.` };
  }
  if (summary.dueToday > 0) {
    return { mood: 'busy_today', text: summary.dueToday === 1 ? 'You have one thing due today.' : `You have ${summary.dueToday} things due today.` };
  }
  if (summary.upcomingWeek > 0) {
    return { mood: 'upcoming', text: summary.upcomingWeek === 1 ? 'You have one thing coming up this week.' : `You have ${summary.upcomingWeek} things coming up this week.` };
  }
  return { mood: 'all_clear', text: "You're all caught up for today." };
}
