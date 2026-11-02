// unit tests for the chart + summary math. no db and no installs needed,
// just run `npm test` (uses node's built-in test runner)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { intervalIndexFor, totalIntervalsFor, buildChart, buildSummary } = require('../utils/chart');

const start = new Date('2026-10-19T13:00:00.000Z');
const at = (sec) => new Date(start.getTime() + sec * 1000);

test('intervalIndexFor puts each moment in the right 2-minute interval', () => {
  assert.equal(intervalIndexFor(at(0), start, 120), 0);
  assert.equal(intervalIndexFor(at(119), start, 120), 0);
  assert.equal(intervalIndexFor(at(120), start, 120), 1);
  assert.equal(intervalIndexFor(at(1799), start, 120), 14);
});

test('intervalIndexFor matches the seed data', () => {
  // seed event 6ad614e6... : 13:02:30 in a session that started at 13:00 -> index 1
  assert.equal(intervalIndexFor('2026-10-19T13:02:30.000Z', start, 120), 1);
  // 6ad61a6d... : 13:26:05 -> index 13
  assert.equal(intervalIndexFor('2026-10-19T13:26:05.000Z', start, 120), 13);
});

test('intervalIndexFor never goes below 0', () => {
  assert.equal(intervalIndexFor(at(-30), start, 120), 0);
});

test('totalIntervalsFor: a 30-minute ended session has 15 two-minute intervals', () => {
  const session = { StartTime: start, EndTime: at(1800), IntervalSeconds: 120 };
  assert.equal(totalIntervalsFor(session), 15);
});

test('totalIntervalsFor: an active session counts up to now, at least 1', () => {
  const session = { StartTime: start, EndTime: null, IntervalSeconds: 120 };
  assert.equal(totalIntervalsFor(session, at(250)), 3);
  assert.equal(totalIntervalsFor(session, at(0)), 1);
});

const behaviors = [
  { _id: 'b1', Name: 'Vocal outburst', Code: 'V', Color: '#F3A712', IsArchived: false },
  { _id: 'b2', Name: 'Hand raise', Code: 'H', Color: '#2E9E5B', IsArchived: false }
];

test('buildChart groups events into intervals and totals', () => {
  const session = { _id: 's1', StartTime: start, EndTime: at(600), IntervalSeconds: 120 };
  const events = [
    { SessionId: 's1', BehaviorId: 'b1', IntervalIndex: 0 },
    { SessionId: 's1', BehaviorId: 'b1', IntervalIndex: 0 },
    { SessionId: 's1', BehaviorId: 'b2', IntervalIndex: 0 },
    { SessionId: 's1', BehaviorId: 'b2', IntervalIndex: 4 },
    { SessionId: 's1', BehaviorId: 'gone', IntervalIndex: 2 } // behavior that got deleted, should be skipped
  ];

  const chart = buildChart(session, events, behaviors);

  assert.equal(chart.totalIntervals, 5);
  assert.equal(chart.intervals.length, 5);
  assert.deepEqual(chart.intervals[0].counts, { V: 2, H: 1 });
  assert.deepEqual(chart.intervals[0].codes, ['H', 'V']);
  assert.equal(chart.intervals[0].startSeconds, 0);
  assert.equal(chart.intervals[0].endSeconds, 120);
  assert.deepEqual(chart.intervals[2].codes, []);
  assert.deepEqual(chart.intervals[4].codes, ['H']);
  assert.deepEqual(
    chart.totals.map((t) => [t.Code, t.count]),
    [['V', 2], ['H', 2]]
  );
});

test('buildChart grows to fit an event past the end time', () => {
  const session = { StartTime: start, EndTime: at(120), IntervalSeconds: 120 };
  const chart = buildChart(session, [{ BehaviorId: 'b1', IntervalIndex: 3 }], behaviors);
  assert.equal(chart.totalIntervals, 4);
  assert.deepEqual(chart.intervals[3].codes, ['V']);
});

test('buildSummary counts per session and works out the rate per hour', () => {
  const sessions = [
    { _id: 's1', StartTime: start, EndTime: at(1800), Status: 'ended' }, // 30 min
    { _id: 's2', StartTime: at(86400), EndTime: at(86400 + 1200), Status: 'ended' } // 20 min
  ];
  const events = [
    { SessionId: 's1', BehaviorId: 'b1' },
    { SessionId: 's1', BehaviorId: 'b1' },
    { SessionId: 's1', BehaviorId: 'b1' },
    { SessionId: 's2', BehaviorId: 'b1' },
    { SessionId: 's2', BehaviorId: 'b2' },
    { SessionId: 'other', BehaviorId: 'b1' } // session not in the list, should be skipped
  ];

  const summary = buildSummary(sessions, events, behaviors);

  assert.equal(summary.sessions.length, 2);
  assert.equal(summary.sessions[0].minutes, 30);
  assert.deepEqual(summary.sessions[0].counts, { b1: 3 });
  assert.equal(summary.sessions[0].ratePerHour.b1, 6); // 3 in 30 min = 6/hour
  assert.equal(summary.sessions[1].ratePerHour.b2, 3); // 1 in 20 min = 3/hour
  assert.deepEqual(
    summary.behaviors.map((b) => [b.Code, b.total]),
    [['V', 4], ['H', 1]]
  );
});
