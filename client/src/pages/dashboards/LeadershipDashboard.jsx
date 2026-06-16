import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import NoticeModal from '../../components/NoticeModal'
import api from '../../api/axios'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function KpiCard({ icon, value, label, accent, sub }) {
  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 ${accent || 'border-slate-200'}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <div className="text-3xl font-black text-slate-800">{value}</div>
      {sub && <div className="text-xs font-semibold text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function ProgressBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
        <span>{label}</span>
        <span>{value} ({pct}%)</span>
      </div>
      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function LeadershipDashboard() {
  const [data, setData] = useState(null)
  const [attrition, setAttrition] = useState([])
  const [loading, setLoading] = useState(true)
  const [noticeOpen, setNoticeOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/reports/leadership-overview'),
      api.get('/reports/attrition'),
    ]).then(([o, a]) => {
      setData(o.data.data)
      setAttrition(a.data.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout title="Strategic Dashboard">
      <div className="flex justify-center items-center py-20"><div className="spinner" /></div>
    </Layout>
  )

  const d = data || {}
  const c = d.company || {}
  const att = d.attendance || {}
  const lv = d.leave || {}
  const wf = d.workforce || {}
  const trends = d.trends || {}

  return (
    <Layout title="Strategic Dashboard (Leadership View)">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 rounded-3xl p-6 md:p-8 mb-6 shadow-2xl animate-fade-in-up relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 50%, #8b5cf6 0%, transparent 50%)'}} />
        <div className="relative">
          <h2 className="text-2xl font-black text-white tracking-tight mb-1 flex items-center gap-2">
            <span>👑</span> Organization Command Center
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            Complete visibility across your entire tenant — workforce health, attendance trends, leave analytics, and organizational structure at a glance.
          </p>
        </div>
      </div>

      {/* Company Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 animate-fade-in-up" style={{animationDelay:'100ms'}}>
        <KpiCard icon="👥" value={c.totalEmployees || 0} label="Total Employees" />
        <KpiCard icon="👨‍💼" value={c.totalManagers || 0} label="Managers" />
        <KpiCard icon="🛡️" value={c.totalHrUsers || 0} label="HR Users" />
        <KpiCard icon="✅" value={c.activeEmployees || 0} label="Active" accent="border-emerald-200" />
        <KpiCard icon="🌟" value={c.newJoinersThisMonth || 0} label="New Joiners" accent="border-indigo-200" sub="This month" />
        <KpiCard icon="👑" value={c.totalLeadership || 0} label="Leadership" accent="border-amber-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fade-in-up" style={{animationDelay:'200ms'}}>
        {/* Attendance Analytics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">📊 Today's Attendance</h3>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-emerald-700">{att.present}</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase">Present</div>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-rose-700">{att.absent}</div>
              <div className="text-[10px] font-bold text-rose-600 uppercase">Absent</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-amber-700">{att.late}</div>
              <div className="text-[10px] font-bold text-amber-600 uppercase">Late</div>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-indigo-700">{att.rate}%</div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase">Attendance Rate</div>
            </div>
          </div>
        </div>

        {/* Leave Analytics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">📅 Leave Analytics (YTD)</h3>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-amber-700">{lv.pending}</div>
              <div className="text-[10px] font-bold text-amber-600 uppercase">Pending</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-emerald-700">{lv.approved}</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase">Approved</div>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-rose-700">{lv.rejected}</div>
              <div className="text-[10px] font-bold text-rose-600 uppercase">Rejected</div>
            </div>
          </div>
          {(lv.departmentStats || []).length > 0 && (
            <div className="space-y-2 mt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">By Department</span>
              {lv.departmentStats.slice(0, 5).map((ds, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-600">
                  <span className="font-semibold">{ds.name}</span>
                  <span className="text-slate-400">{ds.total} days ({ds.pending}P / {ds.approved}A / {ds.rejected}R)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fade-in-up" style={{animationDelay:'300ms'}}>
        {/* Department Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">🏢 Department Distribution</h3>
          <div className="space-y-3">
            {(wf.departmentDistribution || []).map((dep, i) => (
              <ProgressBar key={i} label={dep.name} value={dep.count} max={c.activeEmployees || 1} color="bg-indigo-500" />
            ))}
            {(wf.departmentDistribution || []).length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No department data yet</div>
            )}
          </div>
        </div>

        {/* Employee Growth Trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">📈 Employee Growth (YTD)</h3>
          {(trends.monthlyGrowth || []).length > 0 ? (
            <div className="flex items-end gap-2 h-40 mt-4">
              {trends.monthlyGrowth.map(item => {
                const max = Math.max(...trends.monthlyGrowth.map(a => a.count))
                const h = Math.round((item.count / max) * 100)
                return (
                  <div key={item._id.month} className="flex-1 flex flex-col items-center justify-end group cursor-pointer">
                    <div className="w-full bg-indigo-200 group-hover:bg-indigo-500 rounded-t-md transition-all relative" style={{ height: `${h}%`, minHeight: '10%' }}>
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-0.5 rounded shadow-sm border border-indigo-100">{item.count}</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{MONTHS[item._id.month - 1]}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm font-semibold bg-slate-50 rounded-xl">No growth data this year</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-fade-in-up" style={{animationDelay:'400ms'}}>
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1">
          <span>Quick Actions</span> <span className="opacity-70">⚡</span>
        </h3>
        <div className="flex flex-wrap gap-3">
          <a href="/user-management" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 hover:scale-105 transition-all text-sm">👥 User Management</a>
          <a href="/employees" className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm">🧸 View Employees</a>
          <a href="/organization" className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm">🏢 Company Settings</a>
          <a href="/reports" className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm">📊 View Reports</a>
          <a href="/approvals" className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm">✅ Approvals</a>
          <button onClick={() => setNoticeOpen(true)} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl transition-all text-sm shadow-sm hover:shadow">📢 Announce Holiday</button>
        </div>
      </div>
      <NoticeModal isOpen={noticeOpen} onClose={() => setNoticeOpen(false)} />
    </Layout>
  )
}
