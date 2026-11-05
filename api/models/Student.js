const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, required: true, unique: true },
  assignedBehaviors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Behavior' }]
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
