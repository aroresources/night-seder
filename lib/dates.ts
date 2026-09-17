/**
 * Calendar dates, always in America/New_York.
 *
 * The night program starts at 8:30 pm Eastern, which is already the next day
 * in UTC. Anything that asks "what is today?" through UTC files attendance
 * under the wrong night. So: `today()` resolves the New York calendar day, and
 * every other helper here treats a date as the opaque string "YYYY-MM-DD" and
 * never round-trips it through a timestamp in the local zone.
 *
 * Arithmetic is done at UTC midnight purely as a calendar, never as an instant.
 */

export const TIME_ZONE = 'America/New_York';

/** A calendar date, "YYYY-MM-DD". */
export type CalendarDate = string;

/** The New York calendar date at the given instant (default: now). */
export function today(now: Date = new Date()): CalendarDate {
  // 'en-CA' formats as YYYY-MM-DD.
  return now.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

/** True for a well-formed, real calendar date. */
export function isCalendarDate(value: unknown): value is CalendarDate {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/** Calendar date -> a Date pinned to UTC midnight. For arithmetic only. */
function toUtcMidnight(date: CalendarDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** UTC-midnight Date -> calendar date. */
function fromUtcMidnight(value: Date): CalendarDate {
  const y = String(value.getUTCFullYear()).padStart(4, '0');
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Shift a calendar date by whole days. Negative goes back. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  const value = toUtcMidnight(date);
  value.setUTCDate(value.getUTCDate() + days);
  return fromUtcMidnight(value);
}

/** 0 = Sunday .. 6 = Saturday, matching JS getDay() and Postgres extract(dow). */
export function weekday(date: CalendarDate): number {
  return toUtcMidnight(date).getUTCDay();
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const ms = toUtcMidnight(to).getTime() - toUtcMidnight(from).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Every calendar date from `start` to `end` inclusive.
 * Returns [] when `end` is before `start`.
 */
export function datesInRange(start: CalendarDate, end: CalendarDate): CalendarDate[] {
  const out: CalendarDate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** ISO dates sort correctly as strings, so comparison is plain string compare. */
export function isBefore(a: CalendarDate, b: CalendarDate): boolean {
  return a < b;
}

export function isOnOrBefore(a: CalendarDate, b: CalendarDate): boolean {
  return a <= b;
}

/** Is `date` inside [start, end]? A null bound is open-ended. */
export function withinWindow(
  date: CalendarDate,
  start: CalendarDate | null,
  end: CalendarDate | null,
): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export function minDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return a <= b ? a : b;
}

export function maxDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return a >= b ? a : b;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function weekdayName(date: CalendarDate): string {
  return WEEKDAY_NAMES[weekday(date)];
}

export function weekdayNameFor(dow: number): string {
  return WEEKDAY_NAMES[dow];
}

/** "Wednesday, September 17" — no year, since the header is about right now. */
export function formatHeaderDate(date: CalendarDate): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcMidnight(date));
}

/** "Sep 17, 2026" — for lists and logs. */
export function formatShortDate(date: CalendarDate): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcMidnight(date));
}

/** "Wed, Sep 17" — compact, for dense rows. */
export function formatCompactDate(date: CalendarDate): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcMidnight(date));
}

/**
 * The Hebrew date for a civil date, e.g. "5 Tishri 5787".
 *
 * A Hebrew day begins at nightfall, so the caller decides which civil day to
 * ask about: Daf runs in the morning and passes the day itself; Night Seder
 * runs after nightfall and passes the *next* civil day.
 */
export function hebrewDate(date: CalendarDate): string {
  return new Intl.DateTimeFormat('en-u-ca-hebrew', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcMidnight(date));
}

/** The Hebrew date to show for a night session: the evening begins the next Hebrew day. */
export function hebrewDateForNight(date: CalendarDate): string {
  return hebrewDate(addDays(date, 1));
}

/** "3 days ago", "in 2 days", "today" — for last-contact and follow-up lines. */
export function relativeDays(date: CalendarDate, from: CalendarDate): string {
  const diff = daysBetween(from, date);
  if (diff === 0) return 'today';
  if (diff === -1) return 'yesterday';
  if (diff === 1) return 'tomorrow';
  if (diff < 0) return `${-diff} days ago`;
  return `in ${diff} days`;
}
