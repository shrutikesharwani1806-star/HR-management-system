const mongoose = require('mongoose');

const exportJobSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportType: { 
    type: String, 
    enum: ['headcount', 'attendance', 'leave', 'overtime', 'late_arrivals', 'absence', 'attrition'], 
    required: true 
  },
  format: { type: String, enum: ['csv', 'xlsx', 'pdf'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  fileUrl: String,
  error: String,
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('ExportJob', exportJobSchema);
