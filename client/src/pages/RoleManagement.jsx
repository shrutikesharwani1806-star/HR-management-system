import React, { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

export default function RoleManagement() {
  const [activeTab, setActiveTab] = useState('roles') // 'roles' | 'assignments'
  const [roles, setRoles] = useState([])
  const [permissionsMeta, setPermissionsMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  
  // Role form states
  const [showRoleModal, setShowRoleModal] = useState(null) // 'create' | 'edit' | 'clone' | null
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleForm, setRoleForm] = useState({
    name: '',
    displayName: '',
    description: '',
    permissions: [],
    inherits: ''
  })

  // User assignments states
  const [users, setUsers] = useState([])
  const [searchUser, setSearchUser] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignForm, setAssignForm] = useState({
    roles: [],
    permissions: ''
  })
  const [userHistory, setUserHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  // Fetch Roles
  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/roles')
      setRoles(res.data.data || [])
    } catch (err) {
      showMsg('Failed to load roles', 'error')
    }
  }, [])

  // Fetch Permissions Metadata
  const fetchPermissionsMeta = useCallback(async () => {
    try {
      const res = await api.get('/roles/meta/permissions')
      setPermissionsMeta(res.data.data || {})
    } catch (err) {
      showMsg('Failed to load permissions metadata', 'error')
    }
  }, [])

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/auth/users')
      setUsers(res.data.data || [])
    } catch (err) {}
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchRoles(), fetchPermissionsMeta(), fetchUsers()])
      setLoading(false)
    }
    init()
  }, [fetchRoles, fetchPermissionsMeta, fetchUsers])

  // Fetch user role assignment history
  const fetchUserHistory = async (userId) => {
    setLoadingHistory(true)
    try {
      const res = await api.get(`/roles/history/${userId}`)
      setUserHistory(res.data.data || [])
    } catch (err) {
      showMsg('Failed to load role history', 'error')
    }
    setLoadingHistory(false)
  }

  const handleCreateOrUpdateRole = async (e) => {
    e.preventDefault()
    try {
      if (showRoleModal === 'create') {
        const res = await api.post('/roles', {
          name: roleForm.name,
          displayName: roleForm.displayName,
          description: roleForm.description,
          permissions: roleForm.permissions,
          inherits: roleForm.inherits || null
        })
        showMsg('Role created successfully!')
      } else if (showRoleModal === 'edit') {
        await api.put(`/roles/${selectedRole._id}`, {
          displayName: roleForm.displayName,
          description: roleForm.description,
          permissions: roleForm.permissions,
          inherits: roleForm.inherits || null
        })
        showMsg('Role updated successfully!')
      } else if (showRoleModal === 'clone') {
        await api.post(`/roles/clone/${selectedRole._id}`, {
          name: roleForm.name,
          displayName: roleForm.displayName,
          description: roleForm.description
        })
        showMsg('Role cloned successfully!')
      }
      setShowRoleModal(null)
      fetchRoles()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Action failed', 'error')
    }
  }

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this custom role? This cannot be undone.')) return
    try {
      await api.delete(`/roles/${roleId}`)
      showMsg('Role deleted successfully!')
      fetchRoles()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to delete role', 'error')
    }
  }

  const handleAssignRoles = async (e) => {
    e.preventDefault()
    try {
      const extraPerms = assignForm.permissions
        ? assignForm.permissions.split(',').map(p => p.trim()).filter(Boolean)
        : []
      const res = await api.put(`/roles/assign/${selectedUser._id}`, {
        roles: assignForm.roles,
        permissions: extraPerms
      })
      showMsg(res.data.message || 'Roles assigned successfully!')
      setShowAssignModal(false)
      fetchUsers()
      if (selectedUser) {
        fetchUserHistory(selectedUser._id)
      }
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to assign roles', 'error')
    }
  }

  const togglePermissionSelection = (permKey) => {
    setRoleForm(prev => {
      const isSelected = prev.permissions.includes(permKey)
      const newPerms = isSelected
        ? prev.permissions.filter(p => p !== permKey)
        : [...prev.permissions, permKey]
      return { ...prev, permissions: newPerms }
    })
  }

  const openRoleCreate = () => {
    setRoleForm({ name: '', displayName: '', description: '', permissions: [], inherits: '' })
    setSelectedRole(null)
    setShowRoleModal('create')
  }

  const openRoleEdit = (role) => {
    setSelectedRole(role)
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
      permissions: role.permissions || [],
      inherits: role.inherits || ''
    })
    setShowRoleModal('edit')
  }

  const openRoleClone = (role) => {
    setSelectedRole(role)
    setRoleForm({
      name: `${role.name}_copy`,
      displayName: `${role.displayName} (Copy)`,
      description: `Copy of ${role.displayName}`,
      permissions: [...(role.permissions || [])],
      inherits: role.inherits || ''
    })
    setShowRoleModal('clone')
  }

  const openAssignModal = (user) => {
    setSelectedUser(user)
    const currentRoles = user.roles || (user.role ? [user.role] : [])
    setAssignForm({
      roles: currentRoles,
      permissions: (user.permissions || []).join(', ')
    })
    setShowAssignModal(true)
    fetchUserHistory(user._id)
  }

  const filteredUsers = users.filter(u => {
    const name = u.employeeId ? `${u.employeeId.firstName} ${u.employeeId.lastName}`.toLowerCase() : u.email.toLowerCase()
    return name.includes(searchUser.toLowerCase()) || u.role.toLowerCase().includes(searchUser.toLowerCase())
  })

  return (
    <Layout title="Role Management">
      {/* Toast Alert */}
      {msg && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-bold animate-fade-in-up ${msg.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {msg.text}
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 mb-6 shadow-xl animate-fade-in-up">
        <h2 className="text-xl font-black flex items-center gap-2">🔑 RBAC Role & Permission Engine</h2>
        <p className="text-sm text-slate-400 mt-1">Manage system and custom roles, map module:action permissions, assign multiple roles to users, and track access audit logs.</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 mb-6 animate-fade-in-up">
        <button onClick={() => setActiveTab('roles')} className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all ${activeTab === 'roles' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          🛡️ Role Definitions
        </button>
        <button onClick={() => setActiveTab('assignments')} className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all ${activeTab === 'assignments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          👥 User Role Assignments
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : activeTab === 'roles' ? (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-extrabold text-slate-800">System & Custom Roles</h3>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map(r => (
              <div key={r.name || r._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-slate-800 text-base">{r.displayName}</h4>
                    {r.isSystem ? (
                      <span className="px-2 py-0.5 text-[9px] bg-slate-100 text-slate-600 font-bold rounded-full uppercase border border-slate-200">System</span>
                    ) : (
                      <span className="px-2 py-0.5 text-[9px] bg-indigo-50 text-indigo-700 font-bold rounded-full uppercase border border-indigo-100">Custom</span>
                    )}
                  </div>
                  <code className="text-xs text-slate-400 font-mono block mb-2">{r.name}</code>
                  <p className="text-xs text-slate-500 mb-4">{r.description || 'No description provided.'}</p>
                  
                  {/* Permissions Preview */}
                  <div className="mb-4">
                    <span className="text-xs font-bold text-slate-600 block mb-1">Permissions:</span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {r.permissions && r.permissions.includes('*') ? (
                        <span className="px-2 py-0.5 text-[10px] bg-rose-50 text-rose-700 font-bold rounded border border-rose-100 font-mono">ALL PERMISSIONS (*)</span>
                      ) : r.permissions && r.permissions.length > 0 ? (
                        r.permissions.map(p => (
                          <span key={p} className="px-1.5 py-0.5 text-[10px] bg-indigo-50 text-indigo-700 rounded font-mono">{p}</span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No permissions assigned</span>
                      )}
                    </div>
                  </div>
                  {r.inherits && (
                    <div className="text-[11px] text-slate-500 mb-2">
                      Inherits from: <span className="font-bold font-mono text-indigo-600">{r.inherits}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-end gap-2">
                  <button onClick={() => openRoleClone(r)} className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-all">
                    Clone
                  </button>
                  {!r.isSystem && (
                    <>
                      <button onClick={() => openRoleEdit(r)} className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-all">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteRole(r._id)} className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-all">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-md font-extrabold text-slate-800">Assign Roles to Users</h3>
            <input
              type="text"
              placeholder="Search users by name or role..."
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none w-full max-w-xs"
            />
          </div>

          {/* User Assignments Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Employee</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Primary Role</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Custom Override Permissions</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const emp = u.employeeId
                  const name = emp ? `${emp.firstName} ${emp.lastName}` : u.email
                  return (
                    <tr key={u._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <div className="font-bold text-slate-800">{name}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] rounded-full uppercase font-bold">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.permissions && u.permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.permissions.map(p => (
                              <span key={p} className="px-1.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] rounded font-mono border border-rose-100">{p}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">None</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => openAssignModal(u)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                          Assign & History
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Management Modal (Create, Edit, Clone) */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowRoleModal(null)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleCreateOrUpdateRole} className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-fade-in-up my-8">
            <h3 className="text-lg font-black text-slate-800 mb-4 capitalize">
              🛡️ {showRoleModal} Role
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-600 block mb-1">Role Unique Name</label>
                  <input
                    placeholder="e.g. branch_manager"
                    required
                    disabled={showRoleModal === 'edit'}
                    value={roleForm.name}
                    onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Lowercase alphanumeric & underscores only.</span>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 block mb-1">Display Name</label>
                  <input
                    placeholder="e.g. Branch Manager"
                    required
                    value={roleForm.displayName}
                    onChange={e => setRoleForm({ ...roleForm, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 block mb-1">Description</label>
                <textarea
                  placeholder="Describe the permissions or responsibilities of this role..."
                  rows={2}
                  value={roleForm.description}
                  onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {showRoleModal !== 'clone' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold text-slate-600 block mb-1">Inherits Permissions From</label>
                      <select
                        value={roleForm.inherits}
                        onChange={e => setRoleForm({ ...roleForm, inherits: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                      >
                        <option value="">None</option>
                        {roles
                          .filter(r => r.name !== roleForm.name)
                          .map(r => (
                            <option key={r.name} value={r.name}>{r.displayName} ({r.name})</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Permissions Matrix */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 block mb-3">Map Permissions</label>
                    <div className="space-y-4 max-h-60 overflow-y-auto border border-slate-150 rounded-xl p-4 bg-slate-50/50">
                      {Object.entries(permissionsMeta).map(([modKey, modInfo]) => (
                        <div key={modKey} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                          <h4 className="text-xs font-extrabold text-slate-700 mb-2 capitalize">{modInfo.label}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {modInfo.actions?.map(act => {
                              const isChecked = roleForm.permissions.includes(act.key)
                              return (
                                <label key={act.key} className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900 select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermissionSelection(act.key)}
                                    className="mt-0.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                  />
                                  <span>{act.label} <code className="text-[10px] text-slate-400 block font-mono">{act.key}</code></span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6 border-t border-slate-100 pt-4">
              <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all text-sm shadow-md">
                {showRoleModal === 'create' ? 'Create Role' : showRoleModal === 'edit' ? 'Save Changes' : 'Clone Role'}
              </button>
              <button type="button" onClick={() => setShowRoleModal(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign & History Modal */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowAssignModal(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl animate-fade-in-up my-8">
            <h3 className="text-lg font-black text-slate-800 mb-4">
              🛡️ Manage Roles: {selectedUser.employeeId ? `${selectedUser.employeeId.firstName} ${selectedUser.employeeId.lastName}` : selectedUser.email}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assignment Form */}
              <form onSubmit={handleAssignRoles} className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-700">Assign Roles</h4>
                
                <div>
                  <label className="text-xs font-extrabold text-slate-600 block mb-2">Select Roles</label>
                  <div className="space-y-2 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                    {roles.map(r => {
                      const isChecked = assignForm.roles.includes(r.name)
                      return (
                        <label key={r.name} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setAssignForm(prev => {
                                const newRolesList = isChecked
                                  ? prev.roles.filter(name => name !== r.name)
                                  : [...prev.roles, r.name]
                                return { ...prev, roles: newRolesList }
                              })
                            }}
                            className="text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <span>{r.displayName} ({r.name})</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-600 block mb-1">Custom Extra Permissions (Comma-Separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. employee:create, leave:apply"
                    value={assignForm.permissions}
                    onChange={e => setAssignForm({ ...assignForm, permissions: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Directly grant extra permissions outside of their roles.</span>
                </div>

                <div className="flex gap-2 pt-3">
                  <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all text-xs shadow-md">
                    Apply Changes
                  </button>
                  <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs">
                    Close
                  </button>
                </div>
              </form>

              {/* Assignment Audit History */}
              <div className="border-l border-slate-100 pl-6">
                <h4 className="text-sm font-extrabold text-slate-700 mb-3">Role Assignment History</h4>
                {loadingHistory ? (
                  <div className="flex justify-center py-8"><div className="spinner" /></div>
                ) : userHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic text-xs">No role changes logged for this user.</div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {userHistory.map(log => (
                      <div key={log._id} className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`font-bold ${log.action.includes('Assigned') ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-600">
                          Role: <span className="font-bold text-slate-700">{log.metadata?.role}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          By: {log.userEmail}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
