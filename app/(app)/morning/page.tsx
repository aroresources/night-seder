import { addPersonToMorning, createPersonForMorning } from '@/app/actions/people';
import { makeMorningADayOff } from '@/app/actions/schedule';
import { AddToDaf } from '@/components/add-to-daf';
import { AttendanceBoard } from '@/components/attendance-board';
import { DateHeader } from '@/components/date-header';
import { DayOffButton } from '@/components/day-off-button';
import { ProgramSwitch } from '@/components/program-switch';
import { Banner, Empty } from '@/components/ui';
import { morningScheduleStatus } from '@/lib/attendance';
import { hebrewDate, isCalendarDate, today, withinWindow } from '@/lib/dates';
import {
  getAttendanceOn,
  getGroupMembership,
  getGroups,
  getMorningDaysOff,
  getPeople,
} from '@/lib/queries';
import { morningProgram } from '@/lib/types';

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export default async function MorningPage(props: PageProps<'/morning'>) {
  const searchParams = await props.searchParams;
  const dateParam = param(searchParams.date);
  const date = isCalendarDate(dateParam) ? dateParam : today();
  const program = morningProgram(param(searchParams.event));

  const [people, daysOff, attendance, topicGroups, membership] = await Promise.all([
    getPeople(),
    getMorningDaysOff(program.daysOffTable),
    getAttendanceOn(program.table, date),
    getGroups(),
    getGroupMembership(),
  ]);

  // getPeople already returns everyone in surname order.
  const eligible = people.filter(
    (person) =>
      person.active && person[program.flag] && withinWindow(date, person.start_date, person.end_date),
  );

  const status = morningScheduleStatus(daysOff, date);
  const alreadyADayOff = daysOff.some((day) => day.date === date);

  const candidates = people
    .filter((person) => person.active && !person[program.flag])
    .map((person) => ({ id: person.id, name: person.name }));

  async function addDayOff(reason: string) {
    'use server';
    await makeMorningADayOff(program.daysOffTable, date, reason);
  }

  async function addExisting(personId: string) {
    'use server';
    await addPersonToMorning(program.flag, personId);
  }

  async function createPerson(form: FormData) {
    'use server';
    await createPersonForMorning(program.flag, form);
  }

  return (
    <>
      {/* Morning, so the Hebrew date is the civil day itself — unlike Tonight,
          which is after nightfall and shows the next day. */}
      <DateHeader date={date} subtitle={`${program.label} · ${hebrewDate(date)}`} />

      <div className="mx-auto w-full max-w-[480px] pb-board">
        <ProgramSwitch current={program.value} />

        {!status.scheduled ? (
          <Banner
            action={
              alreadyADayOff ? null : (
                <DayOffButton label="Make today a day off" onConfirm={addDayOff} />
              )
            }
          >
            Not scheduled: {status.reason}. You can still mark who came.
          </Banner>
        ) : alreadyADayOff ? null : (
          <div className="px-4 pt-3">
            <DayOffButton label="Make today a day off" onConfirm={addDayOff} />
          </div>
        )}

        {eligible.length === 0 ? (
          <Empty>Nobody is in {program.label} on this date yet.</Empty>
        ) : (
          <AttendanceBoard
            key={`${program.value}-${date}`}
            table={program.table}
            date={date}
            groups={[{ key: program.value, title: null, people: eligible }]}
            topicGroups={topicGroups}
            groupsByPerson={Object.fromEntries(membership)}
            initialPresent={attendance.map((row) => row.person_id)}
          />
        )}

        <AddToDaf
          label={`Add someone to ${program.label}`}
          candidates={candidates}
          onAddExisting={addExisting}
          onCreate={createPerson}
        />
      </div>
    </>
  );
}
