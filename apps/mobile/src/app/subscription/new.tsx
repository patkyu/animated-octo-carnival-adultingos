import { router } from 'expo-router';
import { useState } from 'react';
import { SUBSCRIPTION_CATEGORIES, firstError, makeRule, parseAmountToMinor, subscriptionInputSchema, todayInZone, type LocalDate, type RecurrenceFrequency } from '@adultingos/shared';
import { createSubscription } from '@/db/finance';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Stack } from '@/ui/primitives';
import { DateField, FormSection, OffsetsField, Segmented, SelectField, TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';
import { Notice } from '@/ui/states';

export default function NewSubscription() {
  const tz = useAppStore((s) => s.profile.timezone);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('streaming');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'PHP' | 'USD'>('PHP');
  const [freq, setFreq] = useState<RecurrenceFrequency>('monthly');
  const [next, setNext] = useState<LocalDate | null>(todayInZone(tz));
  const [trial, setTrial] = useState<LocalDate | null>(null);
  const [offsets, setOffsets] = useState<number[]>([3]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const minor = parseAmountToMinor(amount);
    if (minor === null) return setError('Enter the price, like 149 or 549.00');
    if (!next) return setError('Choose the next renewal date.');
    const parsed = subscriptionInputSchema.safeParse({
      name, category, amountMinor: minor, currency, nextRenewal: next, recurrence: makeRule(freq, next), trialEndsOn: trial, reminderOffsets: offsets, notes: '',
    });
    if (!parsed.success) return setError(firstError(parsed.error));
    setBusy(true);
    try {
      const id = await createSubscription(parsed.data);
      toast('Subscription saved.', 'success', { mascot: 'piso' });
      router.replace(`/subscription/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Add a subscription">
      <Stack gap={24}>
        <FormSection>
          <TextField label="Service name" required value={name} onChangeText={setName} placeholder="e.g. Music streaming" maxLength={120} />
          <SelectField label="Type" value={category} options={SUBSCRIPTION_CATEGORIES.map((c) => ({ value: c.key as string, label: c.label }))} onChange={setCategory} />
        </FormSection>
        <FormSection title="Price">
          <Segmented label="Currency" value={currency} onChange={setCurrency} options={[{ value: 'PHP', label: '₱ PHP' }, { value: 'USD', label: '$ USD' }]} />
          <TextField label="Price per renewal" required value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
          <SelectField label="Billed" value={freq} onChange={setFreq} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' }, { value: 'weekly', label: 'Weekly' }]} />
        </FormSection>
        <FormSection title="Dates">
          <DateField label="Next renewal" required value={next} onChange={setNext} />
          <DateField label="Free trial ends (optional)" value={trial} onChange={setTrial} allowClear quick={false} helper="We'll show it so you can decide before you're charged." />
          <OffsetsField label="Remind me" value={offsets} options={[0, 1, 3, 7]} onChange={setOffsets} />
        </FormSection>
        <AppText variant="caption" color="textMuted">AdultingOS tracks subscriptions you enter. It can't cancel services for you — cancel with the provider, then record it here.</AppText>
        {error ? <Notice tone="danger" title="Not saved">{error}</Notice> : null}
        <Button label="Save subscription" onPress={save} loading={busy} full />
      </Stack>
    </Screen>
  );
}
