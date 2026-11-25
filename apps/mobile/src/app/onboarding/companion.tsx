import { router } from 'expo-router';
import { useState } from 'react';
import { MASCOTS, type MascotId } from '@adultingos/brand';
import { updateProfile } from '@/db/settings';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Stack } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { CompanionPicker } from '@/ui/CompanionPicker';

export default function Companion() {
  const current = useAppStore((s) => s.profile.favoriteMascot);
  const [pick, setPick] = useState<MascotId>(current);
  return (
    <Screen title="Pick your companion" largeTitle subtitle={`“${MASCOTS[pick].phrase}”`}
      footer={<Button label="Continue" full onPress={async () => { await updateProfile({ favoriteMascot: pick, avatar: pick }); router.push('/onboarding/reminders'); }} />}>
      <Stack gap={16}>
        <CompanionPicker value={pick} onChange={setPick} />
        <AppText variant="caption" color="textMuted">You can change this any time, or hide mascots in Settings → Appearance.</AppText>
      </Stack>
    </Screen>
  );
}
