import { addDays, companionMessage, completionRatio, daysBetween, monthKey, summarizeToday, todayInZone, type LocalDate } from '@adultingos/shared';
import { listItems, type Item } from '@/db/obligations';
import { listDocuments, type DocumentRecord } from '@/db/documents';
import { financeOverview, listSubscriptions, type FinanceOverview } from '@/db/finance';
import { getProfile } from '@/db/settings';
import { all } from '@/db/database';

export interface TimelineEntry {
  date: LocalDate;
  kind: 'item' | 'document';
  item?: Item;
  doc?: DocumentRecord;
}

export interface HomeData {
  today: LocalDate;
  priorities: Item[]; // overdue + due today (open)
  completedToday: Item[];
  timeline: TimelineEntry[];
  hasAnyItems: boolean;
  companion: ReturnType<typeof companionMessage>;
  monthProgress: { done: number; total: number } | null;
  documents: { tracked: number; attention: number; next: DocumentRecord | null };
  finance: FinanceOverview;
  subscriptions: { active: number; monthlyMinor: number; nextRenewal: LocalDate | null };
  categoryCounts: Record<string, number>;
  openTasksWeek: number;
}

export async function loadHome(): Promise<HomeData> {
  const { timezone } = await getProfile();
  const today = todayInZone(timezone);
  const monthStart = `${monthKey(today)}-01`;
  const [open, doneRecent, docs, finance, subs, anyRow, monthItems] = await Promise.all([
    listItems({ status: 'open', to: addDays(today, 7) }),
    listItems({ status: 'done', from: addDays(today, -1), to: addDays(today, 7), sort: 'recent', limit: 20 }),
    listDocuments(),
    financeOverview(),
    listSubscriptions(),
    all<{ n: number }>('SELECT COUNT(*) AS n FROM obligations WHERE deleted_at IS NULL'),
    listItems({ status: 'all', from: monthStart, to: addDays(monthStart, 40) }),
  ]);
  const priorities = open.filter((i) => i.dueDate <= today);
  const completedToday = doneRecent.filter((i) => i.completedOn === today);
  const upcoming = open.filter((i) => i.dueDate > today);
  const docTimeline = docs.filter((d) => d.expiryDate && d.expiryDate > today && d.expiryDate <= addDays(today, 7));
  const timeline: TimelineEntry[] = [
    ...upcoming.map((item) => ({ date: item.dueDate, kind: 'item' as const, item })),
    ...docTimeline.map((doc) => ({ date: doc.expiryDate!, kind: 'document' as const, doc })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const withExpiry = docs.filter((d) => d.expiryDate && (d.status === 'expiring_soon' || d.status === 'expired' || d.status === 'active'));
  const nextDoc = withExpiry.sort((a, b) => (a.expiryDate! < b.expiryDate! ? -1 : 1)).find((d) => d.expiryDate! >= today) ?? null;
  const summary = summarizeToday([...open, ...completedToday], today);
  const thisMonth = monthItems.filter((i) => monthKey(i.dueDate) === monthKey(today));
  const ratio = completionRatio(thisMonth, monthStart, addDays(monthStart, 31));
  const activeSubs = subs.filter((s) => s.status === 'active');
  const categoryCounts: Record<string, number> = {};
  for (const i of open) categoryCounts[i.category] = (categoryCounts[i.category] ?? 0) + 1;

  return {
    today, priorities, completedToday, timeline, hasAnyItems: Number(anyRow[0]?.n ?? 0) > 0 || docs.length > 0,
    companion: companionMessage(summary, Number(anyRow[0]?.n ?? 0) > 0 || docs.length > 0, nextDoc ? { name: nextDoc.name, daysLeft: daysBetween(today, nextDoc.expiryDate!) } : null),
    monthProgress: ratio ? { done: ratio.done, total: ratio.total } : null,
    documents: { tracked: docs.length, attention: docs.filter((d) => d.status === 'expired' || d.status === 'expiring_soon').length, next: nextDoc },
    finance,
    subscriptions: {
      active: activeSubs.length,
      monthlyMinor: activeSubs.filter((s) => s.currency === 'PHP').reduce((n, s) => n + s.monthlyMinor, 0),
      nextRenewal: activeSubs.map((s) => s.nextRenewal).filter((d): d is string => !!d).sort()[0] ?? null,
    },
    categoryCounts,
    openTasksWeek: open.filter((i) => i.kind === 'task').length,
  };
}
