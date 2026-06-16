const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['national', 'optional', 'restricted'], default: 'national' },
  description: String,
  applicableLocations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

holidaySchema.index({ tenantId: 1, date: 1 });
module.exports = mongoose.model('Holiday', holidaySchema);
