const mongoose = require('mongoose');
const { withTimestamps } = require('./schemaOptions');

// a behavior we're tracking for one student, shown on the chart by its one letter code
// (like v = vocal outburst). archiving hides it but keeps its history, and frees up the
// letter so it can be reused. (the uniq_code_per_student index in the db only counts
// behaviors that aren't archived)
const behaviorSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: [true, 'Name is required'], trim: true },
    code: {
      type: String,
      required: [true, 'Code is required'],
      trim: true,
      uppercase: true,
      match: [/^[A-Z]$/, 'Code must be a single letter A-Z']
    },
    description: { type: String, default: '', trim: true },
    color: {
      type: String,
      default: '#3B82F6',
      trim: true,
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color must look like #RRGGBB']
    },
    isArchived: { type: Boolean, default: false }
  },
  withTimestamps('behaviors')
);

module.exports = mongoose.model('Behavior', behaviorSchema);
