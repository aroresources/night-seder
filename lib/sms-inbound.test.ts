import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { classifyKeyword, isFromTwilio } from './sms-inbound.ts';

test('the words that mean he wants in', () => {
  for (const word of ['JOIN', 'join', 'Start', 'YES', 'unstop', 'subscribe']) {
    assert.equal(classifyKeyword(word), 'join', word);
  }
});

test('the words that mean he wants out', () => {
  for (const word of ['STOP', 'stop', 'StopAll', 'unsubscribe', 'cancel', 'END', 'quit']) {
    assert.equal(classifyKeyword(word), 'stop', word);
  }
});

test('punctuation and politeness do not hide the keyword', () => {
  assert.equal(classifyKeyword('Join!'), 'join');
  assert.equal(classifyKeyword('  join please  '), 'join');
  assert.equal(classifyKeyword('STOP.'), 'stop');
});

test('a man texting back like a person is not a command', () => {
  assert.equal(classifyKeyword('thanks, see you tonight'), 'other');
  assert.equal(classifyKeyword(''), 'other');
  assert.equal(classifyKeyword('   '), 'other');
  // The keyword has to lead: this is a sentence, not an instruction.
  assert.equal(classifyKeyword('can I join the daf?'), 'other');
});

const TOKEN = 'test-auth-token';
const URL = 'https://night-seder.vercel.app/api/sms';
const PARAMS = { From: '+17325550101', Body: 'JOIN', To: '+16266136288' };

function sign(token: string, url: string, params: Record<string, string>): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((text, key) => text + key + params[key], url);
  return createHmac('sha1', token).update(Buffer.from(payload, 'utf8')).digest('base64');
}

test('a request Twilio signed is accepted', () => {
  assert.equal(isFromTwilio(TOKEN, URL, PARAMS, sign(TOKEN, URL, PARAMS)), true);
});

test('a forged or missing signature is refused', () => {
  assert.equal(isFromTwilio(TOKEN, URL, PARAMS, null), false);
  assert.equal(isFromTwilio(TOKEN, URL, PARAMS, 'not-a-signature'), false);
  assert.equal(isFromTwilio(TOKEN, URL, PARAMS, sign('wrong-token', URL, PARAMS)), false);
});

test('a signature for a different URL or different params is refused', () => {
  assert.equal(
    isFromTwilio(TOKEN, URL, PARAMS, sign(TOKEN, 'https://evil.example/api/sms', PARAMS)),
    false,
    'signed for another host',
  );
  assert.equal(
    isFromTwilio(TOKEN, URL, { ...PARAMS, From: '+17325550999' }, sign(TOKEN, URL, PARAMS)),
    false,
    'the number was swapped after signing',
  );
});
