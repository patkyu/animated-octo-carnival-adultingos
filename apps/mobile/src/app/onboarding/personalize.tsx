import { router } from 'expo-router';
import { useState } from 'react';
import { EMPLOYMENT_STATUSES, LIVING_ARRANGEMENTS, RESPONSIBILITY_AREAS, type EmploymentStatus, type LivingArrangement, type ResponsibilityArea } from '@adultingos/shared';
import { updateProfile } from '@/db/settings';
import { AREA_LABEL, EMPLOYMENT_LABEL, LIVING_LABEL } from '@/features/labels';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Chip, Row, Stack } from '@/ui/primitives';
import { Segmented, TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';

export default function Personalize() {
  const profile = useAppStore((s) => s.profile);
  const [name, setName] = useState(profile.preferredName);
  const [lang, setLang] = useState(profile.language);
  const [employment, setEmployment] = useState<EmploymentStatus | null>(profile.employmentStatus);
  const [living, setLiving] = useState<LivingArrangement | null>(profile.livingArrangement);
  const [areas, setAreas] = useState<ResponsibilityArea[]>(profile.responsibilityAreas);

  const save = async () => {
    await updateProfile({ preferredName: name.trim().slice(0, 40), language: lang, employmentStatus: employment, livingArrangement: living, responsibilityAreas: areas, country: 'PH' });
    router.push('/onboarding/companion');
  };

  return (
    <Screen title="About you" largeTitle subtitle="All questions are optional. We use them only to tailor your dashboard." back={false}
      footer={<Row gap={12}><Button label="Skip" variant="secondary" onPress={() => router.push('/onboarding/companion')} style={{ flex: 1 }} /><Button label="Continue" onPress={save} style={{ flex: 2 }} /></Row>}>
      <Stack gap={20}>
        <TextField label="What should we call you?" helper="A first name or nickname is perfect." value={name} onChangeText={setName} maxLength={40} autoComplete="name-given" />
        <Stack gap={8}>
          <AppText variant="supportStrong">Language</AppText>
          <Segmented label="Language" value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'fil', label: 'Filipino (beta)' }]} />
        </Stack>
        <Stack gap={8}>
          <AppText variant="supportStrong">Country</AppText>
          <AppText color="textMuted">Philippines — guides currently cover the Philippines only.</AppText>
        </Stack>
        <Stack gap={8}>
          <AppText variant="supportStrong">Which best describes you right now?</AppText>
          <Row wrap>{EMPLOYMENT_STATUSES.map((e) => <Chip key={e} label={EMPLOYMENT_LABEL[e]} selected={employment === e} onPress={() => setEmployment(employment === e ? null : e)} />)}</Row>
        </Stack>
        <Stack gap={8}>
          <AppText variant="supportStrong">Where do you live?</AppText>
          <Row wrap>{LIVING_ARRANGEMENTS.map((l) => <Chip key={l} label={LIVING_LABEL[l]} selected={living === l} onPress={() => setLiving(living === l ? null : l)} />)}</Row>
        </Stack>
        <Stack gap={8}>
          <AppText variant="supportStrong">What do you want help with?</AppText>
          <Row wrap>
            {RESPONSIBILITY_AREAS.map((a) => (
              <Chip key={a} label={AREA_LABEL[a]} selected={areas.includes(a)} onPress={() => setAreas(areas.includes(a) ? areas.filter((x) => x !== a) : [...areas, a])} />
            ))}
          </Row>
        </Stack>
        <AppText variant="caption" color="textMuted">We never ask for government ID numbers, bank details, income or your exact address.</AppText>
      </Stack>
    </Screen>
  );
}
