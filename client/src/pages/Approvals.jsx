import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { usePermission } from '../context/usePermission'

export default function Approvals() {
  const { isAdmin } = usePermission()
  
  // Tabs: 'workflow' or 'registrations'
  const [activeTab, setActiveTab] = useState('workflow')
  
  const [pending, setPending] = useState([])
  const [pendingRegistrations, setPendingRegistrations] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(null)

  // Delegation Modal State
  const [showDelegateModal, setShowDelegateModal] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState(null)
  const [delegateToEmpId, setDelegateToEmpId] = useState('')
  const [delegateComment, setDelegateComment] = useState('')
  const [delegating, setDelegating] = useState(false)

  const fetchPending = async () => {
    setLoading(true)
    try {
      const res = await api.get('/workflow/pending')
      setPending(res.data.data)
    } catch {}
    setLoading(false)
  }

  const fetchPendingRegistrations = async () => {
    if (!isAdmin) return
    try {
      const res = await api.get('/auth/pending-registrations')
      setPendingRegistrations(res.data.data)
    } catch {}
  }

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees', { params: { limit: 100 } })
      setEmployees(res.data.data.filter(e => e.status === 'active'))
    } catch {}
  }

  useEffect(() => { 
    fetchPending() 
    fetchEmployees()
    if (isAdmin) {
      fetchPendingRegistrations()
    }
  }, [isAdmin])

  const resolve = async (approvalId, action) => {
    const comment = action === 'reject' ? prompt('Rejection reason (optional):') : undefined
    setResolving(approvalId)
    try {
      await api.put(`/workflow/resolve/${approvalId}`, { action, comment })
      fetchPending()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    }
    setResolving(null)
  }

  const handleApproveRegistration = async (userId) => {
    if (!confirm('Are you sure you want to approve this user registration?')) return
    try {
      await api.put(`/auth/approve-registration/${userId}`)
      alert('User registration approved.')
      fetchPendingRegistrations()
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed')
    }
  }

  const handleRejectRegistration = async (userId) => {
    if (!confirm('Are you sure you want to reject this registration? The account request will be deleted.')) return
    try {
      await api.delete(`/auth/reject-registration/${userId}`)
      alert('User registration request rejected.')
      fetchPendingRegistrations()
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed')
    }
  }

  const handleOpenDelegate = (approval) => {
    setSelectedApproval(approval)
    setShowDelegateModal(true)
  }

  const handleDelegateSubmit = async (e) => {
    e.preventDefault()
    if (!delegateToEmpId) return
    setDelegating(true)
    try {
      await api.put(`/workflow/delegate/${selectedApproval._id}`, {
        delegateToEmpId,
        comment: delegateComment
      })
      setShowDelegateModal(false)
      setSelectedApproval(null)
      setDelegateToEmpId('')
      setDelegateComment('')
      fetchPending()
    } catch (err) {
      alert(err.response?.data?.message || 'Delegation failed')
    }
    setDelegating(false)
  }

  const handleEscalateCheck = async (approvalId) => {
    try {
      await api.put(`/workflow/escalate/${approvalId}`)
      alert('SLA Escalation check completed successfully.')
      fetchPending()
    } catch (err) {
      alert(err.response?.data?.message || 'Escalation check failed')
    }
  }

  const statusBadge = (s) => {
    const map = { 
      pending: 'bg-amber-50 text-amber-700 border-amber-100', 
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
      rejected: 'bg-rose-50 text-rose-700 border-rose-100', 
      escalated: 'bg-red-100 text-red-800 border-red-200' 
    }
    return map[s] || 'bg-slate-50 text-slate-700 border-slate-100'
  }

  return (
    <Layout title="Approvals">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pending Approvals</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Review and authorize tasks or registration requests</p>
        </div>

        {/* Tab Switcher */}
        {isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
            <button 
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'workflow' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('workflow')}
            >
              Workflow Approvals ({pending.length})
            </button>
            <button 
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'registrations' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('registrations')}
            >
              Registration Requests ({pendingRegistrations.length})
            </button>
          </div>
        )}
      </div>

      {activeTab === 'workflow' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-10"><div className="spinner" /></div>
            ) : pending.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium text-sm">No pending approvals found</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">Requested By</th>
                    <th className="px-6 py-3 text-left">Details</th>
                    <th className="px-6 py-3 text-left">SLA Deadline / Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {pending.map((a) => {
                    const activeStage = a.stages?.find(s => s.level === a.currentLevel) || {}
                    const isOverdue = activeStage.slaDeadline && new Date(activeStage.slaDeadline) < new Date()
                    return (
                      <tr key={a._id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-sm font-semibold capitalize text-slate-800">
                          {a.entityType?.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {a.requestedBy?.firstName} {a.requestedBy?.lastName}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {a.entityType === 'leave_request' && `${a.metadata?.totalDays ?? '—'} day(s)`}
                          {a.entityType === 'profile_update' && (
                            <div>
                              <span className="font-semibold text-slate-600">Sensitive Update:</span>{' '}
                              {Object.keys(a.metadata?.pendingFields || {}).map(f => (
                                <span key={f} className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded mr-1 capitalize font-medium">
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                          {a.entityType === 'attendance_regularization' && (
                            <div>
                              <span className="font-semibold text-slate-600">Regularize:</span>{' '}
                              <span className="text-xs text-slate-500 font-medium">{a.metadata?.reason || 'Correction requested'}</span>
                            </div>
                          )}
                          {a.entityType === 'transfer' && (
                            <div>
                              <span className="font-semibold text-indigo-600">Transfer Request:</span>{' '}
                              <span className="text-xs text-slate-500 font-medium">{a.metadata?.reason || 'Departmental alignment'}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-col">
                            <span className={`text-xs px-2 py-0.5 rounded border w-fit font-semibold ${statusBadge(a.status)}`}>
                              {a.status}
                            </span>
                            {activeStage.slaDeadline && (
                              <span className={`text-[11px] mt-1 font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                                SLA: {new Date(activeStage.slaDeadline).toLocaleString()} {isOverdue && '(Breached)'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              onClick={() => resolve(a._id, 'approve')} 
                              disabled={resolving === a._id}
                            >
                              Approve
                            </button>
                            <button 
                              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              onClick={() => resolve(a._id, 'reject')} 
                              disabled={resolving === a._id}
                            >
                              Reject
                            </button>
                            <button 
                              className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                              onClick={() => handleOpenDelegate(a)} 
                            >
                              Delegate
                            </button>
                            {isOverdue && (
                              <button 
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors"
                                onClick={() => handleEscalateCheck(a._id)}
                              >
                                Escalate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* ─── PENDING REGISTRATIONS TAB ─── */
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {pendingRegistrations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium text-sm">No pending registration requests found</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Candidate Name</th>
                    <th className="px-6 py-3 text-left">Email Address</th>
                    <th className="px-6 py-3 text-left">Tenant ID</th>
                    <th className="px-6 py-3 text-left">Verification Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {pendingRegistrations.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                        {u.employeeId?.firstName || 'New'} {u.employeeId?.lastName || 'User'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">
                        {u.tenantId}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="text-xs px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 font-semibold">
                          Pending Verification
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button 
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                            onClick={() => handleApproveRegistration(u._id)}
                          >
                            Approve Access
                          </button>
                          <button 
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all"
                            onClick={() => handleRejectRegistration(u._id)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Delegate Modal */}
      {showDelegateModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowDelegateModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Delegate Approval</h3>
              <button className="text-slate-400 hover:text-slate-600 text-2xl leading-none" onClick={() => setShowDelegateModal(false)}>×</button>
            </div>
            <form onSubmit={handleDelegateSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Delegate To *</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" 
                    value={delegateToEmpId} 
                    onChange={(e) => setDelegateToEmpId(e.target.value)}
                    required
                  >
                    <option value="">Select teammate...</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Delegation Reason / Comment *</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none" 
                    rows={3} 
                    value={delegateComment} 
                    onChange={(e) => setDelegateComment(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => setShowDelegateModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors" disabled={delegating}>
                  {delegating ? 'Delegating...' : 'Submit Delegation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
