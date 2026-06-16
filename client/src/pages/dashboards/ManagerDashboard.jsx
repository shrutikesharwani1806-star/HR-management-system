import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/axios'

export default function ManagerDashboard() {
  const [stats, setStats] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [leave, setLeave] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard'),
      api.get('/reports/attendance-summary'),
      api.get('/reports/leave-summary'),
    ]).then(([d, a, l]) => {
      setStats(d.data.data)
      setAttendance(a.data.data)
      setLeave(l.data.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout title="Manager Dashboard">
      <div className="flex justify-center items-center py-20"><div className="spinner" /></div>
    </Layout>
  )

  const s = stats || {}
  const attendanceTotal = attendance.reduce((sum, x) => sum + (x.count || 0), 0) || 1

  return (
    <Layout title="Reporting Manager Dashboard">
      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800 text-white rounded-3xl p-6 md:p-8 mb-6 shadow-xl animate-fade-in-up relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 70% 30%, #06b6d4 0%, transparent 50%)'}} />
        <div className="relative">
          <h2 className="text-2xl font-black mb-1 flex items-center gap-2">👨‍💼 Team Management Hub</h2>
          <p className="text-sm text-cyan-200 max-w-2xl">Monitor your team's attendance, manage leave approvals, and track team performance — all scoped to your direct reports.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 animate-fade-in-up" style={{animationDelay:'100ms'}}>
        <div className="bg-white border border-cyan-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="text-xs font-bold uppercase text-slate-400 mb-1">Team Size</div>
          <div className="text-3xl font-black text-slate-800">{s.headcount || 0}</div>
          <div className="text-xs text-cyan-600 font-semibold mt-1">Direct Reports</div>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="text-xs font-bold uppercase text-slate-400 mb-1">Present Today</div>
          <div className="text-3xl font-black text-emerald-600">{s.today_present || 0}</div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">Checked in</div>
        </div>
        <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="text-xs font-bold uppercase text-slate-400 mb-1">Absent Today</div>
          <div className="text-3xl font-black text-rose-600">{s.today_absent || 0}</div>
          <div className="text-xs text-rose-600 font-semibold mt-1">Not available</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border border-amber-400 rounded-2xl p-5 shadow-md">
          <div className="text-xs font-bold uppercase text-amber-100 mb-1">Pending Approvals</div>
          <div className="text-3xl font-black">{s.pending_leaves || 0}</div>
          <div className="text-xs text-amber-100 font-semibold mt-1">Needs your action</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fade-in-up" style={{animationDelay:'200ms'}}>
        {/* Team Attendance */}
        <div className="bg-white border border-cyan-100/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Team Attendance Today 📊</h3>
          {attendance.length === 0 ? (
            <div className="text-center py-10 text-slate-400">No team attendance data today</div>
          ) : (
            <div className="space-y-4">
              {attendance.map(item => {
                const pct = Math.round((item.count / attendanceTotal) * 100)
                const clr = { present:'bg-emerald-500', absent:'bg-slate-400', late:'bg-amber-400', half_day:'bg-sky-400', on_leave:'bg-purple-400' }
                return (
                  <div key={item._id}>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span className="capitalize">{item._id?.replace('_', ' ')}</span>
                      <span className="text-cyan-700">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${clr[item._id] || 'bg-cyan-300'} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Team Leave Summary */}
        <div className="bg-white border border-cyan-100/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Team Leave Summary (YTD) 📅</h3>
          {leave.length === 0 ? (
            <div className="text-center py-10 text-slate-400">No leave data</div>
          ) : (
            <div className="space-y-4">
              {leave.map(item => {
                const total = leave.reduce((s, x) => s + (x.total || 0), 0) || 1
                const pct = Math.round((item.total / total) * 100)
                const clr = { pending:'bg-amber-400', approved:'bg-emerald-500', rejected:'bg-rose-400', cancelled:'bg-slate-300' }
                return (
                  <div key={item._id}>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span className="capitalize">{item._id}</span>
                      <span className="text-cyan-700">{item.total} days ({item.count} req)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${clr[item._id] || 'bg-cyan-300'} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-cyan-100/40 rounded-2xl p-5 shadow-sm animate-fade-in-up" style={{animationDelay:'300ms'}}>
        <h3 className="text-sm font-bold text-slate-800 mb-4">Quick Actions ⚡</h3>
        <div className="flex flex-wrap gap-3">
          <a href="/approvals" className="px-5 py-2.5 bg-teal-600 text-white font-bold rounded-xl shadow-sm hover:bg-teal-700 hover:scale-105 transition-all text-sm">✅ Approve Requests</a>
          <a href="/employees" className="px-4 py-2 bg-white hover:bg-cyan-50 border border-cyan-200 text-cyan-700 font-bold rounded-xl transition-all text-sm">👥 View Team</a>
          <a href="/attendance" className="px-4 py-2 bg-white hover:bg-cyan-50 border border-cyan-200 text-cyan-700 font-bold rounded-xl transition-all text-sm">⏰ Team Attendance</a>
          <a href="/reports" className="px-4 py-2 bg-white hover:bg-cyan-50 border border-cyan-200 text-cyan-700 font-bold rounded-xl transition-all text-sm">📈 Team Reports</a>
        </div>
      </div>
    </Layout>
  )
}
