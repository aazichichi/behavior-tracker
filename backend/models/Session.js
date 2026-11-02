const mongoose = require('mongoose');
const { withTimestamps } = require('./schemaOptions');

// one observation period for one student. it gets chopped into intervals of
// IntervalSeconds (2 min by default) for the chart.
// EndTime stays null while the session is still running
const sessionSchema = new mongoose.Schema(
  {
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    StudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    StartTime: { type: Date, required: true, default: Date.now },
    EndTime: { type: Date, default: null },
    IntervalSeconds: {
      type: Number,
      default: 120,
      min: [10, 'IntervalSeconds must be at least 10'],
      max: [3600, 'IntervalSeconds must be at most 3600']
    },
    Status: { type: String, enum: ['active', 'ended'], default: 'active' },
    Notes: { type: String, default: '', trim: true }
  },
  withTimestamps('Sessions')
);

module.exports = mongoose.model('Session', sessionSchema);
