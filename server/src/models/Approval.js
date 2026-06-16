const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  entityType: { type: String, required: true }, // leave_request | attendance_regularization | transfer
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'escalated'],
    default: 'pending',
    index: true,
  },
  currentLevel: { type: Number, default: 1 },
  totalLevels: { type: Number, default: 1 },
  stages: [{
    level: Number,
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    approverRole: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'skipped', 'delegated'],
      default: 'pending',
    },
    action: String,
    comment: String,
    actionAt: Date,
    slaDeadline: Date,
    isEscalated: { type: Boolean, default: false },
    delegatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  }],
  slaHours: Number,
  slaDeadline: Date,
  completedAt: Date,
  metadata: Object,
}, { timestamps: true });

approvalSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });
approvalSchema.index({ tenantId: 1, status: 1 });
approvalSchema.index({ tenantId: 1, 'stages.approverId': 1, status: 1 });
module.exports = mongoose.model('Approval', approvalSchema);
