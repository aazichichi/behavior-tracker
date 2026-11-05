const mongoose = require('mongoose');
const { withTimestamps } = require('./schemaOptions');

// a student that a teacher/parent is tracking. each student belongs to exactly one user (userId)
const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true },
    gradeLevel: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true }
  },
  withTimestamps('students')
);

module.exports = mongoose.model('Student', studentSchema);
