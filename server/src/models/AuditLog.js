const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  userEmail: String,
  module: { type: String, required: true, index: true },
  action: { type: String, required: true },
  ipAddress: String,
  userAgent: String,
  metadata: Object,
  isSensitive: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ tenantId: 1, module: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

// Immutable — prevent all mutations
auditLogSchema.pre('findOneAndUpdate', function () { throw new Error('Audit logs are immutable'); });
auditLogSchema.pre('updateOne', function () { throw new Error('Audit logs are immutable'); });
auditLogSchema.pre('updateMany', function () { throw new Error('Audit logs are immutable'); });
auditLogSchema.pre('deleteOne', function () { throw new Error('Audit logs are immutable'); });
auditLogSchema.pre('deleteMany', function () { throw new Error('Audit logs are immutable'); });

module.exports = mongoose.model('AuditLog', auditLogSchema);
