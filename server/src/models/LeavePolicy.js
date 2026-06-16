const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  accrualRate: { type: Number, default: 1.25 }, // days per month
  maxAccumulation: { type: Number, default: 30 },
  carryForwardLimit: { type: Number, default: 10 },
  encashable: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

leavePolicySchema.index({ tenantId: 1, leaveTypeId: 1 });
module.exports = mongoose.model('LeavePolicy', leavePolicySchema);
