import { useEffect, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import type { MascotId } from '@adultingos/brand';
import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/state/appStore';
import { AppText, Button, IconButton, Row, Stack } from './primitives';
import { Mascot } from './Mascot';

export function Sheet({ visible, onClose, title, children, footer }: { visible: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.c.overlay }]} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={{ flex: 1 }} pointerEvents="box-none" />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: t.c.background, paddingBottom: insets.bottom + 16, maxHeight: '88%' }]}
        >
          <View style={[styles.grabber, { backgroundColor: t.c.borderStrong }]} />
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 }}>
            <AppText variant="section" style={{ flex: 1 }}>{title}</AppText>
            <IconButton icon="x" label="Close" onPress={onClose} />
          </Row>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConfirmDialog({ visible, title, message, confirmLabel, destructive, onConfirm, onCancel, busy }: {
  visible: boolean; title: string; message: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void; busy?: boolean;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.center, { backgroundColor: t.c.overlay }]}>
        <View accessibilityViewIsModal accessibilityRole="alert" style={[styles.dialog, { backgroundColor: t.c.surface }]}>
          <AppText variant="section">{title}</AppText>
          <AppText color="textMuted">{message}</AppText>
          <Row style={{ justifyContent: 'flex-end', marginTop: 8 }} gap={8} wrap>
            <Button label="Cancel" variant="ghost" onPress={onCancel} disabled={busy} />
            <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} loading={busy} />
          </Row>
        </View>
      </View>
    </Modal>
  );
}

/* ---------------------------------- Toasts ---------------------------------- */
interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
  mascot?: MascotId;
  action?: { label: string; onPress: () => void };
}
interface ToastStore {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}
let nextId = 1;
export const useToasts = create<ToastStore>((set) => ({
  items: [],
  push: (t) => set((s) => ({ items: [...s.items.slice(-2), { ...t, id: nextId++ }] })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));
export const toast = (message: string, tone: ToastItem['tone'] = 'info', extra: Partial<ToastItem> = {}) => useToasts.getState().push({ message, tone, ...extra });

function ToastView({ item }: { item: ToastItem }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const h = setTimeout(() => dismiss(item.id), item.action ? 6000 : 3500);
    return () => clearTimeout(h);
  }, [item, dismiss]);
  const bg = item.tone === 'error' ? t.c.danger : t.c.text;
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown} exiting={reduce ? undefined : FadeOutDown} style={[styles.toast, { backgroundColor: bg }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
      {item.mascot ? <Mascot id={item.mascot} expression="celebrating" size={40} animation="none" /> : null}
      <AppText variant="supportStrong" color={item.tone === 'error' ? 'onPrimary' : 'textInverse'} style={{ flex: 1 }}>{item.message}</AppText>
      {item.action ? (
        <Button label={item.action.label} compact variant="soft" onPress={() => { item.action?.onPress(); dismiss(item.id); }} />
      ) : null}
    </Animated.View>
  );
}

export function ToastHost() {
  const items = useToasts((s) => s.items);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', paddingBottom: insets.bottom + 88, paddingHorizontal: 16 }]}>
      <Stack gap={8}>
        {items.map((i) => <ToastView key={i.id} item={i} />)}
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, borderRadius: 24, padding: 24, gap: 12 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, minHeight: 52 },
});
