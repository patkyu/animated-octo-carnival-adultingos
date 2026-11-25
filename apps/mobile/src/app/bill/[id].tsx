import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { describeRule, formatDateLong, formatDateShort, formatMinor, labelFor, BILL_CATEGORIES, todayInZone } from '@adultingos/shared';
import { deleteObligation, setArchived } from '@/db/obligations';
import { getBillByObligation, listPayments } from '@/db/finance';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Card, Divider, Icon, IconButton, Row, Stack, StatusBadge } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { ConfirmDialog, Sheet, toast } from '@/ui/overlays';
import { EmptyState, LoadingList } from '@/ui/states';
import { SyncLabel } from '@/ui/SyncLabel';
import { dueTone } from '@/ui/TaskRow';
import { RescheduleSheet } from '@/ui/RescheduleSheet';

export default function BillDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resched, setResched] = useState(false);
  const { data, isLoading } = useData(['bill', id], async () => {
    const bill = await getBillByObligation(id);
    return bill ? { bill, payments: await listPayments({ billId: bill.id }) } : null;
  });
  if (isLoading) return <Screen title="Bill"><LoadingList rows={3} /></Screen>;
  if (!data) return <Screen title="Bill"><EmptyState mascot="piso" title="This bill isn't here anymore" body="It may have been deleted on another device." actionLabel="All bills" onAction={() => router.replace('/bills')} /></Screen>;
  const { bill, payments } = data;
  const cur = bill.current;
  const due = cur ? dueTone(cur, today) : null;
  const amount = cur?.amountMinor ?? bill.amountMinor;

  return (
    <Screen title="Bill" actions={<IconButton icon="more-vertical" label="More actions" onPress={() => setMenu(true)} />}
      footer={cur && cur.status === 'open' ? (
        <Row gap={10}>
          <Button label="Reschedule" icon="calendar" variant="secondary" compact style={{ flex: 1 }} onPress={() => setResched(true)} />
          <Button label="Mark as paid" icon="check" style={{ flex: 1 }} onPress={() => router.push(`/bill/pay/${cur.id}`)} />
        </Row>
      ) : undefined}>
      <Row gap={12}>
        <Mascot id="piso" expression={due?.tone === 'danger' ? 'concern' : 'happy'} size={72} />
        <Stack gap={4} style={{ flex: 1 }}>
          <AppText variant="title">{bill.obligation.title}</AppText>
          <AppText color="textMuted">{[bill.provider, labelFor(BILL_CATEGORIES, bill.category)].filter(Boolean).join(' · ')}</AppText>
          <SyncLabel state={bill.obligation.syncState} />
        </Stack>
      </Row>
      <Card tone="catFinance">
        <Stack gap={6}>
          <AppText variant="supportStrong" color="onCategory">{cur?.status === 'open' ? 'Next payment' : 'Status'}</AppText>
          <AppText variant="display" color="onCategory">{amount !== null ? formatMinor(amount, bill.currency) : 'Amount varies'}</AppText>
          {cur ? <AppText color="onCategory">Due {formatDateLong(cur.dueDate)}</AppText> : null}
          {due ? <StatusBadge label={due.label} tone={due.tone} /> : null}
        </Stack>
      </Card>
      <Card>
        <Stack gap={10}>
          <Row gap={12}><Icon name="repeat" color="textMuted" /><AppText>{describeRule(bill.obligation.recurrence)}</AppText></Row>
          <Row gap={12}><Icon name="bell" color="textMuted" /><AppText>{bill.obligation.reminderOffsets.length ? bill.obligation.reminderOffsets.map((n) => (n === 0 ? 'on the day' : `${n} days before`)).join(', ') : 'No reminders'}</AppText></Row>
          {bill.variableAmount ? <Row gap={12}><Icon name="activity" color="textMuted" /><AppText>Amount changes each time</AppText></Row> : null}
          {bill.obligation.notes ? <><Divider /><AppText>{bill.obligation.notes}</AppText></> : null}
        </Stack>
      </Card>
      <Card>
        <Stack gap={8}>
          <AppText variant="section">Payment history</AppText>
          {payments.length === 0 ? <AppText color="textMuted">No payments recorded yet.</AppText> : payments.map((p) => (
            <Row key={p.id} style={{ justifyContent: 'space-between', minHeight: 40 }}>
              <Stack gap={0}>
                <AppText variant="bodyStrong">{formatMinor(p.amountMinor, p.currency as 'PHP')}</AppText>
                <AppText variant="caption" color="textMuted">Paid {formatDateShort(p.paidOn)}{p.dueDate ? ` · due ${formatDateShort(p.dueDate)}` : ''}</AppText>
              </Stack>
              <StatusBadge label="Paid" tone="success" />
            </Row>
          ))}
        </Stack>
      </Card>
      <AppText variant="caption" color="textMuted">Amounts are entered by you and aren't verified balances.</AppText>

      <Sheet visible={menu} onClose={() => setMenu(false)} title="Bill options">
        <Stack gap={6}>
          <Button label="Edit" icon="edit-2" variant="secondary" full onPress={() => { setMenu(false); router.push(`/bill/edit/${id}`); }} />
          <Button label={bill.obligation.archivedAt ? 'Restore' : 'Archive (stop tracking)'} icon="archive" variant="secondary" full onPress={async () => { setMenu(false); await setArchived(id, !bill.obligation.archivedAt); toast(bill.obligation.archivedAt ? 'Restored.' : 'Archived. Reminders stopped.'); }} />
          <Divider />
          <Button label="Delete" icon="trash-2" variant="danger" full onPress={() => { setMenu(false); setConfirmDelete(true); }} />
        </Stack>
      </Sheet>
      <ConfirmDialog visible={confirmDelete} title="Delete this bill?" message="This deletes the bill, its payment history and reminders. Archive it instead to keep the history." confirmLabel="Delete" destructive
        onCancel={() => setConfirmDelete(false)} onConfirm={async () => { setConfirmDelete(false); await deleteObligation(id); toast('Bill deleted.'); router.back(); }} />
      <RescheduleSheet visible={resched} occurrenceId={cur?.id ?? null} title={bill.obligation.title} onClose={() => setResched(false)} />
    </Screen>
  );
}
