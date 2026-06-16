const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
