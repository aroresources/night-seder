import test from 'node:test';
import assert from 'node:assert/strict';

import { compareByName, fullName, nameSortKey, parseFullName } from './names.ts';

const person = (first: string, last: string | null = null, middle: string | null = null) => ({
  first_name: first,
  middle_name: middle,
  last_name: last,
});

test('lists order by surname, not by first name', () => {
  const people = [
    person('Edon', 'Freiner'),
    person('Moshe', 'Goldzweig'),
    person('Avi', 'Zussman'),
    person('Yaakov', 'Berger'),
  ];
  assert.deepEqual(
    [...people].sort(compareByName).map(fullName),
    ['Yaakov Berger', 'Edon Freiner', 'Moshe Goldzweig', 'Avi Zussman'],
  );
});

test('brothers are separated by their first names', () => {
  const people = [person('Yosef', 'Cohen'), person('Dovid', 'Cohen'), person('Avi', 'Cohen')];
  assert.deepEqual(
    [...people].sort(compareByName).map((p) => p.first_name),
    ['Avi', 'Dovid', 'Yosef'],
  );
});

test('a man with no surname sorts under his first name, not at the bottom', () => {
  const people = [person('Zalman', 'Adler'), person('Mendel'), person('Shimon', 'Zilber')];
  assert.deepEqual(
    [...people].sort(compareByName).map(fullName),
    ['Zalman Adler', 'Mendel', 'Shimon Zilber'],
  );
});

test('sorting ignores case and stray spacing', () => {
  assert.equal(nameSortKey(person('edon', 'freiner')), nameSortKey(person('Edon', ' Freiner ')));
  assert.equal(nameSortKey(person('Mendel', '  ')), nameSortKey(person('Mendel', null)));
});

test('the middle name has no say in the order', () => {
  assert.equal(
    nameSortKey(person('Dovid', 'Cohen', 'Aryeh')),
    nameSortKey(person('Dovid', 'Cohen')),
  );
});

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
