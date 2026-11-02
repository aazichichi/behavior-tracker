const mongoose = require('mongoose');
const { withTimestamps } = require('./schemaOptions');

// a student that a teacher/parent is tracking. each student belongs to exactly one user (UserId)
const studentSchema = new mongoose.Schema(
  {
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    FirstName: { type: String, required: [true, 'First name is required'], trim: true },
    LastName: { type: String, required: [true, 'Last name is required'], trim: true },
    GradeLevel: { type: String, default: '', trim: true },
    Notes: { type: String, default: '', trim: true }
  },
  withTimestamps('Students')
);

module.exports = mongoose.model('Student', studentSchema);
