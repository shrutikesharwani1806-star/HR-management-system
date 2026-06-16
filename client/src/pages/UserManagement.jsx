import React, { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(null) // 'hr' | 'manager' | null
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' })
  const [msg, setMsg] = useState(null)
  const [resetModal, setResetModal] = useState(null)
  const [newPass, setNewPass] = useState('')

  const fetchUsers = useCallback(async () => {
    try {
      const q = filter ? `?role=${filter}` : ''
      const res = await api.get(`/auth/users${q}`)
      setUsers(res.data.data || [])
    } catch { }
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const endpoint = showCreate === 'hr' ? '/auth/create-hr-admin' : '/auth/create-manager'
      const res = await api.post(endpoint, form)
      showMsg(res.data.message)
      setShowCreate(null)
      setForm({ email: '', password: '', firstName: '', lastName: '', phone: '' })
      fetchUsers()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create account', 'error')
    }
  }

  const handleToggle = async (userId) => {
    try {
      const res = await api.patch(`/auth/users/${userId}/toggle-status`)
      showMsg(res.data.message)
      fetchUsers()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed', 'error')
    }
  }

  const handleResetPassword = async () => {
    if (!newPass || newPass.length < 6) return showMsg('Password must be at least 6 characters', 'error')
    try {
      const res = await api.put(`/auth/users/${resetModal}/reset-password`, { newPassword: newPass })
      showMsg(res.data.message)
      setResetModal(null)
      setNewPass('')
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed', 'error')
    }
  }

  const roleBadge = (role) => {
    const colors = {
      leadership: 'bg-amber-100 text-amber-800 border-amber-200',
      hr_admin: 'bg-violet-100 text-violet-800 border-violet-200',
      manager: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      employee: 'bg-slate-100 text-slate-700 border-slate-200',
      super_admin: 'bg-rose-100 text-rose-800 border-rose-200',
    }
    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${colors[role] || colors.employee}`}>
        {role?.replace('_', ' ')}
      </span>
    )
  }

  return (
    <Layout title="User Management">
      {/* Toast */}
      {msg && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-bold animate-fade-in-up ${msg.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 mb-6 shadow-xl animate-fade-in-up">
        <h2 className="text-xl font-black flex items-center gap-2">👑 User & Role Management</h2>
        <p className="text-sm text-slate-400 mt-1">Create HR Admin and Manager accounts, enable/disable users, reset credentials, and assign permissions.</p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in-up" style={{animationDelay:'100ms'}}>
        <button onClick={() => setShowCreate('hr')} className="px-4 py-2 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all text-sm shadow-sm">+ Create HR Admin</button>
        <button onClick={() => setShowCreate('manager')} className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all text-sm shadow-sm">+ Create Manager</button>
        <div className="ml-auto flex gap-2">
          {['', 'leadership', 'hr_admin', 'manager', 'employee'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f ? f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(null)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-black text-slate-800 mb-4">
              {showCreate === 'hr' ? '🛡️ Create HR Admin' : '👨‍💼 Create Manager'}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="First Name" required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none" />
                <input placeholder="Last Name" required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none" />
              </div>
              <input type="email" placeholder="Email Address" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none" />
              <input type="tel" placeholder="Phone Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none" />
              <input type="password" placeholder="Password (min 6 chars)" required minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none" />
            </div>
            <div className="flex gap-3 mt-5">
              <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm">Create Account</button>
              <button type="button" onClick={() => setShowCreate(null)} className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setResetModal(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-black text-slate-800 mb-4">🔐 Reset Password</h3>
            <input type="password" placeholder="New password (min 6 chars)" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mb-4 focus:border-indigo-400 focus:outline-none" />
            <div className="flex gap-3">
              <button onClick={handleResetPassword} className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 text-sm">Reset</button>
              <button onClick={() => setResetModal(null)} className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up" style={{animationDelay:'200ms'}}>
        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-semibold">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">User</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Last Login</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const emp = u.employeeId
                  const name = emp ? `${emp.firstName} ${emp.lastName}` : u.email
                  return (
                    <tr key={u._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                            {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">{roleBadge(u.role)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleToggle(u._id)} title={u.isActive ? 'Disable' : 'Enable'} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${u.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                            {u.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => setResetModal(u._id)} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-bold hover:bg-amber-100 transition-all">
                            Reset PW
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
