const mongoose = require('mongoose');
const { baseOptions } = require('./schemaOptions');

// one "tap" = a behavior happened at some moment during a session.
// intervalIndex = floor((timestamp - session.startTime) / intervalSeconds),
// the API calculates it when the event gets recorded (the app doesn't send it)
const behaviorEventSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    behaviorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Behavior', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    intervalIndex: { type: Number, required: true, min: 0 }
  },
  baseOptions('behaviorEvents')
);

module.exports = mongoose.model('BehaviorEvent', behaviorEventSchema);
