const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const { v4: uuidv4 } = require('uuid');
const { protect, authorize } = require('../middleware/auth.middleware');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { syncUserRoles } = require('../services/rbac.service');


const User = require('../models/User');
const Employee = require('../models/Employee');

// Helper to generate tokens
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

// Register new tenant (public)
router.post('/register', async (req, res) => {
  const { 
    companyName, 
    domain, 
    contactEmail, 
    contactPhone, 
    industry, 
    companySize,
    address,
    logoUrl,
    leadershipName,
    leadershipEmail,
    password, 
    firstName, 
    lastName 
  } = req.body;
  
  if (!companyName || !contactEmail || !password) {
    return res.status(400).json({ success: false, message: 'Company name, company email, and password are all required.' });
  }

  // 1. Resolve domain and leadership name
  const cleanedDomain = (domain || contactEmail.split('@')[1] || companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com').trim().toLowerCase();
  
  let fName = firstName || 'Leadership';
  let lName = lastName || 'User';
  if (leadershipName) {
    const parts = leadershipName.trim().split(/\s+/);
    fName = parts[0];
    if (parts.length > 1) {
      lName = parts.slice(1).join(' ');
    }
  }

  const resolvedLeadershipEmail = (leadershipEmail || contactEmail).trim().toLowerCase();

  // 2. Check if companyName is already taken (case-insensitive, regex-safe)
  const escapedName = companyName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const duplicateName = await Tenant.findOne({ companyName: { $regex: `^${escapedName}$`, $options: 'i' } });
  if (duplicateName) {
    return res.status(409).json({ 
      success: false, 
      message: `Company name "${companyName.trim()}" is already registered. Please use a unique company name.` 
    });
  }

  // 3. Check if domain or contactEmail is already registered
  const existingTenant = await Tenant.findOne({ $or: [{ domain: cleanedDomain }, { contactEmail: contactEmail.trim().toLowerCase() }] });
  if (existingTenant) {
    return res.status(409).json({ success: false, message: 'Domain or contact email is already registered with another company.' });
  }

  // 4. Generate a unique, human-readable Company ID (tenantId)
  const slugifiedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const tenantId = `${slugifiedName}_${randomSuffix}`;

  // 5. Create Tenant
  const tenant = await Tenant.create({ 
    tenantId, 
    companyName, 
    domain: cleanedDomain, 
    contactEmail, 
    contactPhone, 
    industry,
    companySize,
    address,
    logoUrl,
    status: 'active'
  });

  // 6. Create first Employee (Leadership)
  const employee = await Employee.create({
    tenantId,
    employeeId: 'EMP0001',
    firstName: fName,
    lastName: lName,
    officialEmail: resolvedLeadershipEmail,
    phone: contactPhone,
    joiningDate: new Date(),
    status: 'active',
    employmentType: 'permanent'
  });

  // 7. Create first User (Leadership, Auto-approved & pre-activated)
  const user = await User.create({
    tenantId,
    email: resolvedLeadershipEmail,
    password,
    role: 'leadership',
    isApproved: true,
    isActivated: true,
    acceptedPolicies: true,
    hasCompletedOnboarding: true,
    employeeId: employee._id
  });

  // Link user back to employee
  await Employee.findByIdAndUpdate(employee._id, { userId: user._id });

  // Sync roles in UserRole mapping collection for the Leadership user
  await syncUserRoles(tenantId, user._id, 'leadership');

  // Generate tokens for automatic/instant login of the Leadership user
  const tokens = generateTokens(user);
  const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshTokenHash: refreshHash });

  res.status(201).json({ 
    success: true, 
    message: 'Tenant onboarding completed successfully',
    data: { 
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      },
      tenantId: tenant.tenantId, 
      companyName: tenant.companyName, 
      domain: tenant.domain,
      adminEmail: user.email 
    } 
  });
});

// Get tenant by domain (public)
router.get('/by-domain/:domain', async (req, res) => {
  const tenant = await Tenant.findOne({ domain: req.params.domain }).select('tenantId companyName logoUrl ssoConfig');
  if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
  res.json({ success: true, data: tenant });
});

// Update tenant settings (admin only)
router.put('/settings', protect, authorize('leadership', 'hr_admin', 'super_admin'), async (req, res) => {
  const tenant = await Tenant.findOneAndUpdate({ tenantId: req.tenantId }, req.body, { new: true });
  res.json({ success: true, data: tenant });
});

module.exports = router;
