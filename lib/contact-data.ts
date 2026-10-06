import 'server-only';

import type { ContactRow } from '@/components/contact-list';
import { streaksForAll, type PersonWindow, type StreakSummary } from '@/lib/attendance';
import { byLeastRecentlyContacted, contactReasons, groupFor } from '@/lib/contact';
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

  const entriesByPerson = new Map<string, Correspondence[]>();
  for (const entry of correspondence) {
    const existing = entriesByPerson.get(entry.person_id);
    if (existing) existing.push(entry);
    else entriesByPerson.set(entry.person_id, [entry]);
  }

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
    const reasons = contactReasons(person, { night, daf, shachris }, latest, thresholds, now);

    return {
      id: person.id,
      name: person.name,
      role: person.role,
      phone: person.phone,
      email: person.email,
      active: person.active,
      trackContact: person.track_contact,
      snoozedUntil: person.snoozed_until,
      lastContact: latest
        ? { date: latest.date, channel: latest.channel, note: latest.note }
        : null,
      reasons,
      group: groupFor(person, reasons, now),
      groupIds: membership.get(person.id) ?? [],
    };
  });

  // Needs attention leads with the longest absence; everyone else leads with
  // whoever has gone longest without hearing from me.
  const groupRank = { needs_attention: 0, everyone_else: 1, snoozed: 2 } as const;
  // A missed streak outranks a follow-up: he isn't coming, which is the thing
  // a phone call is actually for.
  const severity = (row: ContactRow) =>
    Math.max(0, ...row.reasons.map((r) => (r.kind === 'follow_up' ? 1 : 2)));

  rows.sort((a, b) => {
    const byGroup = groupRank[a.group] - groupRank[b.group];
    if (byGroup !== 0) return byGroup;

    if (a.group === 'needs_attention') {
      const bySeverity = severity(b) - severity(a);
      if (bySeverity !== 0) return bySeverity;
    }

    return byLeastRecentlyContacted(
      { lastContact: a.lastContact?.date ?? null, name: a.name },
      { lastContact: b.lastContact?.date ?? null, name: b.name },
    );
  });

  return { rows, groups, settings, entriesByPerson, people };
}
