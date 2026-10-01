import { addExistingPersonToDaf, createPersonForDaf } from '@/app/actions/people';
import { makeDafADayOff } from '@/app/actions/schedule';
import { AddToDaf } from '@/components/add-to-daf';
import { AttendanceBoard } from '@/components/attendance-board';
import { DateHeader } from '@/components/date-header';
import { DayOffButton } from '@/components/day-off-button';
import { Banner, Empty } from '@/components/ui';
import { dafScheduleStatus } from '@/lib/attendance';
import { hebrewDate, isCalendarDate, today, withinWindow } from '@/lib/dates';
import { getAttendanceOn, getDafDaysOff, getPeople } from '@/lib/queries';

function readDate(value: string | string[] | undefined): string {
  return isCalendarDate(value) ? value : today();
}

export default async function DafPage(props: PageProps<'/daf'>) {
  const searchParams = await props.searchParams;
  const date = readDate(searchParams.date);

  const [people, daysOff, attendance] = await Promise.all([
    getPeople(),
    getDafDaysOff(),
    getAttendanceOn('daf_attendance', date),
  ]);

  // getPeople already returns everyone in surname order.
  const eligible = people.filter(
    (person) =>
      person.active && person.in_daf && withinWindow(date, person.start_date, person.end_date),
  );

  const status = dafScheduleStatus(daysOff, date);
  const alreadyADayOff = daysOff.some((day) => day.date === date);

  const candidates = people
    .filter((person) => person.active && !person.in_daf)
    .map((person) => ({ id: person.id, name: person.name }));

  async function addDayOff(reason: string) {
    'use server';
    await makeDafADayOff(date, reason);
  }

  return (
    <>
      {/* The shiur is in the morning, so the Hebrew date is the civil day itself. */}
      <DateHeader date={date} subtitle={`Daf yomi · ${hebrewDate(date)}`} />

      <div className="mx-auto w-full max-w-[480px] pb-board">
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
          <Empty>Nobody is in the Daf on this date yet.</Empty>
        ) : (
          <AttendanceBoard
            key={date}
            table="daf_attendance"
            date={date}
            groups={[{ key: 'daf', title: null, people: eligible }]}
            initialPresent={attendance.map((row) => row.person_id)}
          />
        )}

        <AddToDaf
          candidates={candidates}
          onAddExisting={addExistingPersonToDaf}
          onCreate={createPersonForDaf}
        />
      </div>
    </>
  );
}
