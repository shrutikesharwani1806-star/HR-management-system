import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Attendance() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(user?.role === 'leadership' ? 'team' : 'my') // 'my' or 'team'
  const [records, setRecords] = useState([])
  const [teamRecords, setTeamRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [teamLoading, setTeamLoading] = useState(false)
  const [punching, setPunching] = useState(false)
  const [uploadingWork, setUploadingWork] = useState(false)
  const [msg, setMsg] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0])

  // Lookups & Filters for Management view
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedLoc, setSelectedLoc] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await api.get('/attendance/my', { params: { month, year } })
      setRecords(res.data.data)
    } catch {}
    setLoading(false)
  }

  const fetchLookups = async () => {
    try {
      const [deptsRes, locsRes] = await Promise.all([
        api.get('/organization/departments'),
        api.get('/organization/locations')
      ])
      setDepartments(deptsRes.data.data || [])
      setLocations(locsRes.data.data || [])
    } catch (err) {
      console.error('Failed to load lookups:', err)
    }
  }

  const fetchTeamRecords = async () => {
    setTeamLoading(true)
    try {
      const isManagement = ['leadership', 'hr_admin', 'super_admin'].includes(user?.role)
      const endpoint = isManagement ? '/attendance/all' : '/attendance/team'
      const params = { date: targetDate }
      if (isManagement) {
        if (selectedDept) params.department = selectedDept
        if (selectedLoc) params.location = selectedLoc
        if (selectedStatus) params.status = selectedStatus
      }
      const res = await api.get(endpoint, { params })
      setTeamRecords(res.data.data || [])
    } catch {}
    setTeamLoading(false)
  }

  useEffect(() => { 
    if (activeTab === 'my') {
      fetchRecords()
    } else {
      fetchTeamRecords()
    }
  }, [activeTab, month, year, targetDate, selectedDept, selectedLoc, selectedStatus])

  useEffect(() => {
    if (user && user.role !== 'employee') {
      fetchLookups()
    }
  }, [user])

  const punch = async (type) => {
    setPunching(true)
    setMsg('')

    const sendPunch = async (latitude, longitude) => {
      try {
        await api.post('/attendance/punch', { type, latitude, longitude })
        setMsg(`${type === 'in' ? '✅ Punched In' : '🔴 Punched Out'} at ${new Date().toLocaleTimeString()}`)
        fetchRecords()
      } catch (err) {
        setMsg('❌ ' + (err.response?.data?.message || 'Punch failed'))
      } finally {
        setPunching(false)
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendPunch(pos.coords.latitude, pos.coords.longitude)
        },
        (err) => {
          console.warn('Geolocation warning, proceeding without GPS:', err.message)
          sendPunch(undefined, undefined)
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    } else {
      sendPunch(undefined, undefined)
    }
  }

  const handleWorkRecordUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingWork(true)
    setMsg('')
    try {
      const empRes = await api.get('/employees/me')
      const empId = empRes.data.data._id

      const formData = new FormData()
      formData.append('document', file)
      formData.append('docType', 'work_record')
      formData.append('docName', `Daily Report - ${new Date().toLocaleDateString()}`)

      await api.post(`/employees/${empId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMsg('✅ Work record uploaded successfully! Saved to your profile.')
    } catch (err) {
      setMsg('❌ Failed to upload work record.')
    } finally {
      setUploadingWork(false)
      e.target.value = '' 
    }
  }

  const handleDirectCorrect = async (employeeId, recordId, date) => {
    const status = prompt('Enter corrected status (present, absent, late, half_day):', 'present')
    if (!status) return
    const firstIn = prompt('Enter corrected Punch-In Time (HH:MM) - e.g. 09:00 (or leave empty):', '09:00')
    const lastOut = prompt('Enter corrected Punch-Out Time (HH:MM) - e.g. 18:00 (or leave empty):', '18:00')
    const remarks = prompt('Enter correction reason/remarks:')

    try {
      await api.put(`/attendance/correct/${recordId || 'new'}`, {
        employeeId,
        date: date ? new Date(date).toISOString().split('T')[0] : undefined,
        status,
        firstIn: firstIn || undefined,
        lastOut: lastOut || undefined,
        remarks
      })
      alert('Attendance record corrected successfully by HR.')
      fetchRecords()
      if (activeTab === 'team') {
        fetchTeamRecords()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to correct attendance')
    }
  }

  const statusBadge = (s) => {
    const map = { 
      present: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
      absent: 'bg-rose-50 text-rose-700 border-rose-100', 
      late: 'bg-amber-50 text-amber-700 border-amber-100', 
      half_day: 'bg-sky-50 text-sky-700 border-sky-100', 
      on_leave: 'bg-indigo-50 text-indigo-700 border-indigo-100', 
      holiday: 'bg-slate-50 text-slate-700 border-slate-100' 
    }
    return map[s] || 'bg-slate-50 text-slate-700 border-slate-100'
  }

  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
  const todayRecord = records.find(r => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.toLocaleDateString('en-CA') === todayStr
  })
  const hasPunchedIn = todayRecord?.punches?.some(p => p.type === 'in') || false
  const hasPunchedOut = todayRecord?.punches?.some(p => p.type === 'out') || false

  const isManagement = ['leadership', 'hr_admin', 'super_admin'].includes(user?.role)

  return (
    <Layout title="Attendance">
      {/* Tab switcher for Manager/Admin/Leadership */}
      {user?.role !== 'employee' && (
        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
          {user?.role !== 'leadership' && (
            <button 
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'my' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => setActiveTab('my')}
            >
              My Attendance
            </button>
          )}
          <button 
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'team' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => setActiveTab('team')}
          >
            {isManagement ? 'Company Attendance' : 'Team Attendance'}
          </button>
          {['leadership', 'hr_admin'].includes(user?.role) && (
            <button 
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'policies' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => setActiveTab('policies')}
            >
              Shift & Policies
            </button>
          )}
        </div>
      )}

      {activeTab === 'my' && (
        <>
          {/* Punch Panel */}
          {user?.role !== 'leadership' && (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white text-center shadow-lg mb-6">
              <div className="text-4xl mb-2">🕐</div>
              <div className="text-lg font-semibold opacity-90">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div className="text-3xl font-extrabold my-2">{new Date().toLocaleTimeString()}</div>
              
              {msg && (
                <div className="my-3 inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-lg text-sm font-semibold">
                  {msg}
                </div>
              )}
              
              <div className="flex justify-center gap-4 mt-4">
                <button 
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-700/30 active:scale-[0.98] disabled:opacity-50 cursor-pointer" 
                  onClick={() => punch('in')} 
                  disabled={punching || hasPunchedIn}
                >
                  {hasPunchedIn ? 'Punched In ✓' : 'Punch In'}
                </button>
                <button 
                  className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-700/30 active:scale-[0.98] disabled:opacity-50 cursor-pointer" 
                  onClick={() => punch('out')} 
                  disabled={punching || !hasPunchedIn || hasPunchedOut}
                >
                  {hasPunchedOut ? 'Punched Out ✓' : 'Punch Out'}
                </button>
              </div>

              {/* Upload Work Record */}
              <div className="mt-6 border-t border-white/20 pt-5 max-w-[280px] mx-auto">
                <label className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer active:scale-[0.98]">
                  {uploadingWork ? <div className="spin w-4 h-4 border-2" /> : '📄'} 
                  {uploadingWork ? 'Uploading File...' : 'Attach Daily Work Record'}
                  <input type="file" className="hidden" onChange={handleWorkRecordUpload} disabled={uploadingWork} />
                </label>
              </div>
            </div>
          )}

          {/* Date Select Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Month</span>
            <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none" value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none" value={year} onChange={(e) => setYear(e.target.value)}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Attendance History Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 text-sm">Attendance History</h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center py-10"><div className="spin" /></div>
              ) : records.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No attendance history found for this month</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">First In</th>
                      <th className="px-6 py-3 text-left">Last Out</th>
                      <th className="px-6 py-3 text-left">Worked Time</th>
                      <th className="px-6 py-3 text-left">Late Mark</th>
                      {user?.role === 'hr_admin' && <th className="px-6 py-3 text-left">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {records.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-sm font-medium">
                          {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusBadge(r.status)}`}>
                            {r.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {r.firstIn ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-700">{new Date(r.firstIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {(() => {
                                const punchIn = r.punches?.find(p => p.type === 'in');
                                if (punchIn?.latitude && punchIn?.longitude) {
                                  return (
                                    <a href={`https://www.google.com/maps?q=${punchIn.latitude},${punchIn.longitude}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                                      📍 GPS Log
                                    </a>
                                  )
                                }
                                return null;
                              })()}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {r.lastOut ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-700">{new Date(r.lastOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {(() => {
                                // Find the last out punch
                                const outs = r.punches?.filter(p => p.type === 'out') || [];
                                const punchOut = outs[outs.length - 1];
                                if (punchOut?.latitude && punchOut?.longitude) {
                                  return (
                                    <a href={`https://www.google.com/maps?q=${punchOut.latitude},${punchOut.longitude}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                                      📍 GPS Log
                                    </a>
                                  )
                                }
                                return null;
                              })()}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {r.workedMinutes ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {r.lateByMinutes > 0 ? <span className="text-amber-600 font-semibold">{r.lateByMinutes}m</span> : '—'}
                        </td>
                        {user?.role === 'hr_admin' && (
                          <td className="px-6 py-4 text-sm">
                            <button 
                              className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline"
                              onClick={() => handleDirectCorrect(r.employeeId, r._id, r.date)}
                            >
                              Correct
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'team' && (
        <>
          {/* Team/Company Attendance Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Date</span>
              <input 
                type="date"
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none" 
                value={targetDate} 
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            
            {isManagement && (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</span>
                  <select 
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none min-w-[150px]" 
                    value={selectedDept} 
                    onChange={(e) => setSelectedDept(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</span>
                  <select 
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none min-w-[150px]" 
                    value={selectedLoc} 
                    onChange={(e) => setSelectedLoc(e.target.value)}
                  >
                    <option value="">All Locations</option>
                    {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</span>
                  <select 
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none min-w-[120px]" 
                    value={selectedStatus} 
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="half_day">Half Day</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Team Attendance Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 text-sm">
                {isManagement ? 'Company Attendance History' : 'Team Attendance History'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              {teamLoading ? (
                <div className="flex justify-center items-center py-10"><div className="spin" /></div>
              ) : teamRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No members reported for this date</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Employee</th>
                      <th className="px-6 py-3 text-left">Department</th>
                      <th className="px-6 py-3 text-left">Designation</th>
                      <th className="px-6 py-3 text-left">Location</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">First In</th>
                      <th className="px-6 py-3 text-left">Last Out</th>
                      <th className="px-6 py-3 text-left">Worked Time</th>
                      {user?.role === 'hr_admin' && <th className="px-6 py-3 text-left">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {teamRecords.map((tr) => (
                      <tr key={tr._id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-sm font-medium">
                          {tr.firstName} {tr.lastName} ({tr.employeeId})
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {tr.departmentId?.name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {tr.designationId?.name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {tr.locationId?.name || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusBadge(tr.attendance?.status || 'absent')}`}>
                            {(tr.attendance?.status || 'absent').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {tr.attendance?.firstIn ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-700">{new Date(tr.attendance.firstIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {(() => {
                                const punchIn = tr.attendance.punches?.find(p => p.type === 'in');
                                if (punchIn?.latitude && punchIn?.longitude) {
                                  return (
                                    <a href={`https://www.google.com/maps?q=${punchIn.latitude},${punchIn.longitude}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                                      📍 GPS Log
                                    </a>
                                  )
                                }
                                return null;
                              })()}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {tr.attendance?.lastOut ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-700">{new Date(tr.attendance.lastOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {(() => {
                                const outs = tr.attendance.punches?.filter(p => p.type === 'out') || [];
                                const punchOut = outs[outs.length - 1];
                                if (punchOut?.latitude && punchOut?.longitude) {
                                  return (
                                    <a href={`https://www.google.com/maps?q=${punchOut.latitude},${punchOut.longitude}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                                      📍 GPS Log
                                    </a>
                                  )
                                }
                                return null;
                              })()}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {tr.attendance?.workedMinutes ? `${Math.floor(tr.attendance.workedMinutes / 60)}h ${tr.attendance.workedMinutes % 60}m` : '—'}
                        </td>
                        {user?.role === 'hr_admin' && (
                          <td className="px-6 py-4 text-sm">
                            <button
                              className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline"
                              onClick={() => handleDirectCorrect(tr._id, tr.attendance?._id, targetDate)}
                            >
                              Correct
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'policies' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Attendance Policy & Shift Configuration</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {user?.role === 'leadership' 
                    ? 'Define the strict attendance and shift timings for HR Administrators.' 
                    : 'Define the attendance rules, timings, and geofencing radius for Managers and Employees.'}
                </p>
              </div>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm" onClick={() => alert('Shift Policy & Timing Saved Successfully!')}>Save Policy</button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">Shift Timings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Shift Start Time</label>
                    <input type="time" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" defaultValue="09:00" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Shift End Time</label>
                    <input type="time" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" defaultValue="18:00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Grace Period (Minutes)</label>
                    <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" defaultValue="15" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Half Day Threshold (Minutes)</label>
                    <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" defaultValue="240" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">Tracking & Compliance</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                    <span className="text-sm font-medium text-slate-700">Enable Overtime Calculation</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                    <span className="text-sm font-medium text-slate-700">Flag Early Leaving</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                    <span className="text-sm font-medium text-slate-700">Require GPS Location on Punch</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                    <span className="text-sm font-medium text-slate-700">Enable Geofencing (Radius Validation)</span>
                  </label>
                  <div className="pl-7 mt-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Office Radius (Meters)</label>
                    <input type="number" className="w-full max-w-[150px] px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" defaultValue="500" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <h4 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">Hardware Integrations</h4>
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-bold text-indigo-800">Biometric Devices</h5>
                    <p className="text-xs text-indigo-600/80 mt-1">Connect fingerprint or facial recognition terminals.</p>
                  </div>
                  <button className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-50" onClick={() => alert('Please contact support to provision biometric MAC addresses.')}>Configure Devices</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
