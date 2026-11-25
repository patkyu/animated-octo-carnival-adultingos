import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';
import { addDays, formatDateLong, formatTime12, isLocalDate, todayInZone, type LocalDate } from '@adultingos/shared';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/state/appStore';
import { AppText, Chip, Icon, Row, Stack, type IconName } from './primitives';
import { Sheet } from './overlays';

export function FieldLabel({ label, required, helper }: { label: string; required?: boolean; helper?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="supportStrong">
        {label}
        {required ? <AppText variant="supportStrong" color="danger" accessibilityLabel="required"> *</AppText> : null}
      </AppText>
      {helper ? <AppText variant="caption" color="textMuted">{helper}</AppText> : null}
    </View>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Row gap={6} style={{ marginTop: 2 }}>
      <Icon name="alert-circle" size={14} color="danger" />
      <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">{message}</AppText>
    </Row>
  );
}

export interface TextFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string | null;
  icon?: IconName;
}
export function TextField({ label, required, helper, error, icon, style, multiline, ...rest }: TextFieldProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <FieldLabel label={label} required={required} helper={helper} />
      <View
        style={[
          styles.input,
          { backgroundColor: t.c.surface, borderColor: error ? t.c.danger : focused ? t.c.focus : t.c.borderStrong, borderWidth: focused || error ? 2 : 1.5, minHeight: multiline ? 104 : 52 },
        ]}
      >
        {icon ? <Icon name={icon} size={18} color="textMuted" /> : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={helper}
          placeholderTextColor={t.c.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          style={[t.type.body, { flex: 1, color: t.c.text, paddingVertical: 12, textAlignVertical: multiline ? 'top' : 'center' }, style]}
          {...rest}
        />
      </View>
      <FieldError message={error} />
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, { backgroundColor: t.c.surfaceSunken }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: t.c.surface, shadowColor: t.c.shadow, shadowOpacity: 1, shadowRadius: 6, elevation: 1 }]}
          >
            <AppText variant="supportStrong" color={selected ? 'primary' : 'textMuted'} numberOfLines={1}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({ label, helper, value, onChange, disabled }: { label: string; helper?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      accessibilityHint={helper}
      onPress={() => !disabled && onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, opacity: disabled ? 0.5 : 1 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {helper ? <AppText variant="support" color="textMuted">{helper}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: t.c.primary, false: t.c.borderStrong }}
        thumbColor={Platform.OS === 'android' ? t.c.surface : undefined}
        importantForAccessibility="no"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

/** Pick one option from a sheet. */
export function SelectField<T extends string>({ label, value, options, onChange, required, error, helper }: {
  label: string; value: T | null; options: { value: T; label: string; description?: string }[]; onChange: (v: T) => void; required?: boolean; error?: string | null; helper?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      <FieldLabel label={label} required={required} helper={helper} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? 'not selected'}`}
        accessibilityHint="Opens a list of options"
        onPress={() => setOpen(true)}
        style={[styles.input, { backgroundColor: t.c.surface, borderColor: error ? t.c.danger : t.c.borderStrong, borderWidth: 1.5, minHeight: 52 }]}
      >
        <AppText style={{ flex: 1 }} color={current ? 'text' : 'textMuted'}>{current?.label ?? 'Choose…'}</AppText>
        <Icon name="chevron-down" color="textMuted" />
      </Pressable>
      <FieldError message={error} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <Stack gap={4}>
          {options.map((o) => (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: o.value === value }}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={({ pressed }) => [styles.option, { backgroundColor: o.value === value ? t.c.primarySoft : pressed ? t.c.surfaceSunken : 'transparent' }]}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" color={o.value === value ? 'onPrimarySoft' : 'text'}>{o.label}</AppText>
                {o.description ? <AppText variant="support" color="textMuted">{o.description}</AppText> : null}
              </View>
              {o.value === value ? <Icon name="check" color="onPrimarySoft" /> : null}
            </Pressable>
          ))}
        </Stack>
      </Sheet>
    </View>
  );
}

/**
 * Date picker: quick chips plus the platform picker (Android dialog). On web
 * a YYYY-MM-DD field is used. Dates are local calendar dates (no time zone).
 */
export function DateField({ label, value, onChange, required, error, allowClear, quick = true, helper, minimumDate }: {
  label: string; value: LocalDate | null; onChange: (v: LocalDate | null) => void; required?: boolean; error?: string | null; allowClear?: boolean; quick?: boolean; helper?: string; minimumDate?: LocalDate;
}) {
  const t = useTheme();
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const [iosOpen, setIosOpen] = useState(false);
  const [webText, setWebText] = useState(value ?? '');
  const toDate = (d: LocalDate) => new Date(`${d}T12:00:00`);
  const fromDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value ?? today), mode: 'date', minimumDate: minimumDate ? toDate(minimumDate) : undefined,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(fromDate(d));
        },
      });
    } else if (Platform.OS === 'ios') setIosOpen(true);
  };

  return (
    <View style={{ gap: 6 }}>
      <FieldLabel label={label} required={required} helper={helper} />
      {Platform.OS === 'web' ? (
        <TextInput
          accessibilityLabel={`${label}, format year-month-day`}
          value={webText}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={t.c.textMuted}
          onChangeText={(s) => {
            setWebText(s);
            if (isLocalDate(s)) onChange(s);
            else if (!s && allowClear) onChange(null);
          }}
          style={[t.type.body, styles.input, { color: t.c.text, backgroundColor: t.c.surface, borderColor: error ? t.c.danger : t.c.borderStrong, borderWidth: 1.5, minHeight: 52 }]}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? formatDateLong(value) : 'not set'}`}
          accessibilityHint="Opens a date picker"
          onPress={open}
          style={[styles.input, { backgroundColor: t.c.surface, borderColor: error ? t.c.danger : t.c.borderStrong, borderWidth: 1.5, minHeight: 52 }]}
        >
          <Icon name="calendar" color="textMuted" size={18} />
          <AppText style={{ flex: 1 }} color={value ? 'text' : 'textMuted'}>{value ? formatDateLong(value) : 'Pick a date'}</AppText>
        </Pressable>
      )}
      {quick || allowClear ? (
        <Row wrap gap={8}>
          {quick ? (
            <>
              <Chip label="Today" selected={value === today} onPress={() => { onChange(today); setWebText(today); }} />
              <Chip label="Tomorrow" selected={value === addDays(today, 1)} onPress={() => { onChange(addDays(today, 1)); setWebText(addDays(today, 1)); }} />
              <Chip label="In a week" selected={value === addDays(today, 7)} onPress={() => { onChange(addDays(today, 7)); setWebText(addDays(today, 7)); }} />
            </>
          ) : null}
          {allowClear && value ? <Chip label="Clear" icon="x" onPress={() => { onChange(null); setWebText(''); }} /> : null}
        </Row>
      ) : null}
      <FieldError message={error} />
      {iosOpen ? (
        <DateTimePicker value={toDate(value ?? today)} mode="date" display="inline" onChange={(_, d) => { setIosOpen(false); if (d) onChange(fromDate(d)); }} />
      ) : null}
    </View>
  );
}

const TIMES = ['07:00', '08:00', '09:00', '10:00', '12:00', '13:00', '15:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
export function TimeField({ label, value, onChange, allowClear }: { label: string; value: string | null; onChange: (v: string | null) => void; allowClear?: boolean }) {
  const options = [
    ...(allowClear ? [{ value: 'none', label: 'No specific time' }] : []),
    ...TIMES.map((x) => ({ value: x, label: formatTime12(x) })),
  ];
  return <SelectField label={label} value={value ?? (allowClear ? 'none' : null)} options={options} onChange={(v) => onChange(v === 'none' ? null : v)} />;
}

/** Multi-select reminder offsets, e.g. 90 / 30 / 7 days before. */
export function OffsetsField({ label, value, options, onChange, helper }: { label: string; value: number[]; options: readonly number[]; onChange: (v: number[]) => void; helper?: string }) {
  const name = (n: number) => (n === 0 ? 'On the day' : n === 1 ? '1 day before' : `${n} days before`);
  return (
    <View style={{ gap: 8 }}>
      <FieldLabel label={label} helper={helper} />
      <Row wrap gap={8}>
        {options.map((n) => (
          <Chip key={n} label={name(n)} selected={value.includes(n)} onPress={() => onChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n].sort((a, b) => b - a))} />
        ))}
      </Row>
    </View>
  );
}

export function FormSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 16 }}>
      {title ? <AppText variant="section">{title}</AppText> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14 },
  segmented: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
});
