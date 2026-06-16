import React from 'react'
import { usePermission } from '../context/usePermission'

/**
 * Guard component that renders its children only if the authenticated user
 * possesses the required permission.
 *
 * Usage:
 *   <PermissionGuard permission="employee:create">
 *     <button>Add Employee</button>
 *   </PermissionGuard>
 */
export default function PermissionGuard({ permission, children, fallback = null }) {
  const { hasPermission } = usePermission()
  return hasPermission(permission) ? <>{children}</> : fallback
}
