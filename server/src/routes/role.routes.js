const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const User = require('../models/User');
const UserRole = require('../models/UserRole');
const AuditLog = require('../models/AuditLog');
const { protect, authorize, invalidateRoleCache } = require('../middleware/auth.middleware');
const { syncRolePermissions, syncUserRoles, resolveUserPermissions } = require('../services/rbac.service');

router.use(protect);

// Helper for audit logging
async function logAudit(tenantId, reqUser, action, metadata) {
  await AuditLog.create({
    tenantId,
    userId: reqUser.id,
    userEmail: reqUser.email,
    module: 'role',
    action,
    metadata,
    ipAddress: ''
  });
}

// ─── List All Roles (including system defaults) ──────────────────────────
router.get('/', async (req, res) => {
  const tenantId = req.tenantId;

  // Fetch custom roles from DB
  const customRoles = await Role.find({ tenantId, isActive: true }).sort('name').lean();

  // Build system roles that don't have a DB override
  const customNames = new Set(customRoles.map(r => r.name));
  const SYSTEM_ROLE_PERMISSIONS = {
    employee: ['employee:view', 'attendance:create', 'attendance:view', 'leave:create', 'leave:view', 'performance:view'],
    manager: ['employee:view', 'attendance:create', 'attendance:view', 'attendance:approve', 'leave:create', 'leave:view', 'leave:approve', 'leave:reject', 'performance:view', 'performance:update', 'report:view'],
    leadership: ['employee:view', 'attendance:view', 'leave:view', 'payroll:view', 'report:view', 'report:export', 'settings:view', 'role:create', 'role:update', 'role:delete'],
    hr_admin: ['*'],
    super_admin: ['*']
  };

  const systemRoles = Object.entries(SYSTEM_ROLE_PERMISSIONS)
    .filter(([name]) => !customNames.has(name))
    .map(([name, perms]) => ({
      name,
      displayName: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      permissions: perms,
      isSystem: true,
      isActive: true,
      inherits: null,
      description: `Built-in ${name} role`,
    }));

  res.json({
    success: true,
    data: [...systemRoles, ...customRoles],
  });
});

// ─── Get Single Role ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
  res.json({ success: true, data: role });
});

// ─── Create Custom Role ──────────────────────────────────────────────────
router.post('/', authorize('hr_admin', 'leadership', 'super_admin'), async (req, res) => {
  const { name, displayName, description, permissions, inherits } = req.body;

  if (!name || !displayName) {
    return res.status(400).json({ success: false, message: 'name and displayName are required' });
  }

  // Validate name format: lowercase with underscores
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return res.status(400).json({
      success: false,
      message: 'Role name must be lowercase alphanumeric with underscores (e.g. team_lead)',
    });
  }

  // Validate permissions format: module:action
  if (permissions && permissions.length > 0) {
    const invalid = permissions.filter(p => !/^[a-z_]+:[a-z_]+$/.test(p) && p !== '*');
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid permission format: ${invalid.join(', ')}. Use module:action format (e.g. employee:create)`,
      });
    }
  }

  // Prevent creating duplicates of system role names
  const systemNames = ['employee', 'manager', 'hr_admin', 'leadership', 'super_admin'];
  if (systemNames.includes(name)) {
    return res.status(409).json({
      success: false,
      message: `Cannot create a custom role with system name '${name}'. Use a different name.`,
    });
  }

  const existing = await Role.findOne({ tenantId: req.tenantId, name });
  if (existing) {
    return res.status(409).json({ success: false, message: 'A role with this name already exists' });
  }

  const role = await Role.create({
    tenantId: req.tenantId,
    name,
    displayName,
    description,
    permissions: permissions || [],
    inherits: inherits || null,
    isSystem: false,
  });

  // Sync role permissions in RolePermissions collection
  await syncRolePermissions(role._id, role.permissions);

  // Audit Log: Role Created
  await logAudit(req.tenantId, req.user, 'Role Created', {
    roleId: role._id,
    name: role.name,
    displayName: role.displayName,
    permissions: role.permissions
  });

  // Log permissions added individually if any
  if (permissions && permissions.length > 0) {
    for (const p of permissions) {
      await logAudit(req.tenantId, req.user, 'Permission Added', {
        roleId: role._id,
        roleName: role.name,
        permission: p
      });
    }
  }

  invalidateRoleCache(req.tenantId, name);
  res.status(201).json({ success: true, data: role });
});

// ─── Clone Role ──────────────────────────────────────────────────────────
router.post('/clone/:id', authorize('hr_admin', 'leadership', 'super_admin'), async (req, res) => {
  const { name, displayName, description } = req.body;
  const tenantId = req.tenantId;

  if (!name || !displayName) {
    return res.status(400).json({ success: false, message: 'name and displayName are required' });
  }

  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return res.status(400).json({ success: false, message: 'Role name must be lowercase alphanumeric with underscores' });
  }

  const systemNames = ['employee', 'manager', 'hr_admin', 'leadership', 'super_admin'];
  if (systemNames.includes(name)) {
    return res.status(409).json({ success: false, message: `Cannot use system role name '${name}'` });
  }

  const existing = await Role.findOne({ tenantId, name });
  if (existing) {
    return res.status(409).json({ success: false, message: 'A role with this name already exists' });
  }

  const roleToClone = await Role.findOne({ _id: req.params.id, tenantId });
  if (!roleToClone) {
    return res.status(404).json({ success: false, message: 'Role to clone not found' });
  }

  const clonedRole = await Role.create({
    tenantId,
    name,
    displayName,
    description: description || `Clone of ${roleToClone.displayName}`,
    permissions: roleToClone.permissions,
    inherits: roleToClone.inherits,
    isSystem: false,
    isActive: true
  });

  await syncRolePermissions(clonedRole._id, clonedRole.permissions);

  await logAudit(tenantId, req.user, 'Role Created', {
    roleId: clonedRole._id,
    name: clonedRole.name,
    clonedFrom: roleToClone.name,
    permissions: clonedRole.permissions
  });

  res.status(201).json({ success: true, data: clonedRole });
});

// ─── Update Role ─────────────────────────────────────────────────────────
router.put('/:id', authorize('hr_admin', 'leadership', 'super_admin'), async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

  if (role.isSystem) {
    return res.status(403).json({ success: false, message: 'System roles cannot be modified' });
  }

  if (req.body.permissions) {
    const invalid = req.body.permissions.filter(p => !/^[a-z_]+:[a-z_]+$/.test(p) && p !== '*');
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid permission format: ${invalid.join(', ')}. Use module:action format.`,
      });
    }
  }

  const oldValue = {
    displayName: role.displayName,
    description: role.description,
    permissions: [...(role.permissions || [])],
    inherits: role.inherits,
    isActive: role.isActive
  };

  const allowedUpdates = ['displayName', 'description', 'permissions', 'inherits', 'isActive'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) role[field] = req.body[field];
  });

  await role.save();

  // Track Permission Added/Removed
  if (req.body.permissions) {
    const oldPermSet = new Set(oldValue.permissions);
    const newPermSet = new Set(role.permissions);

    const added = role.permissions.filter(p => !oldPermSet.has(p));
    const removed = oldValue.permissions.filter(p => !newPermSet.has(p));

    for (const p of added) {
      await logAudit(req.tenantId, req.user, 'Permission Added', {
        roleId: role._id,
        roleName: role.name,
        permission: p
      });
    }

    for (const p of removed) {
      await logAudit(req.tenantId, req.user, 'Permission Removed', {
        roleId: role._id,
        roleName: role.name,
        permission: p
      });
    }
  }

  // Sync RolePermissions
  await syncRolePermissions(role._id, role.permissions);

  // Log Role Updated
  await logAudit(req.tenantId, req.user, 'Role Updated', {
    roleId: role._id,
    name: role.name,
    oldValue,
    newValue: {
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions,
      inherits: role.inherits,
      isActive: role.isActive
    }
  });

  invalidateRoleCache(req.tenantId, role.name);
  res.json({ success: true, data: role });
});

// ─── Delete Role ─────────────────────────────────────────────────────────
router.delete('/:id', authorize('hr_admin', 'leadership', 'super_admin'), async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

  if (role.isSystem) {
    return res.status(403).json({ success: false, message: 'System roles cannot be deleted' });
  }

  // Check if any users still have this role
  const usersWithRole = await User.countDocuments({ tenantId: req.tenantId, role: role.name });
  const userRolesWithRole = await UserRole.countDocuments({ tenantId: req.tenantId, roleId: role._id });
  if (usersWithRole > 0 || userRolesWithRole > 0) {
    return res.status(409).json({
      success: false,
      message: `Cannot delete: user(s) still have this role. Reassign them first.`,
    });
  }

  await Role.findByIdAndDelete(role._id);

  // Clean mappings
  await RolePermission.deleteMany({ roleId: role._id });

  // Log Role Deleted
  await logAudit(req.tenantId, req.user, 'Role Deleted', {
    name: role.name,
    displayName: role.displayName
  });

  invalidateRoleCache(req.tenantId, role.name);
  res.json({ success: true, message: 'Role deleted successfully' });
});

// ─── Get All Available Permissions ───────────────────────────────────────
router.get('/meta/permissions', async (req, res) => {
  const permissions = {
    employee: {
      label: 'Employee Management',
      actions: [
        { key: 'employee:create', label: 'Create employees' },
        { key: 'employee:update', label: 'Update employee records' },
        { key: 'employee:view', label: 'View employee profile' },
        { key: 'employee:delete', label: 'Delete/terminate employees' },
      ],
    },
    attendance: {
      label: 'Attendance',
      actions: [
        { key: 'attendance:create', label: 'Punch attendance' },
        { key: 'attendance:view', label: 'View attendance records' },
        { key: 'attendance:update', label: 'Update/correct attendance' },
        { key: 'attendance:approve', label: 'Approve attendance requests' },
      ],
    },
    leave: {
      label: 'Leave Management',
      actions: [
        { key: 'leave:create', label: 'Apply for leave' },
        { key: 'leave:view', label: 'View leave requests' },
        { key: 'leave:update', label: 'Update leave configurations' },
        { key: 'leave:approve', label: 'Approve leave request' },
        { key: 'leave:reject', label: 'Reject leave request' },
      ],
    },
    payroll: {
      label: 'Payroll',
      actions: [
        { key: 'payroll:view', label: 'View payroll/payslips' },
        { key: 'payroll:generate', label: 'Generate payroll' },
        { key: 'payroll:approve', label: 'Approve payroll' },
      ],
    },
    report: {
      label: 'Reports',
      actions: [
        { key: 'report:view', label: 'View reports' },
        { key: 'report:export', label: 'Export reports' },
      ],
    },
    recruitment: {
      label: 'Recruitment',
      actions: [
        { key: 'recruitment:create', label: 'Create job postings' },
        { key: 'recruitment:update', label: 'Update job postings' },
        { key: 'recruitment:view', label: 'View job applications' },
      ],
    },
    performance: {
      label: 'Performance',
      actions: [
        { key: 'performance:view', label: 'View performance reviews' },
        { key: 'performance:update', label: 'Update performance scores' },
      ],
    },
    settings: {
      label: 'Settings',
      actions: [
        { key: 'settings:view', label: 'View settings' },
        { key: 'settings:update', label: 'Update company settings' },
      ],
    },
    role: {
      label: 'Role Management',
      actions: [
        { key: 'role:create', label: 'Create new roles' },
        { key: 'role:update', label: 'Edit/update roles' },
        { key: 'role:delete', label: 'Delete custom roles' },
      ],
    },
  };

  res.json({ success: true, data: permissions });
});

// ─── Get User Role History ──────────────────────────────────────────────
router.get('/history/:userId', authorize('hr_admin', 'leadership', 'super_admin'), async (req, res) => {
  const tenantId = req.tenantId;
  const { userId } = req.params;

  const logs = await AuditLog.find({
    tenantId,
    action: { $in: ['User Role Assigned', 'User Role Removed'] },
    'metadata.targetUserId': userId
  }).sort('-createdAt').lean();

  res.json({ success: true, data: logs });
});

// ─── Assign Role to User ────────────────────────────────────────────────
router.put('/assign/:userId', authorize('hr_admin', 'leadership', 'super_admin'), async (req, res) => {
  const { role: newRole, roles: newRoles, permissions: extraPermissions } = req.body;
  const tenantId = req.tenantId;

  const targetRoles = newRoles || (newRole ? [newRole] : []);
  if (targetRoles.length === 0) {
    return res.status(400).json({ success: false, message: 'role or roles is required' });
  }

  // Verify roles exist (system or custom)
  const systemRoles = ['employee', 'manager', 'hr_admin', 'leadership', 'super_admin'];
  for (const r of targetRoles) {
    if (!systemRoles.includes(r)) {
      const customRole = await Role.findOne({ tenantId, name: r, isActive: true });
      if (!customRole) {
        return res.status(404).json({ success: false, message: `Role '${r}' does not exist` });
      }
    }
  }

  const user = await User.findOne({ _id: req.params.userId, tenantId }).populate('employeeId');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Get current roles
  const existingUserRoles = await UserRole.find({ tenantId, userId: user._id }).populate('roleId');
  const oldRoles = existingUserRoles.map(ur => ur.roleId?.name).filter(Boolean);
  if (oldRoles.length === 0 && user.role) {
    oldRoles.push(user.role);
  }

  // Update primary role in User
  user.role = targetRoles[0];
  if (extraPermissions) user.permissions = extraPermissions;
  await user.save();

  // Sync in UserRole mapping collection
  await syncUserRoles(tenantId, user._id, targetRoles);

  // Compare old and new roles for audit logging
  const oldRoleSet = new Set(oldRoles);
  const newRoleSet = new Set(targetRoles);

  const assigned = targetRoles.filter(r => !oldRoleSet.has(r));
  const removed = oldRoles.filter(r => !newRoleSet.has(r));

  for (const r of assigned) {
    await logAudit(tenantId, req.user, 'User Role Assigned', {
      targetUserId: user._id,
      targetUserEmail: user.email,
      role: r,
      oldValue: oldRoles,
      newValue: targetRoles
    });
  }

  for (const r of removed) {
    await logAudit(tenantId, req.user, 'User Role Removed', {
      targetUserId: user._id,
      targetUserEmail: user.email,
      role: r,
      oldValue: oldRoles,
      newValue: targetRoles
    });
  }

  res.json({
    success: true,
    message: `Roles updated successfully`,
    data: { userId: user._id, role: user.role, roles: targetRoles, permissions: user.permissions },
  });
});

module.exports = router;
