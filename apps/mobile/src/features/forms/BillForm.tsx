import { useState } from 'react';
import { BILL_CATEGORIES, billInputSchema, firstError, makeRule, minorToInput, parseAmountToMinor, todayInZone, type BillInput, type RecurrenceFrequency } from '@adultingos/shared';
import { AppText, Button, Stack } from '@/ui/primitives';
import { DateField, FormSection, OffsetsField, Segmented, SelectField, TextField, ToggleRow } from '@/ui/forms';
import { Notice } from '@/ui/states';

export const BILL_FREQS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' }, { value: 'none', label: 'One time' },
];

export function emptyBill(tz: string): BillInput {
  const due = todayInZone(tz);
  return { name: '', provider: '', category: 'electricity', amountMinor: null, variableAmount: false, currency: 'PHP', dueDate: due, recurrence: makeRule('monthly', due), reminderOffsets: [3, 0], notes: '' };
}

/** Bill form. Amounts are parsed to integer centavos — never floating point. */
export function BillForm({ initial, onSubmit, submitLabel }: { initial: BillInput; onSubmit: (v: BillInput) => Promise<void>; submitLabel: string }) {
  const [v, setV] = useState<BillInput>(initial);
  const [amountText, setAmountText] = useState(minorToInput(initial.amountMinor));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<BillInput>) => setV((cur) => ({ ...cur, ...p }));

  const submit = async () => {
    const e: Record<string, string> = {};
    let amountMinor: number | null = null;
    if (amountText.trim()) {
      amountMinor = parseAmountToMinor(amountText);
      if (amountMinor === null) e.amount = 'Enter an amount like 1,250.50';
    } else if (!v.variableAmount) e.amount = 'Enter the amount, or turn on “Amount changes each time”.';
    const candidate = { ...v, amountMinor, recurrence: v.recurrence.freq === 'none' ? v.recurrence : makeRule(v.recurrence.freq, v.dueDate) };
    const parsed = billInputSchema.safeParse(candidate);
    if (!parsed.success) e.form = firstError(parsed.error);
    setErrors(e);
    if (Object.keys(e).length || !parsed.success) return;
    setBusy(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap={24}>
      <FormSection>
        <TextField label="Bill name" required value={v.name} onChangeText={(name) => set({ name })} placeholder="e.g. Electricity" maxLength={120} />
        <TextField label="Provider (optional)" value={v.provider ?? ''} onChangeText={(provider) => set({ provider })} maxLength={80} />
        <SelectField label="Category" value={v.category} options={BILL_CATEGORIES.map((c) => ({ value: c.key as string, label: c.label }))} onChange={(category) => set({ category })} />
      </FormSection>
      <FormSection title="Amount">
        <Segmented label="Currency" value={v.currency} onChange={(currency) => set({ currency })} options={[{ value: 'PHP', label: '₱ PHP' }, { value: 'USD', label: '$ USD' }]} />
        <TextField label={v.variableAmount ? 'Usual amount (optional)' : 'Amount'} required={!v.variableAmount} value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} />
        <ToggleRow label="Amount changes each time" helper="e.g. electricity or water. You'll confirm the amount when you mark it paid." value={v.variableAmount} onChange={(variableAmount) => set({ variableAmount })} />
      </FormSection>
      <FormSection title="Schedule">
        <DateField label="Next due date" required value={v.dueDate} onChange={(d) => d && set({ dueDate: d })} />
        <SelectField label="Repeats" value={v.recurrence.freq} options={BILL_FREQS.map((f) => ({ ...f }))} onChange={(freq) => set({ recurrence: freq === 'none' ? { freq: 'none', interval: 1 } : makeRule(freq, v.dueDate) })}
          helper={v.recurrence.freq === 'monthly' && Number(v.dueDate.slice(8)) > 28 ? 'In shorter months this falls on the last day of the month.' : undefined} />
        <OffsetsField label="Remind me" value={v.reminderOffsets} options={[0, 1, 3, 5, 7]} onChange={(reminderOffsets) => set({ reminderOffsets })} />
      </FormSection>
      <TextField label="Notes (optional)" value={v.notes ?? ''} onChangeText={(notes) => set({ notes })} multiline helper="Don't store account numbers or card details here." />
      <AppText variant="caption" color="textMuted">Amounts are entered by you and aren't verified balances. AdultingOS doesn't connect to banks or make payments.</AppText>
      {errors.form ? <Notice tone="danger" title="Not saved">{errors.form}</Notice> : null}
      <Button label={submitLabel} onPress={submit} loading={busy} full />
    </Stack>
  );
}
