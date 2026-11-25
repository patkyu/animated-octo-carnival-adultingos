import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import { useState } from 'react';
import type { MascotId } from '@adultingos/brand';
import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/state/appStore';
import { AppText, Button, Icon, Row, Stack } from './primitives';
import { SceneIllustration } from './Mascot';

export function EmptyState({ mascot = 'adu', title, body, actionLabel, onAction, secondaryLabel, onSecondary }: {
  mascot?: MascotId; title: string; body: string; actionLabel?: string; onAction?: () => void; secondaryLabel?: string; onSecondary?: () => void;
}) {
  return (
    <Stack gap={12} style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 8 }}>
      <SceneIllustration id={mascot} kind="empty" width={200} />
      <AppText variant="section" align="center">{title}</AppText>
      <AppText color="textMuted" align="center">{body}</AppText>
      {actionLabel && onAction ? <Button label={actionLabel} icon="plus" onPress={onAction} /> : null}
      {secondaryLabel && onSecondary ? <Button label={secondaryLabel} variant="ghost" onPress={onSecondary} /> : null}
    </Stack>
  );
}

export function ErrorState({ title = "Something didn't load", body = 'Your data is safe on this device. Please try again.', onRetry, mascot = 'adu' }: {
  title?: string; body?: string; onRetry?: () => void; mascot?: MascotId;
}) {
  return (
    <Stack gap={12} style={{ alignItems: 'center', paddingVertical: 24 }}>
      <SceneIllustration id={mascot} kind="error" width={180} />
      <AppText variant="section" align="center">{title}</AppText>
      <AppText color="textMuted" align="center">{body}</AppText>
      {onRetry ? <Button label="Try again" icon="refresh-cw" variant="secondary" onPress={onRetry} /> : null}
    </Stack>
  );
}

export function Skeleton({ height = 20, width = '100%', radius = 10 }: { height?: number; width?: number | `${number}%`; radius?: number }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const o = useSharedValue(0.5);
  useEffect(() => {
    if (!reduce) o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [reduce, o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: t.c.surfaceSunken }, s]} />;
}

export function LoadingList({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <View accessible accessibilityLabel={label} accessibilityRole="progressbar" style={{ gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={64} radius={16} />)}
    </View>
  );
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)), []);
  return online;
}

export function OfflineBanner({ message = "You're offline. Changes are saved on this device and will sync later." }: { message?: string }) {
  const t = useTheme();
  const online = useOnline();
  if (online) return null;
  return (
    <Row gap={10} style={{ backgroundColor: t.c.warningSoft, padding: 12, borderRadius: 14 }}>
      <Icon name="wifi-off" color="warning" size={18} />
      <AppText variant="support" color="text" style={{ flex: 1 }} accessibilityLiveRegion="polite">{message}</AppText>
    </Row>
  );
}

export function Notice({ tone = 'info', icon, title, children }: { tone?: 'info' | 'warning' | 'danger' | 'success'; icon?: 'info' | 'alert-triangle' | 'shield' | 'check-circle' | 'cpu'; title?: string; children: ReactNode }) {
  const t = useTheme();
  const bg = { info: t.c.infoSoft, warning: t.c.warningSoft, danger: t.c.dangerSoft, success: t.c.successSoft }[tone];
  const fg = ({ info: 'info', warning: 'warning', danger: 'danger', success: 'success' } as const)[tone];
  return (
    <Row gap={10} style={{ backgroundColor: bg, padding: 14, borderRadius: 16, alignItems: 'flex-start' }}>
      <Icon name={icon ?? (tone === 'warning' ? 'alert-triangle' : 'info')} color={fg} size={18} />
      <View style={{ flex: 1, gap: 4 }}>
        {title ? <AppText variant="supportStrong">{title}</AppText> : null}
        {typeof children === 'string' ? <AppText variant="support">{children}</AppText> : children}
      </View>
    </Row>
  );
}
