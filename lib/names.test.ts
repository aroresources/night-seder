import test from 'node:test';
import assert from 'node:assert/strict';

import { fullName, parseFullName } from './names.ts';

test('one word is a first name and nothing else', () => {
  assert.deepEqual(parseFullName('Dovid'), {
    first_name: 'Dovid',
    middle_name: null,
    last_name: null,
  });
});

test('two words are a first name and a surname', () => {
  assert.deepEqual(parseFullName('Dovid Cohen'), {
    first_name: 'Dovid',
    middle_name: null,
    last_name: 'Cohen',
  });
});

test('three words put the middle in the middle', () => {
  assert.deepEqual(parseFullName('Dovid Yitzchok Cohen'), {
    first_name: 'Dovid',
    middle_name: 'Yitzchok',
    last_name: 'Cohen',
  });
});

test('everything between the ends becomes the middle name', () => {
  assert.deepEqual(parseFullName('Moshe Chaim Yosef Levy'), {
    first_name: 'Moshe',
    middle_name: 'Chaim Yosef',
    last_name: 'Levy',
  });
});

test('ragged pasted whitespace is tidied up', () => {
  assert.deepEqual(parseFullName('  Yaakov   Stern  '), {
    first_name: 'Yaakov',
    middle_name: null,
    last_name: 'Stern',
  });
  assert.deepEqual(parseFullName('Yaakov\tStern'), {
    first_name: 'Yaakov',
    middle_name: null,
    last_name: 'Stern',
  });
});

test('a blank line is not a person', () => {
  assert.equal(parseFullName(''), null);
  assert.equal(parseFullName('   '), null);
  assert.equal(parseFullName('\t'), null);
});

test('fullName reassembles exactly what was split', () => {
  for (const line of ['Dovid', 'Dovid Cohen', 'Moshe Chaim Yosef Levy']) {
    const parts = parseFullName(line);
    assert.ok(parts);
    assert.equal(fullName(parts), line);
  }
});

test('fullName skips the parts that are missing or blank', () => {
  assert.equal(
    fullName({ first_name: 'Dovid', middle_name: null, last_name: 'Cohen' }),
    'Dovid Cohen',
  );
  assert.equal(
    fullName({ first_name: 'Dovid', middle_name: '  ', last_name: 'Cohen' }),
    'Dovid Cohen',
  );
  assert.equal(
    fullName({ first_name: 'Dovid', middle_name: null, last_name: null }),
    'Dovid',
  );
});
