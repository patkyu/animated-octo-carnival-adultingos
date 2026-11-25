import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  addDays, computeReminderInstants, formatMinor, reminderCopy, stableUuid, todayInZone, type NotificationKind, type QuietHours,
} from '@adultingos/shared';
import { listItems } from '@/db/obligations';
import { listDocuments } from '@/db/documents';
import { getNotificationPrefs, getProfile, updateNotificationPrefs } from '@/db/settings';

/**
 * Local reminder scheduling.
 *
 * `reconcileReminders()` is the single source of truth: it computes the full
 * desired set from the database and makes the OS schedule match it — adding
 * missing reminders and cancelling ones whose item was completed, deleted,
 * rescheduled or snoozed. It runs after every data change, on app start/
 * foreground and when the time zone changes, so duplicates are impossible
 * (identifiers are deterministic) and stale reminders cannot survive.
 *
 * Android restores scheduled notifications after a reboot
 * (RECEIVE_BOOT_COMPLETED). We do not request exact-alarm permission: day-level
 * reminders may arrive a few minutes late, which is acceptable here.
 */

const HORIZON_DAYS = 120;
const MAX_SCHEDULED = 60; // well under Android's per-app alarm limits
const PREFIX = 'aos:';

export const CHANNELS: { id: NotificationKind; name: string; description: string }[] = [
  { id: 'task', name: 'Task reminders', description: 'Reminders for your tasks and deadlines.' },
  { id: 'bill', name: 'Bill reminders', description: 'Reminders before bills are due.' },
  { id: 'document', name: 'Document renewals', description: 'Reminders before documents expire.' },
  { id: 'subscription', name: 'Subscription renewals', description: 'Reminders before subscriptions renew.' },
  { id: 'weekly_summary', name: 'Weekly summary', description: 'A short look at your week ahead.' },
];

export async function setupNotificationChannels(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    for (const c of CHANNELS) {
      await Notifications.setNotificationChannelAsync(c.id, {
        name: c.name,
        description: c.description,
        importance: c.id === 'weekly_summary' ? Notifications.AndroidImportance.DEFAULT : Notifications.AndroidImportance.HIGH,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
        lightColor: '#174B49',
      });
    }
  }
  if (Platform.OS !== 'web') {
    await Notifications.setNotificationCategoryAsync('obligation', [
      // The handlers are JavaScript, which only runs while the app process is alive, so the
      // actions bring the app up briefly to apply them (a closed app would otherwise ignore the tap).
      { identifier: 'done', buttonTitle: 'Mark done', options: { opensAppToForeground: true } },
      { identifier: 'snooze', buttonTitle: 'Snooze 1 hour', options: { opensAppToForeground: true } },
    ]);
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermissionState(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** Asked only at a meaningful moment (onboarding reminder step or first reminder set), never at launch. */
export async function requestPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'unsupported';
  await updateNotificationPrefs({ permissionAsked: true });
  const res = await Notifications.requestPermissionsAsync();
  return res.granted ? 'granted' : res.canAskAgain ? 'undetermined' : 'denied';
}

interface Desired {
  identifier: string;
  fireAt: Date;
  kind: NotificationKind;
  title: string;
  body: string;
  url: string;
  occurrenceId?: string;
}

export async function computeDesired(now = new Date()): Promise<Desired[]> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) return [];
  const { timezone } = await getProfile();
  const today = todayInZone(timezone, now);
  const quiet: QuietHours = { enabled: prefs.quietHoursEnabled, start: prefs.quietStart, end: prefs.quietEnd };
  const out: Desired[] = [];

  const items = await listItems({ status: 'open', from: addDays(today, -1), to: addDays(today, HORIZON_DAYS) });
  for (const it of items) {
    const kind: NotificationKind = it.kind === 'bill' ? 'bill' : it.kind === 'subscription' ? 'subscription' : 'task';
    if (!prefs.categories[kind]) continue;
    const snoozedUntil = it.snoozedUntil ? new Date(it.snoozedUntil) : null;
    for (const r of computeReminderInstants({ dueDate: it.dueDate, dueTime: it.dueTime, offsetsDays: it.reminderOffsets, reminderTime: prefs.reminderTime, timeZone: timezone, quietHours: quiet, now })) {
      if (snoozedUntil && r.fireAt < snoozedUntil) continue;
      const amount = it.billAmountMinor !== null && it.currency === 'PHP' ? formatMinor(it.amountMinor ?? it.billAmountMinor) : undefined;
      const copy = reminderCopy({ kind, title: it.title, offsetDays: r.offsetDays, showDetails: prefs.showDetailsOnLockScreen, amountLabel: amount });
      out.push({
        identifier: `${PREFIX}${stableUuid(kind, it.id, String(r.fireAt.getTime()))}`, fireAt: r.fireAt, kind, ...copy,
        url: `adultingos://task/${it.obligationId}`, occurrenceId: it.id,
      });
    }
    // A snoozed item gets one reminder at the end of its snooze.
    if (snoozedUntil && snoozedUntil > now) {
      const copy = reminderCopy({ kind, title: it.title, offsetDays: 0, showDetails: prefs.showDetailsOnLockScreen });
      out.push({ identifier: `${PREFIX}${stableUuid('snz', it.id, it.snoozedUntil ?? '')}`, fireAt: snoozedUntil, kind, ...copy, url: `adultingos://task/${it.obligationId}`, occurrenceId: it.id });
    }
  }

  if (prefs.categories.document) {
    for (const d of await listDocuments()) {
      if (!d.expiryDate || d.stage !== 'obtained') continue;
      for (const r of computeReminderInstants({ dueDate: d.expiryDate, offsetsDays: d.reminderOffsets, reminderTime: prefs.reminderTime, timeZone: timezone, quietHours: quiet, now })) {
        const copy = reminderCopy({ kind: 'document', title: d.name, offsetDays: r.offsetDays, showDetails: prefs.showDetailsOnLockScreen });
        out.push({ identifier: `${PREFIX}${stableUuid('doc', d.id, String(r.fireAt.getTime()))}`, fireAt: r.fireAt, kind: 'document', ...copy, url: `adultingos://document/${d.id}` });
      }
    }
  }

  out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  return out.slice(0, MAX_SCHEDULED);
}

let reconciling: Promise<void> | null = null;

export function reconcileReminders(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (reconciling) return reconciling;
  reconciling = (async () => {
    const permitted = (await getPermissionState()) === 'granted';
    const desired = permitted ? await computeDesired() : [];
    const prefs = await getNotificationPrefs();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const want = new Map(desired.map((d) => [d.identifier, d]));
    for (const s of scheduled) {
      if (s.identifier.startsWith(PREFIX) && !want.has(s.identifier)) await Notifications.cancelScheduledNotificationAsync(s.identifier);
    }
    const have = new Set(scheduled.map((s) => s.identifier));
    for (const d of desired) {
      if (have.has(d.identifier)) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: d.identifier,
        content: {
          title: d.title, body: d.body, data: { url: d.url, occurrenceId: d.occurrenceId ?? null, kind: d.kind },
          categoryIdentifier: d.occurrenceId && (d.kind === 'task') ? 'obligation' : undefined,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d.fireAt, channelId: d.kind },
      });
    }
    // Weekly summary: one repeating notification, rescheduled to match preferences.
    const weeklyId = `${PREFIX}weekly`;
    await Notifications.cancelScheduledNotificationAsync(weeklyId).catch(() => undefined);
    if (permitted && prefs.enabled && prefs.categories.weekly_summary) {
      const [h, m] = prefs.reminderTime.split(':').map(Number) as [number, number];
      await Notifications.scheduleNotificationAsync({
        identifier: weeklyId,
        content: { title: 'Your week ahead', body: 'Take a minute to see what is coming up this week.', data: { url: 'adultingos://calendar' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: prefs.weeklySummaryDay + 1, hour: h, minute: m, channelId: 'weekly_summary' },
      });
    }
  })().finally(() => {
    reconciling = null;
  });
  return reconciling;
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** A one-off reminder an hour from now (notification "Snooze" action). */
export async function snoozeFromNotification(occurrenceId: string, title: string, body: string, url: string): Promise<void> {
  const fireAt = new Date(Date.now() + 60 * 60 * 1000);
  await Notifications.scheduleNotificationAsync({
    identifier: `${PREFIX}${stableUuid('snooze', occurrenceId, String(fireAt.getTime()))}`,
    content: { title, body, data: { url, occurrenceId }, categoryIdentifier: 'obligation' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: 'task' },
  });
}
