const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  year: { type: Number, required: true },
  allocated: { type: Number, default: 0 },
  accrued: { type: Number, default: 0 },
  carried: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  encashed: { type: Number, default: 0 },
  lapsed: { type: Number, default: 0 },
}, { timestamps: true });

leaveBalanceSchema.virtual('available').get(function () {
  return Math.max(0, this.allocated + this.accrued + this.carried - this.used - this.pending - this.encashed);
});

leaveBalanceSchema.index({ tenantId: 1, employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });
module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
