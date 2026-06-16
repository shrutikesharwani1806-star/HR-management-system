import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import NoticeModal from '../../components/NoticeModal'
import api from '../../api/axios'

export default function HrDashboard() {
  const [stats, setStats] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [leave, setLeave] = useState([])
  const [loading, setLoading] = useState(true)
  const [noticeOpen, setNoticeOpen] = useState(false)

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
    <Layout title="HR Management Dashboard">
      <div className="flex justify-center items-center py-20"><div className="spinner" /></div>
    </Layout>
  )

  const s = stats || {}
  const attendanceTotal = attendance.reduce((sum, x) => sum + (x.count || 0), 0) || 1
  const leaveTotal = leave.reduce((sum, x) => sum + (x.total || 0), 0) || 1

  return (
    <Layout title="HR Management Dashboard">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 text-white rounded-3xl p-6 md:p-8 mb-6 shadow-xl animate-fade-in-up relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 30% 50%, #c084fc 0%, transparent 50%)'}} />
        <div className="relative">
          <h2 className="text-2xl font-black mb-1 flex items-center gap-2">🛡️ HR Operations Center</h2>
          <p className="text-sm text-purple-200 max-w-2xl">Manage employees, attendance, leaves, payroll documents, and generate reports for your organization.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 animate-fade-in-up" style={{animationDelay:'100ms'}}>
        <StatCard color="bg-violet-50 text-violet-800 border-violet-100" icon="👥" val={s.headcount ?? 0} label="Total Headcount" />
        <StatCard color="bg-emerald-50 text-emerald-800 border-emerald-100" icon="🟢" val={s.today_present ?? 0} label="Present Today" />
        <StatCard color="bg-rose-50 text-rose-800 border-rose-100" icon="🔴" val={s.today_absent ?? 0} label="Absent Today" />
        <StatCard color="bg-amber-50 text-amber-800 border-amber-100" icon="🕐" val={s.today_late ?? 0} label="Late Today" />
        <StatCard color="bg-purple-50 text-purple-800 border-purple-100" icon="📋" val={s.pending_leaves ?? 0} label="Pending Leaves" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fade-in-up" style={{animationDelay:'200ms'}}>
        {/* Attendance Card */}
        <div className="bg-white/90 backdrop-blur-xs border border-violet-100/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">Today's Attendance 📈</h3>
          {attendance.length === 0 ? (
            <div className="text-center py-10 text-slate-400">No attendance records today</div>
          ) : (
            <div className="space-y-4">
              {attendance.map(item => {
                const pct = Math.round((item.count / attendanceTotal) * 100)
                const clr = { present:'bg-emerald-500', absent:'bg-slate-400', late:'bg-amber-400', half_day:'bg-sky-400', on_leave:'bg-purple-400' }
                return (
                  <div key={item._id}>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span className="capitalize">{item._id?.replace('_', ' ')}</span>
                      <span className="text-violet-700">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${clr[item._id] || 'bg-violet-300'} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Leave Summary */}
        <div className="bg-white/90 backdrop-blur-xs border border-violet-100/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">Leave Summary (YTD) 📅</h3>
          {leave.length === 0 ? (
            <div className="text-center py-10 text-slate-400">No leave data yet</div>
          ) : (
            <div className="space-y-4">
              {leave.map(item => {
                const pct = Math.round((item.total / leaveTotal) * 100)
                const clr = { pending:'bg-amber-400', approved:'bg-emerald-500', rejected:'bg-rose-400', cancelled:'bg-slate-300' }
                return (
                  <div key={item._id}>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span className="capitalize">{item._id}</span>
                      <span className="text-violet-700">{item.total} days ({item.count} req)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${clr[item._id] || 'bg-violet-300'} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/90 backdrop-blur-xs border border-violet-100/40 rounded-2xl p-5 shadow-sm animate-fade-in-up" style={{animationDelay:'300ms'}}>
        <h3 className="text-sm font-bold text-slate-800 mb-4">Quick Actions ✨</h3>
        <div className="flex flex-wrap gap-3">
          <a href="/employees" className="px-5 py-2.5 bg-violet-600 text-white font-bold rounded-xl shadow-sm hover:bg-violet-700 hover:scale-105 transition-all text-sm">👥 Manage Employees</a>
          <a href="/attendance" className="px-4 py-2 bg-white hover:bg-violet-50 border border-violet-200 text-violet-700 font-bold rounded-xl transition-all text-sm">⏰ Attendance</a>
          <a href="/leave" className="px-4 py-2 bg-white hover:bg-violet-50 border border-violet-200 text-violet-700 font-bold rounded-xl transition-all text-sm">📅 Leave Management</a>
          <a href="/payslips" className="px-4 py-2 bg-white hover:bg-violet-50 border border-violet-200 text-violet-700 font-bold rounded-xl transition-all text-sm">💵 Payslips</a>
          <a href="/organization" className="px-4 py-2 bg-white hover:bg-violet-50 border border-violet-200 text-violet-700 font-bold rounded-xl transition-all text-sm">🏢 Organization</a>
          <a href="/reports" className="px-4 py-2 bg-white hover:bg-violet-50 border border-violet-200 text-violet-700 font-bold rounded-xl transition-all text-sm">📊 Reports</a>
          <a href="/approvals" className="px-4 py-2 bg-white hover:bg-violet-50 border border-violet-200 text-violet-700 font-bold rounded-xl transition-all text-sm">✅ Approvals</a>
          <button onClick={() => setNoticeOpen(true)} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl transition-all text-sm shadow-sm hover:shadow">📢 Announce Holiday</button>
        </div>
      </div>

      <NoticeModal isOpen={noticeOpen} onClose={() => setNoticeOpen(false)} />
    </Layout>
  )
}

function StatCard({ color, icon, val, label }) {
  return (
    <div className="bg-white/95 border border-violet-100/40 rounded-2xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border shadow-xs ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{val}</div>
        <div className="text-[11px] font-bold text-slate-400 mt-0.5">{label}</div>
      </div>
    </div>
  )
}
