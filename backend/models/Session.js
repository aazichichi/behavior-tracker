const mongoose = require('mongoose');
const { withTimestamps } = require('./schemaOptions');

// one observation period for one student. it gets chopped into intervals of
// intervalSeconds (2 min by default) for the chart.
// endTime stays null while the session is still running
const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date, default: null },
    intervalSeconds: {
      type: Number,
      default: 120,
      min: [10, 'IntervalSeconds must be at least 10'],
      max: [3600, 'IntervalSeconds must be at most 3600']
    },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    notes: { type: String, default: '', trim: true }
  },
  withTimestamps('sessions')
);

module.exports = mongoose.model('Session', sessionSchema);
