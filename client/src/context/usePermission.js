import { useAuth } from './AuthContext'

// ─── System Role Permissions (mirrors backend SYSTEM_ROLE_PERMISSIONS) ────
// These are used client-side for instant UI decisions (no API call needed).
// The backend is the source of truth — these just drive UI visibility.
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
  hr_admin: ['*'],
  super_admin: ['*'],
}

/**
 * Hook to check user permissions for UI rendering.
 *
 * Usage:
 *   const { hasPermission, hasRole, isAdmin } = usePermission()
 *
 *   // Check module:action permission
 *   if (hasPermission('employee:create')) { ... }
 *
 *   // Check role
 *   if (hasRole('manager', 'hr_admin')) { ... }
 *
 *   // Admin shortcut
 *   if (isAdmin) { ... }
 */
export function usePermission() {
  const { user } = useAuth()

  const role = user?.role || ''
  const userPermissions = user?.permissions || []

  // Resolve permissions from system defaults
  const rolePerms = SYSTEM_ROLE_PERMISSIONS[role] || []
  const isWildcard = rolePerms.includes('*')
  const allPerms = new Set([...rolePerms, ...userPermissions])

  /**
   * Check if the user has a specific permission (module:action).
   * Returns true for hr_admin/super_admin (wildcard).
   */
  const hasPermission = (...permissions) => {
    if (isWildcard) return true
    return permissions.every(p => allPerms.has(p))
  }

  /**
   * Check if the user has ANY of the specified permissions.
   */
  const hasAnyPermission = (...permissions) => {
    if (isWildcard) return true
    return permissions.some(p => allPerms.has(p))
  }

  /**
   * Check if the user's role is one of the given roles.
   */
  const hasRole = (...roles) => {
    return roles.includes(role)
  }

  /**
   * True if user is hr_admin or super_admin.
   */
  const isAdmin = hasRole('hr_admin', 'super_admin')

  /**
   * True if user is manager, hr_admin, or super_admin.
   */
  const isManagerOrAbove = hasRole('manager', 'hr_admin', 'super_admin')

  return {
    role,
    hasPermission,
    hasAnyPermission,
    hasRole,
    isAdmin,
    isManagerOrAbove,
    permissions: [...allPerms],
  }
}
