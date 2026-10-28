/**
 * Who should I reach out to?
 *
 * Contact lists everyone with `track_contact`, rabbis and working men alike,
 * active in a program or not — people who stopped coming are often exactly
 * who you want to call. Streak reasons only apply to someone still active in
 * that program; a follow-up applies to anyone.
 */

import { formatShortDate, type CalendarDate } from './dates.ts';

export interface ContactPerson {
  id: string;
  active: boolean;
  in_night_seder: boolean;
  in_daf: boolean;
  in_shachris: boolean;
  snoozed_until: CalendarDate | null;
}

export interface ContactEntry {
  date: CalendarDate;
  follow_up_date: CalendarDate | null;
}

export interface Thresholds {
  night: number;
  daf: number;
  shachris: number;
}

export interface Streaks {
  night: Streak;
  daf: Streak;
  shachris: Streak;
}

export interface Streak {
  streak: number;
  lastAttended: CalendarDate | null;
}

export interface Reason {
  kind: 'night' | 'daf' | 'shachris' | 'follow_up';
  /** The chip text, e.g. "Missed 4 nights". */
  label: string;
  /** The line under it, e.g. "Last came Sep 3". */
  detail: string | null;
}

/** A snooze that has not yet run out. It expires on its own. */
export function isSnoozed(person: ContactPerson, todayDate: CalendarDate): boolean {
  return person.snoozed_until !== null && person.snoozed_until >= todayDate;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function lastAttendedDetail(last: CalendarDate | null): string {
  return last ? `Last came ${formatShortDate(last)}` : 'Never attended';
}

/**
 * Why this person is in "Needs attention". An empty list means they aren't.
 * Snoozing is handled by the caller so the reasons stay visible on their page.
 */
export function contactReasons(
  person: ContactPerson,
  streaks: Streaks,
  latestEntry: ContactEntry | null,
  thresholds: Thresholds,
  todayDate: CalendarDate,
): Reason[] {
  const reasons: Reason[] = [];

  if (person.active && person.in_night_seder && streaks.night.streak >= thresholds.night) {
    reasons.push({
      kind: 'night',
      label: `Missed ${plural(streaks.night.streak, 'night', 'nights')}`,
      detail: lastAttendedDetail(streaks.night.lastAttended),
    });
  }

  if (person.active && person.in_daf && streaks.daf.streak >= thresholds.daf) {
    reasons.push({
      kind: 'daf',
      label: `Missed ${plural(streaks.daf.streak, 'Daf morning', 'Daf mornings')}`,
      detail: lastAttendedDetail(streaks.daf.lastAttended),
    });
  }

  if (person.active && person.in_shachris && streaks.shachris.streak >= thresholds.shachris) {
    reasons.push({
      kind: 'shachris',
      label: `Missed ${plural(streaks.shachris.streak, 'Shachris', 'Shachris')}`,
      detail: lastAttendedDetail(streaks.shachris.lastAttended),
    });
  }

  // Only the latest entry's follow-up counts: a newer conversation supersedes
  // whatever you meant to do after the previous one.
  if (latestEntry?.follow_up_date && latestEntry.follow_up_date <= todayDate) {
    reasons.push({
      kind: 'follow_up',
      label: 'Follow-up due',
      detail: `Due ${formatShortDate(latestEntry.follow_up_date)}`,
    });
  }

  return reasons;
}

const PROGRAM_LABELS = {
  night: 'Night seder',
  daf: 'Daf',
  shachris: 'Shachris',
} as const;

/**
 * The other side of the story: the programmes he is in, is *not* flagged for,
 * and is still turning up to.
 *
 * "Missed 8 Shachris" on its own reads like a man who has drifted off. Often
 * he is there every night and simply doesn't make the morning, which is a
 * different conversation — so the row says so rather than leaving you to
 * check his page.
 *
 * Only worth saying when he is flagged for attendance somewhere: a follow-up
 * is about a conversation, not about who turns up. A programme he has never
 * once attended is left out, because there is nothing reassuring in it.
 */
export function stillAttending(
  person: ContactPerson,
  streaks: Streaks,
  reasons: Reason[],
): string | null {
  if (!reasons.some((reason) => reason.kind !== 'follow_up')) return null;

  const flagged = new Set(reasons.map((reason) => reason.kind));
  const inProgram = {
    night: person.in_night_seder,
    daf: person.in_daf,
    shachris: person.in_shachris,
  };

  const parts = (['night', 'daf', 'shachris'] as const)
    .filter((program) => inProgram[program] && !flagged.has(program))
    .map((program) => ({ program, last: streaks[program].lastAttended }))
    .filter((entry) => entry.last !== null)
    .map((entry) => `${PROGRAM_LABELS[entry.program]} ${formatShortDate(entry.last!)}`);

  return parts.length === 0 ? null : `Was at ${parts.join(', ')}`;
}

export type Group = 'needs_attention' | 'everyone_else' | 'snoozed';

export function groupFor(
  person: ContactPerson,
  reasons: Reason[],
  todayDate: CalendarDate,
): Group {
  if (isSnoozed(person, todayDate)) return 'snoozed';
  return reasons.length > 0 ? 'needs_attention' : 'everyone_else';
}

/**
 * Least recently contacted first: never contacted, then oldest last contact.
 * Names break ties so the order is stable between renders.
 */
export function byLeastRecentlyContacted<T extends { lastContact: CalendarDate | null; name: string }>(
  a: T,
  b: T,
): number {
  if (a.lastContact === null && b.lastContact === null) return a.name.localeCompare(b.name);
  if (a.lastContact === null) return -1;
  if (b.lastContact === null) return 1;
  if (a.lastContact !== b.lastContact) return a.lastContact < b.lastContact ? -1 : 1;
  return a.name.localeCompare(b.name);
}
