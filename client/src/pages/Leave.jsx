import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Leave() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [teamRequests, setTeamRequests] = useState([])
  const [allRequests, setAllRequests] = useState([])
  const [balances, setBalances] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [holidays, setHolidays] = useState([])
  const [activeTab, setActiveTab] = useState(user?.role === 'leadership' ? 'team' : 'requests')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ leaveTypeId: '', fromDate: '', toDate: '', reason: '', dayType: 'full_day' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [teamLoading, setTeamLoading] = useState(false)
  const [allLoading, setAllLoading] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [req, bal, types, hol] = await Promise.all([
        api.get('/leave/my'),
        api.get('/leave/my/balances'),
        api.get('/leave/types'),
        api.get('/leave/holidays'),
      ])
      setRequests(req.data.data)
      setBalances(bal.data.data)
      setLeaveTypes(types.data.data)
      setHolidays(hol.data.data)
    } catch {}
    setLoading(false)
  }

  const fetchTeamRequests = async () => {
    setTeamLoading(true)
    try {
      const res = await api.get('/leave/team')
      setTeamRequests(res.data.data)
    } catch {}
    setTeamLoading(false)
  }

  const fetchAllRequests = async () => {
    setAllLoading(true)
    try {
      const res = await api.get('/leave/all')
      setAllRequests(res.data.data)
    } catch {}
    setAllLoading(false)
  }

  useEffect(() => { 
    fetchAll() 
  }, [])

  useEffect(() => {
    if (activeTab === 'team' && user?.role !== 'employee') {
      fetchTeamRequests()
    }
    if (activeTab === 'all' && ['hr_admin', 'leadership'].includes(user?.role)) {
      fetchAllRequests()
    }
  }, [activeTab, user])

  const handleApply = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/leave/apply', form)
      setShowModal(false)
      setForm({ leaveTypeId: '', fromDate: '', toDate: '', reason: '', dayType: 'full_day' })
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply leave')
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this leave request?')) return
    try { 
      await api.put(`/leave/cancel/${id}`)
      fetchAll() 
    } catch {}
  }

  const handleResolve = async (id, action) => {
    const comment = action === 'reject' ? prompt('Rejection reason:') : undefined
    if (action === 'reject' && comment === null) return // canceled prompt
    try {
      await api.put(`/leave/resolve/${id}`, { action, comment })
      if (activeTab === 'all') {
        fetchAllRequests()
      } else {
        fetchTeamRequests()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    }
  }

  const statusBadge = (s) => {
    const map = { 
      pending: 'bg-amber-50 text-amber-700 border-amber-100', 
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
      rejected: 'bg-rose-50 text-rose-700 border-rose-100', 
      cancelled: 'bg-slate-50 text-slate-700 border-slate-100' 
    }
    return map[s] || 'bg-slate-50 text-slate-700 border-slate-100'
  }

  return (
    <Layout title="Leave Management">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Leave Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Apply, track and manage your leaves</p>
        </div>
        {user?.role !== 'leadership' && (
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors" onClick={() => setShowModal(true)}>
            + Apply Leave
          </button>
        )}
      </div>

      {/* Leave Balances */}
      {user?.role !== 'leadership' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {balances.map((b) => (
            <div key={b._id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
              <div className="text-xs font-semibold text-slate-500 mb-1">{b.leaveTypeId?.name}</div>
              <div className="text-3xl font-extrabold text-indigo-600 my-1">{b.available ?? 0}</div>
              <div className="text-xs text-slate-400">of {b.allocated + b.accrued + b.carried} days allocated</div>
              <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 flex justify-around">
                <div>Used: <span className="font-semibold text-slate-700">{b.used}</span></div>
                <div>Pending: <span className="font-semibold text-slate-700">{b.pending}</span></div>
              </div>
            </div>
          ))}
          {balances.length === 0 && !loading && (
            <div className="col-span-full bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
              No leave balances assigned
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {user?.role !== 'leadership' && (
          <button className={`px-4 py-2 border-b-2 font-medium text-sm transition-all -mb-px ${activeTab === 'requests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('requests')}>
            My Requests
          </button>
        )}
        {user?.role !== 'employee' && (
          <button className={`px-4 py-2 border-b-2 font-medium text-sm transition-all -mb-px ${activeTab === 'team' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('team')}>
            Team Requests
          </button>
        )}
        {['hr_admin', 'leadership'].includes(user?.role) && (
          <button className={`px-4 py-2 border-b-2 font-medium text-sm transition-all -mb-px ${activeTab === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('all')}>
            Company Leave Requests
          </button>
        )}
        <button className={`px-4 py-2 border-b-2 font-medium text-sm transition-all -mb-px ${activeTab === 'holidays' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('holidays')}>
          Holiday Calendar
        </button>
      </div>

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-10"><div className="spin" /></div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No leave requests found</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">From</th>
                    <th className="px-6 py-3 text-left">To</th>
                    <th className="px-6 py-3 text-left">Days</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Reason</th>
                    <th className="px-6 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {requests.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-semibold">{r.leaveTypeId?.name}</td>
                      <td className="px-6 py-4 text-sm">{new Date(r.fromDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">{new Date(r.toDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold">{r.totalDays}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm max-w-xs truncate">{r.reason}</td>
                      <td className="px-6 py-4 text-right">
                        {r.status === 'pending' && (
                          <button className="px-3 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors" onClick={() => handleCancel(r._id)}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Team Requests Tab */}
      {activeTab === 'team' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {teamLoading ? (
              <div className="flex justify-center items-center py-10"><div className="spin" /></div>
            ) : teamRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No team leave requests found</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Employee</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">From</th>
                    <th className="px-6 py-3 text-left">To</th>
                    <th className="px-6 py-3 text-left">Days</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Reason</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {teamRequests.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-semibold">{r.employeeId?.firstName} {r.employeeId?.lastName}</td>
                      <td className="px-6 py-4 text-sm">{r.leaveTypeId?.name}</td>
                      <td className="px-6 py-4 text-sm">{new Date(r.fromDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">{new Date(r.toDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold">{r.totalDays}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm max-w-xs truncate">{r.reason}</td>
                      <td className="px-6 py-4 text-right">
                        {r.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <button className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors" onClick={() => handleResolve(r._id, 'approve')}>
                              Approve
                            </button>
                            <button className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold transition-colors" onClick={() => handleResolve(r._id, 'reject')}>
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* All Requests Tab (HR/Leadership Only) */}
      {activeTab === 'all' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {allLoading ? (
              <div className="flex justify-center items-center py-10"><div className="spin" /></div>
            ) : allRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No company leave requests found</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Employee</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">From</th>
                    <th className="px-6 py-3 text-left">To</th>
                    <th className="px-6 py-3 text-left">Days</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Reason</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {allRequests.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-semibold">{r.employeeId?.firstName} {r.employeeId?.lastName}</td>
                      <td className="px-6 py-4 text-sm">{r.leaveTypeId?.name}</td>
                      <td className="px-6 py-4 text-sm">{new Date(r.fromDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">{new Date(r.toDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold">{r.totalDays}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm max-w-xs truncate">{r.reason}</td>
                      <td className="px-6 py-4 text-right">
                        {r.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <button className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors" onClick={() => handleResolve(r._id, 'approve')}>
                              Approve
                            </button>
                            <button className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold transition-colors" onClick={() => handleResolve(r._id, 'reject')}>
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Holidays Tab */}
      {activeTab === 'holidays' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {holidays.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No public holidays found</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Holiday</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {holidays.map((h) => (
                    <tr key={h._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-semibold">{h.name}</td>
                      <td className="px-6 py-4 text-sm">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${h.type === 'national' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                          {h.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Apply Leave</h3>
              <button className="text-slate-400 hover:text-slate-600 text-2xl leading-none" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleApply}>
              <div className="p-6 space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">{error}</div>}
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Leave Type *</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} required>
                    <option value="">Select type...</option>
                    {leaveTypes.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                    <option value="" disabled className="bg-slate-100 font-bold text-slate-500">────────── Standard ──────────</option>
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="earned">Earned Leave</option>
                    <option value="comp_off">Comp-Off</option>
                    <option value="wfh">Work From Home</option>
                    <option value="lwp">Leave Without Pay</option>
                    <option value="" disabled className="bg-slate-100 font-bold text-slate-500">───────── Emergency ─────────</option>
                    <option value="emergency">Emergency Leave</option>
                    <option value="family_emergency">Family Emergency Leave</option>
                    <option value="medical_emergency">Medical Emergency Leave</option>
                    <option value="" disabled className="bg-slate-100 font-bold text-slate-500">───────── Occasional ────────</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="paternity">Paternity Leave</option>
                    <option value="marriage">Marriage Leave</option>
                    <option value="bereavement">Bereavement Leave</option>
                    <option value="optional_holiday">Optional Holiday</option>
                    <option value="" disabled className="bg-slate-100 font-bold text-slate-500">────────── Medical ──────────</option>
                    <option value="fever">Fever</option>
                    <option value="health">Health Issue</option>
                    <option value="other">Other Issue</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">From Date *</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">To Date *</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} required />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Day Type</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={form.dayType} onChange={(e) => setForm({ ...form, dayType: e.target.value })}>
                    <option value="full_day">Full Day</option>
                    <option value="half_day_first">Half Day (First Half)</option>
                    <option value="half_day_second">Half Day (Second Half)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Reason *</label>
                  <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
