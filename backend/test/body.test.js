const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pick, isTrue, parseDate, escapeRegex } = require('../utils/body');

test('pick renames allowed fields and drops everything else', () => {
  const body = { firstName: 'Mia', lastName: 'T', UserId: 'attacker', _id: 'x' };
  assert.deepEqual(pick(body, { firstName: 'FirstName', lastName: 'LastName' }), {
    FirstName: 'Mia',
    LastName: 'T'
  });
});

test('pick skips fields that were not sent, but keeps empty strings', () => {
  assert.deepEqual(pick({ notes: '' }, { notes: 'Notes', gradeLevel: 'GradeLevel' }), { Notes: '' });
  assert.deepEqual(pick(undefined, { notes: 'Notes' }), {});
});

test('isTrue understands query-string booleans', () => {
  assert.equal(isTrue('true'), true);
  assert.equal(isTrue('1'), true);
  assert.equal(isTrue(true), true);
  assert.equal(isTrue('false'), false);
  assert.equal(isTrue(undefined), false);
});

test('parseDate accepts ISO strings and milliseconds, rejects junk with status 400', () => {
  assert.equal(parseDate(undefined, 'from'), null);
  assert.equal(parseDate('', 'from'), null);
  assert.equal(parseDate('2026-10-01', 'from').toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(parseDate(1761955200000, 'ts').toISOString(), '2025-11-01T00:00:00.000Z');
  assert.equal(parseDate('1761955200000', 'ts').toISOString(), '2025-11-01T00:00:00.000Z');
  assert.throws(() => parseDate('next tuesday', 'from'), (err) => err.status === 400);
});

test('escapeRegex makes search text literal', () => {
  assert.ok(new RegExp(escapeRegex('a.b*')).test('a.b*'));
  assert.ok(!new RegExp(escapeRegex('a.b')).test('axb'));
});
