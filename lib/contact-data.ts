import 'server-only';

import type { ContactRow } from '@/components/contact-list';
import { streaksForAll, type PersonWindow, type StreakSummary } from '@/lib/attendance';
import {
  contactedSinceLastSeen,
  contactReasons,
  groupFor,
  mostRecent,
  stillAttending,
} from '@/lib/contact';
import { compareByName } from '@/lib/names';
import { today } from '@/lib/dates';
import {
  getAllAttendance,
  getCorrespondence,
  getGroupMembership,
  getGroups,
  getPeople,
  getSettings,
} from '@/lib/queries';
import type { Correspondence, Group, Person, Settings } from '@/lib/types';

const NO_STREAK: StreakSummary = { streak: 0, lastAttended: null };

export interface ContactData {
  rows: ContactRow[];
  groups: Group[];
  settings: Settings;
  /** Person id -> their correspondence, newest first. */
  entriesByPerson: Map<string, Correspondence[]>;
  people: Person[];
}

/**
 * Everything the Contact screen needs, from five queries total: people,
 * settings, both attendance tables and the correspondence log. Streaks are
 * computed for everyone in one pass, never one query per person.
 */
export async function loadContactData(): Promise<ContactData> {
  const [
    people,
    settings,
    nightAttendance,
    dafAttendance,
    shachrisAttendance,
    miscAttendance,
    correspondence,
    groups,
    membership,
  ] =
    await Promise.all([
      getPeople(),
      getSettings(),
      getAllAttendance('night_attendance'),
      getAllAttendance('daf_attendance'),
      getAllAttendance('shachris_attendance'),
      getAllAttendance('misc_attendance'),
      getCorrespondence(),
      getGroups(),
      getGroupMembership(),
    ]);

  const windows: PersonWindow[] = people.map((person) => ({
    id: person.id,
    start_date: person.start_date,
    end_date: person.end_date,
  }));

  const nightStreaks = streaksForAll(windows, nightAttendance);
  const dafStreaks = streaksForAll(windows, dafAttendance);
  const shachrisStreaks = streaksForAll(windows, shachrisAttendance);
  // Misc never flags anybody, but a morning he turned up to is still the last
  // time he was seen.
  const miscStreaks = streaksForAll(windows, miscAttendance);

  const entriesByPerson = new Map<string, Correspondence[]>();
  for (const entry of correspondence) {
    const existing = entriesByPerson.get(entry.person_id);
    if (existing) existing.push(entry);
    else entriesByPerson.set(entry.person_id, [entry]);
  }

  const peopleById = new Map(people.map((person) => [person.id, person]));

  const now = today();
  const thresholds = {
    night: settings.night_absence_threshold,
    daf: settings.daf_absence_threshold,
    shachris: settings.shachris_absence_threshold,
  };

  const rows: ContactRow[] = people.map((person) => {
    const entries = entriesByPerson.get(person.id) ?? [];
    const latest = entries[0] ?? null;
    const night = nightStreaks.get(person.id) ?? NO_STREAK;
    const daf = dafStreaks.get(person.id) ?? NO_STREAK;
    const shachris = shachrisStreaks.get(person.id) ?? NO_STREAK;
    const misc = miscStreaks.get(person.id) ?? NO_STREAK;
    const reasons = contactReasons(person, { night, daf, shachris }, latest, thresholds, now);

    // Only the programmes he is actually in: a Daf date for a man who is not
    // in Daf would read as him having been seen when he was not expected.
    const lastAttended = mostRecent([
      person.in_night_seder ? night.lastAttended : null,
      person.in_daf ? daf.lastAttended : null,
      person.in_shachris ? shachris.lastAttended : null,
      person.in_misc ? misc.lastAttended : null,
    ]);

    return {
      id: person.id,
      name: person.name,
      role: person.role,
      phone: person.phone,
      email: person.email,
      active: person.active,
      trackContact: person.track_contact,
      inNightSeder: person.in_night_seder,
      inDaf: person.in_daf,
      inShachris: person.in_shachris,
      inMisc: person.in_misc,
      stillAttending: stillAttending(person, { night, daf, shachris }, reasons),
      snoozedUntil: person.snoozed_until,
      lastContact: latest
        ? { date: latest.date, channel: latest.channel, note: latest.note }
        : null,
      reasons,
      lastAttended,
      // The longest he has gone without turning up to something he is in.
      worstStreak: Math.max(
        person.in_night_seder ? night.streak : 0,
        person.in_daf ? daf.streak : 0,
        person.in_shachris ? shachris.streak : 0,
      ),
      chased: contactedSinceLastSeen(latest?.date ?? null, lastAttended),
      group: groupFor(person, reasons, now),
      groupIds: membership.get(person.id) ?? [],
    };
  });

  // Surname order, like every other list in the app. The screen re-sorts to
  // whatever was picked; what it must not do is reorder itself because you
  // logged a call, which is what sorting by last contact here used to do.
  rows.sort((a, b) => compareByName(peopleById.get(a.id)!, peopleById.get(b.id)!));

  return { rows, groups, settings, entriesByPerson, people };
}
