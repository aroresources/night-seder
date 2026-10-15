import test from 'node:test';
import assert from 'node:assert/strict';

import { formatForDisplay, isSendable, toE164 } from './phone.ts';

test('reads the ways a US number actually gets typed', () => {
  assert.equal(toE164('7185550101'), '+17185550101');
  assert.equal(toE164('718-555-0101'), '+17185550101');
  assert.equal(toE164('(718) 555-0101'), '+17185550101');
  assert.equal(toE164('718.555.0101'), '+17185550101');
  assert.equal(toE164('  718 555 0101  '), '+17185550101');
  assert.equal(toE164('1-718-555-0101'), '+17185550101');
  assert.equal(toE164('+1 (718) 555-0101'), '+17185550101');
});

test('an international number keeps its own country code', () => {
  assert.equal(toE164('+972 2 555 0101'), '+97225550101');
  assert.equal(toE164('+44 20 7946 0958'), '+442079460958');
});

test('refuses anything it cannot read confidently', () => {
  assert.equal(toE164(''), null);
  assert.equal(toE164('   '), null);
  assert.equal(toE164(null), null);
  assert.equal(toE164(undefined), null);
  assert.equal(toE164('n/a'), null);
  assert.equal(toE164('555-0101'), null, 'seven digits has no area code');
  assert.equal(toE164('718555010'), null, 'nine digits is a typo');
  assert.equal(toE164('271855501011'), null, 'twelve digits without a plus');
});

test('refuses a number with an extension rather than dialling the wrong thing', () => {
  assert.equal(toE164('718-555-0101 ext 12'), null);
  assert.equal(toE164('718-555-0101 x12'), null);
  assert.equal(toE164('(718) 555-0101 extension 4'), null);
});

test('a plus-prefixed number still has to be a plausible length', () => {
  assert.equal(toE164('+1'), null);
  assert.equal(toE164('+1234567'), null, 'too short to be a real number');
  assert.equal(toE164('+1234567890123456'), null, 'longer than E.164 allows');
});

test('isSendable agrees with toE164', () => {
  assert.equal(isSendable('718-555-0101'), true);
  assert.equal(isSendable('555-0101'), false);
  assert.equal(isSendable(null), false);
});

test('a US number reads back the way it was written', () => {
  assert.equal(formatForDisplay('+17185550101'), '(718) 555-0101');
  // Anything else is shown as stored rather than mangled into a US shape.
  assert.equal(formatForDisplay('+97225550101'), '+97225550101');
});
