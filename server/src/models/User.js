const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  role: {
    type: String,
    default: 'employee',
    // System roles: employee, manager, hr_admin, leadership, super_admin
    // Custom roles are also supported (e.g. 'team_lead', 'recruiter')
  },
  permissions: [{ type: String }],
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

  // Account security
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
  isLocked: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  activationToken: { type: String, select: false },
  activationExpires: Date,
  isActivated: { type: Boolean, default: false },
  acceptedPolicies: { type: Boolean, default: false },
  hasCompletedOnboarding: { type: Boolean, default: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  phoneOtp: { type: String, select: false },
  phoneOtpExpires: { type: Date, select: false },
  refreshTokenHash: { type: String, select: false },

  // SSO
  googleId: String,
  microsoftId: String,

  // MFA
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, select: false },

  lastLoginAt: Date,
  lastLoginIp: String,
}, { timestamps: true });

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, role: 1 });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
