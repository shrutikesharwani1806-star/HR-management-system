const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['fixed', 'flexible', 'rotational'], default: 'fixed' },
  startTime: String, // HH:mm
  endTime: String,   // HH:mm
  gracePeriodMinutes: { type: Number, default: 0 },
  halfDayMinutes: { type: Number, default: 240 },
  fullDayMinutes: { type: Number, default: 480 },
  lateMarkAfterMinutes: { type: Number, default: 30 },
  halfDayThresholdMinutes: { type: Number, default: 240 },
  overtimeEnabled: { type: Boolean, default: false },
  overtimeAfterMinutes: { type: Number, default: 0 },
  workDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0=Sun
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

shiftSchema.index({ tenantId: 1, name: 1 });
module.exports = mongoose.model('Shift', shiftSchema);
