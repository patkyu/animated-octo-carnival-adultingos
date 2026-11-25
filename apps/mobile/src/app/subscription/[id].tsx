import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SUBSCRIPTION_CATEGORIES, describeRule, formatDateLong, formatDateShort, formatMinor, labelFor, todayInZone, type LocalDate } from '@adultingos/shared';
import { completeOccurrence, currentOccurrence, deleteObligation } from '@/db/obligations';
import { getSubscriptionByObligation, reactivateSubscription, recordSubscriptionCanceled, subscriptionHistory } from '@/db/finance';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Card, Icon, Row, Stack, StatusBadge } from '@/ui/primitives';
import { DateField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { ConfirmDialog, Sheet, toast } from '@/ui/overlays';
import { EmptyState, LoadingList, Notice } from '@/ui/states';
import { SyncLabel } from '@/ui/SyncLabel';

export default function SubscriptionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelDate, setCancelDate] = useState<LocalDate | null>(today);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data, isLoading } = useData(['subscription', id], async () => {
    const sub = await getSubscriptionByObligation(id);
    return sub ? { sub, history: await subscriptionHistory(id) } : null;
  });
  if (isLoading) return <Screen title="Subscription"><LoadingList rows={3} /></Screen>;
  if (!data) return <Screen title="Subscription"><EmptyState mascot="piso" title="Not found" body="This subscription may have been deleted." /></Screen>;
  const { sub, history } = data;

  return (
    <Screen title="Subscription">
      <Stack gap={6}>
        <AppText variant="title">{sub.obligation.title}</AppText>
        <Row gap={8} wrap>
          <StatusBadge label={sub.status === 'active' ? 'Active' : `Canceled ${sub.canceledOn ? formatDateShort(sub.canceledOn) : ''}`} tone={sub.status === 'active' ? 'success' : 'neutral'} />
          <AppText variant="caption" color="textMuted">{labelFor(SUBSCRIPTION_CATEGORIES, sub.category)}</AppText>
        </Row>
        <SyncLabel state={sub.obligation.syncState} />
      </Stack>
      <Card tone="catCalendar">
        <Stack gap={4}>
          <AppText variant="display" color="onCategory">{formatMinor(sub.amountMinor, sub.currency)}</AppText>
          <AppText color="onCategory">{describeRule(sub.obligation.recurrence)} · ≈ {formatMinor(sub.monthlyMinor, sub.currency)}/month · {formatMinor(sub.annualMinor, sub.currency)}/year</AppText>
          {sub.nextRenewal && sub.status === 'active' ? <AppText color="onCategory">Next renewal: {formatDateLong(sub.nextRenewal)}</AppText> : null}
          {sub.trialEndsOn ? <AppText color="onCategory">Free trial {sub.trialEndsOn >= today ? 'ends' : 'ended'} {formatDateLong(sub.trialEndsOn)}</AppText> : null}
        </Stack>
      </Card>
      {sub.status === 'active' ? (
        <Stack gap={8}>
          {sub.nextRenewal && sub.nextRenewal <= today ? (
            <Button label="It renewed — schedule the next one" icon="repeat" full onPress={async () => {
              const cur = await currentOccurrence(id);
              if (cur) await completeOccurrence(cur.id);
              toast('Next renewal scheduled.', 'success');
            }} />
          ) : null}
          <Button label="I canceled this subscription" icon="x-circle" variant="secondary" full onPress={() => setCancelOpen(true)} />
          <Notice>AdultingOS can't cancel services for you. Cancel with the provider, then record it here to stop reminders.</Notice>
        </Stack>
      ) : (
        <Button label="Reactivate tracking" icon="rotate-ccw" variant="secondary" full onPress={async () => { await reactivateSubscription(id); toast('Tracking again.'); }} />
      )}
      <Card>
        <Stack gap={8}>
          <AppText variant="section">Renewal history</AppText>
          {history.length === 0 ? <AppText color="textMuted">No renewals recorded yet.</AppText> : history.map((h) => (
            <Row key={h.id} gap={10}><Icon name="check-circle" color="success" size={16} /><AppText variant="support">Renewed {formatDateShort(h.dueDate)}</AppText></Row>
          ))}
        </Stack>
      </Card>
      <Button label="Delete" icon="trash-2" variant="ghost" onPress={() => setConfirmDelete(true)} />
      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)} title="Record cancellation"
        footer={<Button label="Save" full onPress={async () => { if (!cancelDate) return; await recordSubscriptionCanceled(id, cancelDate); setCancelOpen(false); toast('Recorded. Reminders stopped.', 'success'); }} />}>
        <DateField label="Canceled on" value={cancelDate} onChange={setCancelDate} />
      </Sheet>
      <ConfirmDialog visible={confirmDelete} title="Delete this subscription?" message="This removes it and its history. Use “I canceled” instead to keep a record." confirmLabel="Delete" destructive
        onCancel={() => setConfirmDelete(false)} onConfirm={async () => { setConfirmDelete(false); await deleteObligation(id); toast('Deleted.'); router.back(); }} />
    </Screen>
  );
}
