const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: String,
  address: String,
  city: String,
  state: String,
  country: String,
  pincode: String,
  timezone: String,
  latitude: Number,
  longitude: Number,
  geofenceRadius: { type: Number, default: 100 },
  allowedIps: [String],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

locationSchema.index({ tenantId: 1, name: 1 });
module.exports = mongoose.model('Location', locationSchema);
