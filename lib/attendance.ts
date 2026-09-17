/**
 * Derived schedules, held sessions, attendance statistics and missed streaks.
 *
 * Nothing in here touches the database. Everything takes plain rows and
 * returns plain values, so the rules that matter can be unit-tested:
 *
 *   * Schedules are derived from a zman's range, off-weekdays and days off —
 *     never stored as rows.
 *   * A session is "held" when at least one person was marked present. A
 *     scheduled date in the past with nobody marked is "not recorded", and
 *     stays out of everyone's denominator.
 *   * A person is expected only at held sessions inside their membership
 *     window, so joining mid-zman doesn't read as absence.
 *   * A missed streak counts consecutive most-recent *held* sessions, not
 *     calendar days, so Fridays, days off and the gap between zmanim can
 *     never add to it.
 */

import { datesInRange, weekday, weekdayNameFor, withinWindow, type CalendarDate } from './dates.ts';

export type Program = 'night' | 'daf';

export interface ZmanSchedule {
  start_date: CalendarDate;
  end_date: CalendarDate;
  off_weekdays: number[];
}

export interface DayOff {
  date: CalendarDate;
  reason: string | null;
}

export interface PersonWindow {
  id: string;
  start_date: CalendarDate;
  end_date: CalendarDate | null;
}

export interface AttendanceRow {
  date: CalendarDate;
  person_id: string;
}

/** Why a date is or isn't a scheduled session. */
export interface ScheduleStatus {
  scheduled: boolean;
  /** Present only when not scheduled: "Friday", or a day-off reason. */
  reason: string | null;
}

const SATURDAY = 6;

function dayOffMap(daysOff: readonly DayOff[]): Map<CalendarDate, string | null> {
  return new Map(daysOff.map((d) => [d.date, d.reason]));
}

// Night ------------------------------------------------------------------

export function nightScheduleStatus(
  zman: ZmanSchedule | null,
  daysOff: readonly DayOff[],
  date: CalendarDate,
): ScheduleStatus {
  if (!zman) return { scheduled: false, reason: 'No zman covers this date' };
  if (!withinWindow(date, zman.start_date, zman.end_date)) {
    return { scheduled: false, reason: 'Outside the zman' };
  }
  const off = dayOffMap(daysOff).get(date);
  if (off !== undefined) {
    return { scheduled: false, reason: off ? `Day off: ${off}` : 'Day off' };
  }
  if (zman.off_weekdays.includes(weekday(date))) {
    return { scheduled: false, reason: weekdayNameFor(weekday(date)) };
  }
  return { scheduled: true, reason: null };
}

/** Every date in the zman that isn't an off weekday and isn't a day off. */
export function scheduledNights(
  zman: ZmanSchedule,
  daysOff: readonly DayOff[],
): CalendarDate[] {
  const off = dayOffMap(daysOff);
  return datesInRange(zman.start_date, zman.end_date).filter(
    (date) => !zman.off_weekdays.includes(weekday(date)) && !off.has(date),
  );
}

// Daf --------------------------------------------------------------------

export function dafScheduleStatus(
  daysOff: readonly DayOff[],
  date: CalendarDate,
): ScheduleStatus {
  const off = dayOffMap(daysOff).get(date);
  if (off !== undefined) {
    return { scheduled: false, reason: off ? `Day off: ${off}` : 'Day off' };
  }
  if (weekday(date) === SATURDAY) return { scheduled: false, reason: 'Saturday' };
  return { scheduled: true, reason: null };
}

/** Every date in the range except Saturdays and Daf days off. */
export function scheduledDafMornings(
  start: CalendarDate,
  end: CalendarDate,
  daysOff: readonly DayOff[],
): CalendarDate[] {
  const off = dayOffMap(daysOff);
  return datesInRange(start, end).filter(
    (date) => weekday(date) !== SATURDAY && !off.has(date),
  );
}

// Held sessions ----------------------------------------------------------

/**
 * Dates where at least one person was marked present, ascending.
 * An unscheduled date with attendance counts: we met, so it was held.
 */
export function heldDates(attendance: readonly AttendanceRow[]): CalendarDate[] {
  return [...new Set(attendance.map((row) => row.date))].sort();
}

/** Held dates inside [start, end] inclusive. */
export function heldDatesInRange(
  attendance: readonly AttendanceRow[],
  start: CalendarDate,
  end: CalendarDate,
): CalendarDate[] {
  return heldDates(attendance).filter((date) => date >= start && date <= end);
}

/**
 * Scheduled dates strictly before today with nobody marked present.
 * These are mistakes to fix, not sessions where everybody was absent, so
 * they are reported separately and excluded from every denominator.
 */
export function notRecordedDates(
  scheduled: readonly CalendarDate[],
  attendance: readonly AttendanceRow[],
  todayDate: CalendarDate,
): CalendarDate[] {
  const held = new Set(heldDates(attendance));
  return scheduled.filter((date) => date < todayDate && !held.has(date));
}

// Per-person statistics ---------------------------------------------------

export interface PersonStats {
  attended: number;
  expected: number;
  /** 0–100, rounded. 0 when nothing was expected. */
  percent: number;
  lastAttended: CalendarDate | null;
}

/** Person id -> the dates they were present, as a set. */
export function attendanceByPerson(
  attendance: readonly AttendanceRow[],
): Map<string, Set<CalendarDate>> {
  const byPerson = new Map<string, Set<CalendarDate>>();
  for (const row of attendance) {
    let dates = byPerson.get(row.person_id);
    if (!dates) {
      dates = new Set();
      byPerson.set(row.person_id, dates);
    }
    dates.add(row.date);
  }
  return byPerson;
}

/**
 * Attended / expected over the given held sessions, clipped to the person's
 * membership window at both ends so the percentage can never exceed 100.
 */
export function personStats(
  person: PersonWindow,
  held: readonly CalendarDate[],
  attended: ReadonlySet<CalendarDate> | undefined,
): PersonStats {
  let expected = 0;
  let present = 0;
  let last: CalendarDate | null = null;
  for (const date of held) {
    if (!withinWindow(date, person.start_date, person.end_date)) continue;
    expected += 1;
    if (attended?.has(date)) {
      present += 1;
      if (!last || date > last) last = date;
    }
  }
  return {
    attended: present,
    expected,
    percent: expected === 0 ? 0 : Math.round((present / expected) * 100),
    lastAttended: last,
  };
}

/**
 * Consecutive most-recent held sessions in the person's window with no
 * attendance row for them. Resets to zero the moment they attend.
 */
export function missedStreak(
  person: PersonWindow,
  held: readonly CalendarDate[],
  attended: ReadonlySet<CalendarDate> | undefined,
): number {
  let streak = 0;
  for (let i = held.length - 1; i >= 0; i -= 1) {
    const date = held[i];
    if (!withinWindow(date, person.start_date, person.end_date)) continue;
    if (attended?.has(date)) break;
    streak += 1;
  }
  return streak;
}

export interface StreakSummary {
  streak: number;
  lastAttended: CalendarDate | null;
}

/**
 * Streaks for everyone at once, from a single pass over the attendance rows.
 * Never call this per person.
 */
export function streaksForAll(
  people: readonly PersonWindow[],
  attendance: readonly AttendanceRow[],
): Map<string, StreakSummary> {
  const held = heldDates(attendance);
  const byPerson = attendanceByPerson(attendance);
  const out = new Map<string, StreakSummary>();
  for (const person of people) {
    const attended = byPerson.get(person.id);
    out.set(person.id, {
      streak: missedStreak(person, held, attended),
      lastAttended: personStats(person, held, attended).lastAttended,
    });
  }
  return out;
}
