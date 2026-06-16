const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },

  punches: [{
    time: Date,
    type: { type: String, enum: ['in', 'out'] },
    source: { type: String, enum: ['web', 'mobile', 'biometric', 'regularization'], default: 'web' },
    latitude: Number,
    longitude: Number,
    ipAddress: String,
    isValid: { type: Boolean, default: true },
  }],

  firstIn: Date,
  lastOut: Date,
  workedMinutes: { type: Number, default: 0 },
  overtimeMinutes: { type: Number, default: 0 },
  lateByMinutes: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'weekend'],
    default: 'absent',
    index: true,
  },

  isRegularized: { type: Boolean, default: false },
  regularizationReason: String,
  regularizationStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
  regularizationApprovalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Approval' },

  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
  remarks: String,
}, { timestamps: true });

attendanceRecordSchema.index({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceRecordSchema.index({ tenantId: 1, date: 1, status: 1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
