const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true },
  companyName: { type: String, required: true, unique: true },
  domain: { type: String, required: true, unique: true },
  logoUrl: String,
  industry: String,
  companySize: String,
  status: { type: String, enum: ['active', 'suspended', 'trial', 'cancelled'], default: 'trial' },
  plan: { type: String, enum: ['standard', 'professional', 'enterprise'], default: 'standard' },
  passwordPolicy: {
    minLength: { type: Number, default: 8 },
    requireUppercase: { type: Boolean, default: true },
    requireNumbers: { type: Boolean, default: true },
    requireSymbols: { type: Boolean, default: false },
    expiryDays: { type: Number, default: 90 },
  },
  ssoConfig: {
    googleEnabled: { type: Boolean, default: false },
    microsoftEnabled: { type: Boolean, default: false },
    samlEnabled: { type: Boolean, default: false },
    samlMetadataUrl: String,
  },
  mfaRequired: { type: Boolean, default: false },
  maxFailedAttempts: { type: Number, default: 5 },
  lockoutDurationMinutes: { type: Number, default: 15 },
  timezone: { type: String, default: 'Asia/Kolkata' },
  currency: { type: String, default: 'INR' },
  contactEmail: String,
  contactPhone: String,
  address: Object,
  settings: { type: Object, default: {} },
  trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  subscriptionEndsAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);
