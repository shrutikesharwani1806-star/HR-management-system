const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: String,
  description: String,
  grade: String,
  band: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

designationSchema.index({ tenantId: 1, name: 1 });
module.exports = mongoose.model('Designation', designationSchema);
