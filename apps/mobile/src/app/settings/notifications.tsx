import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { updateNotificationPrefs, type NotificationPrefs } from '@/db/settings';
import { getPermissionState, requestPermission, type PermissionState } from '@/notifications/scheduler';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Card, Stack } from '@/ui/primitives';
import { SelectField, TimeField, ToggleRow } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Notice } from '@/ui/states';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

export default function NotificationSettings() {
  const n = useAppStore((s) => s.notif);
  const [perm, setPerm] = useState<PermissionState>('granted');
  useEffect(() => void getPermissionState().then(setPerm), []);
  const set = (p: Partial<NotificationPrefs>) => updateNotificationPrefs(p);
  const cat = (k: keyof NotificationPrefs['categories'], v: boolean) => set({ categories: { ...n.categories, [k]: v } });
  return (
    <Screen title="Notifications">
      {Platform.OS !== 'web' && perm !== 'granted' ? (
        <Notice tone="warning" title="Android notifications are off for AdultingOS">
          <Stack gap={8}>
            <AppText variant="support">You'll still see everything on Home. Allow notifications to get reminders.</AppText>
            {perm === 'undetermined' ? <Button label="Allow notifications" compact onPress={async () => setPerm(await requestPermission())} /> : <Button label="Open Android settings" compact onPress={() => Linking.openSettings()} />}
          </Stack>
        </Notice>
      ) : null}
      <Card>
        <ToggleRow label="Reminders" helper="Turn all AdultingOS reminders on or off." value={n.enabled} onChange={(enabled) => set({ enabled })} />
      </Card>
      <Card>
        <Stack gap={0}>
          <AppText variant="section">Categories</AppText>
          <ToggleRow label="Tasks" value={n.categories.task} disabled={!n.enabled} onChange={(v) => cat('task', v)} />
          <ToggleRow label="Bills" value={n.categories.bill} disabled={!n.enabled} onChange={(v) => cat('bill', v)} />
          <ToggleRow label="Document renewals" value={n.categories.document} disabled={!n.enabled} onChange={(v) => cat('document', v)} />
          <ToggleRow label="Subscriptions" value={n.categories.subscription} disabled={!n.enabled} onChange={(v) => cat('subscription', v)} />
          <ToggleRow label="Weekly summary" value={n.categories.weekly_summary} disabled={!n.enabled} onChange={(v) => cat('weekly_summary', v)} />
          {n.categories.weekly_summary ? <SelectField label="Weekly summary day" value={String(n.weeklySummaryDay)} onChange={(v) => set({ weeklySummaryDay: Number(v) })} options={DAYS.map((d, i) => ({ value: String(i), label: d }))} /> : null}
        </Stack>
      </Card>
      <Card>
        <Stack gap={12}>
          <AppText variant="section">Timing</AppText>
          <TimeField label="Usual reminder time" value={n.reminderTime} onChange={(v) => set({ reminderTime: v ?? '09:00' })} />
          <ToggleRow label="Quiet hours" helper="Reminders that fall inside quiet hours arrive when they end." value={n.quietHoursEnabled} onChange={(quietHoursEnabled) => set({ quietHoursEnabled })} />
          {n.quietHoursEnabled ? (
            <>
              <SelectField label="Quiet from" value={n.quietStart} onChange={(quietStart) => set({ quietStart })} options={HOURS.map((h) => ({ value: h, label: h }))} />
              <SelectField label="Quiet until" value={n.quietEnd} onChange={(quietEnd) => set({ quietEnd })} options={HOURS.map((h) => ({ value: h, label: h }))} />
            </>
          ) : null}
        </Stack>
      </Card>
      <Card>
        <Stack gap={0}>
          <AppText variant="section">Privacy</AppText>
          <ToggleRow label="Show details on lock screen" helper="Off: reminders say “A bill is due in 3 days.” On: they show names and amounts." value={n.showDetailsOnLockScreen} onChange={(showDetailsOnLockScreen) => set({ showDetailsOnLockScreen })} />
          <ToggleRow label="Mascot messages" helper="Friendly encouragement from your companion in the app." value={n.mascotNotifications} onChange={(mascotNotifications) => set({ mascotNotifications })} />
        </Stack>
      </Card>
      <AppText variant="caption" color="textMuted">Reminders are scheduled on your phone and may arrive a few minutes late to save battery.</AppText>
    </Screen>
  );
}
