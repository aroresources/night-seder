import test from 'node:test';
import assert from 'node:assert/strict';

import { composeBody, isGsm7, measure, OPT_OUT_SUFFIX } from './message-text.ts';

test('plain English is one part up to 160 characters', () => {
  assert.deepEqual(measure('Night seder starts at 8:30 tonight.'), {
    encoding: 'GSM-7',
    characters: 35,
    segments: 1,
    remaining: 125,
  });

  const exactly160 = 'a'.repeat(160);
  assert.equal(measure(exactly160).segments, 1);
  assert.equal(measure(exactly160).remaining, 0);
});

test('one character past 160 costs two parts, not one and a bit', () => {
  const over = 'a'.repeat(161);
  assert.equal(measure(over).segments, 2);
  // Parts in a multi-part message hold 153, not 160.
  assert.equal(measure(over).remaining, 2 * 153 - 161);
  assert.equal(measure('a'.repeat(306)).segments, 2);
  assert.equal(measure('a'.repeat(307)).segments, 3);
});

test('a single curly quote drops the whole message to 70 per part', () => {
  const straight = "Don't forget seder.";
  const curly = 'Don’t forget seder.';

  assert.equal(measure(straight).encoding, 'GSM-7');
  assert.equal(measure(curly).encoding, 'UCS-2');
  assert.equal(measure(curly).remaining, 70 - curly.length);

  // The expensive part: the same words cost three times as much to send.
  const long = 'a'.repeat(150);
  assert.equal(measure(long).segments, 1);
  assert.equal(measure(long + '’').segments, 3);
});

test('Hebrew is UCS-2', () => {
  assert.equal(isGsm7('אור מתתיהו'), false);
  assert.equal(measure('אור מתתיהו').encoding, 'UCS-2');
  assert.equal(measure('אור מתתיהו').segments, 1);
});

test('the characters GSM-7 charges double for are counted double', () => {
  assert.equal(isGsm7('a[b]c'), true, 'brackets are in GSM-7, just extended');
  // Three plain letters plus two brackets at two slots each.
  assert.equal(measure('a[b]c').remaining, 160 - 7);
  assert.equal(measure('{'.repeat(80)).segments, 1, '160 slots exactly');
  assert.equal(measure('{'.repeat(81)).segments, 2);
});

test('an empty message costs nothing', () => {
  assert.deepEqual(measure(''), {
    encoding: 'GSM-7',
    characters: 0,
    segments: 0,
    remaining: 160,
  });
});

test('the opt-out line is appended, and only once', () => {
  assert.equal(
    composeBody('Seder at 8:30.', true),
    'Seder at 8:30.' + OPT_OUT_SUFFIX,
  );
  assert.equal(composeBody('Seder at 8:30.', false), 'Seder at 8:30.');
  assert.equal(
    composeBody('Seder at 8:30. Reply STOP to stop.', true),
    'Seder at 8:30. Reply STOP to stop.',
    'already says it',
  );
  assert.equal(
    composeBody('Text STOP to unsubscribe anytime', true),
    'Text STOP to unsubscribe anytime',
    'said in other words, still said',
  );
});

test('composeBody trims what was typed', () => {
  assert.equal(composeBody('  Seder at 8:30.  ', false), 'Seder at 8:30.');
});
