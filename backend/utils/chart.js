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
  const start = new Date(session.StartTime).getTime();
  const end = session.EndTime ? new Date(session.EndTime).getTime() : now.getTime();
  const intervals = Math.ceil(Math.max(0, end - start) / (session.IntervalSeconds * MS));
  return Math.max(1, intervals);
};

// the end of session interval chart: one row per interval with the codes that
// happened in it, plus a total for each behavior.
//
//   intervals: [{ index: 0, startSeconds: 0, endSeconds: 120,
//                 counts: { V: 1, R: 1 }, codes: ['R', 'V'] }, ...]
//   totals:    [{ behaviorId, Name, Code, Color, count }]
exports.buildChart = (session, events, behaviors, now = new Date()) => {
  const byId = new Map(behaviors.map((b) => [String(b._id), b]));
  const maxEventIndex = events.reduce((max, e) => Math.max(max, e.IntervalIndex), -1);
  const total = Math.max(exports.totalIntervalsFor(session, now), maxEventIndex + 1);

  const intervals = Array.from({ length: total }, (_, index) => ({
    index,
    startSeconds: index * session.IntervalSeconds,
    endSeconds: (index + 1) * session.IntervalSeconds,
    counts: {},
    codes: []
  }));

  const totals = new Map();
  for (const b of behaviors) {
    totals.set(String(b._id), {
      behaviorId: String(b._id),
      Name: b.Name,
      Code: b.Code,
      Color: b.Color,
      count: 0
    });
  }

  for (const e of events) {
    const behavior = byId.get(String(e.BehaviorId));
    if (!behavior) continue; // behavior got deleted, just skip it
    const row = intervals[e.IntervalIndex];
    row.counts[behavior.Code] = (row.counts[behavior.Code] || 0) + 1;
    totals.get(String(behavior._id)).count += 1;
  }

  for (const row of intervals) row.codes = Object.keys(row.counts).sort();

  return {
    intervalSeconds: session.IntervalSeconds,
    totalIntervals: total,
    intervals,
    totals: [...totals.values()]
  };
};

// trends across sessions for one student: for each session, how many times each
// behavior happened and the rate per hour (good for a progress graph)
//
//   sessions: [{ sessionId, StartTime, EndTime, minutes,
//                counts: { <behaviorId>: n }, ratePerHour: { <behaviorId>: r } }]
//   behaviors: [{ behaviorId, Name, Code, Color, IsArchived, total }]
exports.buildSummary = (sessions, events, behaviors, now = new Date()) => {
  const perSession = new Map();
  for (const s of sessions) {
    const end = s.EndTime ? new Date(s.EndTime) : now;
    const minutes = Math.max(0, (end - new Date(s.StartTime)) / 60000);
    perSession.set(String(s._id), {
      sessionId: String(s._id),
      StartTime: s.StartTime,
      EndTime: s.EndTime,
      Status: s.Status,
      minutes: Math.round(minutes * 10) / 10,
      counts: {},
      ratePerHour: {}
    });
  }

  const totals = new Map(
    behaviors.map((b) => [
      String(b._id),
      { behaviorId: String(b._id), Name: b.Name, Code: b.Code, Color: b.Color, IsArchived: b.IsArchived, total: 0 }
    ])
  );

  for (const e of events) {
    const row = perSession.get(String(e.SessionId));
    const total = totals.get(String(e.BehaviorId));
    if (!row || !total) continue;
    const key = String(e.BehaviorId);
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
