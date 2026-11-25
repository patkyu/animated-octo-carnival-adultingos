import { router } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import { updateNotificationPrefs } from '@/db/settings';
import { requestPermission } from '@/notifications/scheduler';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Row, Stack } from '@/ui/primitives';
import { TimeField, ToggleRow } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { Notice } from '@/ui/states';

export default function Reminders() {
  const n = useAppStore((s) => s.notif);
  const [time, setTime] = useState(n.reminderTime);
  const [quiet, setQuiet] = useState(n.quietHoursEnabled);
  const [weekly, setWeekly] = useState(n.categories.weekly_summary);
  const [denied, setDenied] = useState(false);

  const save = async (ask: boolean) => {
    await updateNotificationPrefs({ reminderTime: time, quietHoursEnabled: quiet, categories: { ...n.categories, weekly_summary: weekly }, enabled: ask || n.enabled });
    if (ask && Platform.OS !== 'web') {
      const res = await requestPermission();
      if (res !== 'granted') {
        setDenied(true);
        return;
      }
    }
    router.push('/onboarding/first-step');
  };

  return (
    <Screen title="Friendly reminders" largeTitle subtitle="Tiki can remind you before things are due.">
      <Stack gap={16}>
        <Mascot id="tiki" expression="happy" pose="wave" size={120} style={{ alignSelf: 'center' }} />
        <TimeField label="Usual reminder time" value={time} onChange={(v) => setTime(v ?? '09:00')} />
        <ToggleRow label="Quiet hours (10 PM – 7 AM)" helper="No reminders while you rest." value={quiet} onChange={setQuiet} />
        <ToggleRow label="Weekly summary" helper="A short look at your week, once a week." value={weekly} onChange={setWeekly} />
        <Notice icon="shield" title="Private by default">Lock-screen reminders don't show amounts or document details unless you turn that on.</Notice>
        {denied ? (
          <Notice tone="warning" title="Notifications are off">
            That's okay — you'll still see everything due on your Home screen. You can turn notifications on later in Settings.
          </Notice>
        ) : null}
        <Button label={denied ? 'Continue without notifications' : 'Turn on reminders'} full onPress={() => (denied ? router.push('/onboarding/first-step') : save(true))} />
        {!denied ? <Button label="Not now" variant="ghost" full onPress={async () => { await updateNotificationPrefs({ reminderTime: time, quietHoursEnabled: quiet }); router.push('/onboarding/first-step'); }} /> : null}
        <Row><AppText variant="caption" color="textMuted">Android will ask for permission to send notifications.</AppText></Row>
      </Stack>
    </Screen>
  );
}
