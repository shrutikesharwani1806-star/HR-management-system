const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['contract', 'id_proof', 'payslip', 'experience_letter', 'other'], 
    default: 'other' 
  },
  fileUrl: { type: String, required: true },
  fileSize: Number, // in bytes
  mimeType: String,
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
