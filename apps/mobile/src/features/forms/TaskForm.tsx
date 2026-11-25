import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { View , Platform } from 'react-native';
import { CUSTOM_UNITS, PRIORITIES, TASK_CATEGORIES, describeRule, taskInputSchema, todayInZone, type TaskInput } from '@adultingos/shared';
import { kvGet, kvSet } from '@/db/database';
import { createCustomCategory, listCustomCategories } from '@/db/obligations';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, IconButton, Row, Stack } from '@/ui/primitives';
import { DateField, OffsetsField, Segmented, SelectField, TextField, TimeField, FormSection } from '@/ui/forms';
import { Sheet } from '@/ui/overlays';
import { Notice } from '@/ui/states';
import { getPermissionState, requestPermission } from '@/notifications/scheduler';

const FREQ_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly', description: 'Same day each month. On the 29th–31st, shorter months use their last day.' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom…' },
] as const;

export const REMINDER_CHOICES = [0, 1, 3, 7, 14, 30] as const;

export function defaultTaskInput(tz: string): TaskInput {
  return {
    title: '', description: '', category: 'personal', priority: 'medium', dueDate: todayInZone(tz), dueTime: null,
    recurrence: { freq: 'none', interval: 1 }, reminderOffsets: [1, 0], tags: [], notes: '', checklist: [],
  };
}

/** Shared create/edit form. Drafts survive navigation away and back (draftKey). */
export function TaskForm({ initial, onSubmit, submitLabel, draftKey, showChecklist = true }: { initial: TaskInput; onSubmit: (v: TaskInput) => Promise<void>; submitLabel: string; draftKey?: string; showChecklist?: boolean }) {
  const tz = useAppStore((s) => s.profile.timezone);
  const notifEnabled = useAppStore((s) => s.notif.enabled);
  const custom = useData(['custom-categories'], listCustomCategories);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState(initial.tags.join(', '));
  const [permission, setPermission] = useState<string>('granted');
  const restored = useRef(false);

  const { control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<TaskInput>({
    resolver: zodResolver(taskInputSchema) as unknown as Resolver<TaskInput>,
    defaultValues: initial,
  });
  const checklist = useFieldArray({ control, name: 'checklist' });
  const values = watch();

  useEffect(() => {
    if (!draftKey || restored.current) return;
    restored.current = true;
    void kvGet<TaskInput | null>(draftKey, null).then((d) => {
      if (d && d.title) {
        reset(d);
        setTagsText(d.tags.join(', '));
      }
    });
  }, [draftKey, reset]);

  useEffect(() => {
    if (!draftKey) return;
    const h = setTimeout(() => void kvSet(draftKey, values), 500);
    return () => clearTimeout(h);
  }, [draftKey, values]);

  useEffect(() => {
    void getPermissionState().then(setPermission);
  }, []);

  const submit = handleSubmit(async (v) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const tags = tagsText.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
      await onSubmit({ ...v, tags });
      if (draftKey) await kvSet(draftKey, null);
    } catch (e) {
      // Inputs stay as typed so nothing is lost.
      setSubmitError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  });

  const categoryOptions = [
    ...TASK_CATEGORIES.map((c) => ({ value: c.key as string, label: c.label })),
    ...(custom.data ?? []).map((c) => ({ value: `custom:${c.id}`, label: c.name })),
    { value: '__new', label: '+ New category…' },
  ];

  return (
    <Stack gap={24}>
      <FormSection>
        <Controller control={control} name="title" render={({ field }) => (
          <TextField label="What needs doing?" required value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} maxLength={120} error={errors.title?.message} placeholder="e.g. Renew NBI clearance" />
        )} />
        <Controller control={control} name="category" render={({ field }) => (
          <SelectField label="Category" value={field.value} options={categoryOptions} onChange={(v) => (v === '__new' ? setNewCatOpen(true) : field.onChange(v))} />
        )} />
        <Controller control={control} name="priority" render={({ field }) => (
          <Stack gap={6}>
            <AppText variant="supportStrong">Priority</AppText>
            <Segmented label="Priority" value={field.value} onChange={field.onChange} options={PRIORITIES.map((p) => ({ value: p, label: p[0]!.toUpperCase() + p.slice(1) }))} />
          </Stack>
        )} />
      </FormSection>

      <FormSection title="When">
        <Controller control={control} name="dueDate" render={({ field }) => (
          <DateField label="Due date" required value={field.value} onChange={(d) => field.onChange(d ?? todayInZone(tz))} error={errors.dueDate?.message} />
        )} />
        <Controller control={control} name="dueTime" render={({ field }) => (
          <TimeField label="Time (optional)" value={field.value ?? null} onChange={field.onChange} allowClear />
        )} />
        <Controller control={control} name="recurrence" render={({ field }) => (
          <Stack gap={10}>
            <SelectField label="Repeat" value={field.value.freq} options={FREQ_OPTIONS.map((o) => ({ ...o }))} onChange={(freq) => field.onChange({ freq, interval: 1, unit: freq === 'custom' ? 'week' : undefined })} helper={describeRule(field.value)} />
            {field.value.freq === 'custom' ? (
              <Row gap={10}>
                <View style={{ flex: 1 }}>
                  <TextField label="Every" keyboardType="number-pad" value={String(field.value.interval)} onChangeText={(s) => field.onChange({ ...field.value, interval: Math.max(1, Math.min(365, Number(s.replace(/\D/g, '')) || 1)) })} />
                </View>
                <View style={{ flex: 1 }}>
                  <SelectField label="Unit" value={field.value.unit ?? 'week'} options={CUSTOM_UNITS.map((u) => ({ value: u, label: `${u}s` }))} onChange={(unit) => field.onChange({ ...field.value, unit })} />
                </View>
              </Row>
            ) : null}
          </Stack>
        )} />
        <Controller control={control} name="reminderOffsets" render={({ field }) => (
          <OffsetsField label="Remind me" value={field.value} options={REMINDER_CHOICES} onChange={field.onChange} helper="At your usual reminder time; on the day, an hour before a set time." />
        )} />
        {Platform.OS !== 'web' && values.reminderOffsets.length > 0 && (permission !== 'granted' || !notifEnabled) ? (
          <Notice tone="warning" title="Notifications are off">
            <Stack gap={8}>
              <AppText variant="support">You'll still see this on Home and in Tasks. Turn on notifications to get reminders.</AppText>
              {permission === 'undetermined' ? <Button label="Turn on notifications" compact onPress={async () => setPermission(await requestPermission())} /> : null}
            </Stack>
          </Notice>
        ) : null}
      </FormSection>

      <FormSection title="Details (optional)">
        <Controller control={control} name="description" render={({ field }) => (
          <TextField label="Description" value={field.value ?? ''} onChangeText={field.onChange} multiline maxLength={2000} error={errors.description?.message} />
        )} />
        {showChecklist ? <Stack gap={8}>
          <AppText variant="supportStrong">Checklist</AppText>
          {checklist.fields.map((f, idx) => (
            <Row key={f.id} gap={4}>
              <View style={{ flex: 1 }}>
                <Controller control={control} name={`checklist.${idx}.title`} render={({ field }) => (
                  <TextField label={`Step ${idx + 1}`} value={field.value} onChangeText={field.onChange} maxLength={120} />
                )} />
              </View>
              <IconButton icon="trash-2" label={`Remove step ${idx + 1}`} onPress={() => checklist.remove(idx)} />
            </Row>
          ))}
          <Button label="Add a step" icon="plus" variant="ghost" compact style={{ alignSelf: 'flex-start' }} onPress={() => checklist.append({ title: '', done: false })} />
        </Stack> : null}
        <TextField label="Tags" helper="Separate with commas." value={tagsText} onChangeText={setTagsText} autoCapitalize="none" />
        <Controller control={control} name="notes" render={({ field }) => (
          <TextField label="Notes" value={field.value ?? ''} onChangeText={field.onChange} multiline maxLength={2000} error={errors.notes?.message} helper="Don't store full ID or account numbers here." />
        )} />
      </FormSection>

      {submitError ? <Notice tone="danger" title="Not saved">{submitError}</Notice> : null}
      <Button label={submitLabel} onPress={() => void submit()} loading={submitting} full />

      <Sheet visible={newCatOpen} onClose={() => setNewCatOpen(false)} title="New category"
        footer={<Button label="Create category" full disabled={!newCat.trim()} onPress={async () => {
          const id = await createCustomCategory(newCat);
          setValue('category', `custom:${id}`);
          setNewCat('');
          setNewCatOpen(false);
          void custom.refetch();
        }} />}>
        <TextField label="Name" value={newCat} onChangeText={setNewCat} maxLength={40} autoFocus />
      </Sheet>
    </Stack>
  );
}
