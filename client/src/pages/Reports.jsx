import React, { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { usePermission } from '../context/usePermission'

const REPORT_TYPES = [
  { key: 'headcount', label: 'Headcount', icon: '👥', endpoint: '/reports/headcount' },
  { key: 'attendance', label: 'Attendance Summary', icon: '⏰', endpoint: '/reports/attendance-summary' },
  { key: 'leave', label: 'Leave Summary', icon: '📅', endpoint: '/reports/leave-summary' },
  { key: 'overtime', label: 'Overtime', icon: '🔥', endpoint: '/reports/overtime' },
  { key: 'late', label: 'Late Arrivals', icon: '🕐', endpoint: '/reports/late-arrivals' },
  { key: 'absence', label: 'Absence', icon: '🚫', endpoint: '/reports/absence' },
  { key: 'attrition', label: 'Attrition', icon: '📉', endpoint: '/reports/attrition' },
]

export default function Reports() {
  const { hasRole } = usePermission()
  const [activeReport, setActiveReport] = useState('headcount')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [filters, setFilters] = useState({ startDate: '', endDate: '', department: '', location: '', year: new Date().getFullYear().toString() })
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState('')

  // Load departments and locations for filters
  useEffect(() => {
    api.get('/organization/departments').then(r => setDepartments(r.data.data || [])).catch(() => {})
    api.get('/organization/locations').then(r => setLocations(r.data.data || [])).catch(() => {})
  }, [])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    const report = REPORT_TYPES.find(r => r.key === activeReport)
    if (!report) return setLoading(false)

    const params = new URLSearchParams()
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    if (filters.department) params.set('department', filters.department)
    if (filters.location) params.set('location', filters.location)
    if (filters.year && (activeReport === 'leave' || activeReport === 'attrition')) params.set('year', filters.year)

    try {
      const res = await api.get(`${report.endpoint}?${params.toString()}`)
      setData(res.data.data || [])
    } catch { setData([]) }
    setLoading(false)
  }, [activeReport, filters])

  useEffect(() => { fetchReport() }, [fetchReport])

  const handleExport = async (format) => {
    setExporting(true)
    setExportMsg('')
    try {
      const res = await api.post('/reports/export', {
        reportType: activeReport,
        format,
        filters,
      })
      const jobId = res.data.jobId
      // Poll for completion
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const status = await api.get(`/reports/export/status/${jobId}`)
          if (status.data.data.status === 'completed') {
            clearInterval(poll)
            setExporting(false)
            setExportMsg(`✅ Export ready!`)
            if (status.data.data.fileUrl) {
              window.open(status.data.data.fileUrl, '_blank')
            }
          } else if (status.data.data.status === 'failed' || attempts > 30) {
            clearInterval(poll)
            setExporting(false)
            setExportMsg(`❌ Export failed: ${status.data.data.error || 'Timeout'}`)
          }
        } catch {
          clearInterval(poll)
          setExporting(false)
          setExportMsg('❌ Export status check failed')
        }
      }, 2000)
    } catch (err) {
      setExporting(false)
      setExportMsg(err.response?.data?.message || 'Export failed')
    }
  }

  const activeReportMeta = REPORT_TYPES.find(r => r.key === activeReport)
  const showDateFilters = ['attendance', 'overtime', 'late', 'absence'].includes(activeReport)
  const showYearFilter = ['leave', 'attrition'].includes(activeReport)
  const showDeptFilter = ['headcount'].includes(activeReport)

  return (
    <Layout title="Reports & Analytics">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 mb-6 shadow-xl animate-fade-in-up">
        <h2 className="text-xl font-black flex items-center gap-2">📊 Reports & Analytics</h2>
        <p className="text-sm text-slate-400 mt-1">Generate workforce reports with date, department, and location filters. Export to CSV, Excel, or PDF.</p>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 animate-fade-in-up" style={{animationDelay:'100ms'}}>
        {REPORT_TYPES.map(r => (
          <button key={r.key} onClick={() => setActiveReport(r.key)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeReport === r.key ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {r.icon} {r.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm animate-fade-in-up" style={{animationDelay:'150ms'}}>
        <h3 className="text-sm font-bold text-slate-800 mb-3">🔍 Filters</h3>
        <div className="flex flex-wrap gap-3 items-end">
          {showDateFilters && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
                <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
                <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none" />
              </div>
            </>
          )}
          {showYearFilter && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Year</label>
              <select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          {showDeptFilter && departments.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Department</label>
              <select value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          )}
          {showDeptFilter && locations.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Location</label>
              <select value={filters.location} onChange={e => setFilters({...filters, location: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none">
                <option value="">All Locations</option>
                {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={fetchReport} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 text-sm transition-all">Apply</button>
        </div>
      </div>

      {/* Export Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in-up" style={{animationDelay:'200ms'}}>
        <span className="text-sm font-bold text-slate-600">Export:</span>
        {['csv', 'xlsx', 'pdf'].map(fmt => (
          <button key={fmt} onClick={() => handleExport(fmt)} disabled={exporting} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-sm transition-all disabled:opacity-50">
            {fmt === 'csv' ? '📄 CSV' : fmt === 'xlsx' ? '📊 Excel' : '📋 PDF'}
          </button>
        ))}
        {exporting && <span className="text-xs text-indigo-600 font-semibold animate-pulse">Generating export...</span>}
        {exportMsg && <span className="text-xs font-semibold">{exportMsg}</span>}
      </div>

      {/* Report Data */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up" style={{animationDelay:'250ms'}}>
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <span className="text-lg">{activeReportMeta?.icon}</span>
          <h3 className="text-sm font-bold text-slate-800">{activeReportMeta?.label} Report</h3>
          <span className="ml-auto text-xs text-slate-400 font-semibold">{data.length} records</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner" /></div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-semibold">No data available for this report</div>
        ) : (
          <div className="overflow-x-auto">
            {/* Headcount Report */}
            {activeReport === 'headcount' && (
              <div className="p-5 space-y-3">
                {data.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold text-sm text-slate-700 capitalize">{item._id || 'Unknown'}</span>
                    <span className="text-lg font-black text-indigo-600">{item.count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Attendance Summary / Leave Summary */}
            {(activeReport === 'attendance' || activeReport === 'leave') && (
              <div className="p-5 space-y-3">
                {data.map((item, i) => {
                  const total = data.reduce((s, x) => s + (x.count || x.total || 0), 0) || 1
                  const val = item.count || item.total || 0
                  const pct = Math.round((val / total) * 100)
                  const colors = { present:'bg-emerald-500', absent:'bg-slate-400', late:'bg-amber-400', approved:'bg-emerald-500', pending:'bg-amber-400', rejected:'bg-rose-400' }
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span className="capitalize">{item._id?.replace('_', ' ')}</span>
                        <span>{val} {activeReport === 'leave' ? `days (${item.count} req)` : `(${pct}%)`}</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[item._id] || 'bg-indigo-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Overtime / Late / Absence - Tabular */}
            {['overtime', 'late', 'absence'].includes(activeReport) && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Employee</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">ID</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Date</th>
                    {activeReport === 'overtime' && <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">OT Minutes</th>}
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 100).map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        {item.employeeName || (item.employeeId ? `${item.employeeId.firstName} ${item.employeeId.lastName}` : '—')}
                      </td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">
                        {item.employeeId?.employeeId || item.employeeId || '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                      </td>
                      {activeReport === 'overtime' && (
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                            +{item.overtimeMinutes || 0} min
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'late' ? 'bg-amber-100 text-amber-700' : item.status === 'absent' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                          {item.status || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Attrition - Monthly Bar Chart */}
            {activeReport === 'attrition' && (
              <div className="p-5">
                {data.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">No attrition data</div>
                ) : (
                  <div className="flex items-end gap-2 h-48">
                    {data.map(item => {
                      const max = Math.max(...data.map(a => a.count))
                      const h = Math.round((item.count / max) * 100)
                      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                      return (
                        <div key={item._id.month} className="flex-1 flex flex-col items-center justify-end group cursor-pointer">
                          <div className="w-full bg-rose-200 group-hover:bg-rose-500 rounded-t-md transition-all relative" style={{ height: `${h}%`, minHeight: '10%' }}>
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-black text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-0.5 rounded shadow-sm border border-rose-100">{item.count}</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{months[item._id.month - 1]}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
