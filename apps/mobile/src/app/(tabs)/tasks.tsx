import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TASK_CATEGORIES, addDays, daysBetween, todayInZone } from '@adultingos/shared';
import { bulk, listCustomCategories, listItems, setArchived, type Item, type ItemFilter, type ObligationKind } from '@/db/obligations';
import { toggleItem } from '@/features/actions';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button, Chip, IconButton, Row, Stack } from '@/ui/primitives';
import { Segmented, TextField } from '@/ui/forms';
import { Fab } from '@/ui/layout';
import { TaskRow } from '@/ui/TaskRow';
import { ConfirmDialog, Sheet, toast } from '@/ui/overlays';
import { EmptyState, ErrorState, LoadingList, OfflineBanner } from '@/ui/states';
import { isEnabled } from '@/config/env';

type StatusFilter = 'open' | 'done' | 'archived';
type KindFilter = 'all' | ObligationKind;

function group(items: Item[], today: string): { title: string; items: Item[] }[] {
  const g = new Map<string, Item[]>();
  const label = (i: Item) => {
    const d = daysBetween(today, i.dueDate);
    if (i.status !== 'open') return 'Completed';
    if (d < 0) return 'Overdue';
    if (d === 0) return 'Today';
    if (d <= 7) return 'This week';
    if (d <= 31) return 'Later this month';
    return 'Later';
  };
  for (const i of items) {
    const k = label(i);
    g.set(k, [...(g.get(k) ?? []), i]);
  }
  return [...g.entries()].map(([title, items]) => ({ title, items }));
}

export default function Tasks() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string; category?: string }>();
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const [status, setStatus] = useState<StatusFilter>('open');
  const [kind, setKind] = useState<KindFilter>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<NonNullable<ItemFilter['sort']>>('due');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (params.kind === 'task' || params.kind === 'bill' || params.kind === 'subscription') setKind(params.kind);
    if (params.category) setCategories([params.category]);
  }, [params.kind, params.category]);

  const filter: ItemFilter = useMemo(() => ({
    status: status === 'archived' ? 'all' : status,
    archived: status === 'archived',
    kinds: kind === 'all' ? undefined : [kind],
    categories: categories.length ? categories : undefined,
    search: search || undefined,
    sort: status === 'done' ? 'recent' : sort,
    to: status === 'open' ? addDays(today, 3650) : undefined,
    limit: 300,
  }), [status, kind, categories, search, sort, today]);

  const { data, isLoading, error, refetch } = useData(['tasks', filter], async () => {
    const items = await listItems(filter);
    // In "done" show history; in "open" hide future instances beyond the first per obligation.
    if (status !== 'open') return items;
    const seen = new Set<string>();
    return items.filter((i) => (seen.has(i.obligationId) ? false : (seen.add(i.obligationId), true)));
  });
  const custom = useData(['custom-categories'], listCustomCategories);
  const sections = useMemo(() => group(data ?? [], today), [data, today]);

  const toggleSel = (i: Item) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(i.id)) n.delete(i.id);
    else n.add(i.id);
    return n;
  });
  const runBulk = async (action: 'complete' | 'archive' | 'delete' | 'restore') => {
    const ids = [...selected];
    if (action === 'restore') {
      for (const id of ids) {
        const it = data?.find((d) => d.id === id);
        if (it) await setArchived(it.obligationId, false);
      }
    } else await bulk(action, ids);
    toast(`${ids.length} item${ids.length === 1 ? '' : 's'} updated.`, 'success');
    setSelected(new Set());
    setSelecting(false);
  };

  const activeFilterCount = categories.length + (sort !== 'due' ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: t.c.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText variant="title">Tasks</AppText>
          <Row gap={0}>
            <IconButton icon="calendar" label="Calendar view" onPress={() => router.push('/calendar')} />
            <IconButton icon="sliders" label={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`} badge={activeFilterCount > 0} onPress={() => setFiltersOpen(true)} />
            <IconButton icon={selecting ? 'x' : 'check-square'} label={selecting ? 'Cancel selection' : 'Select several'} onPress={() => { setSelecting(!selecting); setSelected(new Set()); }} />
          </Row>
        </Row>
        <TextField label="Search tasks" value={search} onChangeText={setSearch} placeholder="Search titles, notes, tags" icon="search" returnKeyType="search" />
        <Segmented label="Status" value={status} onChange={setStatus} options={[{ value: 'open', label: 'To do' }, { value: 'done', label: 'Done' }, { value: 'archived', label: 'Archived' }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {([['all', 'All'], ['task', 'Tasks'], ['bill', 'Bills'], ...(isEnabled('subscriptions') ? [['subscription', 'Subscriptions']] : [])] as [KindFilter, string][]).map(([k, l]) => (
            <Chip key={k} label={l} selected={kind === k} onPress={() => setKind(k)} />
          ))}
          <Chip label="Documents" icon="file-text" onPress={() => router.push('/documents')} />
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 140, gap: 12 }} keyboardShouldPersistTaps="handled">
        <OfflineBanner />
        {isLoading ? <LoadingList /> : error ? <ErrorState onRetry={() => refetch()} /> : !data?.length ? (
          search || categories.length || kind !== 'all' ? (
            <EmptyState mascot="tiki" title="No matches" body="Try a different search or clear your filters." actionLabel="Clear filters" onAction={() => { setSearch(''); setCategories([]); setKind('all'); }} />
          ) : status === 'open' ? (
            <EmptyState mascot="tiki" title="Nothing to do — for now" body="Add a task and Tiki will remind you before it's due." actionLabel="Add a task" onAction={() => router.push('/task/new')} />
          ) : (
            <EmptyState mascot="tiki" title={status === 'done' ? 'No completed items yet' : 'Nothing archived'} body={status === 'done' ? 'Completed tasks and paid bills show up here.' : 'Archived items are hidden from your lists but kept for your records.'} />
          )
        ) : (
          sections.map((s) => (
            <Stack key={s.title} gap={8}>
              <AppText variant="supportStrong" color={s.title === 'Overdue' ? 'danger' : 'textMuted'}>{s.title} · {s.items.length}</AppText>
              {s.items.map((i) => (
                <TaskRow key={i.id} item={i} onToggle={status === 'archived' ? undefined : toggleItem} selectable={selecting} selected={selected.has(i.id)} onSelect={toggleSel} customCategories={custom.data ?? []} />
              ))}
            </Stack>
          ))
        )}
      </ScrollView>
      {selecting ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: t.c.surface, borderTopWidth: 1, borderColor: t.c.border, gap: 8 }}>
          <AppText variant="supportStrong" align="center">{selected.size} selected</AppText>
          <Row gap={8} style={{ justifyContent: 'center' }} wrap>
            {status === 'open' ? <Button label="Mark done" icon="check" compact disabled={!selected.size} onPress={() => runBulk('complete')} /> : null}
            {status === 'archived' ? <Button label="Restore" icon="rotate-ccw" compact disabled={!selected.size} onPress={() => runBulk('restore')} /> : <Button label="Archive" icon="archive" variant="secondary" compact disabled={!selected.size} onPress={() => runBulk('archive')} />}
            <Button label="Delete" icon="trash-2" variant="danger" compact disabled={!selected.size} onPress={() => setConfirmDelete(true)} />
          </Row>
        </View>
      ) : (
        <Fab label="Add something new" onPress={() => router.push('/add')} />
      )}
      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter and sort" footer={<Button label="Show results" full onPress={() => setFiltersOpen(false)} />}>
        <Stack gap={16}>
          <Stack gap={8}>
            <AppText variant="supportStrong">Sort by</AppText>
            <Segmented label="Sort by" value={sort} onChange={setSort} options={[{ value: 'due', label: 'Due date' }, { value: 'priority', label: 'Priority' }, { value: 'title', label: 'A–Z' }]} />
          </Stack>
          <Stack gap={8}>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText variant="supportStrong">Categories</AppText>
              {categories.length ? <Button label="Clear" variant="ghost" compact onPress={() => setCategories([])} /> : null}
            </Row>
            <Row wrap>
              {[...TASK_CATEGORIES.map((c) => ({ key: c.key as string, label: c.label })), ...(custom.data ?? []).map((c) => ({ key: `custom:${c.id}`, label: c.name }))].map((c) => (
                <Chip key={c.key} label={c.label} selected={categories.includes(c.key)} onPress={() => setCategories(categories.includes(c.key) ? categories.filter((x) => x !== c.key) : [...categories, c.key])} />
              ))}
            </Row>
            <Button label="Manage custom categories" variant="ghost" compact onPress={() => { setFiltersOpen(false); router.push('/settings/categories'); }} />
          </Stack>
        </Stack>
      </Sheet>
      <ConfirmDialog
        visible={confirmDelete}
        title={`Delete ${selected.size} item${selected.size === 1 ? '' : 's'}?`}
        message="This removes them and their reminders. Recurring items stop repeating. This can't be undone — use Archive to keep a record instead."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); void runBulk('delete'); }}
      />
    </View>
  );
}
