const Employee = require('../models/Employee');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { uploadMulterFile } = require('../services/storage.service');

exports.create = async (req, res) => {
  const tenantId = req.tenantId;
  let employeeId = req.body.employeeId;
  
  if (employeeId) {
    const existing = await Employee.findOne({ tenantId, employeeId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Employee ID already exists within this company.' });
    }
  } else {
    const count = await Employee.countDocuments({ tenantId });
    let generatedId = `EMP${String(count + 1).padStart(4, '0')}`;
    let checkId = await Employee.findOne({ tenantId, employeeId: generatedId });
    let suffix = 1;
    while (checkId) {
      generatedId = `EMP${String(count + 1 + suffix).padStart(4, '0')}`;
      checkId = await Employee.findOne({ tenantId, employeeId: generatedId });
      suffix++;
    }
    employeeId = generatedId;
  }

  const employee = await Employee.create({ ...req.body, tenantId, employeeId });
  let activationLink = '';
  let tempPassword = '';

  if (req.body.officialEmail && req.body.createAccount !== false) {
    const crypto = require('crypto');
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    tempPassword = Math.random().toString(36).slice(-8);

    const user = await User.create({ 
      tenantId, 
      email: req.body.officialEmail.toLowerCase(), 
      password: tempPassword, 
      role: req.body.role || 'employee', 
      employeeId: employee._id, 
      isApproved: true,
      isActivated: false,
      activationToken,
      activationExpires
    });
    
    employee.userId = user._id;
    await employee.save();

    const { syncUserRoles } = require('../services/rbac.service');
    await syncUserRoles(tenantId, user._id, req.body.role || 'employee');

    activationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate?token=${activationToken}`;
    
    const { sendEmail } = require('../services/notification.service');
    await sendEmail({
      to: req.body.officialEmail,
      subject: 'Welcome to HRMS - Activate Your Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Welcome to Your New Team!</h2>
          <p>Your HR/Admin has created an employee profile for you at <strong>${tenantId}</strong>.</p>
          <p>To activate your account, set your password, and complete your profile onboarding, click the button below:</p>
          <p style="margin: 24px 0;">
            <a href="${activationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Activate Your Account</a>
          </p>
          <p>Alternatively, you can log in directly at the login screen using this temporary password: <strong>${tempPassword}</strong></p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 11px;">This activation link is valid for 7 days.</p>
        </div>
      `,
      text: `Welcome! Activate your account here: ${activationLink}. (Temporary Password: ${tempPassword})`
    });
  }

  await AuditLog.create({ 
    tenantId, 
    userId: req.user.id, 
    userEmail: req.user.email, 
    module: 'employee', 
    action: 'create', 
    ipAddress: req.ip, 
    metadata: { employeeId: employee.employeeId } 
  });

  res.status(201).json({ 
    success: true, 
    data: { 
      employee, 
      activationLink, 
      tempPassword 
    } 
  });
};

exports.list = async (req, res) => {
  const tenantId = req.tenantId;
  const { page = 1, limit = 20, search, department, designation, location, status, sort = '-createdAt' } = req.query;
  const query = { tenantId };
  if (search) query.$text = { $search: search };
  if (department) query.departmentId = department;
  if (designation) query.designationId = designation;
  if (location) query.locationId = location;
  if (status) query.status = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [employees, total] = await Promise.all([
    Employee.find(query).populate('departmentId', 'name').populate('designationId', 'name').populate('locationId', 'name city').populate('managerId', 'firstName lastName employeeId').populate('userId', 'role').sort(sort).skip(skip).limit(parseInt(limit)).lean(),
    Employee.countDocuments(query),
  ]);
  res.json({ success: true, data: employees, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
};

exports.getOne = async (req, res) => {
  const query = Employee.findOne({ _id: req.params.id, tenantId: req.tenantId });
  const isOwnProfile = req.user.employeeId && req.user.employeeId.toString() === req.params.id;
  const isAuthorizedRole = ['hr_admin', 'super_admin'].includes(req.user.role);

  if (isOwnProfile || isAuthorizedRole) {
    query.select('+bankDetails +pan +aadhaar +pf +esi +uan');
  }

  const emp = await query
    .populate('departmentId', 'name code')
    .populate('designationId', 'name grade')
    .populate('locationId', 'name city state')
    .populate('managerId', 'firstName lastName employeeId photoUrl')
    .populate('shiftId', 'name startTime endTime');

  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.json({ success: true, data: emp });
};

exports.myProfile = async (req, res) => {
  const emp = await Employee.findOne({ userId: req.user.id, tenantId: req.tenantId })
    .select('+bankDetails +pan +aadhaar +pf +esi +uan')
    .populate('departmentId', 'name')
    .populate('designationId', 'name grade')
    .populate('locationId', 'name city')
    .populate('managerId', 'firstName lastName employeeId photoUrl')
    .lean();
    
  if (!emp) return res.status(404).json({ success: false, message: 'Profile not found' });
  
  const tenant = await require('../models/Tenant').findOne({ tenantId: req.tenantId }).select('companyName logoUrl').lean();

  res.json({ success: true, data: emp, tenant });
};

const Approval = require('../models/Approval');

exports.update = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.tenantId;

  if (req.body.managerId) {
    const circular = await checkCircular(id, req.body.managerId, tenantId);
    if (circular) return res.status(400).json({ success: false, message: 'Circular reporting structure detected' });
  }

  // Find original employee details
  const original = await Employee.findOne({ _id: id, tenantId });
  if (!original) return res.status(404).json({ success: false, message: 'Employee not found' });

  if (req.body.employeeId && req.body.employeeId !== original.employeeId) {
    const existing = await Employee.findOne({ tenantId, employeeId: req.body.employeeId, _id: { $ne: id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Employee ID already exists within this company.' });
    }
  }

  let updatePayload = { ...req.body };
  let sensitiveChangeDetected = false;
  let sensitiveFields = {};

  // Define sensitive fields
  const fieldsToCheck = ['pan', 'aadhaar'];
  fieldsToCheck.forEach(field => {
    if (req.body[field] !== undefined && req.body[field] !== original[field]) {
      sensitiveChangeDetected = true;
      sensitiveFields[field] = req.body[field];
      delete updatePayload[field]; // Do not update yet
    }
  });

  if (req.body.bankDetails) {
    const origBank = original.bankDetails || {};
    const newBank = req.body.bankDetails || {};
    if (
      (newBank.bankName && newBank.bankName !== origBank.bankName) ||
      (newBank.accountNumber && newBank.accountNumber !== origBank.accountNumber) ||
      (newBank.ifscCode && newBank.ifscCode !== origBank.ifscCode)
    ) {
      sensitiveChangeDetected = true;
      sensitiveFields.bankDetails = newBank;
      delete updatePayload.bankDetails; // Do not update yet
    }
  }

  // Only enforce approval if role is 'employee'
  if (sensitiveChangeDetected && req.user.role === 'employee') {
    const approvalEngine = require('../services/approvalEngine');
    await approvalEngine.submitRequest(tenantId, 'profile_update', id, original._id, {
      pendingFields: sensitiveFields,
      originalFields: {
        pan: original.pan,
        aadhaar: original.aadhaar,
        bankDetails: original.bankDetails
      }
    });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userEmail: req.user.email,
      module: 'employee',
      action: 'profile_update_requested',
      ipAddress: req.ip,
      metadata: { employeeId: original.employeeId, fields: Object.keys(sensitiveFields) },
      isSensitive: true
    });
  }

  // Handle role changes by authorized users
  if (req.body.role && ['hr_admin', 'super_admin'].includes(req.user.role)) {
    const userToUpdate = await User.findOne({ employeeId: id, tenantId });
    if (userToUpdate && userToUpdate.role !== req.body.role) {
      const oldRole = userToUpdate.role;
      userToUpdate.role = req.body.role;
      await userToUpdate.save();

      await AuditLog.create({
        tenantId,
        userId: req.user.id,
        userEmail: req.user.email,
        module: 'role',
        action: 'role_changed',
        ipAddress: req.ip,
        metadata: { employeeId: original.employeeId, oldRole, newRole: req.body.role },
        isSensitive: true
      });
    }
  }

  // Apply the non-sensitive updates
  const emp = await Employee.findOneAndUpdate({ _id: id, tenantId }, updatePayload, { new: true, runValidators: true });
  
  await AuditLog.create({ 
    tenantId, 
    userId: req.user.id, 
    userEmail: req.user.email, 
    module: 'employee', 
    action: 'update', 
    ipAddress: req.ip, 
    metadata: { employeeId: emp.employeeId }, 
    isSensitive: sensitiveChangeDetected 
  });

  res.json({ 
    success: true, 
    data: emp, 
    message: sensitiveChangeDetected && req.user.role === 'employee'
      ? 'Non-sensitive updates applied. Sensitive changes (PAN, Aadhaar, Bank Details) require approval.' 
      : 'Employee updated successfully.' 
  });
};

exports.uploadPhoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const { key, url } = await uploadMulterFile(req.file, 'profiles', req.tenantId);
  const emp = await Employee.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { photoUrl: url }, { new: true });
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.json({ success: true, data: { photoUrl: url, signedUrl: url } });
};

exports.uploadDocument = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const { key, url } = await uploadMulterFile(req.file, 'documents', req.tenantId);
  const emp = await Employee.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $push: { documents: { type: req.body.docType || 'general', name: req.body.docName || req.file.originalname, url: key, uploadedAt: new Date() } } }, { new: true });
  res.json({ success: true, data: { key, signedUrl: url } });
};

exports.orgChart = async (req, res) => {
  const employees = await Employee.find({ tenantId: req.tenantId, status: 'active' }).select('firstName lastName employeeId photoUrl designationId managerId').populate('designationId', 'name').lean();
  const map = {};
  employees.forEach((e) => { map[e._id.toString()] = { ...e, children: [] }; });
  const roots = [];
  employees.forEach((e) => {
    if (e.managerId && map[e.managerId.toString()]) map[e.managerId.toString()].children.push(map[e._id.toString()]);
    else roots.push(map[e._id.toString()]);
  });
  res.json({ success: true, data: roots });
};

exports.terminate = async (req, res) => {
  const emp = await Employee.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { status: 'terminated', exitDate: req.body.exitDate || new Date(), 'metadata.terminationReason': req.body.reason }, { new: true });
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
  await AuditLog.create({ tenantId: req.tenantId, userId: req.user.id, userEmail: req.user.email, module: 'employee', action: 'terminate', ipAddress: req.ip, metadata: { employeeId: emp.employeeId, reason: req.body.reason }, isSensitive: true });
  res.json({ success: true, data: emp });
};

exports.initiateTransfer = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const { departmentId, designationId, locationId, managerId, transferDate, reason } = req.body;

  const emp = await Employee.findOne({ _id: id, tenantId });
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

  const approvalEngine = require('../services/approvalEngine');
  const approval = await approvalEngine.submitRequest(tenantId, 'transfer', id, emp._id, {
    departmentId,
    designationId,
    locationId,
    managerId,
    transferDate,
    reason
  });

  await AuditLog.create({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    module: 'employee',
    action: 'transfer_initiated',
    ipAddress: req.ip,
    metadata: { employeeId: emp.employeeId, transferId: approval._id }
  });

  res.status(201).json({ success: true, message: 'Transfer initiated and sent for approval.', data: approval });
};

async function checkCircular(empId, managerId, tenantId) {
  if (empId.toString() === managerId.toString()) return true;
  let current = managerId;
  const visited = new Set();
  while (current) {
    if (visited.has(current.toString())) return true;
    visited.add(current.toString());
    const mgr = await Employee.findOne({ _id: current, tenantId }).select('managerId').lean();
    if (!mgr?.managerId) break;
    if (mgr.managerId.toString() === empId.toString()) return true;
    current = mgr.managerId;
  }
  return false;
}

exports.getActivity = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.tenantId;

  const emp = await Employee.findOne({ _id: id, tenantId });
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

  const query = {
    tenantId,
    $or: [
      { 'metadata.employeeId': emp.employeeId },
      { userId: emp.userId }
    ]
  };

  const logs = await AuditLog.find(query).sort('-createdAt').limit(20).lean();
  res.json({ success: true, data: logs });
};
