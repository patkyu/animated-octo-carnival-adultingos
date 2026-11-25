import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { isEnabled } from '@/config/env';

/** Five persistent tabs. Each tab keeps its own state when you switch away. */
export default function TabsLayout() {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const icon = (name: React.ComponentProps<typeof Feather>['name']) =>
    function TabIcon({ color }: { color: unknown }) {
      return <Feather name={name} size={22} color={color as string} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.c.primary,
        tabBarInactiveTintColor: t.c.textMuted,
        tabBarStyle: { backgroundColor: t.c.surface, borderTopColor: t.c.border, height: 64 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6 },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        tabBarItemStyle: { minHeight: 48 },
        sceneStyle: { backgroundColor: t.c.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: tr('tab.home'), tabBarIcon: icon('home'), tabBarAccessibilityLabel: tr('tab.home') }} />
      <Tabs.Screen name="tasks" options={{ title: tr('tab.tasks'), tabBarIcon: icon('check-square'), tabBarAccessibilityLabel: tr('tab.tasks') }} />
      <Tabs.Screen name="guides" options={{ title: tr('tab.guides'), tabBarIcon: icon('book-open'), tabBarAccessibilityLabel: tr('tab.guides') }} />
      <Tabs.Screen
        name="assistant"
        options={{ title: tr('tab.assistant'), tabBarIcon: icon('message-circle'), tabBarAccessibilityLabel: tr('tab.assistant'), href: isEnabled('ai_assistant') ? undefined : null }}
      />
      <Tabs.Screen name="profile" options={{ title: tr('tab.profile'), tabBarIcon: icon('user'), tabBarAccessibilityLabel: tr('tab.profile') }} />
    </Tabs>
  );
}
