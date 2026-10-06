import Link from 'next/link';

import { DafRangePicker, ZmanPicker } from '@/components/report-pickers';
import { ReportTable, type ReportRow } from '@/components/report-table';
import { Empty, ScreenHeader } from '@/components/ui';
import {
  attendanceByPerson,
  heldDatesInRange,
  missedStreak,
  notRecordedDates,
  personStats,
  scheduledMornings,
  scheduledNights,
  heldDates as toHeldDates,
  type AttendanceRow,
  type PersonWindow,
} from '@/lib/attendance';
import {
  addDays,
  formatCompactDate,
  isCalendarDate,
  minDate,
  today,
  type CalendarDate,
} from '@/lib/dates';
import { nameSortKey } from '@/lib/names';
import {
  getAllAttendance,
  getCurrentZman,
  getMorningDaysOff,
  getGroupMembership,
  getGroups,
  getPairs,
  getPeople,
  getSettings,
  getZmanDaysOff,
  getZmanim,
} from '@/lib/queries';
import { MORNING_PROGRAMS } from '@/lib/types';
import type { Person } from '@/lib/types';

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function windowOf(person: Person): PersonWindow {
  return { id: person.id, start_date: person.start_date, end_date: person.end_date };
}

/** Rows for anyone who was either expected or present in the period. */
function buildRows(
  people: Person[],
  held: CalendarDate[],
  allAttendance: AttendanceRow[],
  threshold: number,
  pairOf: (personId: string) => string | null,
  groupsOf: (personId: string) => string[],
): ReportRow[] {
  const byPerson = attendanceByPerson(allAttendance);
  const allHeld = toHeldDates(allAttendance);

  return people
    .map((person) => {
      const attended = byPerson.get(person.id);
      const stats = personStats(windowOf(person), held, attended);
      const streak = missedStreak(windowOf(person), allHeld, attended);
      return {
        id: person.id,
        name: person.name,
        sortKey: nameSortKey(person),
        role: person.role,
        pair: pairOf(person.id),
        attended: stats.attended,
        expected: stats.expected,
        percent: stats.percent,
        flagged: person.active && streak >= threshold,
        streak,
        groupIds: groupsOf(person.id),
      };
    })
    .filter((row) => row.expected > 0 || row.attended > 0);
}

function Summary({ label, held, rows }: { label: string; held: number; rows: ReportRow[] }) {
  const attended = rows.reduce((sum, row) => sum + row.attended, 0);
  const expected = rows.reduce((sum, row) => sum + row.expected, 0);
  const percent = expected === 0 ? 0 : Math.round((attended / expected) * 100);

  return (
    <section className="px-4 pt-4">
      <div className="flex divide-x divide-hairline overflow-hidden rounded-xl bg-surface">
        <div className="flex-1 px-4 py-3">
          <p className="text-[24px] tabular-nums">{held}</p>
          <p className="text-[13px] text-ink-secondary">{label}</p>
        </div>
        <div className="flex-1 px-4 py-3">
          <p className="text-[24px] tabular-nums">{percent}%</p>
          <p className="text-[13px] text-ink-secondary">Attendance</p>
        </div>
      </div>
    </section>
  );
}

function DateList({
  title,
  dates,
  counts,
  hrefFor,
  empty,
}: {
  title: string;
  dates: CalendarDate[];
  counts?: Map<CalendarDate, number>;
  hrefFor: (date: CalendarDate) => string;
  empty: string;
}) {
  return (
    <section className="px-4">
      <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">{title}</h2>
      <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
        {dates.length === 0 ? (
          <p className="px-4 py-3 text-[15px] text-ink-secondary">{empty}</p>
        ) : (
          dates.map((date) => (
            <Link
              key={date}
              href={hrefFor(date)}
              className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5 active:bg-surface-pressed"
            >
              <span className="flex-1 text-[15px]">{formatCompactDate(date)}</span>
              {counts ? (
                <span className="text-[15px] tabular-nums text-ink-secondary">
                  {counts.get(date) ?? 0} here
                </span>
              ) : null}
              <span aria-hidden className="text-[17px] leading-none text-ink-tertiary">
                &rsaquo;
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

export default async function ReportsPage(props: PageProps<'/reports'>) {
  const searchParams = await props.searchParams;
  const now = today();

  const [
    people,
    settings,
    zmanim,
    currentZman,
    nightAttendance,
    dafAttendance,
    shachrisAttendance,
    dafDaysOff,
    shachrisDaysOff,
    groups,
    membership,
  ] = await Promise.all([
    getPeople(),
    getSettings(),
    getZmanim(),
    getCurrentZman(),
    getAllAttendance('night_attendance'),
    getAllAttendance('daf_attendance'),
    getAllAttendance('shachris_attendance'),
    getMorningDaysOff('daf_days_off'),
    getMorningDaysOff('shachris_days_off'),
    getGroups(),
    getGroupMembership(),
  ]);

  const groupsOf = (personId: string) => membership.get(personId) ?? [];

  // Night Seder ----------------------------------------------------------

  const requestedZman = param(searchParams.zman);
  const zman =
    zmanim.find((z) => z.id === requestedZman) ??
    currentZman ??
    zmanim[0] ??
    null;

  const [zmanDaysOff, pairs] = await Promise.all([
    zman ? getZmanDaysOff(zman.id) : Promise.resolve([]),
    zman ? getPairs(zman.id) : Promise.resolve([]),
  ]);

  const pairNameFor = new Map<string, string[]>();
  for (const pair of pairs) {
    const label =
      pair.label ??
      pair.members
        .map((member) => people.find((p) => p.id === member.person_id)?.name ?? '')
        .filter(Boolean)
        .join(' & ');
    for (const member of pair.members) {
      const existing = pairNameFor.get(member.person_id);
      if (existing) existing.push(label);
      else pairNameFor.set(member.person_id, [label]);
    }
  }

  const nightHeld = zman
    ? heldDatesInRange(nightAttendance, zman.start_date, minDate(zman.end_date, now))
    : [];
  const nightRows = zman
    ? buildRows(
        people,
        nightHeld,
        nightAttendance,
        settings.night_absence_threshold,
        (id) => pairNameFor.get(id)?.join(', ') ?? null,
        groupsOf,
      )
    : [];

  const nightCounts = new Map<CalendarDate, number>();
  for (const row of nightAttendance) {
    nightCounts.set(row.date, (nightCounts.get(row.date) ?? 0) + 1);
  }

  const nightNotRecorded = zman
    ? notRecordedDates(scheduledNights(zman, zmanDaysOff), nightAttendance, now)
    : [];

  // Per pair: attended and expected summed across that pair's members.
  const pairTotals = pairs.map((pair) => {
    const members = pair.members
      .map((member) => nightRows.find((row) => row.id === member.person_id))
      .filter((row): row is ReportRow => row !== undefined);
    const attended = members.reduce((sum, row) => sum + row.attended, 0);
    const expected = members.reduce((sum, row) => sum + row.expected, 0);
    const label =
      pair.label ??
      pair.members
        .map((member) => people.find((p) => p.id === member.person_id)?.name ?? '')
        .filter(Boolean)
        .join(' & ');
    return {
      id: pair.id,
      label,
      attended,
      expected,
      percent: expected === 0 ? 0 : Math.round((attended / expected) * 100),
    };
  });

  // Daf ------------------------------------------------------------------

  const dafRange = param(searchParams.daf) ?? '30';
  const customFrom = param(searchParams.from);
  const customTo = param(searchParams.to);

  let dafStart: CalendarDate;
  let dafEnd: CalendarDate = now;
  if (dafRange === 'month') {
    dafStart = `${now.slice(0, 7)}-01`;
  } else if (dafRange === '90') {
    dafStart = addDays(now, -89);
  } else if (dafRange === 'custom') {
    dafStart = isCalendarDate(customFrom) ? customFrom : addDays(now, -29);
    dafEnd = isCalendarDate(customTo) ? customTo : now;
  } else {
    dafStart = addDays(now, -29);
  }

  const morningEnd = minDate(dafEnd, now);

  // Daf and Shachris are the same report twice over, so they are built the
  // same way rather than written out twice. Both share the range picker.
  const morningSections = MORNING_PROGRAMS.map((program) => {
    const attendance = program.value === 'daf' ? dafAttendance : shachrisAttendance;
    const daysOff = program.value === 'daf' ? dafDaysOff : shachrisDaysOff;

    const held = heldDatesInRange(attendance, dafStart, morningEnd);
    const rows = buildRows(
      // Anyone in the programme, plus anyone who turned up without being in it.
      people.filter(
        (person) =>
          person[program.flag] || attendance.some((row) => row.person_id === person.id),
      ),
      held,
      attendance,
      settings[program.threshold],
      () => null,
      groupsOf,
    );

    const counts = new Map<CalendarDate, number>();
    for (const row of attendance) {
      counts.set(row.date, (counts.get(row.date) ?? 0) + 1);
    }

    const notRecorded = notRecordedDates(
      scheduledMornings(dafStart, morningEnd, daysOff),
      attendance,
      now,
    );

    return { program, held, rows, counts, notRecorded };
  });

  return (
    <>
      <ScreenHeader title="Reports" />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <h2 className="px-5 pt-5 text-[20px] font-semibold">Night Seder</h2>

        {!zman ? (
          <Empty>No zman yet. Create one under More to see a report.</Empty>
        ) : (
          <>
            <ZmanPicker zmanim={zmanim} selected={zman.id} />
            <Summary label="Nights held" held={nightHeld.length} rows={nightRows} />
            <ReportTable
              rows={nightRows}
              groups={groups}
              showPair
              filename={`night-seder-${zman.name.toLowerCase().replace(/\s+/g, '-')}.csv`}
            />

            <section className="px-4">
              <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">Per pair</h2>
              <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
                {pairTotals.length === 0 ? (
                  <p className="px-4 py-3 text-[15px] text-ink-secondary">No pairs in this zman.</p>
                ) : (
                  pairTotals.map((pair) => (
                    <div key={pair.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-[17px]">{pair.label}</span>
                      <span className="shrink-0 text-right text-[15px] tabular-nums text-ink-secondary">
                        {pair.attended}/{pair.expected} · {pair.percent}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <DateList
              title="Nights held"
              dates={[...nightHeld].reverse()}
              counts={nightCounts}
              hrefFor={(date) => `/?date=${date}`}
              empty="Nothing recorded in this zman yet."
            />

            <DateList
              title="Not recorded"
              dates={[...nightNotRecorded].reverse()}
              hrefFor={(date) => `/?date=${date}`}
              empty="Every scheduled night has something recorded."
            />
          </>
        )}

        <h2 className="px-5 pt-8 text-[20px] font-semibold">Morning</h2>
        <DafRangePicker range={dafRange} from={dafStart} to={dafEnd} />

        {morningSections.map((section) => (
          <div key={section.program.value}>
            <h3 className="px-5 pt-6 text-[17px] font-semibold">{section.program.label}</h3>
            <Summary label="Mornings held" held={section.held.length} rows={section.rows} />
            <ReportTable
              rows={section.rows}
              groups={groups}
              showPair={false}
              filename={`${section.program.value}-${dafStart}-to-${dafEnd}.csv`}
            />

            <DateList
              title="Mornings held"
              dates={[...section.held].reverse()}
              counts={section.counts}
              hrefFor={(date) => `/morning?date=${date}&event=${section.program.value}`}
              empty="Nothing recorded in this range yet."
            />

            <DateList
              title="Not recorded"
              dates={[...section.notRecorded].reverse()}
              hrefFor={(date) => `/morning?date=${date}&event=${section.program.value}`}
              empty="Every scheduled morning has something recorded."
            />
          </div>
        ))}
      </div>
    </>
  );
}
