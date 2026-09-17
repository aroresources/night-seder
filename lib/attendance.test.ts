import test from 'node:test';
import assert from 'node:assert/strict';

import {
  attendanceByPerson,
  dafScheduleStatus,
  heldDates,
  heldDatesInRange,
  missedStreak,
  nightScheduleStatus,
  notRecordedDates,
  personStats,
  scheduledDafMornings,
  scheduledNights,
  streaksForAll,
  type AttendanceRow,
  type PersonWindow,
  type ZmanSchedule,
} from './attendance.ts';

// A two-week zman, Sunday 6 September 2026 through Saturday 19 September 2026,
// off on Friday (5) and Saturday (6).
const zman: ZmanSchedule = {
  start_date: '2026-09-06',
  end_date: '2026-09-19',
  off_weekdays: [5, 6],
};

const rows = (...pairs: [string, string][]): AttendanceRow[] =>
  pairs.map(([date, person_id]) => ({ date, person_id }));

/** Ten consecutive dates starting 6 September 2026. */
const tenDates = [
  '2026-09-06',
  '2026-09-07',
  '2026-09-08',
  '2026-09-09',
  '2026-09-10',
  '2026-09-11',
  '2026-09-12',
  '2026-09-13',
  '2026-09-14',
  '2026-09-15',
];

test('scheduled nights skip the off weekdays', () => {
  const nights = scheduledNights(zman, []);
  assert.equal(nights.length, 10);
  assert.equal(nights[0], '2026-09-06');
  assert.ok(!nights.includes('2026-09-11'), 'Friday is off');
  assert.ok(!nights.includes('2026-09-12'), 'Saturday is off');
  assert.ok(nights.includes('2026-09-13'), 'Sunday is on');
});

test('a day off drops that date from the schedule', () => {
  const nights = scheduledNights(zman, [{ date: '2026-09-14', reason: 'Sukkos' }]);
  assert.equal(nights.length, 9);
  assert.ok(!nights.includes('2026-09-14'));
});

test('Friday says why, and a day off gives its reason', () => {
  assert.deepEqual(nightScheduleStatus(zman, [], '2026-09-10'), {
    scheduled: true,
    reason: null,
  });
  assert.deepEqual(nightScheduleStatus(zman, [], '2026-09-11'), {
    scheduled: false,
    reason: 'Friday',
  });
  assert.deepEqual(
    nightScheduleStatus(zman, [{ date: '2026-09-14', reason: 'Sukkos' }], '2026-09-14'),
    { scheduled: false, reason: 'Day off: Sukkos' },
  );
  assert.deepEqual(nightScheduleStatus(null, [], '2026-09-14'), {
    scheduled: false,
    reason: 'No zman covers this date',
  });
});

test('Daf runs every day but Saturday, minus its own days off', () => {
  assert.equal(dafScheduleStatus([], '2026-09-18').scheduled, true, 'Friday');
  assert.equal(dafScheduleStatus([], '2026-09-20').scheduled, true, 'Sunday');
  assert.deepEqual(dafScheduleStatus([], '2026-09-19'), {
    scheduled: false,
    reason: 'Saturday',
  });
  assert.deepEqual(dafScheduleStatus([{ date: '2026-09-21', reason: 'Yom Tov' }], '2026-09-21'), {
    scheduled: false,
    reason: 'Day off: Yom Tov',
  });

  const mornings = scheduledDafMornings('2026-09-13', '2026-09-19', [
    { date: '2026-09-16', reason: null },
  ]);
  assert.deepEqual(mornings, [
    '2026-09-13',
    '2026-09-14',
    '2026-09-15',
    '2026-09-17',
    '2026-09-18',
  ]);
});

test('a session is held when anyone was marked, including unscheduled dates', () => {
  const attendance = rows(['2026-09-06', 'a'], ['2026-09-06', 'b'], ['2026-09-11', 'a']);
  assert.deepEqual(heldDates(attendance), ['2026-09-06', '2026-09-11']);
  assert.deepEqual(heldDatesInRange(attendance, '2026-09-07', '2026-09-30'), ['2026-09-11']);
});

test('a scheduled night with nobody marked is not recorded, not an absence', () => {
  const attendance = rows(['2026-09-06', 'a'], ['2026-09-08', 'a']);
  const notRecorded = notRecordedDates(scheduledNights(zman, []), attendance, '2026-09-10');
  assert.deepEqual(notRecorded, ['2026-09-07', '2026-09-09']);
  assert.ok(!notRecorded.includes('2026-09-10'), 'today is not yet missing');

  // And it sits in nobody's denominator: only held dates count.
  const person: PersonWindow = { id: 'a', start_date: '2026-09-06', end_date: null };
  const stats = personStats(person, heldDates(attendance), attendanceByPerson(attendance).get('a'));
  assert.equal(stats.expected, 2);
  assert.equal(stats.attended, 2);
  assert.equal(stats.percent, 100);
});

test('8 of 10 held nights is 80 percent', () => {
  const attended = new Set(tenDates.slice(0, 8));
  const person: PersonWindow = { id: 'a', start_date: '2026-09-01', end_date: null };
  assert.deepEqual(personStats(person, tenDates, attended), {
    attended: 8,
    expected: 10,
    percent: 80,
    lastAttended: '2026-09-13',
  });
});

test('joining after night 4 and attending every night since is 100 percent', () => {
  const joiner: PersonWindow = { id: 'b', start_date: tenDates[4], end_date: null };
  const attended = new Set(tenDates.slice(4));
  const stats = personStats(joiner, tenDates, attended);
  assert.equal(stats.expected, 6);
  assert.equal(stats.attended, 6);
  assert.equal(stats.percent, 100);
});

test('going inactive freezes the numbers instead of accruing absences', () => {
  const held = ['2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09'];
  const person: PersonWindow = { id: 'a', start_date: '2026-09-06', end_date: '2026-09-07' };
  const attended = new Set(['2026-09-06', '2026-09-07']);
  const stats = personStats(person, held, attended);
  assert.equal(stats.expected, 2);
  assert.equal(stats.percent, 100);
  assert.equal(missedStreak(person, held, attended), 0);
});

test('a missed streak counts held sessions and resets on attendance', () => {
  const held = ['2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'];
  const person: PersonWindow = { id: 'a', start_date: '2026-09-01', end_date: null };

  assert.equal(missedStreak(person, held, new Set(['2026-09-07'])), 3);
  assert.equal(missedStreak(person, held, new Set(['2026-09-10'])), 0);
  assert.equal(missedStreak(person, held, new Set()), 5, 'never attended counts every session');
  assert.equal(missedStreak(person, [], new Set()), 0, 'no sessions, no streak');
});

test('a break with no held sessions never adds to a streak', () => {
  // He came to the last night of the winter zman, then three weeks passed with
  // nothing held, then the spring zman started and he came again.
  const held = ['2026-03-05', '2026-03-29', '2026-03-30'];
  const person: PersonWindow = { id: 'a', start_date: '2026-01-01', end_date: null };
  assert.equal(missedStreak(person, held, new Set(held)), 0);

  // Same break, but he has not come back yet: only the two held nights count,
  // not the twenty-odd calendar days of the break.
  assert.equal(missedStreak(person, held, new Set(['2026-03-05'])), 2);
});

test('nights nobody held never enter a streak', () => {
  const attendance = rows(['2026-09-06', 'a'], ['2026-09-07', 'b'], ['2026-09-08', 'b']);
  const person: PersonWindow = { id: 'a', start_date: '2026-09-01', end_date: null };
  const held = heldDates(attendance);
  assert.equal(missedStreak(person, held, attendanceByPerson(attendance).get('a')), 2);
});

test('streaksForAll answers for everyone from one pass', () => {
  const people: PersonWindow[] = [
    { id: 'a', start_date: '2026-09-01', end_date: null },
    { id: 'b', start_date: '2026-09-01', end_date: null },
    { id: 'late', start_date: '2026-09-09', end_date: null },
  ];
  const attendance = rows(
    ['2026-09-06', 'a'],
    ['2026-09-07', 'a'],
    ['2026-09-08', 'b'],
    ['2026-09-09', 'b'],
    ['2026-09-10', 'b'],
  );
  const streaks = streaksForAll(people, attendance);
  assert.deepEqual(streaks.get('a'), { streak: 3, lastAttended: '2026-09-07' });
  assert.deepEqual(streaks.get('b'), { streak: 0, lastAttended: '2026-09-10' });
  assert.deepEqual(
    streaks.get('late'),
    { streak: 2, lastAttended: null },
    'only the two held nights since he joined count',
  );
});

test('a person in two pairs is counted once', () => {
  // Attendance is per person; the pair is only a grouping. The same rabbi
  // appearing in two cards is still one row and one set entry.
  const attendance = rows(['2026-09-06', 'rabbi'], ['2026-09-06', 'rabbi']);
  const byPerson = attendanceByPerson(attendance);
  assert.equal(byPerson.get('rabbi')?.size, 1);
  const person: PersonWindow = { id: 'rabbi', start_date: '2026-09-01', end_date: null };
  assert.equal(personStats(person, heldDates(attendance), byPerson.get('rabbi')).attended, 1);
});
