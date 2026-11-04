const { Session, Behavior, BehaviorEvent } = require('../models');
const { parseDate } = require('../utils/body');
const { buildChart } = require('../utils/chart');

// GET /api/students/:studentId/sessions?status=ended&from=...&to=...&limit=50
//   returns: 200 [session, ...] newest first
//   db:      Session.find({ studentId, userId, [status], [startTime range] })
exports.listSessions = async (req, res, next) => {
  try {
    const filter = { studentId: req.student._id, userId: req.userId };

    if (req.query.status !== undefined) {
      if (!['active', 'ended'].includes(req.query.status)) {
        return res.status(400).json({ error: 'status must be "active" or "ended"' });
      }
      filter.status = req.query.status;
    }

    const from = parseDate(req.query.from, 'from');
    const to = parseDate(req.query.to, 'to');
    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = from;
      if (to) filter.startTime.$lte = to;
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const sessions = await Session.find(filter).sort({ startTime: -1 }).limit(limit);
    res.status(200).json(sessions);
  } catch (err) {
    next(err);
  }
};

// POST /api/students/:studentId/sessions   (starts a session right now)
//   takes:   { intervalSeconds?: 120, notes?: "" }
//   returns: 201 session  |  409 { error, activeSessionId } if one's already running
//   db:      Session.findOne (is one already active?), Session.create
exports.startSession = async (req, res, next) => {
  try {
    const active = await Session.findOne({
      studentId: req.student._id,
      userId: req.userId,
      status: 'active'
    });
    if (active) {
      return res.status(409).json({
        error: 'This student already has an active session. End it before starting another.',
        activeSessionId: active._id
      });
    }

    const { intervalSeconds, notes } = req.body || {};
    const session = await Session.create({
      userId: req.userId,
      studentId: req.student._id,
      startTime: new Date(),
      endTime: null,
      status: 'active',
      ...(intervalSeconds !== undefined ? { intervalSeconds: intervalSeconds } : {}),
      ...(notes !== undefined ? { notes: notes } : {})
    });

    res.status(201).location(`/api/sessions/${session._id}`).json(session);
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions/:sessionId
//   returns: 200 { ...session, events: [event, ...] }  events oldest first
//   db:      Session.findOne (loadOwned), BehaviorEvent.find({ sessionId })
exports.getSession = async (req, res, next) => {
  try {
    const events = await BehaviorEvent.find({ sessionId: req.sessionDoc._id }).sort({ timestamp: 1 });
    res.status(200).json({ ...req.sessionDoc.toJSON(), events });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/sessions/:sessionId
//   takes:   { notes?, status?: "ended" }   sending status "ended" stops the session now
//   returns: 200 session  |  400 { error }
//   db:      Session.updateOne
exports.updateSession = async (req, res, next) => {
  try {
    const { notes, status } = req.body || {};

    if (notes === undefined && status === undefined) {
      return res.status(400).json({ error: 'Send notes and/or status' });
    }

    if (status !== undefined) {
      if (status !== 'ended') {
        return res.status(400).json({ error: 'status can only be set to "ended"' });
      }
      if (req.sessionDoc.status === 'active') {
        req.sessionDoc.status = 'ended';
        req.sessionDoc.endTime = new Date();
      }
    }

    if (notes !== undefined) req.sessionDoc.notes = notes;

    await req.sessionDoc.save();
    res.status(200).json(req.sessionDoc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sessions/:sessionId
//   returns: 200 { message, deletedEvents }
//   db:      BehaviorEvent.deleteMany({ sessionId }), Session.deleteOne
exports.deleteSession = async (req, res, next) => {
  try {
    const events = await BehaviorEvent.deleteMany({ sessionId: req.sessionDoc._id, userId: req.userId });
    await req.sessionDoc.deleteOne();
    res.status(200).json({ message: 'Session deleted', deletedEvents: events.deletedCount });
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions/:sessionId/chart
//   returns: 200 { session, intervalSeconds, totalIntervals,
//                  intervals: [{ index, startSeconds, endSeconds, counts, codes }],
//                  totals: [{ behaviorId, name, code, color, count }] }
//   db:      BehaviorEvent.find({ sessionId }), Behavior.find({ studentId })
//   (the actual math is in utils/chart.js)
exports.getChart = async (req, res, next) => {
  try {
    const events = await BehaviorEvent.find({ sessionId: req.sessionDoc._id }).lean();
    const behaviors = await Behavior.find({ studentId: req.sessionDoc.studentId, userId: req.userId })
      .sort({ code: 1 })
      .lean();

    res.status(200).json({ session: req.sessionDoc, ...buildChart(req.sessionDoc, events, behaviors) });
  } catch (err) {
    next(err);
  }
};
