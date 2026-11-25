import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { categoryLabel, daysBetween, formatMinor, formatTime12, relativeDayLabel, todayInZone } from '@adultingos/shared';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/state/appStore';
import type { Item } from '@/db/obligations';
import { AppText, Icon, Row, StatusBadge, type IconName } from './primitives';

const KIND_ICON: Record<Item['kind'], IconName> = { task: 'check-square', bill: 'file-text', subscription: 'repeat' };

export function dueTone(item: Pick<Item, 'dueDate' | 'status'>, today: string): { tone: 'danger' | 'warning' | 'neutral' | 'success'; label: string } {
  if (item.status === 'done') return { tone: 'success', label: 'Done' };
  if (item.status === 'skipped') return { tone: 'neutral', label: 'Skipped' };
  const d = daysBetween(today, item.dueDate);
  if (d < 0) return { tone: 'danger', label: d === -1 ? 'Overdue · yesterday' : `Overdue · ${-d} days` };
  if (d === 0) return { tone: 'warning', label: 'Due today' };
  if (d <= 3) return { tone: 'warning', label: relativeDayLabel(item.dueDate, today) };
  return { tone: 'neutral', label: relativeDayLabel(item.dueDate, today) };
}

/** A task/bill/subscription occurrence with one-tap completion. */
export function TaskRow({ item, onToggle, selectable, selected, onSelect, customCategories = [] }: {
  item: Item; onToggle?: (item: Item) => void; selectable?: boolean; selected?: boolean; onSelect?: (item: Item) => void; customCategories?: { id: string; name: string }[];
}) {
  const t = useTheme();
  const tz = useAppStore((s) => s.profile.timezone);
  const accountMode = useAppStore((s) => s.app.mode === 'account');
  const today = todayInZone(tz);
  const done = item.status === 'done';
  const due = dueTone(item, today);
  const amount = item.kind !== 'task' && (item.amountMinor ?? item.billAmountMinor) !== null && item.currency
    ? formatMinor((item.amountMinor ?? item.billAmountMinor)!, item.currency as 'PHP' | 'USD')
    : null;
  const checkLabel = done ? `Reopen ${item.title}` : item.kind === 'bill' ? `Mark ${item.title} as paid` : `Mark ${item.title} as done`;

  return (
    <View style={[styles.row, { backgroundColor: t.c.surface, borderColor: selected ? t.c.primary : t.c.border, borderWidth: selected ? 2 : StyleSheet.hairlineWidth }]}>
      {selectable ? (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!selected }} accessibilityLabel={`Select ${item.title}`} onPress={() => onSelect?.(item)} style={styles.check} hitSlop={8}>
          <View style={[styles.box, { borderColor: selected ? t.c.primary : t.c.borderStrong, backgroundColor: selected ? t.c.primary : 'transparent' }]}>
            {selected ? <Icon name="check" size={16} color="onPrimary" /> : null}
          </View>
        </Pressable>
      ) : onToggle ? (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={checkLabel} onPress={() => onToggle(item)} style={styles.check} hitSlop={8}>
          <View style={[styles.circle, { borderColor: done ? t.c.success : t.c.borderStrong, backgroundColor: done ? t.c.success : 'transparent' }]}>
            {done ? <Icon name="check" size={16} color="onPrimary" /> : null}
          </View>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${due.label}.${amount ? ` ${amount}.` : ''} Open details`}
        onPress={() => (selectable ? onSelect?.(item) : router.push(item.kind === 'bill' ? `/bill/${item.obligationId}` : item.kind === 'subscription' ? `/subscription/${item.obligationId}` : `/task/${item.obligationId}`))}
        style={{ flex: 1, paddingVertical: 12, paddingRight: 12, gap: 4 }}
      >
        <AppText variant="bodyStrong" numberOfLines={2} style={done ? { textDecorationLine: 'line-through', color: t.c.textMuted } : undefined}>{item.title}</AppText>
        <Row wrap gap={8}>
          <StatusBadge label={due.label} tone={due.tone} />
          <Row gap={4}>
            <Icon name={KIND_ICON[item.kind]} size={13} color="textMuted" />
            <AppText variant="caption" color="textMuted">{item.kind === 'task' ? categoryLabel(item.category, customCategories) : item.kind === 'bill' ? 'Bill' : 'Subscription'}</AppText>
          </Row>
          {item.dueTime ? <AppText variant="caption" color="textMuted">{formatTime12(item.dueTime)}</AppText> : null}
          {amount ? <AppText variant="caption" color="text">{amount}</AppText> : null}
          {item.priority === 'high' && !done ? <StatusBadge label="High priority" tone="info" icon="flag" /> : null}
          {accountMode && item.syncState === 'pending' ? <Icon name="upload-cloud" size={13} color="textMuted" /> : null}
        </Row>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, minHeight: 64 },
  check: { width: 56, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
