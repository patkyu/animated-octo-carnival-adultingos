import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { addDays, formatDateShort, todayInZone, uuidv4, type LocalDate } from '@adultingos/shared';
import { createTask } from '@/db/obligations';
import { getGuide } from '@/features/guides';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button, Card, Icon, Row, Stack } from '@/ui/primitives';
import { DateField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Sheet, toast } from '@/ui/overlays';
import { EmptyState, LoadingList } from '@/ui/states';

/** Checklist preview: choose steps and deadlines, then add them as tasks. */
export default function ChecklistPreview() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const { data: g, isLoading } = useData(['guide', slug], () => getGuide(slug));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dates, setDates] = useState<Record<number, LocalDate>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!g) return;
    setSelected(new Set(g.steps.map((s, i) => (s.optional ? -1 : i)).filter((i) => i >= 0)));
    setDates(Object.fromEntries(g.steps.map((s, i) => [i, addDays(today, Math.max(1, s.offsetDays ?? 0))])));
  }, [g, today]);

  if (isLoading) return <Screen title="Add steps"><LoadingList rows={4} /></Screen>;
  if (!g) return <Screen title="Add steps"><EmptyState mascot="doki" title="Guide not available" body="It may have been withdrawn for review." /></Screen>;

  const add = async () => {
    setBusy(true);
    const batch = uuidv4();
    try {
      for (const i of [...selected].sort((a, b) => a - b)) {
        const s = g.steps[i]!;
        await createTask(
          {
            title: s.title.slice(0, 120), description: s.body.slice(0, 2000), category: g.category === 'government' ? 'government' : g.category === 'employment' ? 'work' : g.category === 'freelancing' ? 'work' : 'personal',
            priority: 'medium', dueDate: dates[i] ?? addDays(today, 7), dueTime: null, recurrence: { freq: 'none', interval: 1 }, reminderOffsets: [1, 0],
            tags: [g.slug], notes: `From the guide “${g.title}”.`, checklist: [],
          },
          { source: 'guide', sourceRef: `${g.slug}:${batch}` },
        );
      }
      toast(`${selected.size} step${selected.size === 1 ? '' : 's'} added to Tasks.`, 'success', { mascot: 'doki' });
      router.replace({ pathname: '/tasks', params: { category: g.category === 'government' ? 'government' : '' } });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not add the steps.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Add steps to Tasks" footer={<Button label={`Add ${selected.size} step${selected.size === 1 ? '' : 's'}`} full disabled={!selected.size} loading={busy} onPress={add} />}>
      <AppText variant="section">{g.title}</AppText>
      <AppText color="textMuted">Choose the steps you need and adjust the dates. You can change everything later.</AppText>
      <Stack gap={8}>
        {g.steps.map((s, i) => {
          const on = selected.has(i);
          return (
            <Card key={i}>
              <Row gap={12}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={s.title} hitSlop={8}
                  onPress={() => setSelected((cur) => { const n = new Set(cur); if (n.has(i)) n.delete(i); else n.add(i); return n; })}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: on ? t.c.primary : t.c.borderStrong, backgroundColor: on ? t.c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Icon name="check" size={16} color="onPrimary" /> : null}
                  </View>
                </Pressable>
                <Stack gap={2} style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{s.title}{s.optional ? ' (optional)' : ''}</AppText>
                  {on ? <AppText variant="caption" color="textMuted">Due {formatDateShort(dates[i] ?? today)}</AppText> : null}
                </Stack>
                {on ? <Button label="Date" compact variant="ghost" onPress={() => setEditing(i)} /> : null}
              </Row>
            </Card>
          );
        })}
      </Stack>
      <Sheet visible={editing !== null} onClose={() => setEditing(null)} title="Set a deadline" footer={<Button label="Done" full onPress={() => setEditing(null)} />}>
        {editing !== null ? <DateField label="Due date" value={dates[editing] ?? today} onChange={(d) => d && setDates({ ...dates, [editing]: d })} /> : null}
      </Sheet>
    </Screen>
  );
}
