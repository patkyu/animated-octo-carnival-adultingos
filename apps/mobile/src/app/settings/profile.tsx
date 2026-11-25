import { router } from 'expo-router';
import { useState } from 'react';
import { EMPLOYMENT_STATUSES, LIVING_ARRANGEMENTS, type EmploymentStatus, type LivingArrangement } from '@adultingos/shared';
import { kvGet, kvSet } from '@/db/database';
import { updateProfile } from '@/db/settings';
import { EMPLOYMENT_LABEL, LIVING_LABEL } from '@/features/labels';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Stack } from '@/ui/primitives';
import { Segmented, SelectField, TextField, ToggleRow } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';

const ZONES = ['Asia/Manila', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Europe/London', 'America/Los_Angeles', 'America/New_York', 'Australia/Sydney', 'UTC'];

export default function EditProfile() {
  const p = useAppStore((s) => s.profile);
  const [name, setName] = useState(p.preferredName);
  const [language, setLanguage] = useState(p.language);
  const [tz, setTz] = useState(p.timezone);
  const [employment, setEmployment] = useState<EmploymentStatus | 'none'>(p.employmentStatus ?? 'none');
  const [living, setLiving] = useState<LivingArrangement | 'none'>(p.livingArrangement ?? 'none');
  const autoTz = useData(['tz_auto'], () => kvGet('tz_auto', true));
  const [auto, setAuto] = useState<boolean | null>(null);
  const autoValue = auto ?? autoTz.data ?? true;
  return (
    <Screen title="Personal profile" footer={<Button label="Save" full onPress={async () => {
      await kvSet('tz_auto', autoValue);
      await updateProfile({ preferredName: name.trim().slice(0, 40), language, timezone: tz, employmentStatus: employment === 'none' ? null : employment, livingArrangement: living === 'none' ? null : living });
      toast('Profile saved.', 'success');
      router.back();
    }} />}>
      <Stack gap={18}>
        <TextField label="Preferred name" value={name} onChangeText={setName} maxLength={40} />
        <Stack gap={6}>
          <AppText variant="supportStrong">Language</AppText>
          <Segmented label="Language" value={language} onChange={setLanguage} options={[{ value: 'en', label: 'English' }, { value: 'fil', label: 'Filipino (beta)' }]} />
          {language === 'fil' ? <AppText variant="caption" color="textMuted">Filipino covers navigation and common actions for now; other text appears in English.</AppText> : null}
        </Stack>
        <AppText variant="supportStrong">Country: Philippines</AppText>
        <ToggleRow label="Use my phone's time zone" helper="Keeps reminders right when you travel." value={autoValue} onChange={setAuto} />
        {!autoValue ? <SelectField label="Time zone" value={tz} onChange={setTz} options={[...new Set([tz, ...ZONES])].map((z) => ({ value: z, label: z.replace('_', ' ') }))} /> : <AppText variant="caption" color="textMuted">Current: {tz}</AppText>}
        <SelectField label="Employment (optional)" value={employment} onChange={setEmployment} options={[{ value: 'none', label: 'Not set' }, ...EMPLOYMENT_STATUSES.map((e) => ({ value: e, label: EMPLOYMENT_LABEL[e] }))]} />
        <SelectField label="Living arrangement (optional)" value={living} onChange={setLiving} options={[{ value: 'none', label: 'Not set' }, ...LIVING_ARRANGEMENTS.map((l) => ({ value: l, label: LIVING_LABEL[l] }))]} />
        <Button label="Change companion" variant="secondary" onPress={() => router.push('/mascots')} />
      </Stack>
    </Screen>
  );
}
