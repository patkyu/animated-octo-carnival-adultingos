import { useState } from 'react';
import { addDays, formatDateLong, todayInZone, type LocalDate } from '@adultingos/shared';
import { rescheduleOccurrence, snoozeOccurrence } from '@/db/obligations';
import { useAppStore } from '@/state/appStore';
import { Button, Stack, AppText } from './primitives';
import { DateField } from './forms';
import { Sheet, toast } from './overlays';

/** Reschedule (moves the due date) or snooze (quiets reminders, keeps the date). */
export function RescheduleSheet({ occurrenceId, title, visible, onClose }: { occurrenceId: string | null; title: string; visible: boolean; onClose: () => void }) {
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const [custom, setCustom] = useState<LocalDate | null>(null);
  const move = async (d: LocalDate) => {
    if (!occurrenceId) return;
    await rescheduleOccurrence(occurrenceId, d);
    toast(`Moved to ${formatDateLong(d)}`, 'success');
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={`Reschedule “${title}”`}>
      <Stack gap={10}>
        <Button label="Tomorrow" variant="secondary" full onPress={() => move(addDays(today, 1))} />
        <Button label="In 3 days" variant="secondary" full onPress={() => move(addDays(today, 3))} />
        <Button label="Next week" variant="secondary" full onPress={() => move(addDays(today, 7))} />
        <DateField label="Pick another date" value={custom} onChange={setCustom} quick={false} minimumDate={today} />
        {custom ? <Button label={`Move to ${formatDateLong(custom)}`} full onPress={() => move(custom)} /> : null}
        <AppText variant="caption" color="textMuted">Only want a break from reminders? Snooze keeps the due date.</AppText>
        <Button
          label="Snooze reminders for 1 hour"
          variant="ghost"
          full
          onPress={async () => {
            if (!occurrenceId) return;
            await snoozeOccurrence(occurrenceId, new Date(Date.now() + 3600_000));
            toast('Snoozed for an hour.');
            onClose();
          }}
        />
      </Stack>
    </Sheet>
  );
}
