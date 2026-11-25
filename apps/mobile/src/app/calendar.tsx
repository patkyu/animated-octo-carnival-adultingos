import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { addDays, addMonthsAnchored, formatDateLong, startOfMonth, startOfWeek, todayInZone, weekdayShort, type LocalDate } from '@adultingos/shared';
import { listItems, type Item } from '@/db/obligations';
import { listDocuments, type DocumentRecord } from '@/db/documents';
import { toggleItem } from '@/features/actions';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Card, Chip, Icon, Row, Stack } from '@/ui/primitives';
import { Segmented } from '@/ui/forms';
import { MonthGrid, type DayMarks } from '@/ui/CalendarGrid';
import { Screen } from '@/ui/layout';
import { TaskRow } from '@/ui/TaskRow';
import { LoadingList } from '@/ui/states';

type View_ = 'month' | 'week' | 'agenda';
type Filter = 'all' | 'task' | 'bill' | 'subscription' | 'document';

function DayList({ d, items: all, docs: allDocs }: { d: LocalDate; items: Item[]; docs: DocumentRecord[] }) {
  const items = all.filter((i) => i.dueDate === d);
  const docs = allDocs.filter((x) => x.expiryDate === d);
  if (!items.length && !docs.length) return <AppText color="textMuted">Nothing due.</AppText>;
  return (
    <Stack gap={8}>
      {docs.map((doc) => (
        <Card key={doc.id} tone="catDocuments" onPress={() => router.push(`/document/${doc.id}`)} accessibilityLabel={`${doc.name} expires`}>
          <Row gap={10}><Icon name="file-text" color="onCategory" /><AppText variant="bodyStrong" color="onCategory">{doc.name} expires</AppText></Row>
        </Card>
      ))}
      {items.map((i) => <TaskRow key={i.id} item={i} onToggle={toggleItem} />)}
    </Stack>
  );
}

export default function Calendar() {
  const t = useTheme();
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const [view, setView] = useState<View_>('month');
  const [month, setMonth] = useState<LocalDate>(startOfMonth(today));
  const [selected, setSelected] = useState<LocalDate>(today);
  const [filter, setFilter] = useState<Filter>('all');

  const range = view === 'month'
    ? { from: addDays(month, -7), to: addDays(addMonthsAnchored(month, 1, 1), 7) }
    : view === 'week' ? { from: startOfWeek(selected), to: addDays(startOfWeek(selected), 6) } : { from: today, to: addDays(today, 60) };

  const { data, isLoading } = useData(['calendar', range.from, range.to], async () => {
    const [items, docs] = await Promise.all([listItems({ status: 'all', from: range.from, to: range.to }), listDocuments()]);
    return { items, docs: docs.filter((d) => d.expiryDate && d.expiryDate >= range.from && d.expiryDate <= range.to) };
  });

  const visibleItems = useMemo(() => (data?.items ?? []).filter((i) => filter === 'all' || i.kind === filter), [data, filter]);
  const visibleDocs = useMemo(() => (filter === 'all' || filter === 'document' ? data?.docs ?? [] : []), [data, filter]);

  const marks = useMemo(() => {
    const m = new Map<LocalDate, DayMarks>();
    const add = (d: LocalDate, kind: 'task' | 'bill' | 'subscription' | 'document', overdue: boolean) => {
      const cur = m.get(d) ?? { count: 0, overdue: false, kinds: new Set() };
      cur.count++;
      cur.overdue ||= overdue;
      cur.kinds.add(kind);
      m.set(d, cur);
    };
    for (const i of visibleItems) if (i.status !== 'skipped') add(i.dueDate, i.kind, i.status === 'open' && i.dueDate < today);
    for (const d of visibleDocs) add(d.expiryDate!, 'document', false);
    return m;
  }, [visibleItems, visibleDocs, today]);


  return (
    <Screen title="Calendar">
      <Segmented label="Calendar view" value={view} onChange={setView} options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'agenda', label: 'Agenda' }]} />
      <Row wrap>
        {([['all', 'All'], ['task', 'Tasks'], ['bill', 'Bills'], ['subscription', 'Subscriptions'], ['document', 'Documents']] as [Filter, string][]).map(([k, l]) => (
          <Chip key={k} label={l} selected={filter === k} onPress={() => setFilter(k)} />
        ))}
      </Row>
      {isLoading ? <LoadingList rows={3} /> : view === 'month' ? (
        <>
          <Card><MonthGrid month={month} selected={selected} today={today} marks={marks} onSelect={setSelected} onPrev={() => setMonth(addMonthsAnchored(month, -1, 1))} onNext={() => setMonth(addMonthsAnchored(month, 1, 1))} /></Card>
          <AppText variant="section">{formatDateLong(selected)}</AppText>
          <DayList d={selected} items={visibleItems} docs={visibleDocs} />
        </>
      ) : view === 'week' ? (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <Chip label="‹ Previous week" onPress={() => setSelected(addDays(selected, -7))} />
            <Chip label="Next week ›" onPress={() => setSelected(addDays(selected, 7))} />
          </Row>
          {Array.from({ length: 7 }, (_, k) => addDays(startOfWeek(selected), k)).map((d) => (
            <Stack key={d} gap={6}>
              <Pressable onPress={() => setSelected(d)} accessibilityRole="header">
                <AppText variant="supportStrong" color={d === today ? 'primary' : 'textMuted'}>{weekdayShort(d)} · {formatDateLong(d)}{d === today ? ' · Today' : ''}</AppText>
              </Pressable>
              <DayList d={d} items={visibleItems} docs={visibleDocs} />
            </Stack>
          ))}
        </>
      ) : (
        <Stack gap={14}>
          {[...new Set([...visibleItems.filter((i) => i.status === 'open').map((i) => i.dueDate), ...visibleDocs.map((x) => x.expiryDate!)])].sort().map((d) => (
            <Stack key={d} gap={6}>
              <AppText variant="supportStrong" color="textMuted">{formatDateLong(d)}</AppText>
              <DayList d={d} items={visibleItems} docs={visibleDocs} />
            </Stack>
          ))}
          {!visibleItems.some((i) => i.status === 'open') && !visibleDocs.length ? <AppText color="textMuted">Nothing in the next 60 days.</AppText> : null}
        </Stack>
      )}
      <AppText variant="caption" color="textMuted" style={{ color: t.c.textMuted }}>Dots: tasks, bills, subscriptions and documents. Red means something is overdue.</AppText>
    </Screen>
  );
}
