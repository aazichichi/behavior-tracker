const mongoose = require('mongoose');
const { withTimestamps } = require('./schemaOptions');

// a behavior we're tracking for one student, shown on the chart by its one letter Code
// (like V = vocal outburst). archiving hides it but keeps its history, and frees up the
// letter so it can be reused. (the uniq_code_per_student index in the db only counts
// behaviors that aren't archived)
const behaviorSchema = new mongoose.Schema(
  {
    StudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Name: { type: String, required: [true, 'Name is required'], trim: true },
    Code: {
      type: String,
      required: [true, 'Code is required'],
      trim: true,
      uppercase: true,
      match: [/^[A-Z]$/, 'Code must be a single letter A-Z']
    },
    Description: { type: String, default: '', trim: true },
    Color: {
      type: String,
      default: '#3B82F6',
      trim: true,
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color must look like #RRGGBB']
    },
    IsArchived: { type: Boolean, default: false }
  },
  withTimestamps('Behaviors')
);

module.exports = mongoose.model('Behavior', behaviorSchema);
