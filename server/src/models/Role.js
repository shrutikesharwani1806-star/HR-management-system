const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },           // e.g. 'team_lead', 'recruiter'
  displayName: { type: String, required: true },     // e.g. 'Team Lead', 'Recruiter'
  description: String,

  // Explicit permissions: module:action format
  // Examples: 'employee:create', 'leave:approve', 'attendance:read', 'report:view'
  permissions: [{ type: String }],

  // Inherit all permissions from another role
  inherits: { type: String, default: null },         // e.g. 'employee' — inherits all employee perms

  // System roles cannot be deleted or renamed
  isSystem: { type: Boolean, default: false },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
