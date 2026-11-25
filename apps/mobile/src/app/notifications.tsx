import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { formatDateLong, formatTime12 } from '@adultingos/shared';
import { computeDesired, getPermissionState, requestPermission, type PermissionState } from '@/notifications/scheduler';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Card, Icon, Row, Stack } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { EmptyState, LoadingList, Notice } from '@/ui/states';
import { openUrl } from '@/features/actions';

/** Notification center: upcoming reminders and permission status. */
export default function NotificationCenter() {
  const prefs = useAppStore((s) => s.notif);
  const tz = useAppStore((s) => s.profile.timezone);
  const [perm, setPerm] = useState<PermissionState>('granted');
  useEffect(() => void getPermissionState().then(setPerm), []);
  const { data, isLoading } = useData(['upcoming-reminders'], () => computeDesired());
  const fmt = (d: Date) => {
    const local = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
    const [date, time] = local.split(', ');
    return `${formatDateLong(date!)} · ${formatTime12((time ?? '09:00').slice(0, 5).replace('24:', '00:'))}`;
  };
  return (
    <Screen title="Reminders" actions={<Button label="Settings" variant="ghost" compact onPress={() => router.push('/settings/notifications')} />}>
      {Platform.OS === 'web' ? <Notice>Reminders are delivered by the Android app. This list shows what would be scheduled.</Notice> : null}
      {perm === 'denied' ? (
        <Notice tone="warning" title="Notifications are blocked">
          <Stack gap={8}>
            <AppText variant="support">Everything still appears on Home and in Tasks. To get reminders, allow notifications for AdultingOS in Android settings.</AppText>
            <Button label="Open Android settings" compact onPress={() => Linking.openSettings()} />
          </Stack>
        </Notice>
      ) : perm === 'undetermined' ? (
        <Notice title="Reminders need permission">
          <Button label="Turn on notifications" compact onPress={async () => setPerm(await requestPermission())} />
        </Notice>
      ) : null}
      {!prefs.enabled ? <Notice tone="warning">Reminders are turned off in Settings.</Notice> : null}
      <AppText variant="section">Coming up</AppText>
      {isLoading ? <LoadingList rows={3} /> : !data?.length ? (
        <EmptyState mascot="tiki" title="No reminders scheduled" body="Add due dates and reminders to tasks, bills and documents." />
      ) : (
        <Stack gap={8}>
          {data.map((n) => (
            <Card key={n.identifier} onPress={() => openUrl(n.url)} accessibilityLabel={`${n.title}. ${n.body}. ${fmt(n.fireAt)}`}>
              <Row gap={12}>
                <Icon name={n.kind === 'bill' ? 'credit-card' : n.kind === 'document' ? 'file-text' : n.kind === 'subscription' ? 'repeat' : 'bell'} color="primary" />
                <Stack gap={2} style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{n.title}</AppText>
                  <AppText variant="support" color="textMuted">{n.body}</AppText>
                  <AppText variant="caption" color="textMuted">{fmt(n.fireAt)}</AppText>
                </Stack>
              </Row>
            </Card>
          ))}
          <AppText variant="caption" color="textMuted">This is exactly what appears on your lock screen. Details are hidden unless you turn them on in Settings.</AppText>
        </Stack>
      )}
    </Screen>
  );
}
