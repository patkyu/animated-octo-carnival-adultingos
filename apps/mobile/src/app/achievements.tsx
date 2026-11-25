import { router } from 'expo-router';
import { RELEASED_ACHIEVEMENTS, totalXp } from '@adultingos/shared';
import { computeStats, unlockedKeys } from '@/db/achievements';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Card, Row, Stack, StatusBadge } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { LoadingList, Notice } from '@/ui/states';

export default function Achievements() {
  const enabled = useAppStore((s) => s.prefs.gamificationEnabled);
  const { data, isLoading } = useData(['achievements'], async () => ({ unlocked: await unlockedKeys(), stats: await computeStats() }));
  if (!enabled) {
    return (
      <Screen title="Adulting Milestones">
        <Notice>Milestones are turned off. You can turn them back on in Appearance.</Notice>
        <Button label="Appearance settings" variant="secondary" onPress={() => router.push('/settings/appearance')} />
      </Screen>
    );
  }
  return (
    <Screen title="Adulting Milestones" largeTitle subtitle="Celebrating real progress. No streaks, no pressure.">
      {isLoading || !data ? <LoadingList /> : (
        <>
          <Card tone="catCelebrate">
            <Row gap={12}>
              <Mascot id="sunny" expression="celebrating" size={72} />
              <Stack gap={2} style={{ flex: 1 }}>
                <AppText variant="number" color="onCategory">{data.unlocked.size} of {RELEASED_ACHIEVEMENTS.length}</AppText>
                <AppText color="onCategory">milestones · {totalXp(data.unlocked)} XP</AppText>
              </Stack>
            </Row>
          </Card>
          <Stack gap={8}>
            {RELEASED_ACHIEVEMENTS.map((a) => {
              const got = data.unlocked.has(a.key);
              return (
                <Card key={a.key} accessibilityLabel={`${a.title}. ${a.description}. ${got ? 'Unlocked' : 'Not yet'}`}>
                  <Row gap={12}>
                    <Mascot id={a.mascot} expression={got ? 'celebrating' : 'sleepy'} size={56} animation="none" />
                    <Stack gap={2} style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" color={got ? 'text' : 'textMuted'}>{a.title}</AppText>
                      <AppText variant="support" color="textMuted">{a.description}</AppText>
                    </Stack>
                    {got ? <StatusBadge label="Unlocked" tone="success" /> : <StatusBadge label={`${a.xp} XP`} tone="neutral" icon="lock" />}
                  </Row>
                </Card>
              );
            })}
          </Stack>
        </>
      )}
    </Screen>
  );
}
