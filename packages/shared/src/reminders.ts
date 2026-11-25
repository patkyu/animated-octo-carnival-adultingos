import {
  addDays,
  minutesToTime,
  timeToMinutes,
  zonedTimeToUtc,
  type LocalDate,
  type LocalTime,
} from './dates';

export interface QuietHours {
  enabled: boolean;
  start: LocalTime; // e.g. 22:00
  end: LocalTime; // e.g. 07:00
}

export const DEFAULT_QUIET_HOURS: QuietHours = { enabled: true, start: '22:00', end: '07:00' };
export const DEFAULT_REMINDER_TIME: LocalTime = '09:00';

export function isWithinQuietHours(time: LocalTime, quiet: QuietHours): boolean {
  if (!quiet.enabled) return false;
  const t = timeToMinutes(time);
  const s = timeToMinutes(quiet.start);
  const e = timeToMinutes(quiet.end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

/**
 * Moves a wall-clock reminder out of quiet hours to the moment quiet hours end.
 * Returns the (possibly next-day) date and time.
 */
export function shiftOutOfQuietHours(date: LocalDate, time: LocalTime, quiet: QuietHours): { date: LocalDate; time: LocalTime } {
  if (!isWithinQuietHours(time, quiet)) return { date, time };
  const t = timeToMinutes(time);
  const s = timeToMinutes(quiet.start);
  const e = timeToMinutes(quiet.end);
  // Overnight window and we're in the evening part → next morning.
  const nextDay = s > e && t >= s;
  return { date: nextDay ? addDays(date, 1) : date, time: minutesToTime(e) };
}

export interface ReminderInstant {
  /** Days before the due date (0 = on the day). */
  offsetDays: number;
  fireAt: Date;
  localDate: LocalDate;
  localTime: LocalTime;
}

/**
 * Computes concrete reminder instants for an item. Past instants are dropped,
 * duplicates (e.g. two offsets collapsing after the quiet-hours shift) are
 * removed, and results are sorted.
 */
export function computeReminderInstants(params: {
  dueDate: LocalDate;
  dueTime?: LocalTime | null;
  offsetsDays: readonly number[];
  reminderTime?: LocalTime;
  timeZone: string;
  quietHours?: QuietHours;
  now?: Date;
}): ReminderInstant[] {
  const now = params.now ?? new Date();
  const seen = new Set<number>();
  const out: ReminderInstant[] = [];
  for (const offset of [...new Set(params.offsetsDays)].filter((n) => Number.isInteger(n) && n >= 0)) {
    const baseDate = addDays(params.dueDate, -offset);
    // On the due day with a due time, remind one hour before; else use the reminder time.
    let time: LocalTime =
      offset === 0 && params.dueTime
        ? minutesToTime(Math.max(0, timeToMinutes(params.dueTime) - 60))
        : params.reminderTime ?? DEFAULT_REMINDER_TIME;
    let date = baseDate;
    if (params.quietHours) ({ date, time } = shiftOutOfQuietHours(date, time, params.quietHours));
    const fireAt = zonedTimeToUtc(date, time, params.timeZone);
    if (fireAt.getTime() <= now.getTime()) continue;
    if (seen.has(fireAt.getTime())) continue;
    seen.add(fireAt.getTime());
    out.push({ offsetDays: offset, fireAt, localDate: date, localTime: time });
  }
  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

export type NotificationKind = 'task' | 'bill' | 'document' | 'subscription' | 'weekly_summary';

/**
 * Notification copy. When `showDetails` is false (the default), lock-screen
 * text never includes amounts, document names or reference numbers.
 */
export function reminderCopy(params: {
  kind: NotificationKind;
  title: string;
  offsetDays: number;
  showDetails: boolean;
  amountLabel?: string;
}): { title: string; body: string } {
  const when =
    params.offsetDays === 0 ? 'today' : params.offsetDays === 1 ? 'tomorrow' : `in ${params.offsetDays} days`;
  if (!params.showDetails) {
    const generic: Record<NotificationKind, string> = {
      task: `You have a task due ${when}.`,
      bill: `A bill is due ${when}.`,
      document: params.offsetDays === 0 ? 'A document expires today.' : `A document renewal is coming up ${when}.`,
      subscription: `A subscription renews ${when}.`,
      weekly_summary: 'Your week ahead is ready.',
    };
    return { title: 'AdultingOS', body: `${generic[params.kind]} Tap to open.` };
  }
  switch (params.kind) {
    case 'bill':
      return { title: params.title, body: `Due ${when}${params.amountLabel ? ` · ${params.amountLabel}` : ''}.` };
    case 'document':
      return {
        title: params.title,
        body: params.offsetDays === 0 ? 'Expires today. Check renewal steps.' : `Expires ${when}. Time to plan your renewal.`,
      };
    case 'subscription':
      return { title: params.title, body: `Renews ${when}.` };
    default:
      return { title: params.title, body: `Due ${when}.` };
  }
}
