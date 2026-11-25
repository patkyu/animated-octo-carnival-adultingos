import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isEnabled } from '@/config/env';
import { useTheme } from '@/theme/ThemeProvider';
import type { ColorTokens } from '@/theme/tokens';
import { AppText, Icon, IconButton, Row, Stack, type IconName } from '@/ui/primitives';

/** Global quick-add menu (opened from the floating Add button). */
export default function QuickAdd() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const go = (to: string) => {
    router.back();
    setTimeout(() => router.push(to as never), 10);
  };
  const items: { icon: IconName; title: string; body: string; to: string; tone: keyof ColorTokens; show: boolean }[] = [
    { icon: 'check-square', title: 'Task', body: 'Something to get done', to: '/task/new', tone: 'catPositive', show: true },
    { icon: 'credit-card', title: 'Bill', body: 'A payment with a due date', to: '/bill/new', tone: 'catFinance', show: true },
    { icon: 'file-text', title: 'Document', body: 'An ID, clearance or record to renew', to: '/document/new', tone: 'catDocuments', show: true },
    { icon: 'repeat', title: 'Subscription', body: 'A service that renews', to: '/subscription/new', tone: 'catCalendar', show: isEnabled('subscriptions') },
    { icon: 'bell', title: 'Reminder', body: 'A simple nudge on a date', to: '/task/new?reminder=1', tone: 'catCelebrate', show: true },
  ];
  return (
    <View style={{ flex: 1 }}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.c.overlay }]} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" />
      <View style={{ flex: 1 }} pointerEvents="none" />
      <View accessibilityViewIsModal style={{ backgroundColor: t.c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText variant="section">Add something</AppText>
          <IconButton icon="x" label="Close" onPress={() => router.back()} />
        </Row>
        <Stack gap={10}>
          {items.filter((i) => i.show).map((i) => (
            <Pressable key={i.title} accessibilityRole="button" accessibilityLabel={`Add ${i.title}. ${i.body}`} onPress={() => go(i.to)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: t.c[i.tone], opacity: pressed ? 0.8 : 1, minHeight: 64 })}>
              <Icon name={i.icon} color="onCategory" size={22} />
              <Stack gap={0} style={{ flex: 1 }}>
                <AppText variant="bodyStrong" color="onCategory">{i.title}</AppText>
                <AppText variant="support" color="onCategory">{i.body}</AppText>
              </Stack>
              <Icon name="chevron-right" color="onCategory" />
            </Pressable>
          ))}
        </Stack>
      </View>
    </View>
  );
}
