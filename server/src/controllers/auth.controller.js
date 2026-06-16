const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Role = require('../models/Role');
const Tenant = require('../models/Tenant');
const AuditLog = require('../models/AuditLog');
const { sendEmail } = require('../services/notification.service');
const { syncUserRoles } = require('../services/rbac.service');

// ─── Register first admin / employee ─────────────────────────────────────
exports.register = async (req, res) => {
  const { tenantId, email, password, firstName, lastName, phone, role } = req.body;

  const tenant = await Tenant.findOne({ tenantId });
  if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

  const existing = await User.findOne({ tenantId, email: email.toLowerCase() });
  if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

  const userCount = await User.countDocuments({ tenantId });
  const isFirstUser = userCount === 0;

  // All roles are auto-approved for an easier login flow based on user request
  const finalRole = isFirstUser ? 'leadership' : (role || 'employee');
  const isApproved = true;

  const Employee = require('../models/Employee');
  const empCount = await Employee.countDocuments({ tenantId });
  const employeeId = `EMP${String(empCount + 1).padStart(4, '0')}`;

  const employee = await Employee.create({
    tenantId,
    employeeId,
    firstName: firstName || 'New',
    lastName: lastName || 'User',
    officialEmail: email.toLowerCase(),
    phone,
    joiningDate: new Date(),
    status: isApproved ? 'active' : 'probation'
  });

  const user = await User.create({
    tenantId,
    email: email.toLowerCase(),
    password,
    role: finalRole,
    employeeId: employee._id,
    isApproved
  });

  employee.userId = user._id;
  await employee.save();

  await syncUserRoles(tenantId, user._id, finalRole);

  res.status(201).json({
    success: true,
    message: isApproved 
      ? 'Registration successful and approved.' 
      : 'Registration submitted successfully. Pending HR Admin approval.',
    data: { id: user._id, email: user.email, role: user.role, isApproved },
  });
};

// ─── Login ────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { tenantId, email, password, expectedRole } = req.body;

  const tenant = await Tenant.findOne({ tenantId });
  if (!tenant || tenant.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'Tenant not found or suspended' });
  }

  const user = await User.findOne({ tenantId, email: email.toLowerCase() })
    .select('+password +refreshTokenHash +failedLoginAttempts +isLocked +lockedUntil');

  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Auto-approvals enabled: No pending approval checks here.
  // Enforce secure role-tab matching
  if (expectedRole) {
    if (expectedRole === 'hr_admin' && user.role !== 'hr_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access Denied: Account does not have HR Admin privileges.' });
    }
    if (expectedRole === 'manager' && user.role !== 'manager') {
      return res.status(403).json({ success: false, message: 'Access Denied: Account does not have Manager privileges.' });
    }
    if (expectedRole === 'employee' && user.role !== 'employee') {
      return res.status(403).json({ success: false, message: 'Access Denied: Account does not have Employee privileges.' });
    }
  }

  // Lockout check
  if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(403).json({
      success: false,
      message: `Account locked until ${user.lockedUntil.toISOString()}`,
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const maxAttempts = tenant.maxFailedAttempts || 5;
    const lockMinutes = tenant.lockoutDurationMinutes || 15;
    const update = { failedLoginAttempts: attempts };
    if (attempts >= maxAttempts) {
      update.isLocked = true;
      update.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
    }
    await User.findByIdAndUpdate(user._id, update);
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Reset failed attempts
  await User.findByIdAndUpdate(user._id, {
    failedLoginAttempts: 0,
    isLocked: false,
    lockedUntil: null,
    lastLoginAt: new Date(),
    lastLoginIp: req.ip,
  });

  if (user.mfaEnabled) {
    const mfaToken = jwt.sign({ userId: user._id, type: 'mfa_pending' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    return res.json({
      success: true,
      mfaRequired: true,
      mfaToken,
      message: 'MFA verification required.'
    });
  }

  const tokens = generateTokens(user);

  // Store hashed refresh token
  const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash });

  // Audit log
  await AuditLog.create({
    tenantId,
    userId: user._id.toString(),
    userEmail: user.email,
    module: 'auth',
    action: 'login',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ 
    success: true, 
    data: { 
      ...tokens, 
      user: { 
        id: user._id, 
        email: user.email, 
        role: user.role, 
        tenantId,
        isActivated: user.isActivated,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        tenant: {
          companyName: tenant.companyName,
          logoUrl: tenant.logoUrl
        }
      } 
    } 
  });
};

// ─── Refresh Tokens ───────────────────────────────────────────────────────
exports.refresh = async (req, res) => {
  const { userId, refreshToken } = req.body;
  if (!userId || !refreshToken)
    return res.status(400).json({ success: false, message: 'userId and refreshToken required' });

  const user = await User.findById(userId).select('+refreshTokenHash');
  if (!user?.refreshTokenHash)
    return res.status(401).json({ success: false, message: 'Session expired, please login again' });

  const match = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!match) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

  const tokens = generateTokens(user);
  const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash });

  res.json({ success: true, data: tokens });
};

// ─── Logout ───────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { refreshTokenHash: null });
  res.json({ success: true, message: 'Logged out successfully' });
};

// ─── Me ───────────────────────────────────────────────────────────────────
exports.me = async (req, res) => {
  const user = await User.findById(req.user.id).populate('employeeId', 'firstName lastName photoUrl employeeId');
  res.json({ success: true, data: user });
};

// ─── Forgot Password ──────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { tenantId, email } = req.body;
  const user = await User.findOne({ tenantId, email: email.toLowerCase() });
  // Silent — never reveal if email exists
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: token,
      passwordResetExpires: new Date(Date.now() + 3600 * 1000),
    });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'Reset Your HRMS Password',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`,
      text: `Reset URL: ${resetUrl}`,
    });
  }
  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
};

// ─── Reset Password ───────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');
  if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json({ success: true, message: 'Password reset successful' });
};

// ─── Change Password ───────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully' });
};

// ─── Forgot Password OTP (Phone) ──────────────────────────────────────────
exports.forgotPasswordOtp = async (req, res) => {
  const { tenantId, phone } = req.body;
  if (!tenantId || !phone) {
    return res.status(400).json({ success: false, message: 'Tenant ID and phone number are required' });
  }

  const Employee = require('../models/Employee');
  const employee = await Employee.findOne({ tenantId, phone: phone.trim() });
  if (!employee) {
    return res.status(404).json({ success: false, message: 'No employee record found with this phone number' });
  }

  const user = await User.findOne({ tenantId, employeeId: employee._id });
  if (!user) {
    return res.status(404).json({ success: false, message: 'No user account linked to this phone number' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  await User.findByIdAndUpdate(user._id, {
    phoneOtp: otp,
    phoneOtpExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  });

  console.log(`[SMS OTP SIMULATION] Sent OTP "${otp}" to ${phone}`);

  res.json({ 
    success: true, 
    message: 'OTP has been sent to your registered phone number.',
    devOtp: otp // Included for easy copy-pasting in development/testing
  });
};

// ─── Reset Password OTP (Phone) ───────────────────────────────────────────
exports.resetPasswordOtp = async (req, res) => {
  const { tenantId, phone, otp, newPassword } = req.body;
  if (!tenantId || !phone || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const Employee = require('../models/Employee');
  const employee = await Employee.findOne({ tenantId, phone: phone.trim() });
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  const user = await User.findOne({ tenantId, employeeId: employee._id }).select('+phoneOtp +phoneOtpExpires');
  if (!user || !user.phoneOtp) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  if (user.phoneOtp !== otp.trim()) {
    return res.status(400).json({ success: false, message: 'Incorrect OTP code' });
  }

  if (user.phoneOtpExpires < new Date()) {
    return res.status(400).json({ success: false, message: 'OTP has expired' });
  }

  // Update password and clear OTP
  user.password = newPassword;
  user.phoneOtp = undefined;
  user.phoneOtpExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successful! You can now log in.' });
};

// ─── Token Generator ──────────────────────────────────────────────────────
function generateTokens(user) {
  const payload = {
    id: user._id,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
    permissions: user.permissions || [],
    employeeId: user.employeeId,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  return { accessToken, refreshToken };
}

// ─── MFA Verification & Management ───────────────────────────────────────
exports.verifyMfa = async (req, res) => {
  const { mfaToken, code } = req.body;
  if (!mfaToken || !code) {
    return res.status(400).json({ success: false, message: 'mfaToken and code are required' });
  }

  try {
    const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
    if (decoded.type !== 'mfa_pending') {
      return res.status(400).json({ success: false, message: 'Invalid MFA token' });
    }

    const user = await User.findById(decoded.userId).select('+mfaSecret');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Validate code: support '123456' as simulation or custom secret suffix
    const isValid = code === '123456' || (user.mfaSecret && code === user.mfaSecret.slice(-6));
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    const tokens = generateTokens(user);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash });

    await AuditLog.create({
      tenantId: user.tenantId,
      userId: user._id.toString(),
      userEmail: user.email,
      module: 'auth',
      action: 'mfa_login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, data: { ...tokens, user: { id: user._id, email: user.email, role: user.role, tenantId: user.tenantId } } });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'MFA session expired or invalid' });
  }
};

exports.enableMfa = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const mfaSecret = Math.random().toString(36).substring(2, 12).toUpperCase();
  user.mfaEnabled = true;
  user.mfaSecret = mfaSecret;
  await user.save();

  await AuditLog.create({
    tenantId: req.tenantId,
    userId: user._id.toString(),
    userEmail: user.email,
    module: 'auth',
    action: 'mfa_enable',
    ipAddress: req.ip,
  });

  res.json({ success: true, mfaSecret, message: `MFA enabled. Use simulated verification code: ${mfaSecret.slice(-6)}` });
};

exports.disableMfa = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.mfaEnabled = false;
  user.mfaSecret = undefined;
  await user.save();

  await AuditLog.create({
    tenantId: req.tenantId,
    userId: user._id.toString(),
    userEmail: user.email,
    module: 'auth',
    action: 'mfa_disable',
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'MFA disabled successfully.' });
};

// ─── SSO Integrations (Google, Microsoft, SAML) ──────────────────────────
exports.googleSso = async (req, res) => {
  const { tenantId, email, firstName, lastName, googleId } = req.body;
  if (!tenantId || !email) {
    return res.status(400).json({ success: false, message: 'tenantId and email are required' });
  }

  const tenant = await Tenant.findOne({ tenantId });
  if (!tenant || tenant.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'Tenant not found or suspended' });
  }

  let user = await User.findOne({ tenantId, email: email.toLowerCase() });
  if (!user) {
    const Employee = require('../models/Employee');
    const employee = await Employee.create({
      tenantId,
      firstName: firstName || 'Google',
      lastName: lastName || 'User',
      officialEmail: email.toLowerCase(),
      status: 'active',
      joiningDate: new Date()
    });

    user = await User.create({
      tenantId,
      email: email.toLowerCase(),
      role: 'employee',
      employeeId: employee._id,
      googleId: googleId || 'google_sso_simulated_id',
      isActive: true
    });
    await syncUserRoles(tenantId, user._id, 'employee');
  }

  if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(403).json({ success: false, message: `Account locked until ${user.lockedUntil.toISOString()}` });
  }

  await AuditLog.create({
    tenantId,
    userId: user._id.toString(),
    userEmail: user.email,
    module: 'auth',
    action: 'google_sso_login',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  const tokens = generateTokens(user);
  const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash });

  res.json({ success: true, data: { ...tokens, user: { id: user._id, email: user.email, role: user.role, tenantId } } });
};

exports.microsoftSso = async (req, res) => {
  const { tenantId, email, firstName, lastName, microsoftId } = req.body;
  if (!tenantId || !email) {
    return res.status(400).json({ success: false, message: 'tenantId and email are required' });
  }

  const tenant = await Tenant.findOne({ tenantId });
  if (!tenant || tenant.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'Tenant not found or suspended' });
  }

  let user = await User.findOne({ tenantId, email: email.toLowerCase() });
  if (!user) {
    const Employee = require('../models/Employee');
    const employee = await Employee.create({
      tenantId,
      firstName: firstName || 'Microsoft',
      lastName: lastName || 'User',
      officialEmail: email.toLowerCase(),
      status: 'active',
      joiningDate: new Date()
    });

    user = await User.create({
      tenantId,
      email: email.toLowerCase(),
      role: 'employee',
      employeeId: employee._id,
      microsoftId: microsoftId || 'ms_sso_simulated_id',
      isActive: true
    });
    await syncUserRoles(tenantId, user._id, 'employee');
  }

  if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(403).json({ success: false, message: `Account locked until ${user.lockedUntil.toISOString()}` });
  }

  await AuditLog.create({
    tenantId,
    userId: user._id.toString(),
    userEmail: user.email,
    module: 'auth',
    action: 'microsoft_sso_login',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  const tokens = generateTokens(user);
  const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash });

  res.json({ success: true, data: { ...tokens, user: { id: user._id, email: user.email, role: user.role, tenantId } } });
};

exports.samlSso = async (req, res) => {
  const { tenantId, email, firstName, lastName } = req.body;
  if (!tenantId || !email) {
    return res.status(400).json({ success: false, message: 'tenantId and email are required' });
  }

  const tenant = await Tenant.findOne({ tenantId });
  if (!tenant || tenant.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'Tenant not found or suspended' });
  }

  let user = await User.findOne({ tenantId, email: email.toLowerCase() });
  if (!user) {
    const Employee = require('../models/Employee');
    const employee = await Employee.create({
      tenantId,
      firstName: firstName || 'SAML',
      lastName: lastName || 'User',
      officialEmail: email.toLowerCase(),
      status: 'active',
      joiningDate: new Date()
    });

    user = await User.create({
      tenantId,
      email: email.toLowerCase(),
      role: 'employee',
      employeeId: employee._id,
      isActive: true
    });
    await syncUserRoles(tenantId, user._id, 'employee');
  }

  if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(403).json({ success: false, message: `Account locked until ${user.lockedUntil.toISOString()}` });
  }

  await AuditLog.create({
    tenantId,
    userId: user._id.toString(),
    userEmail: user.email,
    module: 'auth',
    action: 'saml_sso_login',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  const tokens = generateTokens(user);
  const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash });

  res.json({ success: true, data: { ...tokens, user: { id: user._id, email: user.email, role: user.role, tenantId } } });
};

// ─── Registration Approvals (HR Admin) ───────────────────────────────────
exports.getPendingApprovals = async (req, res) => {
  const tenantId = req.tenantId;
  const pendingUsers = await User.find({ tenantId, isApproved: false })
    .populate('employeeId')
    .lean();
  res.json({ success: true, data: pendingUsers });
};

exports.approveUser = async (req, res) => {
  const tenantId = req.tenantId;
  const { userId } = req.params;

  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) return res.status(404).json({ success: false, message: 'User request not found' });

  user.isApproved = true;
  await user.save();

  if (user.employeeId) {
    const Employee = require('../models/Employee');
    await Employee.findByIdAndUpdate(user.employeeId, { status: 'active' });
  }

  res.json({ success: true, message: 'User registration approved successfully.' });
};

exports.rejectUser = async (req, res) => {
  const tenantId = req.tenantId;
  const { userId } = req.params;

  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) return res.status(404).json({ success: false, message: 'User request not found' });

  const employeeId = user.employeeId;
  await User.findByIdAndDelete(userId);

  if (employeeId) {
    const Employee = require('../models/Employee');
    await Employee.findByIdAndDelete(employeeId);
  }

  res.json({ success: true, message: 'User registration request rejected and deleted.' });
};

// ─── Create HR Admin (Leadership or HR Admin only) ────────────────────────
exports.createHrAdmin = async (req, res) => {
  const requestorRole = req.user.role;
  if (!['leadership', 'hr_admin', 'super_admin'].includes(requestorRole)) {
    return res.status(403).json({ success: false, message: 'Only Leadership or HR Admin can create HR Admin accounts.' });
  }

  const { email, password, firstName, lastName, phone } = req.body;
  const resolvedTenantId = req.tenantId;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const tenant = await Tenant.findOne({ tenantId: resolvedTenantId });
  if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

  const existing = await User.findOne({ tenantId: resolvedTenantId, email: email.toLowerCase() });
  if (existing) return res.status(409).json({ success: false, message: 'Email already registered in this tenant.' });

  const Employee = require('../models/Employee');
  const empCount = await Employee.countDocuments({ tenantId: resolvedTenantId });
  const employeeId = `EMP${String(empCount + 1).padStart(4, '0')}`;

  const employee = await Employee.create({
    tenantId: resolvedTenantId,
    employeeId,
    firstName: firstName || 'HR',
    lastName: lastName || 'Admin',
    officialEmail: email.toLowerCase(),
    phone: phone || undefined,
    joiningDate: new Date(),
    status: 'active'
  });

  const user = await User.create({
    tenantId: resolvedTenantId,
    email: email.toLowerCase(),
    password,
    role: 'hr_admin',
    employeeId: employee._id,
    isApproved: true  // HR admins are always pre-approved — no pending state
  });

  employee.userId = user._id;
  await employee.save();

  await syncUserRoles(resolvedTenantId, user._id, 'hr_admin');

  await AuditLog.create({
    tenantId: resolvedTenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    module: 'auth',
    action: 'create_hr_admin',
    details: `Created HR Admin account: ${email}`,
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: `HR Admin account created for ${email}. They can log in immediately — no approval needed.`,
    data: { id: user._id, email: user.email, role: 'hr_admin', tenantId: resolvedTenantId }
  });
};

// ─── Create Manager (Leadership or HR Admin only) ─────────────────────────
exports.createManager = async (req, res) => {
  const requestorRole = req.user.role;
  if (!['leadership', 'hr_admin', 'super_admin'].includes(requestorRole)) {
    return res.status(403).json({ success: false, message: 'Only Leadership or HR Admin can create Manager accounts.' });
  }

  const { email, password, firstName, lastName, departmentId, phone } = req.body;
  const resolvedTenantId = req.tenantId;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const tenant = await Tenant.findOne({ tenantId: resolvedTenantId });
  if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

  const existing = await User.findOne({ tenantId: resolvedTenantId, email: email.toLowerCase() });
  if (existing) return res.status(409).json({ success: false, message: 'Email already registered in this tenant.' });

  const Employee = require('../models/Employee');
  const empCount = await Employee.countDocuments({ tenantId: resolvedTenantId });
  const employeeId = `EMP${String(empCount + 1).padStart(4, '0')}`;

  const employee = await Employee.create({
    tenantId: resolvedTenantId,
    employeeId,
    firstName: firstName || 'Manager',
    lastName: lastName || 'User',
    officialEmail: email.toLowerCase(),
    joiningDate: new Date(),
    status: 'active',
    phone: phone || undefined,
    departmentId: departmentId || undefined
  });

  const user = await User.create({
    tenantId: resolvedTenantId,
    email: email.toLowerCase(),
    password,
    role: 'manager',
    employeeId: employee._id,
    isApproved: true
  });

  employee.userId = user._id;
  await employee.save();

  await syncUserRoles(resolvedTenantId, user._id, 'manager');

  await AuditLog.create({
    tenantId: resolvedTenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    module: 'auth',
    action: 'create_manager',
    details: `Created Manager account: ${email}`,
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: `Manager account created for ${email}. They can log in immediately.`,
    data: { id: user._id, email: user.email, role: 'manager', tenantId: resolvedTenantId }
  });
};

// ─── List Users (Leadership, HR Admin) ────────────────────────────────────
exports.listUsers = async (req, res) => {
  const tenantId = req.tenantId;
  const { role, status, page = 1, limit = 50 } = req.query;
  const query = { tenantId };
  if (role) query.role = role;
  if (status === 'active') query.isActive = true;
  if (status === 'inactive') query.isActive = false;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const Employee = require('../models/Employee');

  const [users, total] = await Promise.all([
    User.find(query)
      .select('email role isActive isApproved lastLoginAt createdAt employeeId permissions')
      .populate({
        path: 'employeeId',
        select: 'firstName lastName employeeId photoUrl departmentId designationId phone',
        populate: [
          { path: 'departmentId', select: 'name' },
          { path: 'designationId', select: 'name' },
        ]
      })
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
  });
};

// ─── Toggle User Status (Enable/Disable) ─────────────────────────────────
exports.toggleUserStatus = async (req, res) => {
  const { userId } = req.params;
  const tenantId = req.tenantId;

  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Prevent self-deactivation
  if (user._id.toString() === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
  }

  // Prevent non-leadership from toggling leadership accounts
  if (user.role === 'leadership' && req.user.role !== 'leadership') {
    return res.status(403).json({ success: false, message: 'Only leadership can manage leadership accounts.' });
  }

  user.isActive = !user.isActive;
  await user.save();

  await AuditLog.create({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    module: 'auth',
    action: user.isActive ? 'user_enabled' : 'user_disabled',
    details: `${user.isActive ? 'Enabled' : 'Disabled'} user: ${user.email}`,
    ipAddress: req.ip,
    isSensitive: true,
  });

  res.json({
    success: true,
    message: `User ${user.email} has been ${user.isActive ? 'enabled' : 'disabled'}.`,
    data: { id: user._id, email: user.email, isActive: user.isActive }
  });
};

// ─── Reset User Password (Leadership/HR Admin) ───────────────────────────
exports.resetUserPassword = async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;
  const tenantId = req.tenantId;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.password = newPassword;
  user.failedLoginAttempts = 0;
  user.isLocked = false;
  user.lockedUntil = null;
  await user.save();

  await AuditLog.create({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    module: 'auth',
    action: 'admin_password_reset',
    details: `Password reset for user: ${user.email}`,
    ipAddress: req.ip,
    isSensitive: true,
  });

  res.json({ success: true, message: `Password reset for ${user.email} was successful.` });
};

// ─── Update User Permissions (Leadership only) ───────────────────────────
exports.updateUserPermissions = async (req, res) => {
  const { userId } = req.params;
  const { permissions } = req.body;
  const tenantId = req.tenantId;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ success: false, message: 'permissions must be an array of strings.' });
  }

  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.permissions = permissions;
  await user.save();

  await AuditLog.create({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    module: 'auth',
    action: 'permissions_updated',
    details: `Updated permissions for user: ${user.email}`,
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    message: `Permissions updated for ${user.email}.`,
    data: { id: user._id, email: user.email, permissions: user.permissions }
  });
};

// ─── Activation Verification ───────────────────────────────────────────
exports.verifyActivationToken = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Activation token is required.' });
  }

  const user = await User.findOne({
    activationToken: token,
    activationExpires: { $gt: new Date() }
  }).populate('employeeId');

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired activation link.' });
  }

  res.json({
    success: true,
    data: {
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      employee: user.employeeId
    }
  });
};

// ─── Activation Completion ─────────────────────────────────────────────
exports.completeActivation = async (req, res) => {
  const { token, password, personalEmail, phone, currentAddress, maritalStatus, bloodGroup, gender } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'New password is required.' });
  }

  let user;
  if (token) {
    user = await User.findOne({
      activationToken: token,
      activationExpires: { $gt: new Date() }
    }).select('+password');
  } else if (req.user && req.user.id) {
    user = await User.findById(req.user.id).select('+password');
  }

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired activation link.' });
  }

  // Hash password & set properties
  user.password = password;
  user.isActivated = true;
  user.acceptedPolicies = true;
  user.hasCompletedOnboarding = true;
  user.activationToken = undefined;
  user.activationExpires = undefined;
  await user.save();

  // Update employee profile fields
  if (user.employeeId) {
    const Employee = require('../models/Employee');
    const updateData = { status: 'active' };
    if (personalEmail) updateData.personalEmail = personalEmail;
    if (phone) updateData.phone = phone;
    if (currentAddress) updateData.currentAddress = currentAddress;
    if (maritalStatus) updateData.maritalStatus = maritalStatus;
    if (bloodGroup) updateData.bloodGroup = bloodGroup;
    if (gender) updateData.gender = gender;

    await Employee.findByIdAndUpdate(user.employeeId, updateData);
  }

  // Audit log
  await AuditLog.create({
    tenantId: user.tenantId,
    userId: user._id.toString(),
    userEmail: user.email,
    module: 'auth',
    action: 'account_activated',
    ipAddress: req.ip
  });

  // Generate tokens for automatic login
  const tokens = generateTokens(user);
  const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash });

  res.json({
    success: true,
    message: 'Account activated successfully!',
    data: {
      ...tokens,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        isActivated: true,
        hasCompletedOnboarding: true
      }
    }
  });
};
