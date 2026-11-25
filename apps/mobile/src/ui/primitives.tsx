import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { TypeVariant } from '@/theme/tokens';
import type { ColorTokens } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Feather>['name'];

/* ---------------------------------- Text ---------------------------------- */
export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: keyof ColorTokens;
  align?: TextStyle['textAlign'];
  children?: ReactNode;
}
export function AppText({ variant = 'body', color = 'text', align, style, ...rest }: AppTextProps) {
  const t = useTheme();
  const isHeading = variant === 'display' || variant === 'title' || variant === 'section';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={variant === 'display' ? 1.6 : 2}
      style={[t.type[variant], { color: t.c[color], textAlign: align }, style]}
      {...rest}
    />
  );
}

export function Icon({ name, size = 20, color = 'text' }: { name: IconName; size?: number; color?: keyof ColorTokens }) {
  const t = useTheme();
  return <Feather name={name} size={size} color={t.c[color]} accessibilityElementsHidden importantForAccessibility="no" />;
}

/* --------------------------------- Button --------------------------------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  compact?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}
export function Button({ label, variant = 'primary', icon, loading, compact, full, disabled, style, onPress, ...rest }: ButtonProps) {
  const t = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: keyof ColorTokens; border?: string; pressed: string }> = {
    primary: { bg: t.c.primary, fg: 'onPrimary', pressed: t.c.primaryPressed },
    secondary: { bg: t.c.surface, fg: 'primary', border: t.c.borderStrong, pressed: t.c.surfaceSunken },
    ghost: { bg: 'transparent', fg: 'primary', pressed: t.c.surfaceSunken },
    danger: { bg: t.c.danger, fg: 'onPrimary', pressed: t.c.danger },
    soft: { bg: t.c.primarySoft, fg: 'onPrimarySoft', pressed: t.c.primarySoft },
  };
  const p = palette[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={(e) => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? p.pressed : p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 1.5 : 0,
          minHeight: compact ? 40 : 52,
          paddingHorizontal: compact ? 14 : 20,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: full ? 'stretch' : 'auto',
        },
        style,
      ]}
      hitSlop={compact ? 4 : 0}
      {...rest}
    >
      {loading ? <ActivityIndicator color={t.c[p.fg]} /> : icon ? <Icon name={icon} size={18} color={p.fg} /> : null}
      <AppText variant={compact ? 'supportStrong' : 'bodyStrong'} color={p.fg} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, tone = 'text', size = 22, badge }: { icon: IconName; label: string; onPress: () => void; tone?: keyof ColorTokens; size?: number; badge?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? t.c.surfaceSunken : 'transparent' }]}
    >
      <Icon name={icon} size={size} color={tone} />
      {badge ? <View style={[styles.badgeDot, { backgroundColor: t.c.danger, borderColor: t.c.background }]} /> : null}
    </Pressable>
  );
}

/* ---------------------------------- Card ---------------------------------- */
export function Card({ children, onPress, tone, style, accessibilityLabel, accessibilityHint }: {
  children: ReactNode; onPress?: () => void; tone?: keyof ColorTokens; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; accessibilityHint?: string;
}) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: tone ? t.c[tone] : t.c.surface,
    borderRadius: t.radius.lg,
    padding: t.space.lg,
    borderWidth: tone ? 0 : StyleSheet.hairlineWidth,
    borderColor: t.c.border,
    shadowColor: t.c.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: tone ? 0 : 1,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [base, { transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

/* ---------------------------------- Chips --------------------------------- */
export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={[
        styles.chip,
        { backgroundColor: selected ? t.c.primary : t.c.surface, borderColor: selected ? t.c.primary : t.c.borderStrong },
      ]}
    >
      {selected ? <Icon name="check" size={14} color="onPrimary" /> : icon ? <Icon name={icon} size={14} color="textMuted" /> : null}
      <AppText variant="supportStrong" color={selected ? 'onPrimary' : 'text'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
/** Status is conveyed by icon + text, not colour alone. */
export function StatusBadge({ label, tone, icon }: { label: string; tone: StatusTone; icon?: IconName }) {
  const t = useTheme();
  const map: Record<StatusTone, { bg: string; fg: keyof ColorTokens; icon: IconName }> = {
    neutral: { bg: t.c.surfaceSunken, fg: 'textMuted', icon: 'circle' },
    success: { bg: t.c.successSoft, fg: 'success', icon: 'check-circle' },
    warning: { bg: t.c.warningSoft, fg: 'warning', icon: 'clock' },
    danger: { bg: t.c.dangerSoft, fg: 'danger', icon: 'alert-circle' },
    info: { bg: t.c.infoSoft, fg: 'info', icon: 'info' },
  };
  const m = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: m.bg }]} accessible accessibilityLabel={label}>
      <Icon name={icon ?? m.icon} size={13} color={m.fg} />
      <AppText variant="caption" color={m.fg}>
        {label}
      </AppText>
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.c.border, marginVertical: t.space.sm }} />;
}

export function Row({ children, gap = 8, style, wrap, ...rest }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean } & Omit<ViewProps, 'style' | 'children'>) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]} {...rest}>{children}</View>;
}

export function Stack({ children, gap = 12, style, ...rest }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> } & Omit<ViewProps, 'style' | 'children'>) {
  return <View style={[{ gap }, style]} {...rest}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
      <AppText variant="section">{title}</AppText>
      {action && onAction ? <Button label={action} variant="ghost" compact onPress={onAction} /> : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16 },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', top: 11, right: 11, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
});
