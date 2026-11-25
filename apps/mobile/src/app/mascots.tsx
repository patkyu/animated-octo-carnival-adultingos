import { useState } from 'react';
import { MASCOTS, type MascotId } from '@adultingos/brand';
import { updatePreferences, updateProfile } from '@/db/settings';
import { useAppStore } from '@/state/appStore';
import { CompanionPicker } from '@/ui/CompanionPicker';
import { AppText, Card, Stack } from '@/ui/primitives';
import { ToggleRow } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { toast } from '@/ui/overlays';

/** Mascot collection + companion selection. */
export default function Mascots() {
  const profile = useAppStore((s) => s.profile);
  const prefs = useAppStore((s) => s.prefs);
  const [focus, setFocus] = useState<MascotId>(profile.favoriteMascot);
  const m = MASCOTS[focus];
  return (
    <Screen title="The Adulting Buddies">
      <Card tone="catPositive">
        <Stack gap={6} style={{ alignItems: 'center' }}>
          <Mascot id={focus} expression="happy" pose="wave" size={140} force label={`${m.name}, ${m.role}`} />
          <AppText variant="section" color="onCategory">{m.name}</AppText>
          <AppText color="onCategory" align="center">{m.role} · {m.personality}</AppText>
          <AppText variant="bodyStrong" color="onCategory" align="center">“{m.phrase}”</AppText>
        </Stack>
      </Card>
      <AppText variant="section">Choose your companion</AppText>
      <CompanionPicker value={focus} onChange={async (id) => { setFocus(id); await updateProfile({ favoriteMascot: id, avatar: id }); toast(`${MASCOTS[id].name} is your companion now.`, 'success', { mascot: id }); }} />
      <Card>
        <Stack gap={0}>
          <ToggleRow label="Show mascots" value={prefs.showMascots} onChange={(showMascots) => updatePreferences({ showMascots })} />
          <ToggleRow label="Mascot animations" value={prefs.mascotAnimations} onChange={(mascotAnimations) => updatePreferences({ mascotAnimations })} />
        </Stack>
      </Card>
    </Screen>
  );
}
