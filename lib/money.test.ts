import test from 'node:test';
import assert from 'node:assert/strict';

import { centsToInput, formatCents, parseDollars } from './money.ts';

test('parseDollars reads the ways an amount actually gets typed', () => {
  assert.equal(parseDollars('180'), 18000);
  assert.equal(parseDollars('180.50'), 18050);
  assert.equal(parseDollars('$180'), 18000);
  assert.equal(parseDollars('$1,800.25'), 180025);
  assert.equal(parseDollars(' 180 '), 18000);
  assert.equal(parseDollars('180.5'), 18050);
  assert.equal(parseDollars('0'), 0);
});

test('parseDollars rounds past binary floating point', () => {
  // 1.005 * 100 is 100.49999999999999 in binary floating point.
  assert.equal(parseDollars('1.005'), null, 'three decimals is not an amount');
  assert.equal(parseDollars('18.29'), 1829);
  assert.equal(parseDollars('0.07'), 7);
  assert.equal(parseDollars('1234.56'), 123456);
});

test('parseDollars refuses what is not a plain amount', () => {
  assert.equal(parseDollars(''), null);
  assert.equal(parseDollars('   '), null);
  assert.equal(parseDollars('abc'), null);
  assert.equal(parseDollars('-50'), null, 'a payment is not negative');
  assert.equal(parseDollars('180.999'), null);
  assert.equal(parseDollars('1e3'), null);
});

test('formatCents always lines up to two decimals', () => {
  assert.equal(formatCents(18000), '$180.00');
  assert.equal(formatCents(18050), '$180.50');
  assert.equal(formatCents(0), '$0.00');
  assert.equal(formatCents(7), '$0.07');
  assert.equal(formatCents(180025), '$1,800.25');
});

test('a value survives the round trip through an input box', () => {
  for (const cents of [0, 7, 18000, 18050, 123456]) {
    assert.equal(parseDollars(centsToInput(cents)), cents);
  }
});
