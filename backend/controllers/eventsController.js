const mongoose = require('mongoose');
const { Behavior, BehaviorEvent } = require('../models');
const { parseDate } = require('../utils/body');
const { intervalIndexFor } = require('../utils/chart');

// gives a little wiggle room in case the phone's clock is a bit ahead of the server's
const CLOCK_SKEW_MS = 60 * 1000;

// GET /api/sessions/:sessionId/events
//   returns: 200 [event, ...] oldest first
//   db:      BehaviorEvents.find({ SessionId })
exports.listEvents = async (req, res, next) => {
  try {
    const events = await BehaviorEvent.find({ SessionId: req.sessionDoc._id }).sort({ Timestamp: 1 });
    res.status(200).json(events);
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/:sessionId/events   (the "tap" when a behavior happens)
//   takes:   { behaviorId, timestamp? }  timestamp defaults to right now. the app only
//            needs to send it if the tap happened earlier (ex: recorded while offline)
//   returns: 201 event  |  400 { error }  |  404 behavior not found  |  409 session ended / behavior archived
//   db:      Behaviors.findOne({ _id, StudentId, UserId }), BehaviorEvents.insertOne
exports.createEvent = async (req, res, next) => {
  try {
    const session = req.sessionDoc;
    const { behaviorId, timestamp } = req.body || {};

    if (session.Status !== 'active') {
      return res.status(409).json({ error: 'This session has ended, so no more events can be added' });
    }

    if (!behaviorId || !mongoose.isValidObjectId(behaviorId)) {
      return res.status(400).json({ error: 'behaviorId is required and must be a valid id' });
    }

    const behavior = await Behavior.findOne({
      _id: String(behaviorId),
      StudentId: session.StudentId,
      UserId: req.userId
    });
    if (!behavior) {
      return res.status(404).json({ error: 'Behavior not found for this student' });
    }
    if (behavior.IsArchived) {
      return res.status(409).json({ error: 'This behavior is archived' });
    }

    const when = parseDate(timestamp, 'timestamp') || new Date();
    if (when < session.StartTime || when.getTime() > Date.now() + CLOCK_SKEW_MS) {
      return res.status(400).json({ error: 'timestamp must be between the session start and now' });
    }

    const event = await BehaviorEvent.create({
      SessionId: session._id,
      StudentId: session.StudentId,
      BehaviorId: behavior._id,
      UserId: req.userId,
      Timestamp: when,
      IntervalIndex: intervalIndexFor(when, session.StartTime, session.IntervalSeconds)
    });

    res.status(201).location(`/api/events/${event._id}`).json(event);
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:eventId
//   returns: 200 event  |  404 { error }
exports.getEvent = (req, res) => {
  res.status(200).json(req.event);
};

// DELETE /api/events/:eventId   (undo button for a mistaken tap)
//   returns: 200 { message }
//   db:      BehaviorEvents.deleteOne
exports.deleteEvent = async (req, res, next) => {
  try {
    await req.event.deleteOne();
    res.status(200).json({ message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};
