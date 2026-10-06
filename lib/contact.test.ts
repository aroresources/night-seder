import test from 'node:test';
import assert from 'node:assert/strict';

import {
  byLeastRecentlyContacted,
  contactReasons,
  groupFor,
  isSnoozed,
  type ContactPerson,
  type Streak,
  type Streaks,
  type Thresholds,
} from './contact.ts';

const TODAY = '2026-09-17';
const thresholds: Thresholds = { night: 3, daf: 3, shachris: 3 };
const none: Streak = { streak: 0, lastAttended: '2026-09-16' };

function person(overrides: Partial<ContactPerson> = {}): ContactPerson {
  return {
    id: 'p',
    active: true,
    in_night_seder: true,
    in_daf: false,
    in_shachris: false,
    snoozed_until: null,
    ...overrides,
  };
}

/** Nobody is missing anything unless the test says so. */
function streaks(overrides: Partial<Streaks> = {}): Streaks {
  return { night: none, daf: none, shachris: none, ...overrides };
}

test('three missed nights reaches the threshold and names the last time he came', () => {
  const reasons = contactReasons(
    person(),
    streaks({ night: { streak: 3, lastAttended: '2026-09-08' } }),
    null,
    thresholds,
    TODAY,
  );
  assert.equal(reasons.length, 1);
  assert.equal(reasons[0].label, 'Missed 3 nights');
  assert.equal(reasons[0].detail, 'Last came Sep 8, 2026');
  assert.equal(groupFor(person(), reasons, TODAY), 'needs_attention');
});

test('attending once clears the chip', () => {
  const reasons = contactReasons(
    person(),
    streaks({ night: { streak: 0, lastAttended: TODAY } }),
    null,
    thresholds,
    TODAY,
  );
  assert.deepEqual(reasons, []);
  assert.equal(groupFor(person(), reasons, TODAY), 'everyone_else');
});

test('two missed nights is below the threshold', () => {
  const reasons = contactReasons(
    person(),
    streaks({ night: { streak: 2, lastAttended: '2026-09-10' } }),
    null,
    thresholds,
    TODAY,
  );
  assert.deepEqual(reasons, []);
});

test('a Daf streak only counts for someone in the Daf', () => {
  const daf: Streak = { streak: 6, lastAttended: '2026-08-30' };

  const notInDaf = contactReasons(person({ in_daf: false }), streaks({ daf }), null, thresholds, TODAY);
  assert.deepEqual(notInDaf, []);

  const inDaf = contactReasons(
    person({ in_daf: true, in_night_seder: false }),
    streaks({ daf }),
    null,
    thresholds,
    TODAY,
  );
  assert.equal(inDaf[0].label, 'Missed 6 Daf mornings');
});

test('a Shachris streak only counts for someone in Shachris', () => {
  const shachris: Streak = { streak: 4, lastAttended: '2026-09-09' };

  const notIn = contactReasons(
    person({ in_shachris: false }),
    streaks({ shachris }),
    null,
    thresholds,
    TODAY,
  );
  assert.deepEqual(notIn, []);

  const isIn = contactReasons(
    person({ in_shachris: true, in_night_seder: false }),
    streaks({ shachris }),
    null,
    thresholds,
    TODAY,
  );
  assert.equal(isIn.length, 1);
  assert.equal(isIn[0].kind, 'shachris');
  assert.equal(isIn[0].label, 'Missed 4 Shachris');
  assert.equal(isIn[0].detail, 'Last came Sep 9, 2026');
});

test('Daf and Shachris are counted separately', () => {
  // He comes to the shiur but has stopped coming to minyan.
  const reasons = contactReasons(
    person({ in_night_seder: false, in_daf: true, in_shachris: true }),
    streaks({
      daf: { streak: 0, lastAttended: TODAY },
      shachris: { streak: 5, lastAttended: '2026-09-07' },
    }),
    null,
    thresholds,
    TODAY,
  );
  assert.deepEqual(
    reasons.map((r) => r.kind),
    ['shachris'],
  );
});

test('each programme uses its own threshold', () => {
  const loose: Thresholds = { night: 3, daf: 3, shachris: 10 };
  const reasons = contactReasons(
    person({ in_shachris: true, in_night_seder: false }),
    streaks({ shachris: { streak: 5, lastAttended: '2026-09-07' } }),
    null,
    loose,
    TODAY,
  );
  assert.deepEqual(reasons, [], 'five missed is under a threshold of ten');
});

test('a program-inactive person gets no streak reason, but still a follow-up', () => {
  const missing: Streak = { streak: 9, lastAttended: '2026-06-01' };
  const inactive = person({ active: false });

  assert.deepEqual(contactReasons(inactive, streaks({ night: missing }), null, thresholds, TODAY), []);

  const withFollowUp = contactReasons(
    inactive,
    streaks({ night: missing }),
    { date: '2026-09-01', follow_up_date: '2026-09-16' },
    thresholds,
    TODAY,
  );
  assert.equal(withFollowUp.length, 1);
  assert.equal(withFollowUp[0].label, 'Follow-up due');
});

test('a follow-up dated yesterday is due; tomorrow is not', () => {
  const due = contactReasons(
    person(),
    streaks(),
    { date: '2026-09-10', follow_up_date: '2026-09-16' },
    thresholds,
    TODAY,
  );
  assert.equal(due[0].label, 'Follow-up due');

  const today = contactReasons(
    person(),
    streaks(),
    { date: '2026-09-10', follow_up_date: TODAY },
    thresholds,
    TODAY,
  );
  assert.equal(today[0].label, 'Follow-up due', 'today counts as due');

  const later = contactReasons(
    person(),
    streaks(),
    { date: '2026-09-10', follow_up_date: '2026-09-18' },
    thresholds,
    TODAY,
  );
  assert.deepEqual(later, []);
});

test('a snooze hides someone until it runs out, then they come back', () => {
  const streak: Streak = { streak: 4, lastAttended: '2026-09-01' };
  const snoozed = person({ snoozed_until: '2026-09-24' });
  const reasons = contactReasons(snoozed, streaks({ night: streak }), null, thresholds, TODAY);

  assert.equal(isSnoozed(snoozed, TODAY), true);
  assert.equal(groupFor(snoozed, reasons, TODAY), 'snoozed');

  // Eight days later the snooze has expired and the streak still holds.
  const later = '2026-09-25';
  assert.equal(isSnoozed(snoozed, later), false);
  assert.equal(
    groupFor(snoozed, contactReasons(snoozed, streaks({ night: streak }), null, thresholds, later), later),
    'needs_attention',
  );
});

test('a snooze expiring today is over', () => {
  assert.equal(isSnoozed(person({ snoozed_until: '2026-09-16' }), TODAY), false);
  assert.equal(isSnoozed(person({ snoozed_until: TODAY }), TODAY), true);
});

test('never contacted comes first, then the oldest last contact', () => {
  const rows = [
    { name: 'Chaim', lastContact: '2026-09-01' },
    { name: 'Avi', lastContact: null },
    { name: 'Berel', lastContact: '2026-05-04' },
    { name: 'Dovid', lastContact: null },
  ];
  assert.deepEqual(
    [...rows].sort(byLeastRecentlyContacted).map((r) => r.name),
    ['Avi', 'Dovid', 'Berel', 'Chaim'],
  );
});

test('every programme can flag the same person at once', () => {
  const reasons = contactReasons(
    person({ in_daf: true, in_shachris: true }),
    streaks({
      night: { streak: 4, lastAttended: '2026-09-02' },
      daf: { streak: 5, lastAttended: '2026-09-03' },
      shachris: { streak: 6, lastAttended: '2026-09-04' },
    }),
    { date: '2026-09-01', follow_up_date: '2026-09-05' },
    thresholds,
    TODAY,
  );
  assert.deepEqual(
    reasons.map((r) => r.kind),
    ['night', 'daf', 'shachris', 'follow_up'],
  );
});
