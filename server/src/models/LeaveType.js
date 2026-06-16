const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: String,
  description: String,
  category: {
    type: String,
    enum: ['casual', 'sick', 'earned', 'privileged', 'comp_off', 'maternity', 'paternity', 'loss_of_pay', 'bereavement', 'custom'],
    default: 'custom',
  },
  isPaid: { type: Boolean, default: true },
  requiresApproval: { type: Boolean, default: true },
  requiresMedicalCertificate: { type: Boolean, default: false },
  maxConsecutiveDays: { type: Number, default: 0 },
  noticePeriodDays: { type: Number, default: 0 },
  isCarryForward: { type: Boolean, default: false },
  maxCarryForwardDays: { type: Number, default: 0 },
  isEncashable: { type: Boolean, default: false },
  isAccrued: { type: Boolean, default: false },
  accrualFrequency: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  accrualAmount: { type: Number, default: 0 },
  applicableGenders: [String],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

leaveTypeSchema.index({ tenantId: 1, code: 1 });
module.exports = mongoose.model('LeaveType', leaveTypeSchema);
