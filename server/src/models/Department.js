const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: String,
  description: String,
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  headId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  isActive: { type: Boolean, default: true },
  costCenter: String,
}, { timestamps: true });

departmentSchema.index({ tenantId: 1, name: 1 });
departmentSchema.index({ tenantId: 1, parentId: 1 });
module.exports = mongoose.model('Department', departmentSchema);
