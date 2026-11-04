const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  intervals: [{
    timestamp: { type: Date, required: true },
    durationSeconds: { type: Number, default: 0 },
    behaviorsLogged: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Behavior' }]
  }]
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
