import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { categoryLabel, describeRule, formatDateLong, formatDateShort, formatTime12, todayInZone } from '@adultingos/shared';
import {
  addChecklistItem, checklistFor, currentOccurrence, deleteObligation, getObligation, listCustomCategories, occurrencesFor, removeChecklistItem,
  reopenOccurrence, setArchived, skipOccurrence, toggleChecklistItem, completeOccurrence,
} from '@/db/obligations';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button, Card, Divider, Icon, IconButton, Row, Stack, StatusBadge } from '@/ui/primitives';
import { TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { ConfirmDialog, Sheet, toast } from '@/ui/overlays';
import { RescheduleSheet } from '@/ui/RescheduleSheet';
import { EmptyState, LoadingList } from '@/ui/states';
import { SyncLabel } from '@/ui/SyncLabel';
import { dueTone } from '@/ui/TaskRow';

export default function TaskDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resched, setResched] = useState(false);
  const [newStep, setNewStep] = useState('');

  const { data, isLoading } = useData(['task', id], async () => {
    const ob = await getObligation(id);
    if (!ob) return null;
    const [occ, history, checklist, custom] = await Promise.all([currentOccurrence(id), occurrencesFor(id), checklistFor(id), listCustomCategories()]);
    return { ob, occ, history, checklist, custom };
  });

  if (isLoading) return <Screen title="Task"><LoadingList rows={3} /></Screen>;
  if (!data) {
    return (
      <Screen title="Task">
        <EmptyState mascot="tiki" title="This task isn't here anymore" body="It may have been deleted, possibly on another device. Its reminders were cancelled." actionLabel="Go to Tasks" onAction={() => router.replace('/tasks')} />
      </Screen>
    );
  }
  const { ob, occ, history, checklist, custom } = data;
  const status = occ ? dueTone(occ, today) : { tone: 'neutral' as const, label: 'No date' };
  const done = occ?.status === 'done';
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <Screen title="Task" actions={<IconButton icon="more-vertical" label="More actions" onPress={() => setMenu(true)} />}
      footer={occ ? (
        <Row gap={10}>
          {!done ? <Button label="Reschedule" icon="calendar" variant="secondary" onPress={() => setResched(true)} style={{ flex: 1 }} /> : null}
          <Button
            label={done ? 'Reopen' : 'Mark done'}
            icon={done ? 'rotate-ccw' : 'check'}
            variant={done ? 'secondary' : 'primary'}
            style={{ flex: 1 }}
            onPress={async () => {
              if (done) await reopenOccurrence(occ.id);
              else {
                const r = await completeOccurrence(occ.id);
                toast(r.nextOccurrenceId ? 'Done! The next one is scheduled.' : 'Nice work!', 'success', { mascot: 'adu' });
              }
            }}
          />
        </Row>
      ) : undefined}>
      <Stack gap={8}>
        <Row wrap gap={8}>
          <StatusBadge label={status.label} tone={status.tone} />
          {ob.archivedAt ? <StatusBadge label="Archived" tone="neutral" icon="archive" /> : null}
          {ob.source === 'ai' ? <StatusBadge label="Suggested by Ask Adu" tone="info" icon="message-circle" /> : null}
          {ob.source === 'guide' ? <StatusBadge label="From a guide" tone="info" icon="book-open" /> : null}
        </Row>
        <AppText variant="title">{ob.title}</AppText>
        {ob.description ? <AppText color="textMuted">{ob.description}</AppText> : null}
        <SyncLabel state={ob.syncState} />
      </Stack>

      <Card>
        <Stack gap={12}>
          <Row gap={12}><Icon name="calendar" color="textMuted" /><AppText>{occ ? `${formatDateLong(occ.dueDate)}${ob.dueTime ? ` · ${formatTime12(ob.dueTime)}` : ''}` : 'No date'}</AppText></Row>
          <Row gap={12}><Icon name="repeat" color="textMuted" /><AppText>{describeRule(ob.recurrence)}</AppText></Row>
          <Row gap={12}><Icon name="bell" color="textMuted" /><AppText>{ob.reminderOffsets.length ? ob.reminderOffsets.map((n) => (n === 0 ? 'on the day' : `${n} day${n === 1 ? '' : 's'} before`)).join(', ') : 'No reminders'}</AppText></Row>
          <Row gap={12}><Icon name="tag" color="textMuted" /><AppText>{categoryLabel(ob.category, custom)} · {ob.priority} priority{ob.tags.length ? ` · ${ob.tags.join(', ')}` : ''}</AppText></Row>
        </Stack>
      </Card>

      <Card>
        <Stack gap={8}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="section">Checklist</AppText>
            {checklist.length ? <AppText variant="caption" color="textMuted">{doneCount}/{checklist.length} done</AppText> : null}
          </Row>
          {checklist.map((c) => (
            <Row key={c.id} gap={4}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: c.done }} accessibilityLabel={c.title} onPress={() => toggleChecklistItem(c.id, !c.done)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
                <Icon name={c.done ? 'check-square' : 'square'} color={c.done ? 'success' : 'textMuted'} />
                <AppText style={c.done ? { textDecorationLine: 'line-through', color: t.c.textMuted } : undefined}>{c.title}</AppText>
              </Pressable>
              <IconButton icon="x" label={`Remove ${c.title}`} size={18} tone="textMuted" onPress={() => removeChecklistItem(c.id)} />
            </Row>
          ))}
          <Row gap={8}>
            <Stack style={{ flex: 1 }} gap={0}>
              <TextField label="Add a step" value={newStep} onChangeText={setNewStep} maxLength={120} onSubmitEditing={() => { if (newStep.trim()) { void addChecklistItem(id, newStep); setNewStep(''); } }} />
            </Stack>
            <IconButton icon="plus" label="Add step" onPress={() => { if (newStep.trim()) { void addChecklistItem(id, newStep); setNewStep(''); } }} />
          </Row>
        </Stack>
      </Card>

      {ob.notes ? (
        <Card><Stack gap={6}><AppText variant="section">Notes</AppText><AppText>{ob.notes}</AppText></Stack></Card>
      ) : null}

      {history.filter((h) => h.status !== 'open').length ? (
        <Card>
          <Stack gap={6}>
            <AppText variant="section">History</AppText>
            {history.filter((h) => h.status !== 'open').slice(0, 12).map((h) => (
              <Row key={h.id} style={{ justifyContent: 'space-between', minHeight: 32 }}>
                <AppText variant="support">Due {formatDateShort(h.dueDate)}</AppText>
                <StatusBadge label={h.status === 'done' ? `Done ${h.completedOn ? formatDateShort(h.completedOn) : ''}` : 'Skipped'} tone={h.status === 'done' ? 'success' : 'neutral'} />
              </Row>
            ))}
          </Stack>
        </Card>
      ) : null}

      <Sheet visible={menu} onClose={() => setMenu(false)} title="Task options">
        <Stack gap={6}>
          <Button label="Edit" icon="edit-2" variant="secondary" full onPress={() => { setMenu(false); router.push(`/task/edit/${id}`); }} />
          {occ && occ.status === 'open' && ob.recurrence.freq !== 'none' ? (
            <Button label="Skip this time" icon="skip-forward" variant="secondary" full onPress={async () => { setMenu(false); await skipOccurrence(occ.id); toast('Skipped. The next one is scheduled.'); }} />
          ) : null}
          <Button label={ob.archivedAt ? 'Restore from archive' : 'Archive'} icon="archive" variant="secondary" full onPress={async () => {
            setMenu(false);
            await setArchived(id, !ob.archivedAt);
            toast(ob.archivedAt ? 'Restored.' : 'Archived. Find it under Tasks → Archived.', 'info', ob.archivedAt ? {} : { action: { label: 'Undo', onPress: () => void setArchived(id, false) } });
          }} />
          <Divider />
          <Button label="Delete" icon="trash-2" variant="danger" full onPress={() => { setMenu(false); setConfirmDelete(true); }} />
        </Stack>
      </Sheet>
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this task?"
        message={ob.recurrence.freq !== 'none' ? 'This deletes the task and all its future repeats, and cancels its reminders.' : 'This deletes the task and cancels its reminders.'}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await deleteObligation(id);
          toast('Task deleted.');
          router.back();
        }}
      />
      <RescheduleSheet visible={resched} occurrenceId={occ?.id ?? null} title={ob.title} onClose={() => setResched(false)} />
    </Screen>
  );
}
