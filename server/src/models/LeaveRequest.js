const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  totalDays: { type: Number, default: 1 },
  dayType: { type: String, enum: ['full_day', 'half_day_first', 'half_day_second'], default: 'full_day' },
  reason: { type: String, required: true },
  attachmentUrl: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'withdrawn'],
    default: 'pending',
    index: true,
  },
  approvalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Approval' },
  approvedBy: String,
  approvedAt: Date,
  rejectedBy: String,
  rejectedAt: Date,
  rejectionReason: String,
  cancelledAt: Date,
}, { timestamps: true });

leaveRequestSchema.index({ tenantId: 1, employeeId: 1, status: 1 });
leaveRequestSchema.index({ tenantId: 1, employeeId: 1, fromDate: 1, toDate: 1 });
module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
