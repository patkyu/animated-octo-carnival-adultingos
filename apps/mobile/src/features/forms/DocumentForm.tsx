import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { DOCUMENT_TEMPLATES, RENEWAL_OFFSET_CHOICES, documentInputSchema, documentTemplate, type DocumentInput } from '@adultingos/shared';
import { AppText, Button, Stack } from '@/ui/primitives';
import { DateField, FormSection, OffsetsField, Segmented, SelectField, TextField } from '@/ui/forms';
import { Notice } from '@/ui/states';

export function emptyDocument(templateKey = 'passport'): DocumentInput {
  const t = documentTemplate(templateKey);
  return {
    templateKey, name: t.key === 'custom' ? '' : t.name, issuer: t.issuer, stage: 'obtained', issueDate: null, expiryDate: null, referenceLast4: '',
    officialUrl: t.officialUrl ?? '', reminderOffsets: t.expiry === 'no' ? [] : [90, 30, 7], notes: '',
  };
}

export function DocumentForm({ initial, onSubmit, submitLabel, lockTemplate }: { initial: DocumentInput; onSubmit: (v: DocumentInput) => Promise<void>; submitLabel: string; lockTemplate?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<DocumentInput>({
    resolver: zodResolver(documentInputSchema) as unknown as Resolver<DocumentInput>,
    defaultValues: initial,
  });
  const v = watch();
  const tpl = documentTemplate(v.templateKey);
  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  });

  return (
    <Stack gap={24}>
      <FormSection>
        {!lockTemplate ? (
          <SelectField label="Document type" value={v.templateKey} options={DOCUMENT_TEMPLATES.map((d) => ({ value: d.key, label: d.name, description: d.issuer || undefined }))}
            onChange={(key) => reset({ ...emptyDocument(key), notes: v.notes })} />
        ) : null}
        <Controller control={control} name="name" render={({ field }) => (
          <TextField label="Name" required value={field.value} onChangeText={field.onChange} error={errors.name?.message} maxLength={120} />
        )} />
        <Controller control={control} name="issuer" render={({ field }) => (
          <TextField label="Issued by" value={field.value ?? ''} onChangeText={field.onChange} maxLength={120} />
        )} />
        <Controller control={control} name="stage" render={({ field }) => (
          <Stack gap={6}>
            <AppText variant="supportStrong">Status</AppText>
            <Segmented label="Document status" value={field.value} onChange={field.onChange} options={[{ value: 'obtained', label: 'I have it' }, { value: 'in_progress', label: 'Applying' }, { value: 'not_obtained', label: 'Need it' }]} />
          </Stack>
        )} />
      </FormSection>

      {v.stage === 'obtained' ? (
        <FormSection title="Dates">
          <Controller control={control} name="issueDate" render={({ field }) => (
            <DateField label="Issue date (optional)" value={field.value ?? null} onChange={field.onChange} allowClear quick={false} />
          )} />
          <Controller control={control} name="expiryDate" render={({ field }) => (
            <DateField label="Expiry date" value={field.value ?? null} onChange={field.onChange} allowClear quick={false} error={errors.expiryDate?.message}
              helper={tpl.expiry === 'no' ? 'Usually no expiry — leave empty if it does not expire.' : tpl.expiry === 'varies' ? 'Some versions expire. Leave empty if yours does not.' : 'Check the date printed on your document.'} />
          )} />
          {v.expiryDate ? (
            <Controller control={control} name="reminderOffsets" render={({ field }) => (
              <OffsetsField label="Renewal reminders" value={field.value} options={RENEWAL_OFFSET_CHOICES} onChange={field.onChange} />
            )} />
          ) : null}
        </FormSection>
      ) : null}

      <FormSection title="Reference (optional)">
        <Notice icon="shield" title="Only the last 4 characters">
          AdultingOS never stores full ID numbers. Add the last 4 characters if it helps you tell documents apart.
        </Notice>
        <Controller control={control} name="referenceLast4" render={({ field }) => (
          <TextField label="Last 4 characters" value={field.value ?? ''} onChangeText={(s) => field.onChange(s.replace(/[^A-Za-z0-9]/g, '').slice(-4))} maxLength={4} autoCapitalize="characters" error={errors.referenceLast4?.message} />
        )} />
        <Controller control={control} name="notes" render={({ field }) => (
          <TextField label="Notes" value={field.value ?? ''} onChangeText={field.onChange} multiline error={errors.notes?.message} helper="e.g. where you keep it. Don't write full ID numbers." />
        )} />
      </FormSection>
      {err ? <Notice tone="danger" title="Not saved">{err}</Notice> : null}
      <Button label={submitLabel} onPress={() => void submit()} loading={busy} full />
    </Stack>
  );
}
