// pure functions (no db stuff) that turn sessions + events into the numbers the
// web/mobile apps actually draw. kept separate on purpose so we can unit test
// them without mongo, see test/chart.test.js

const MS = 1000;

// which interval of the session a moment lands in (0 = the first one)
exports.intervalIndexFor = (timestamp, startTime, intervalSeconds) => {
  const elapsed = new Date(timestamp).getTime() - new Date(startTime).getTime();
  return Math.max(0, Math.floor(elapsed / (intervalSeconds * MS)));
};

// how many intervals the session has. if it's still active we count up to `now`
exports.totalIntervalsFor = (session, now = new Date()) => {
  const start = new Date(session.startTime).getTime();
  const end = session.endTime ? new Date(session.endTime).getTime() : now.getTime();
  const intervals = Math.ceil(Math.max(0, end - start) / (session.intervalSeconds * MS));
  return Math.max(1, intervals);
};

// the end of session interval chart: one row per interval with the codes that
// happened in it, plus a total for each behavior.
//
//   intervals: [{ index: 0, startSeconds: 0, endSeconds: 120,
//                 counts: { V: 1, R: 1 }, codes: ['R', 'V'] }, ...]
//   totals:    [{ behaviorId, name, code, color, count }]
exports.buildChart = (session, events, behaviors, now = new Date()) => {
  const byId = new Map(behaviors.map((b) => [String(b._id), b]));
  const maxEventIndex = events.reduce((max, e) => Math.max(max, e.intervalIndex), -1);
  const total = Math.max(exports.totalIntervalsFor(session, now), maxEventIndex + 1);

  const intervals = Array.from({ length: total }, (_, index) => ({
    index,
    startSeconds: index * session.intervalSeconds,
    endSeconds: (index + 1) * session.intervalSeconds,
    counts: {},
    codes: []
  }));

  const totals = new Map();
  for (const b of behaviors) {
    totals.set(String(b._id), {
      behaviorId: String(b._id),
      name: b.name,
      code: b.code,
      color: b.color,
      count: 0
    });
  }

  for (const e of events) {
    const behavior = byId.get(String(e.behaviorId));
    if (!behavior) continue; // behavior got deleted, just skip it
    const row = intervals[e.intervalIndex];
    row.counts[behavior.code] = (row.counts[behavior.code] || 0) + 1;
    totals.get(String(behavior._id)).count += 1;
  }

  for (const row of intervals) row.codes = Object.keys(row.counts).sort();

  return {
    intervalSeconds: session.intervalSeconds,
    totalIntervals: total,
    intervals,
    totals: [...totals.values()]
  };
};

// trends across sessions for one student: for each session, how many times each
// behavior happened and the rate per hour (good for a progress graph)
//
//   sessions: [{ sessionId, startTime, endTime, minutes,
//                counts: { <behaviorId>: n }, ratePerHour: { <behaviorId>: r } }]
//   behaviors: [{ behaviorId, name, code, color, isArchived, total }]
exports.buildSummary = (sessions, events, behaviors, now = new Date()) => {
  const perSession = new Map();
  for (const s of sessions) {
    const end = s.endTime ? new Date(s.endTime) : now;
    const minutes = Math.max(0, (end - new Date(s.startTime)) / 60000);
    perSession.set(String(s._id), {
      sessionId: String(s._id),
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      minutes: Math.round(minutes * 10) / 10,
      counts: {},
      ratePerHour: {}
    });
  }

  const totals = new Map(
    behaviors.map((b) => [
      String(b._id),
      { behaviorId: String(b._id), name: b.name, code: b.code, color: b.color, isArchived: b.isArchived, total: 0 }
    ])
  );

  for (const e of events) {
    const row = perSession.get(String(e.sessionId));
    const total = totals.get(String(e.behaviorId));
    if (!row || !total) continue;
    const key = String(e.behaviorId);
    row.counts[key] = (row.counts[key] || 0) + 1;
    total.total += 1;
  }

  for (const row of perSession.values()) {
    for (const [key, count] of Object.entries(row.counts)) {
      row.ratePerHour[key] = row.minutes > 0 ? Math.round((count / row.minutes) * 60 * 10) / 10 : 0;
    }
  }

  return {
    sessions: [...perSession.values()],
    behaviors: [...totals.values()]
  };
};
