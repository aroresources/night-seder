import Link from 'next/link';

import { makeNightADayOff } from '@/app/actions/schedule';
import { AttendanceBoard, type BoardGroup } from '@/components/attendance-board';
import { DateHeader } from '@/components/date-header';
import { DayOffButton } from '@/components/day-off-button';
import { Banner, ButtonLink, Empty } from '@/components/ui';
import { nightScheduleStatus, notRecordedDates, scheduledNights } from '@/lib/attendance';
import { hebrewDateForNight, isCalendarDate, today, withinWindow } from '@/lib/dates';
import {
  getAllAttendance,
  getAttendanceOn,
  getPairs,
  getPeople,
  getZmanDaysOff,
  getZmanForDate,
} from '@/lib/queries';
import type { Person } from '@/lib/types';

function readDate(value: string | string[] | undefined): string {
  return isCalendarDate(value) ? value : today();
}

export default async function TonightPage(props: PageProps<'/'>) {
  const searchParams = await props.searchParams;
  const date = readDate(searchParams.date);
  const now = today();

  const [people, zman] = await Promise.all([getPeople(), getZmanForDate(date)]);

  const eligible = people.filter(
    (person) =>
      person.active &&
      person.in_night_seder &&
      withinWindow(date, person.start_date, person.end_date),
  );

  const [daysOff, pairs, attendance] = await Promise.all([
    zman ? getZmanDaysOff(zman.id) : Promise.resolve([]),
    zman ? getPairs(zman.id) : Promise.resolve([]),
    getAttendanceOn('night_attendance', date),
  ]);

  const status = nightScheduleStatus(zman, daysOff, date);
  const alreadyADayOff = daysOff.some((day) => day.date === date);
  const byId = new Map<string, Person>(eligible.map((person) => [person.id, person]));

  const groups: BoardGroup[] = [];
  const pairedIds = new Set<string>();

  for (const pair of pairs) {
    const members = pair.members
      .map((member) => byId.get(member.person_id))
      .filter((person): person is Person => person !== undefined);
    if (members.length === 0) continue;
    for (const member of members) pairedIds.add(member.id);
    groups.push({
      key: pair.id,
      title: pair.label ?? members.map((m) => m.name).join(' & '),
      people: members,
      markAll: true,
    });
  }

  const unpaired = eligible.filter((person) => !pairedIds.has(person.id));
  if (zman && unpaired.length > 0) {
    groups.push({ key: 'not-paired', title: 'Not paired', people: unpaired });
  }
  if (!zman) {
    groups.push({ key: 'everyone', title: 'Everyone', people: eligible });
  }

  // The nudge: scheduled nights in this zman that nobody ever recorded.
  let missingCount = 0;
  if (zman) {
    const zmanAttendance = await getAllAttendance('night_attendance', {
      start: zman.start_date,
      end: zman.end_date,
    });
    missingCount = notRecordedDates(scheduledNights(zman, daysOff), zmanAttendance, now).length;
  }

  async function addDayOff(reason: string) {
    'use server';
    if (!zman) return;
    await makeNightADayOff(zman.id, date, reason);
  }

  const subtitle = [zman?.name, hebrewDateForNight(date)].filter(Boolean).join(' · ');

  return (
    <>
      <DateHeader date={date} subtitle={subtitle} />

      <div className="mx-auto w-full max-w-[480px] pb-board">
        {!zman ? (
          <Banner
            action={
              <ButtonLink href="/more/zmanim/new" className="px-0">
                Create a zman
              </ButtonLink>
            }
          >
            No zman covers this date, so there are no pairs to show. You can still mark who came.
          </Banner>
        ) : !status.scheduled ? (
          <Banner
            action={
              alreadyADayOff ? null : (
                <DayOffButton label="Make tonight a day off" onConfirm={addDayOff} />
              )
            }
          >
            Not scheduled: {status.reason}. You can still mark who came.
          </Banner>
        ) : alreadyADayOff ? null : (
          <div className="px-4 pt-3">
            <DayOffButton label="Make tonight a day off" onConfirm={addDayOff} />
          </div>
        )}

        {missingCount > 0 ? (
          <p className="px-5 pt-3 text-[13px] text-ink-secondary">
            {missingCount} scheduled {missingCount === 1 ? 'night has' : 'nights have'} nothing
            recorded.{' '}
            <Link href="/reports" className="text-accent">
              See them in Reports
            </Link>
            .
          </p>
        ) : null}

        {eligible.length === 0 ? (
          <Empty
            action={
              <ButtonLink href="/more/people/new" variant="filled">
                Add someone
              </ButtonLink>
            }
          >
            Nobody is in night seder on this date yet.
          </Empty>
        ) : (
          <AttendanceBoard
            key={date}
            table="night_attendance"
            date={date}
            groups={groups}
            // Only worth offering the switch when there are pairs to switch away
            // from; `eligible` is already in surname order.
            flatGroup={
              pairs.length > 0
                ? { key: 'everyone', title: null, people: eligible }
                : undefined
            }
            initialPresent={attendance.map((row) => row.person_id)}
          />
        )}
      </div>
    </>
  );
}
