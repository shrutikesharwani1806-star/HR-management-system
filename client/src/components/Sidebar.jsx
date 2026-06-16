import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePermission } from '../context/usePermission'

// Navigation items with required permissions
// If `requiredPermission` is set, the item is only shown if the user has that permission.
// If `requiredRole` is set, the item is only shown for those roles.
// If neither is set, the item is always visible.
const NAV = [
  { group: 'Main Workspace', items: [
    { to: '/dashboard', icon: '🌸', label: 'Dashboard' },
    { to: '/profile',   icon: '👤', label: 'My Profile' },
  ]},
  { group: 'Workforce', items: [
    { to: '/employees',   icon: '🧸', label: 'Employees',   requiredPermission: 'employee:view' },
    { to: '/attendance',  icon: '⏰', label: 'Attendance' },
    { to: '/leave',       icon: '📅', label: 'Leave' },
    { to: '/payslips',    icon: '💵', label: 'Payslips',    requiredPermission: 'payroll:view' },
    { to: '/approvals',   icon: '💖', label: 'Approvals',   requiredPermission: 'leave:approve' },
  ]},
  { group: 'Company Settings', items: [
    { to: '/user-management', icon: '👑', label: 'User Management', requiredPermission: 'user:manage' },
    { to: '/roles',           icon: '🔑', label: 'Role Management', requiredPermission: 'role:create' },
    { to: '/organization',    icon: '🏢', label: 'Organization',    requiredPermission: 'settings:view' },
    { to: '/reports',         icon: '🎀', label: 'Reports',         requiredPermission: 'report:view' },
  ]},
]

export default function Sidebar({ isOpen, toggleSidebar }) {
  const { user, logout } = useAuth()
  const { hasPermission, hasRole, isAdmin } = usePermission()
  const navigate = useNavigate()

  const handleLogout = async () => { 
    await logout()
    navigate('/login') 
  }
  const initials = user?.employee 
    ? ((user.employee.firstName?.[0] || '') + (user.employee.lastName?.[0] || '')).toUpperCase() 
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : '🐰')

  const filteredNav = NAV.map(group => {
    const filteredItems = group.items.filter(item => {
      // Check permission-based visibility
      if (item.requiredPermission) {
        return hasPermission(item.requiredPermission)
      }
      // Check role-based visibility
      if (item.requiredRole) {
        return hasRole(...item.requiredRole)
      }
      return true
    })
    return { ...group, items: filteredItems }
  }).filter(group => group.items.length > 0)

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/10 z-40 lg:hidden backdrop-blur-xs transition-opacity" 
          onClick={toggleSidebar}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-64 bg-stone-50/95 border-r border-rose-100/60 flex flex-col z-50 shadow-md shadow-rose-100/20 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-rose-100/40 overflow-hidden">
          <div className="flex items-center gap-3">
            {user?.tenant?.logoUrl ? (
              <img src={user.tenant.logoUrl} alt="Company Logo" className="w-9 h-9 rounded-xl object-contain shadow-xs border border-rose-200/50 bg-white" />
            ) : (
              <div className="w-9 h-9 bg-rose-100/80 rounded-xl flex items-center justify-center text-rose-700 font-bold text-sm shadow-xs border border-rose-200/50 uppercase">
                {user?.tenant?.companyName ? user.tenant.companyName[0] : 'H'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-stone-700 font-bold text-sm leading-tight tracking-wide truncate max-w-[130px]" title={user?.tenant?.companyName || 'HRMS SaaS'}>
                {user?.tenant?.companyName || 'HRMS SaaS'}
              </div>
              <div 
                className="text-rose-700/60 text-[10px] font-semibold truncate flex items-center gap-1 group cursor-copy" 
                title="Click to copy Company ID" 
                onClick={() => {
                  if(user?.tenant?.tenantId){
                    navigator.clipboard.writeText(user.tenant.tenantId); 
                    alert('Company ID Copied: ' + user.tenant.tenantId)
                  }
                }}
              >
                ID: {user?.tenant?.tenantId} 
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">📋</span>
              </div>
            </div>
          </div>
          <button className="lg:hidden text-rose-350 hover:text-rose-500 flex-shrink-0" onClick={toggleSidebar}>
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {filteredNav.map(({ group, items }) => (
            <div key={group} className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-700/60 px-3 mb-2">{group}</span>
              {items.map(({ to, icon, label }) => (
                <NavLink 
                  key={to} 
                  to={to} 
                  onClick={() => { if (window.innerWidth < 1024) toggleSidebar() }}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${isActive ? 'bg-rose-100/80 text-rose-800 font-bold shadow-xs border border-rose-200/60' : 'text-stone-500 hover:bg-rose-50/40 hover:text-rose-700'}`}
                >
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-rose-100/60 bg-rose-50/20 flex items-center gap-3">
          {user?.employee?.photoUrl ? (
            <img 
              src={user.employee.photoUrl} 
              alt="Profile" 
              className="w-9 h-9 rounded-full border border-white shadow-sm object-cover flex-shrink-0"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          {(!user?.employee?.photoUrl) ? (
            <div className="w-9 h-9 rounded-full bg-rose-200/70 border border-white shadow-xs flex items-center justify-center text-rose-700 text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          ) : (
            <div style={{ display: 'none' }} className="w-9 h-9 rounded-full bg-rose-200/70 border border-white shadow-xs flex items-center justify-center text-rose-700 text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div className="text-xs font-bold text-stone-700 truncate">
              {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : (user?.email || 'User')}
            </div>
            <div className="text-[10px] text-rose-600/70 font-semibold capitalize truncate">{(user?.role || '').replace('_', ' ')}</div>
          </div>
          <button className="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50/50 transition-all" onClick={handleLogout} title="Logout">
            🐾
          </button>
        </div>
      </aside>
    </>
  )
}
