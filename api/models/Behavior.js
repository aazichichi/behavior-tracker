const mongoose = require('mongoose');

const BehaviorSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g., "Hand Flapping"
  code: { type: String, required: true },       // e.g., "HF"
  color: { type: String, default: '#FF0000' },   // UI color indicator
  type: { type: String, enum: ['frequency', 'duration', 'interval'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Behavior', BehaviorSchema);
