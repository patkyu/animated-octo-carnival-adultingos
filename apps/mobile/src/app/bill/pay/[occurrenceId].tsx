import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { formatDateLong, formatMinor, minorToInput, parseAmountToMinor, todayInZone, type LocalDate } from '@adultingos/shared';
import { getOccurrence } from '@/db/obligations';
import { markBillPaid } from '@/db/finance';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Card, Stack } from '@/ui/primitives';
import { DateField, TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { toast } from '@/ui/overlays';
import { EmptyState, LoadingList, Notice } from '@/ui/states';

/** Confirms a payment: records date + amount, then schedules exactly one next occurrence. */
export default function PayBill() {
  const { occurrenceId } = useLocalSearchParams<{ occurrenceId: string }>();
  const tz = useAppStore((s) => s.profile.timezone);
  const [paidOn, setPaidOn] = useState<LocalDate | null>(todayInZone(tz));
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: occ, isLoading } = useData(['occurrence', occurrenceId], () => getOccurrence(occurrenceId));
  useEffect(() => {
    const a = occ?.amountMinor ?? occ?.billAmountMinor;
    if (a !== null && a !== undefined) setAmount(minorToInput(a));
  }, [occ]);

  if (isLoading) return <Screen title="Mark as paid"><LoadingList rows={2} /></Screen>;
  if (!occ) return <Screen title="Mark as paid"><EmptyState mascot="piso" title="Bill not found" body="It may have been deleted." /></Screen>;
  if (occ.status === 'done') return <Screen title="Mark as paid"><Notice tone="success" title="Already paid">This bill was already marked as paid. Nothing was changed.</Notice></Screen>;

  return (
    <Screen title="Mark as paid" footer={
      <Button label="Confirm payment" icon="check" full loading={busy} onPress={async () => {
        const minor = parseAmountToMinor(amount);
        if (minor === null) return setError('Enter the amount you paid, like 1,250.50');
        if (!paidOn) return setError('Choose the payment date.');
        setBusy(true);
        try {
          const r = await markBillPaid(occurrenceId, paidOn, minor);
          toast(r.nextOccurrenceId ? 'Paid! Piso scheduled the next one.' : 'Paid! Every little peso counts.', 'success', { mascot: 'piso' });
          router.back();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not save the payment.');
        } finally {
          setBusy(false);
        }
      }} />
    }>
      <Card tone="catFinance">
        <Stack gap={6} style={{ alignItems: 'center' }}>
          <Mascot id="piso" expression="excited" size={96} />
          <AppText variant="section" color="onCategory" align="center">{occ.title}</AppText>
          <AppText color="onCategory">Due {formatDateLong(occ.dueDate)}</AppText>
          {occ.billAmountMinor !== null && occ.currency ? <AppText variant="number" color="onCategory">{formatMinor(occ.billAmountMinor, occ.currency as 'PHP')}</AppText> : null}
        </Stack>
      </Card>
      <DateField label="Paid on" value={paidOn} onChange={setPaidOn} />
      <TextField label="Amount paid" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={error} />
      <AppText variant="caption" color="textMuted">This records a payment you made elsewhere. AdultingOS does not send money.</AppText>
    </Screen>
  );
}
