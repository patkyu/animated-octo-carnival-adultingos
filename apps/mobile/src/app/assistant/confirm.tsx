import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { addDays, formatDateShort, todayInZone, type LocalDate } from '@adultingos/shared';
import { AiError, cancelProposal, confirmProposal } from '@/features/ai';
import { useChat } from '@/features/chatStore';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button, Card, Icon, Row, Stack } from '@/ui/primitives';
import { DateField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Sheet, toast } from '@/ui/overlays';
import { EmptyState, Notice } from '@/ui/states';

/** AI action confirmation: the user picks tasks and dates; nothing happens before "Add". */
export default function ConfirmProposal() {
  const t = useTheme();
  const { messageId } = useLocalSearchParams<{ messageId: string }>();
  const msg = useChat((s) => s.messages.find((m) => m.id === messageId));
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const proposal = msg?.proposal;
  const [selected, setSelected] = useState<Set<number>>(new Set(proposal?.tasks.map((_, i) => i) ?? []));
  const [dates, setDates] = useState<Record<number, LocalDate | null>>(Object.fromEntries((proposal?.tasks ?? []).map((tk, i) => [i, tk.dueDate ?? addDays(today, 7)])));
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  if (!proposal) return <Screen title="Suggested tasks"><EmptyState title="Suggestion not found" body="Ask Adu again for a fresh checklist." /></Screen>;

  return (
    <Screen title="Suggested tasks" footer={
      <Row gap={10}>
        <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={async () => { await cancelProposal(proposal.id).catch(() => undefined); router.back(); }} />
        <Button label={`Add ${selected.size}`} icon="check" style={{ flex: 1.4 }} disabled={!selected.size} loading={busy} onPress={async () => {
          setBusy(true);
          try {
            await confirmProposal(proposal.id, [...selected], Object.fromEntries([...selected].map((i) => [i, dates[i] ?? null])));
            toast(`${selected.size} task${selected.size === 1 ? '' : 's'} added.`, 'success', { mascot: 'adu' });
            router.replace('/tasks');
          } catch (e) {
            toast(e instanceof AiError ? e.message : 'Could not add the tasks.', 'error');
          } finally {
            setBusy(false);
          }
        }} />
      </Row>
    }>
      <Notice icon="info" title="Review before adding">These were suggested by Ask Adu (AI). Untick anything you don't need and set your own dates.</Notice>
      <Stack gap={8}>
        {proposal.tasks.map((tk, i) => {
          const on = selected.has(i);
          return (
            <Card key={i}>
              <Row gap={12}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={tk.title} hitSlop={8}
                  onPress={() => setSelected((cur) => { const n = new Set(cur); if (n.has(i)) n.delete(i); else n.add(i); return n; })}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: on ? t.c.primary : t.c.borderStrong, backgroundColor: on ? t.c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Icon name="check" size={16} color="onPrimary" /> : null}
                  </View>
                </Pressable>
                <Stack gap={2} style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{tk.title}</AppText>
                  {tk.notes ? <AppText variant="caption" color="textMuted">{tk.notes}</AppText> : null}
                  {on ? <AppText variant="caption" color="textMuted">Due {dates[i] ? formatDateShort(dates[i]!) : 'in a week'}</AppText> : null}
                </Stack>
                {on ? <Button label="Date" compact variant="ghost" onPress={() => setEditing(i)} /> : null}
              </Row>
            </Card>
          );
        })}
      </Stack>
      <Sheet visible={editing !== null} onClose={() => setEditing(null)} title="Set a due date" footer={<Button label="Done" full onPress={() => setEditing(null)} />}>
        {editing !== null ? <DateField label="Due date" value={dates[editing] ?? null} onChange={(d) => setDates({ ...dates, [editing]: d })} /> : null}
      </Sheet>
    </Screen>
  );
}
