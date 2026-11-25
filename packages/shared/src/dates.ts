/**
 * Local-date utilities.
 *
 * All-day obligations and document expiry dates are stored as calendar dates
 * ("YYYY-MM-DD") with no time zone, so a passport expiring on 2027-03-01 expires
 * on that date wherever the user is. Arithmetic is done in UTC on purpose so
 * that daylight-saving transitions can never shift a date.
 */

export type LocalDate = string; // YYYY-MM-DD
export type LocalTime = string; // HH:mm (24h)

export const DEFAULT_TIMEZONE = 'Asia/Manila';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

export function isLocalTime(value: unknown): value is LocalTime {
  return typeof value === 'string' && TIME_RE.test(value);
}

export function parseLocalDate(value: LocalDate): DateParts {
  if (!isLocalDate(value)) throw new RangeError(`Invalid local date: ${value}`);
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return { year: y, month: m, day: d };
}

export function formatLocalDate({ year, month, day }: DateParts): LocalDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 30;
}

function toEpochDay(date: LocalDate): number {
  const { year, month, day } = parseLocalDate(date);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function fromEpochDay(epochDay: number): LocalDate {
  const d = new Date(epochDay * 86_400_000);
  return formatLocalDate({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromEpochDay(toEpochDay(date) + days);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return toEpochDay(to) - toEpochDay(from);
}

export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0; // ISO format sorts lexicographically
}

/** 0 = Sunday ... 6 = Saturday */
export function dayOfWeek(date: LocalDate): number {
  return (((toEpochDay(date) + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday
}

/**
 * Adds months, placing the result on `anchorDay` clamped to the target month's
 * length. A bill anchored on the 31st falls on Feb 28/29, Apr 30, then returns
 * to the 31st in months that have one — it never "drifts" to the 28th forever.
 */
export function addMonthsAnchored(date: LocalDate, months: number, anchorDay?: number): LocalDate {
  const { year, month, day } = parseLocalDate(date);
  const anchor = anchorDay ?? day;
  const zeroBased = month - 1 + months;
  const y = year + Math.floor(zeroBased / 12);
  const m = (((zeroBased % 12) + 12) % 12) + 1;
  return formatLocalDate({ year: y, month: m, day: Math.min(anchor, daysInMonth(y, m)) });
}

function partsInZone(instant: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(instant)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year ?? 1970,
    month: out.month ?? 1,
    day: out.day ?? 1,
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  };
}

/** The calendar date "today" in the given zone. */
export function todayInZone(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): LocalDate {
  const p = partsInZone(now, timeZone);
  return formatLocalDate({ year: p.year, month: p.month, day: p.day });
}

/** Local wall-clock minutes since midnight in the given zone. */
export function minutesOfDayInZone(timeZone: string, now: Date = new Date()): number {
  const p = partsInZone(now, timeZone);
  return p.hour * 60 + p.minute;
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = partsInZone(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock date/time in a zone to a UTC instant. Handles DST by
 * re-evaluating the offset at the candidate instant (two-pass), which is exact
 * for every zone except inside a skipped hour, where it moves forward.
 */
export function zonedTimeToUtc(date: LocalDate, time: LocalTime, timeZone: string = DEFAULT_TIMEZONE): Date {
  if (!isLocalTime(time)) throw new RangeError(`Invalid local time: ${time}`);
  const { year, month, day } = parseLocalDate(date);
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const naive = Date.UTC(year, month - 1, day, hh, mm);
  let guess = naive - zoneOffsetMs(new Date(naive), timeZone);
  guess = naive - zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess);
}

export function timeToMinutes(time: LocalTime): number {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

export function minutesToTime(minutes: number): LocalTime {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function startOfWeek(date: LocalDate, weekStartsOn = 0): LocalDate {
  const diff = (dayOfWeek(date) - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

export function startOfMonth(date: LocalDate): LocalDate {
  const { year, month } = parseLocalDate(date);
  return formatLocalDate({ year, month, day: 1 });
}

export function monthKey(date: LocalDate): string {
  return date.slice(0, 7);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Locale-independent formatting so output is identical on Hermes and Node. */
export function formatDateShort(date: LocalDate): string {
  const { year, month, day } = parseLocalDate(date);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function formatDateLong(date: LocalDate): string {
  const { year, month, day } = parseLocalDate(date);
  return `${WEEKDAYS_LONG[dayOfWeek(date)]}, ${MONTHS_LONG[month - 1]} ${day}, ${year}`;
}

export function formatMonthYear(date: LocalDate): string {
  const { year, month } = parseLocalDate(date);
  return `${MONTHS_LONG[month - 1]} ${year}`;
}

export function weekdayShort(date: LocalDate): string {
  return WEEKDAYS[dayOfWeek(date)] ?? '';
}

export function formatTime12(time: LocalTime): string {
  const [h, m] = time.split(':').map(Number) as [number, number];
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Human relative label: "Today", "Tomorrow", "In 3 days", "2 days ago". */
export function relativeDayLabel(date: LocalDate, today: LocalDate): string {
  const d = daysBetween(today, date);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d > 1 && d < 7) return `In ${d} days`;
  if (d < -1) return `${-d} days ago`;
  return formatDateShort(date);
}

export function greetingForMinutes(minutesOfDay: number): 'morning' | 'afternoon' | 'evening' {
  if (minutesOfDay < 12 * 60) return 'morning';
  if (minutesOfDay < 18 * 60) return 'afternoon';
  return 'evening';
}

/** Mid-sentence form: "today", "tomorrow", "in 3 days", "2 days ago", "on Dec 6, 2026". */
export function relativeDayPhrase(date: LocalDate, today: LocalDate): string {
  const d = daysBetween(today, date);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d === -1) return 'yesterday';
  if (d > 1 && d < 7) return `in ${d} days`;
  if (d < -1) return `${-d} days ago`;
  return `on ${formatDateShort(date)}`;
}
