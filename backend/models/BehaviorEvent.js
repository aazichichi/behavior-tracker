const mongoose = require('mongoose');
const { baseOptions } = require('./schemaOptions');

// one "tap" = a behavior happened at some moment during a session.
// IntervalIndex = floor((Timestamp - Session.StartTime) / IntervalSeconds),
// the API calculates it when the event gets recorded (the app doesn't send it)
const behaviorEventSchema = new mongoose.Schema(
  {
    SessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    StudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    BehaviorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Behavior', required: true },
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Timestamp: { type: Date, required: true, default: Date.now },
    IntervalIndex: { type: Number, required: true, min: 0 }
  },
  baseOptions('BehaviorEvents')
);

module.exports = mongoose.model('BehaviorEvent', behaviorEventSchema);
