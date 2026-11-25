import { router } from 'expo-router';
import { suggestDashboardAreas } from '@adultingos/shared';
import { updateAppState } from '@/db/settings';
import { useAppStore } from '@/state/appStore';
import { AppText, Card, Icon, Row, Stack, Button, type IconName } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { AREA_LABEL } from '@/features/labels';

export default function FirstStep() {
  const profile = useAppStore((s) => s.profile);
  const areas = suggestDashboardAreas({ employment: profile.employmentStatus, living: profile.livingArrangement, selected: profile.responsibilityAreas });
  const finish = async (to?: string) => {
    await updateAppState({ onboardingComplete: true });
    router.replace('/(tabs)');
    if (to) setTimeout(() => router.push(to as never), 50);
  };
  const options: { icon: IconName; title: string; body: string; to: string }[] = [
    { icon: 'file-text', title: 'Track a document', body: 'Passport, IDs, clearances — get renewal reminders.', to: '/document/new' },
    { icon: 'credit-card', title: 'Add a bill', body: 'Electricity, internet, rent — never miss a due date.', to: '/bill/new' },
    { icon: 'check-square', title: 'Add a task', body: 'Anything you need to get done.', to: '/task/new' },
    { icon: 'book-open', title: 'Browse guides', body: 'See what to do next for common adulting tasks.', to: '/guides' },
  ];
  return (
    <Screen title={`You're all set${profile.preferredName ? `, ${profile.preferredName}` : ''}!`} largeTitle subtitle="Want to add your first responsibility now?">
      <Stack gap={12}>
        <Mascot id={profile.favoriteMascot} expression="celebrating" pose="wave" size={120} animation="celebrate" style={{ alignSelf: 'center' }} />
        {options.map((o) => (
          <Card key={o.title} onPress={() => finish(o.to)} accessibilityLabel={`${o.title}. ${o.body}`}>
            <Row gap={14}>
              <Icon name={o.icon} size={22} color="primary" />
              <Stack gap={2} style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{o.title}</AppText>
                <AppText variant="support" color="textMuted">{o.body}</AppText>
              </Stack>
              <Icon name="chevron-right" color="textMuted" />
            </Row>
          </Card>
        ))}
        <AppText variant="caption" color="textMuted">Your Home will highlight: {areas.map((a) => AREA_LABEL[a]).join(', ')}.</AppText>
        <Button label="I'll do it later" variant="ghost" full onPress={() => finish()} />
      </Stack>
    </Screen>
  );
}
