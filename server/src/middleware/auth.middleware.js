const jwt = require('jsonwebtoken');
const Role = require('../models/Role');
const { resolveUserPermissions } = require('../services/rbac.service');

// ─── Default System Permissions per Role ──────────────────────────────────
// These are baseline (fallback) permissions used when no Role document exists
// in the database for the user's role. Once a tenant creates custom Role docs,
// permissions are resolved dynamically from the database.
const SYSTEM_ROLE_PERMISSIONS = {
  employee: [
    'employee:view',
    'attendance:create',
    'attendance:view',
    'leave:create',
    'leave:view',
    'performance:view',
    'profile:read', 'profile:update', 'leave:apply', 'leave:read', 'leave:cancel', 'attendance:punch', 'attendance:read', 'attendance:regularize'
  ],
  manager: [
    'employee:view',
    'attendance:create',
    'attendance:view',
    'attendance:approve',
    'leave:create',
    'leave:view',
    'leave:approve',
    'leave:reject',
    'performance:view',
    'performance:update',
    'report:view',
    'profile:read', 'profile:update', 'leave:apply', 'leave:read', 'leave:cancel', 'attendance:punch', 'attendance:read', 'attendance:regularize', 'team:read', 'report:read'
  ],
  leadership: [
    'employee:view',
    'attendance:view',
    'leave:view',
    'payroll:view',
    'report:view',
    'report:export',
    'settings:view',
    'role:create',
    'role:update',
    'role:delete',
    'profile:read', 'profile:update', 'leave:read', 'attendance:read', 'report:read', 'team:read', 'organization:read', 'organization:update', 'user:manage', 'user:create', 'user:toggle', 'user:reset_password'
  ],
  hr_admin: ['*'],   // wildcard — all permissions
  super_admin: ['*'],
};

// Keep backward compat export name
const ROLE_PERMISSIONS = SYSTEM_ROLE_PERMISSIONS;

// ─── Role Permission Cache (per tenant+role, 5 min TTL) ──────────────────
const rolePermCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(tenantId, roleName) {
  return `${tenantId}::${roleName}`;
}

/**
 * Resolve the full set of permissions for a role, including inherited permissions.
 * Looks up the Role document from the database first; falls back to SYSTEM_ROLE_PERMISSIONS.
 */
async function resolvePermissions(tenantId, roleName) {
  const key = cacheKey(tenantId, roleName);
  const cached = rolePermCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.perms;
  }

  let perms = new Set();

  // Try to load from the database
  const roleDoc = await Role.findOne({ tenantId, name: roleName, isActive: true }).lean();

  if (roleDoc) {
    // Add explicit permissions from the Role document
    (roleDoc.permissions || []).forEach(p => perms.add(p));

    // Resolve inherited permissions (one level deep to prevent cycles)
    if (roleDoc.inherits) {
      const parentPerms = await resolvePermissions(tenantId, roleDoc.inherits);
      parentPerms.forEach(p => perms.add(p));
    }
  } else {
    // Fall back to system defaults
    const systemPerms = SYSTEM_ROLE_PERMISSIONS[roleName] || [];
    systemPerms.forEach(p => perms.add(p));
  }

  const permArray = [...perms];
  rolePermCache.set(key, { perms: permArray, ts: Date.now() });
  return permArray;
}

/**
 * Invalidate cached permissions for a specific tenant+role (call on role update).
 */
function invalidateRoleCache(tenantId, roleName) {
  if (roleName) {
    rolePermCache.delete(cacheKey(tenantId, roleName));
  } else {
    // Invalidate all for tenant
    for (const key of rolePermCache.keys()) {
      if (key.startsWith(`${tenantId}::`)) rolePermCache.delete(key);
    }
  }
}

// ─── Protect Middleware ───────────────────────────────────────────────────
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('No token provided. Authorization denied.');
    error.statusCode = 401;
    return next(error);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // SECURITY: Every authenticated token MUST carry a tenantId
    if (!decoded.tenantId) {
      const error = new Error('Invalid token: missing tenant context.');
      error.statusCode = 401;
      return next(error);
    }

    req.user = decoded;
    // SECURITY: tenantId comes ONLY from the JWT — never from headers or body
    req.tenantId = decoded.tenantId;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Authorize by Role Name ──────────────────────────────────────────────
// Checks if the user's role is one of the allowed roles.
// Works for both system roles AND custom roles.
const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
      const resolved = await resolveUserPermissions(req.tenantId, req.user.id, req.user.role, req.user.permissions);
      const userRoles = resolved.roles;

      if (userRoles.includes('super_admin')) return next();

      const hasRole = userRoles.some(r => roles.includes(r));
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied'
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

// ─── Require Permission (module:action) ──────────────────────────────────
// Dynamically resolves permissions from the Role model + system defaults.
// Supports custom roles with inheritance.
const requirePermission = (...permissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
      // Resolve permissions from DB for the user's role assignments (UserRole)
      const resolved = await resolveUserPermissions(req.tenantId, req.user.id, req.user.role, req.user.permissions);

      // Wildcard check (hr_admin / super_admin / custom roles with '*')
      if (resolved.permissions.includes('*')) return next();

      const hasAll = permissions.every(p => resolved.permissions.includes(p));
      if (!hasAll) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied'
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

// ─── Check if user has a specific permission (for use in controllers) ────
async function userHasPermission(tenantId, role, userPermissions, permission, userId) {
  if (userId) {
    const resolved = await resolveUserPermissions(tenantId, userId, role, userPermissions);
    if (resolved.permissions.includes('*')) return true;
    return resolved.permissions.includes(permission);
  }
  const rolePerms = await resolvePermissions(tenantId, role);
  if (rolePerms.includes('*')) return true;
  const allPerms = new Set([...rolePerms, ...(userPermissions || [])]);
  return allPerms.has(permission);
}

module.exports = {
  protect,
  authorize,
  requirePermission,
  resolvePermissions,
  invalidateRoleCache,
  userHasPermission,
  ROLE_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
};

