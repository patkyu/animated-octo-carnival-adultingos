import 'expo-crypto'; // provides crypto.getRandomValues for UUIDs
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getRandomValues } from 'expo-crypto';
import { getDb, kvGet } from '@/db/database';
import { seedDemoIfNeeded } from '@/db/demo';
import { evaluateAchievements } from '@/db/achievements';
import { completeOccurrence, getOccurrence } from '@/db/obligations';
import { getProfile, updateProfile } from '@/db/settings';
import { openUrl } from '@/features/actions';
import { debounce, onDataChanged } from '@/lib/events';
import { invalidateAll, queryClient } from '@/lib/useData';
import { reconcileReminders, setupNotificationChannels, snoozeFromNotification } from '@/notifications/scheduler';
import { useAppStore } from '@/state/appStore';
import { initAuth } from '@/sync/auth';
import { syncNow } from '@/sync/engine';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ToastHost, toast } from '@/ui/overlays';
import { ErrorState } from '@/ui/states';

// Hermes polyfill for the shared uuid helper.
const g = globalThis as { crypto?: { getRandomValues?: unknown } };
if (!g.crypto) (globalThis as Record<string, unknown>).crypto = { getRandomValues };
else if (!g.crypto.getRandomValues) g.crypto.getRandomValues = getRandomValues;

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const afterChange = {
  sync: debounce(() => void syncNow(), 2000),
  reminders: debounce(() => void reconcileReminders(), 800),
  achievements: debounce(async () => {
    const earned = await evaluateAchievements();
    for (const a of earned) toast(`Milestone unlocked: ${a.title}`, 'success', { mascot: a.mascot });
    if (earned.length) void invalidateAll();
  }, 600),
};

function Shell() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.c.background }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.background }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
      <ToastHost />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const reload = useAppStore((s) => s.reload);
  const setReduce = useAppStore((s) => s.setSystemReduceMotion);

  useEffect(() => {
    (async () => {
      try {
        await getDb();
        await seedDemoIfNeeded();
        // Keep the stored zone aligned with the device (travel, OFWs).
        const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const p = await getProfile();
        if (deviceTz && p.timezone !== deviceTz && (await kvGet('tz_auto', true))) await updateProfile({ timezone: deviceTz });
        await reload();
        await initAuth();
        if (Platform.OS !== 'web') await setupNotificationChannels();
        void reconcileReminders();
        void syncNow();
        setReady(true);
      } catch (e) {
        setBootError(e instanceof Error ? e.message : 'Startup failed');
      }
    })();
  }, [reload]);

  useEffect(() => {
    const off = onDataChanged((scope) => {
      void invalidateAll();
      if (['profile', 'preferences', 'notifications', 'app_state'].includes(scope)) void reload();
      if (scope !== 'sync' && scope !== 'app_state') afterChange.sync();
      afterChange.reminders();
      if (scope !== 'app_state') afterChange.achievements();
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void syncNow();
        void reconcileReminders();
        void invalidateAll();
      }
    });
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => undefined);
    const rm = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      off();
      sub.remove();
      rm.remove();
    };
  }, [reload, setReduce]);

  // Notification taps and actions.
  useEffect(() => {
    if (Platform.OS === 'web' || !ready) return;
    const handle = async (resp: Notifications.NotificationResponse) => {
      const data = resp.notification.request.content.data as { url?: string; occurrenceId?: string | null };
      if (resp.actionIdentifier === 'done' && data.occurrenceId) {
        const occ = await getOccurrence(data.occurrenceId);
        if (occ && occ.status === 'open') await completeOccurrence(occ.id);
        return;
      }
      if (resp.actionIdentifier === 'snooze' && data.occurrenceId) {
        const c = resp.notification.request.content;
        await snoozeFromNotification(data.occurrenceId, c.title ?? 'AdultingOS', c.body ?? '', data.url ?? '');
        return;
      }
      if (data.occurrenceId && !(await getOccurrence(data.occurrenceId))) {
        toast('That item was deleted. Here are your tasks.');
        openUrl('adultingos://tasks');
        return;
      }
      openUrl(data.url);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) void handle(last);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void handle(r));
    return () => sub.remove();
  }, [ready]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && (ready || bootError)) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError, ready, bootError]);

  if (!(fontsLoaded || fontError) || (!ready && !bootError)) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {bootError ? (
              <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
                <ErrorState title="AdultingOS couldn't start" body={`Your data has not been changed. (${bootError})`} />
              </View>
            ) : (
              <Shell />
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
