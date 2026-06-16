const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  basicSalary: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'paid'], default: 'paid' },
  fileUrl: { type: String }, // optional S3 / uploaded document url
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: String
}, { timestamps: true });

module.exports = mongoose.model('Payslip', payslipSchema);
