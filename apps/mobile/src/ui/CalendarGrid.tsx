import { Pressable, StyleSheet, View } from 'react-native';
import { addDays, dayOfWeek, daysInMonth, formatDateLong, formatMonthYear, parseLocalDate, startOfMonth, type LocalDate } from '@adultingos/shared';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, IconButton, Row } from './primitives';

export interface DayMarks {
  count: number;
  overdue: boolean;
  kinds: Set<'task' | 'bill' | 'subscription' | 'document'>;
}

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Month grid with due-date indicators (dots + accessible counts). */
export function MonthGrid({ month, selected, today, marks, onSelect, onPrev, onNext }: {
  month: LocalDate; selected: LocalDate; today: LocalDate; marks: Map<LocalDate, DayMarks>; onSelect: (d: LocalDate) => void; onPrev: () => void; onNext: () => void;
}) {
  const t = useTheme();
  const first = startOfMonth(month);
  const { year, month: m } = parseLocalDate(first);
  const lead = dayOfWeek(first);
  const days = daysInMonth(year, m);
  const cells: (LocalDate | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(first, i))];
  while (cells.length % 7) cells.push(null);
  const dotColor = { task: t.c.primary, bill: t.c.warning, subscription: t.c.info, document: '#6B5FA8' } as const;

  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon="chevron-left" label="Previous month" onPress={onPrev} />
        <AppText variant="section" accessibilityLiveRegion="polite">{formatMonthYear(first)}</AppText>
        <IconButton icon="chevron-right" label="Next month" onPress={onNext} />
      </Row>
      <View style={styles.row}>
        {WEEK.map((w, i) => (
          <View key={i} style={styles.cell} accessible accessibilityLabel={WEEK_FULL[i]}>
            <AppText variant="caption" color="textMuted">{w}</AppText>
          </View>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={styles.row}>
          {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={styles.cell} />;
            const mk = marks.get(d);
            const isSel = d === selected;
            const isToday = d === today;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={`${formatDateLong(d)}${isToday ? ', today' : ''}. ${mk ? `${mk.count} item${mk.count === 1 ? '' : 's'}${mk.overdue ? ', some overdue' : ''}` : 'Nothing due'}`}
                onPress={() => onSelect(d)}
                style={[styles.cell, styles.day, { backgroundColor: isSel ? t.c.primary : isToday ? t.c.primarySoft : 'transparent' }]}
              >
                <AppText variant="supportStrong" color={isSel ? 'onPrimary' : isToday ? 'onPrimarySoft' : 'text'}>{parseLocalDate(d).day}</AppText>
                <Row gap={2} style={{ height: 6 }}>
                  {mk ? [...mk.kinds].slice(0, 3).map((k) => <View key={k} style={[styles.dot, { backgroundColor: isSel ? t.c.onPrimary : mk.overdue ? t.c.danger : dotColor[k] }]} />) : null}
                </Row>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  day: { borderRadius: 14, gap: 2, margin: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
