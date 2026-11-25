import { updatePreferences } from '@/db/settings';
import { useAppStore } from '@/state/appStore';
import { AppText, Card, Stack } from '@/ui/primitives';
import { Segmented, ToggleRow } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';

export default function Appearance() {
  const p = useAppStore((s) => s.prefs);
  const sysReduce = useAppStore((s) => s.systemReduceMotion);
  return (
    <Screen title="Appearance">
      <Stack gap={8}>
        <AppText variant="supportStrong">Theme</AppText>
        <Segmented label="Theme" value={p.theme} onChange={(theme) => updatePreferences({ theme })} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </Stack>
      <Card>
        <Stack gap={4}>
          <ToggleRow label="Reduce motion" helper={sysReduce ? 'Your phone already asks apps to reduce motion.' : 'Turns off decorative animations.'} value={p.reducedMotion || sysReduce} disabled={sysReduce} onChange={(reducedMotion) => updatePreferences({ reducedMotion })} />
          <ToggleRow label="Show mascots" helper="Hide decorative character illustrations." value={p.showMascots} onChange={(showMascots) => updatePreferences({ showMascots })} />
          <ToggleRow label="Mascot animations" value={p.mascotAnimations} disabled={!p.showMascots} onChange={(mascotAnimations) => updatePreferences({ mascotAnimations })} />
          <ToggleRow label="Adulting Milestones" helper="Optional achievements for real accomplishments. No streaks, no penalties." value={p.gamificationEnabled} onChange={(gamificationEnabled) => updatePreferences({ gamificationEnabled })} />
        </Stack>
      </Card>
      <Mascot id="sunny" expression="happy" size={96} style={{ alignSelf: 'center' }} label="Preview of Sunny" />
      <AppText variant="caption" color="textMuted" align="center">Text size follows your phone's font size setting.</AppText>
    </Screen>
  );
}
