const Permission = require('../models/Permission');
const Role = require('../models/Role');
const RolePermission = require('../models/RolePermission');
const UserRole = require('../models/UserRole');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

const ALL_PERMISSIONS = [
  // Employee
  { name: 'employee:create', module: 'employee', action: 'create' },
  { name: 'employee:update', module: 'employee', action: 'update' },
  { name: 'employee:view', module: 'employee', action: 'view' },
  { name: 'employee:read', module: 'employee', action: 'read' },
  { name: 'employee:delete', module: 'employee', action: 'delete' },

  // Attendance
  { name: 'attendance:create', module: 'attendance', action: 'create' },
  { name: 'attendance:view', module: 'attendance', action: 'view' },
  { name: 'attendance:read', module: 'attendance', action: 'read' },
  { name: 'attendance:update', module: 'attendance', action: 'update' },
  { name: 'attendance:approve', module: 'attendance', action: 'approve' },
  { name: 'attendance:punch', module: 'attendance', action: 'punch' },
  { name: 'attendance:regularize', module: 'attendance', action: 'regularize' },

  // Leave
  { name: 'leave:create', module: 'leave', action: 'create' },
  { name: 'leave:view', module: 'leave', action: 'view' },
  { name: 'leave:read', module: 'leave', action: 'read' },
  { name: 'leave:update', module: 'leave', action: 'update' },
  { name: 'leave:apply', module: 'leave', action: 'apply' },
  { name: 'leave:cancel', module: 'leave', action: 'cancel' },
  { name: 'leave:approve', module: 'leave', action: 'approve' },
  { name: 'leave:reject', module: 'leave', action: 'reject' },

  // Payroll
  { name: 'payroll:view', module: 'payroll', action: 'view' },
  { name: 'payroll:generate', module: 'payroll', action: 'generate' },
  { name: 'payroll:approve', module: 'payroll', action: 'approve' },

  // Report
  { name: 'report:view', module: 'report', action: 'view' },
  { name: 'report:read', module: 'report', action: 'read' },
  { name: 'report:export', module: 'report', action: 'export' },

  // Recruitment
  { name: 'recruitment:create', module: 'recruitment', action: 'create' },
  { name: 'recruitment:update', module: 'recruitment', action: 'update' },
  { name: 'recruitment:view', module: 'recruitment', action: 'view' },

  // Performance
  { name: 'performance:view', module: 'performance', action: 'view' },
  { name: 'performance:update', module: 'performance', action: 'update' },

  // Settings
  { name: 'settings:view', module: 'settings', action: 'view' },
  { name: 'settings:update', module: 'settings', action: 'update' },

  // Role
  { name: 'role:create', module: 'role', action: 'create' },
  { name: 'role:update', module: 'role', action: 'update' },
  { name: 'role:delete', module: 'role', action: 'delete' },
  { name: 'role:view', module: 'role', action: 'view' },
  { name: 'role:read', module: 'role', action: 'read' },
  { name: 'role:manage', module: 'role', action: 'manage' },
];

/**
 * Seed all static permissions in the database.
 */
async function seedPermissions() {
  try {
    for (const p of ALL_PERMISSIONS) {
      await Permission.findOneAndUpdate(
        { name: p.name },
        p,
        { upsert: true, new: true }
      );
    }
    logger.info('✅ System permissions seeded/updated successfully');
  } catch (error) {
    logger.error('❌ Failed to seed permissions: ' + error.message);
  }
}

/**
 * Sync RolePermissions collection for a given role based on its permissions array.
 */
async function syncRolePermissions(roleId, permissionsArray) {
  try {
    // 1. Delete all existing mappings for this role
    await RolePermission.deleteMany({ roleId });

    // If role has wildcard permission, we can store a specific record or map it
    if (permissionsArray.includes('*')) {
      // Create wildcard mapping or map to all permissions
      const allPermDocs = await Permission.find({});
      const mappings = allPermDocs.map(p => ({
        roleId,
        permissionId: p._id
      }));
      await RolePermission.insertMany(mappings);
      return;
    }

    // 2. Fetch permission IDs for the provided names
    const matchedPerms = await Permission.find({ name: { $in: permissionsArray } });
    
    // 3. Insert new mappings
    if (matchedPerms.length > 0) {
      const mappings = matchedPerms.map(p => ({
        roleId,
        permissionId: p._id
      }));
      await RolePermission.insertMany(mappings);
    }
  } catch (error) {
    logger.error(`❌ Error syncing role permissions for role ${roleId}: ${error.message}`);
  }
}

/**
 * Sync UserRoles collection for a given user.
 * Supports assigning multiple roles.
 */
async function syncUserRoles(tenantId, userId, roleNames) {
  try {
    // 1. Delete existing user roles
    await UserRole.deleteMany({ userId });

    const rolesList = Array.isArray(roleNames) ? roleNames : [roleNames];

    // Find Roles in the DB (both custom and system defaults if they exist in DB)
    const dbRoles = await Role.find({ tenantId, name: { $in: rolesList } });

    // If some system roles don't exist in DB yet, create them dynamically
    const dbRoleNames = new Set(dbRoles.map(r => r.name));
    const missingRoles = rolesList.filter(name => !dbRoleNames.has(name));

    const SYSTEM_ROLES_META = {
      employee: { displayName: 'Employee', desc: 'Built-in Employee role', permissions: ['employee:view', 'attendance:create', 'attendance:view', 'leave:create', 'leave:view', 'performance:view', 'profile:read', 'profile:update', 'leave:apply', 'leave:read', 'leave:cancel', 'attendance:punch', 'attendance:read', 'attendance:regularize'] },
      manager: { displayName: 'Manager', desc: 'Built-in Manager role', permissions: ['employee:view', 'attendance:create', 'attendance:view', 'attendance:approve', 'leave:create', 'leave:view', 'leave:approve', 'leave:reject', 'performance:view', 'performance:update', 'report:view', 'profile:read', 'profile:update', 'leave:apply', 'leave:read', 'leave:cancel', 'attendance:punch', 'attendance:read', 'attendance:regularize', 'team:read', 'report:read'] },
      leadership: { displayName: 'Leadership', desc: 'Built-in Leadership role', permissions: ['employee:view', 'employee:create', 'employee:update', 'attendance:view', 'leave:view', 'payroll:view', 'report:view', 'report:export', 'settings:view', 'settings:update', 'role:create', 'role:update', 'role:delete', 'profile:read', 'profile:update', 'leave:read', 'attendance:read', 'report:read', 'team:read', 'organization:read', 'organization:update', 'user:manage', 'user:create', 'user:toggle', 'user:reset_password'] },
      hr_admin: { displayName: 'HR Admin', desc: 'Built-in HR Admin role', permissions: ['*'] },
      super_admin: { displayName: 'Super Admin', desc: 'Built-in Super Admin role', permissions: ['*'] }
    };

    for (const missingName of missingRoles) {
      const meta = SYSTEM_ROLES_META[missingName] || { displayName: missingName.toUpperCase(), desc: 'Custom role', permissions: [] };
      const newRole = await Role.create({
        tenantId,
        name: missingName,
        displayName: meta.displayName,
        description: meta.desc,
        permissions: meta.permissions,
        isSystem: ['employee', 'manager', 'leadership', 'hr_admin', 'super_admin'].includes(missingName),
        isActive: true
      });
      dbRoles.push(newRole);
      // Sync permissions for this new role
      await syncRolePermissions(newRole._id, meta.permissions);
    }

    // 2. Insert new UserRole mappings
    const mappings = dbRoles.map(r => ({
      tenantId,
      userId,
      roleId: r._id
    }));

    if (mappings.length > 0) {
      await UserRole.insertMany(mappings);
    }
  } catch (error) {
    logger.error(`❌ Error syncing user roles for user ${userId}: ${error.message}`);
  }
}

/**
 * Resolve all permission keys for a given user dynamically.
 */
async function resolveUserPermissions(tenantId, userId, userRoleField, userExplicitPermissions = []) {
  try {
    // 1. Fetch user roles from UserRoles collection
    const userRoles = await UserRole.find({ tenantId, userId }).populate('roleId');
    
    let rolePermissions = new Set();
    const assignedRoles = [];

    if (userRoles.length > 0) {
      for (const ur of userRoles) {
        if (ur.roleId && ur.roleId.isActive) {
          assignedRoles.push(ur.roleId.name);
          (ur.roleId.permissions || []).forEach(p => rolePermissions.add(p));
        }
      }
    } else {
      // Fallback to primary role in User model if UserRoles is empty
      assignedRoles.push(userRoleField);
      const dbRole = await Role.findOne({ tenantId, name: userRoleField, isActive: true });
      if (dbRole) {
        (dbRole.permissions || []).forEach(p => rolePermissions.add(p));
      } else {
        // Fallback to system static permissions
        const SYSTEM_ROLE_PERMISSIONS = {
          employee: ['employee:view', 'attendance:create', 'attendance:view', 'leave:create', 'leave:view', 'performance:view', 'profile:read', 'profile:update', 'leave:apply', 'leave:read', 'leave:cancel', 'attendance:punch', 'attendance:read', 'attendance:regularize'],
          manager: ['employee:view', 'attendance:create', 'attendance:view', 'attendance:approve', 'leave:create', 'leave:view', 'leave:approve', 'leave:reject', 'performance:view', 'performance:update', 'report:view', 'profile:read', 'profile:update', 'leave:apply', 'leave:read', 'leave:cancel', 'attendance:punch', 'attendance:read', 'attendance:regularize', 'team:read', 'report:read'],
          leadership: ['employee:view', 'employee:create', 'employee:update', 'attendance:view', 'leave:view', 'payroll:view', 'report:view', 'report:export', 'settings:view', 'settings:update', 'role:create', 'role:update', 'role:delete', 'profile:read', 'profile:update', 'leave:read', 'attendance:read', 'report:read', 'team:read', 'organization:read', 'organization:update', 'user:manage', 'user:create', 'user:toggle', 'user:reset_password'],
          hr_admin: ['*'],
          super_admin: ['*']
        };
        const systemPerms = SYSTEM_ROLE_PERMISSIONS[userRoleField] || [];
        systemPerms.forEach(p => rolePermissions.add(p));
      }
    }

    // Combine role permissions + user-level explicit override permissions
    if (assignedRoles.includes('leadership')) {
      rolePermissions.add('settings:update');
      rolePermissions.add('employee:create');
      rolePermissions.add('employee:update');
    }
    const allPerms = new Set([...rolePermissions, ...userExplicitPermissions]);
    return {
      roles: assignedRoles,
      permissions: [...allPerms]
    };
  } catch (error) {
    logger.error(`❌ Error resolving permissions for user ${userId}: ${error.message}`);
    return { roles: [userRoleField], permissions: [] };
  }
}

module.exports = {
  seedPermissions,
  syncRolePermissions,
  syncUserRoles,
  resolveUserPermissions,
  ALL_PERMISSIONS
};
