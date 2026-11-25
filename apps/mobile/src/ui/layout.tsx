import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { IS_DEMO } from '@/config/env';
import { AppText, Icon, IconButton, Row, type IconName } from './primitives';

/** Standard screen: safe areas, title bar with back, scrolling body, keyboard avoidance. */
export function Screen({
  title, subtitle, back = true, actions, children, scroll = true, refreshing, onRefresh, footer, largeTitle, contentStyle, scrollProps,
}: {
  title?: string; subtitle?: string; back?: boolean; actions?: ReactNode; children: ReactNode; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void;
  footer?: ReactNode; largeTitle?: boolean; contentStyle?: object; scrollProps?: ScrollViewProps;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const header =
    title || back || actions ? (
      <Row style={{ paddingHorizontal: 8, paddingTop: insets.top + 4, minHeight: 56 + insets.top, backgroundColor: t.c.background }} gap={4}>
        {back ? <IconButton icon="arrow-left" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : <View style={{ width: 8 }} />}
        <View style={{ flex: 1, paddingHorizontal: back ? 0 : 8 }}>
          {title && !largeTitle ? <AppText variant="section" numberOfLines={1}>{title}</AppText> : null}
        </View>
        {IS_DEMO ? <DemoBadge /> : null}
        {actions}
      </Row>
    ) : null;
  const body = (
    <>
      {largeTitle && title ? (
        <View style={{ marginBottom: 8, gap: 4 }}>
          <AppText variant="title">{title}</AppText>
          {subtitle ? <AppText color="textMuted">{subtitle}</AppText> : null}
        </View>
      ) : null}
      {children}
    </>
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.c.background }}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[{ padding: 16, paddingBottom: insets.bottom + 120, gap: 16 }, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.c.primary} colors={[t.c.primary]} /> : undefined}
            {...scrollProps}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1, padding: 16, gap: 16 }, contentStyle]}>{body}</View>
        )}
        {footer ? (
          <View style={{ padding: 16, paddingBottom: insets.bottom + 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.c.border, backgroundColor: t.c.background }}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

export function DemoBadge() {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.c.catCelebrate, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }} accessible accessibilityLabel="Demo mode with sample data">
      <AppText variant="caption" color="onCategory">DEMO</AppText>
    </View>
  );
}

export function Fab({ label, onPress, icon = 'plus' }: { label: string; onPress: () => void; icon?: IconName }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { backgroundColor: pressed ? t.c.primaryPressed : t.c.primary, shadowColor: t.c.shadow }]}
    >
      <Icon name={icon} size={24} color="onPrimary" />
    </Pressable>
  );
}

/** Ring showing real done/total. Renders nothing meaningful-looking without data. */
export function ProgressRing({ done, total, size = 72, label }: { done: number; total: number; size?: number; label: string }) {
  const t = useTheme();
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? done / total : 0;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: total, now: done, text: `${done} of ${total}` }} style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.c.surfaceSunken} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={t.c.primary} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <AppText variant="supportStrong">{done}/{total}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
