import test from 'node:test';
import assert from 'node:assert/strict';

import { smsLink, SHUL_SMS_NUMBER } from './consent.ts';

test('the join link carries a real number and the word', () => {
  assert.equal(smsLink('(626) 613-6288', 'JOIN'), 'sms:+16266136288?body=JOIN');
});

test('punctuation in the printed number never reaches the link', () => {
  // The bug this exists for: a lost backslash turned \D into a literal D, so
  // the brackets and spaces went straight into the href and nothing dialled.
  assert.ok(!smsLink(SHUL_SMS_NUMBER, 'JOIN').includes('('), 'no brackets');
  assert.ok(!smsLink(SHUL_SMS_NUMBER, 'JOIN').includes(' '), 'no spaces');
  assert.match(smsLink(SHUL_SMS_NUMBER, 'JOIN'), /^sms:\+1\d{10}\?body=JOIN$/);
});

test('a number already carrying its country code is not given a second one', () => {
  assert.equal(smsLink('+1 626-613-6288', 'JOIN'), 'sms:+16266136288?body=JOIN');
});

test('a body with a space is escaped, not left to break the link', () => {
  assert.equal(smsLink('6266136288', 'JOIN ME'), 'sms:+16266136288?body=JOIN%20ME');
});
