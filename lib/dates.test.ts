import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDateRange,
  addDays,
  ageOn,
  datesInRange,
  daysBetween,
  formatHeaderDate,
  hebrewDate,
  hebrewDateForNight,
  hebrewMonthYear,
  isCalendarDate,
  relativeDays,
  today,
  weekday,
  weekdayName,
  withinWindow,
} from './dates.ts';

test('today: 8:45 pm Eastern is still the same Eastern day', () => {
  // Wednesday 14 January 2026, 8:45 pm Eastern = Thursday 01:45 UTC.
  const during = new Date('2026-01-15T01:45:00Z');
  assert.equal(today(during), '2026-01-14');
  assert.equal(weekdayName(today(during)), 'Wednesday');
});

test('today: naive UTC would have been wrong for that instant', () => {
  const during = new Date('2026-01-15T01:45:00Z');
  assert.equal(during.toISOString().slice(0, 10), '2026-01-15');
  assert.notEqual(today(during), during.toISOString().slice(0, 10));
});

test('today: holds across the daylight saving boundary', () => {
  // 8:45 pm EDT on 17 September 2026 = 00:45 UTC the next day.
  assert.equal(today(new Date('2026-09-18T00:45:00Z')), '2026-09-17');
  // Just before midnight Eastern.
  assert.equal(today(new Date('2026-09-18T03:59:00Z')), '2026-09-17');
  // Just after midnight Eastern.
  assert.equal(today(new Date('2026-09-18T04:01:00Z')), '2026-09-18');
});

test('today: early morning Eastern, for the Daf shiur', () => {
  // 6:15 am Eastern on 17 September 2026 = 10:15 UTC the same day.
  assert.equal(today(new Date('2026-09-17T10:15:00Z')), '2026-09-17');
});

test('addDays crosses months, years and leap days without drifting', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2026-09-17', 0), '2026-09-17');
});

test('addDays is unaffected by the daylight saving change', () => {
  // 8 March 2026 is the spring-forward Sunday in New York.
  assert.equal(addDays('2026-03-07', 1), '2026-03-08');
  assert.equal(addDays('2026-03-08', 1), '2026-03-09');
  assert.equal(addDays('2026-11-01', 1), '2026-11-02');
});

test('weekday numbering is 0 = Sunday .. 6 = Saturday', () => {
  assert.equal(weekday('2026-09-13'), 0);
  assert.equal(weekday('2026-09-17'), 4);
  assert.equal(weekday('2026-09-18'), 5);
  assert.equal(weekday('2026-09-19'), 6);
});

test('daysBetween is signed and whole', () => {
  assert.equal(daysBetween('2026-09-17', '2026-09-20'), 3);
  assert.equal(daysBetween('2026-09-20', '2026-09-17'), -3);
  assert.equal(daysBetween('2026-09-17', '2026-09-17'), 0);
  assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2);
});

test('datesInRange is inclusive, and empty when reversed', () => {
  assert.deepEqual(datesInRange('2026-09-17', '2026-09-20'), [
    '2026-09-17',
    '2026-09-18',
    '2026-09-19',
    '2026-09-20',
  ]);
  assert.deepEqual(datesInRange('2026-09-17', '2026-09-17'), ['2026-09-17']);
  assert.deepEqual(datesInRange('2026-09-20', '2026-09-17'), []);
});

test('withinWindow treats a missing end as open-ended', () => {
  assert.equal(withinWindow('2026-09-17', '2026-09-01', null), true);
  assert.equal(withinWindow('2026-08-31', '2026-09-01', null), false);
  assert.equal(withinWindow('2026-09-17', '2026-09-01', '2026-09-17'), true);
  assert.equal(withinWindow('2026-09-18', '2026-09-01', '2026-09-17'), false);
  assert.equal(withinWindow('2026-09-17', null, null), true);
});

test('isCalendarDate rejects timestamps and impossible dates', () => {
  assert.equal(isCalendarDate('2026-09-17'), true);
  assert.equal(isCalendarDate('2026-09-17T01:45:00Z'), false);
  assert.equal(isCalendarDate('2026-02-30'), false);
  assert.equal(isCalendarDate('2026-13-01'), false);
  assert.equal(isCalendarDate(''), false);
  assert.equal(isCalendarDate(null), false);
});

test('formatting reads the date as written, with no zone shift', () => {
  assert.equal(formatHeaderDate('2026-09-17'), 'Thursday, September 17');
  assert.equal(formatHeaderDate('2026-01-01'), 'Thursday, January 1');
});

test('the Hebrew date for a night is the next civil day', () => {
  const evening = '2026-09-17';
  assert.equal(hebrewDateForNight(evening), hebrewDate(addDays(evening, 1)));
  assert.notEqual(hebrewDateForNight(evening), hebrewDate(evening));
});

test('hebrewMonthYear names the month a payment period covers', () => {
  assert.equal(hebrewMonthYear('2026-09-30'), 'Tishri 5787');
  assert.equal(hebrewMonthYear('2026-10-15'), 'Heshvan 5787');
  assert.equal(hebrewMonthYear('2027-04-02'), 'Adar II 5787', 'a leap year has two Adars');
});

test('hebrewDate produces a Hebrew calendar year, not a civil one', () => {
  const formatted = hebrewDate('2026-09-17');
  assert.match(formatted, /5\d{3}/);
});

test('age turns over on the birthday, not before or after', () => {
  assert.equal(ageOn('1987-06-15', '2026-06-14'), 38, 'the day before');
  assert.equal(ageOn('1987-06-15', '2026-06-15'), 39, 'on the day');
  assert.equal(ageOn('1987-06-15', '2026-06-16'), 39, 'the day after');
});

test('age is right either side of the turn of the year', () => {
  assert.equal(ageOn('1990-12-31', '2026-01-01'), 35);
  assert.equal(ageOn('1990-01-01', '2026-12-31'), 36);
});

test('a leap-day birthday turns on 1 March in a common year', () => {
  assert.equal(ageOn('1988-02-29', '2026-02-28'), 37);
  assert.equal(ageOn('1988-02-29', '2026-03-01'), 38);
  // And on the day itself when the year does have one.
  assert.equal(ageOn('1988-02-29', '2028-02-29'), 40);
});

test('age handles a birthday today and one not yet reached', () => {
  assert.equal(ageOn('2026-10-12', '2026-10-12'), 0, 'born today');
  assert.equal(ageOn('2027-01-01', '2026-10-12'), -1, 'a date in the future is not an age');
});

test('relativeDays reads from a fixed today', () => {
  assert.equal(relativeDays('2026-09-17', '2026-09-17'), 'today');
  assert.equal(relativeDays('2026-09-16', '2026-09-17'), 'yesterday');
  assert.equal(relativeDays('2026-09-18', '2026-09-17'), 'tomorrow');
  assert.equal(relativeDays('2026-09-10', '2026-09-17'), '7 days ago');
  assert.equal(relativeDays('2026-09-24', '2026-09-17'), 'in 7 days');
});

test('a date range says the year once when both ends share it', () => {
  assert.equal(formatDateRange('2026-09-12', '2026-10-11'), 'Sep 12 – Oct 11, 2026');
});

test('a date range that crosses New Year says both years', () => {
  assert.equal(formatDateRange('2026-12-10', '2027-01-08'), 'Dec 10, 2026 – Jan 8, 2027');
});

test('a period of one day is just that day', () => {
  assert.equal(formatDateRange('2026-10-05', '2026-10-05'), 'Oct 5, 2026');
});
