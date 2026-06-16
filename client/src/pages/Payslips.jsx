import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Payslips() {
  const { user } = useAuth()
  const [payslips, setPayslips] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // Form state for HR uploading payslip
  const [form, setForm] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basicSalary: '',
    allowances: '0',
    deductions: '0',
    remarks: '',
  })
  
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canManage = ['leadership', 'hr_admin', 'super_admin'].includes(user?.role)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      if (canManage) {
        // Fetch all payslips and employees list for selector
        const [payslipsRes, employeesRes] = await Promise.all([
          api.get('/payslips/all'),
          api.get('/employees?limit=200')
        ])
        setPayslips(payslipsRes.data.data)
        setEmployees(employeesRes.data.data)
      } else {
        // Fetch only log-in user's payslips (completely isolated)
        const res = await api.get('/payslips/my')
        setPayslips(res.data.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch payroll records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setUploading(true)

    if (!form.employeeId || !form.month || !form.year || !form.basicSalary) {
      setError('Please fill in all required fields.')
      setUploading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('employeeId', form.employeeId)
      formData.append('month', form.month)
      formData.append('year', form.year)
      formData.append('basicSalary', form.basicSalary)
      formData.append('allowances', form.allowances)
      formData.append('deductions', form.deductions)
      formData.append('remarks', form.remarks)
      formData.append('status', 'paid')
      if (file) {
        formData.append('payslip', file)
      }

      await api.post('/payslips', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess('Monthly payment marked as Done & Payslip uploaded successfully!')
      setForm({
        employeeId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        basicSalary: '',
        allowances: '0',
        deductions: '0',
        remarks: '',
      })
      setFile(null)
      // Reset input element
      const fileInput = document.getElementById('payslipFile')
      if (fileInput) fileInput.value = ''
      
      // Refresh list
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payslip.')
    } finally {
      setUploading(false)
    }
  }

  // Format month to name
  const getMonthName = (mNum) => {
    const date = new Date()
    date.setMonth(mNum - 1)
    return date.toLocaleString('default', { month: 'long' })
  }

  return (
    <Layout title="Payslips & Salary Ledger">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Payslips & Payroll Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {canManage 
              ? 'Record employee payments, process payroll status, and upload secure payslips.' 
              : 'View and download your official monthly payslips securely.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <span>✅</span>
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* HR/LEADERSHIP UPLOAD SLIP FORM */}
        {canManage && (
          <div className="lg:col-span-4 bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Record Monthly Payment</h3>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Select Employee *</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-violet-400"
                  value={form.employeeId} 
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })} 
                  required
                >
                  <option value="">Choose employee...</option>
                  {employees.filter(e => {
                    if (user?.role === 'leadership') return ['hr_admin', 'manager'].includes(e.userId?.role)
                    if (user?.role === 'hr_admin') return ['employee', 'manager'].includes(e.userId?.role)
                    return true
                  }).map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.firstName} {e.lastName} ({e.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Month *</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-violet-400"
                    value={form.month} 
                    onChange={(e) => setForm({ ...form, month: e.target.value })} 
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Year *</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-violet-400"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Basic Salary *</label>
                <input 
                  type="number" 
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-violet-400"
                  value={form.basicSalary}
                  onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Allowances</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-violet-400"
                    value={form.allowances}
                    onChange={(e) => setForm({ ...form, allowances: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Deductions</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-violet-400"
                    value={form.deductions}
                    onChange={(e) => setForm({ ...form, deductions: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Upload Payslip PDF (Optional)</label>
                <input 
                  type="file" 
                  id="payslipFile"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Remarks</label>
                <textarea 
                  rows="2"
                  placeholder="Enter payroll remarks..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-violet-400 resize-none"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>

              <button 
                type="submit" 
                disabled={uploading}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Processing...' : 'Mark Paid & Upload Slip'}
              </button>
            </form>
          </div>
        )}

        {/* LEDGER & LIST TABLE */}
        <div className={`${canManage ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden`}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {canManage ? 'Tenant Payment History' : 'My Salary Slips'}
            </h3>
            <span className="text-[10px] font-bold text-violet-650 bg-violet-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Secure Ledger
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-violet-650 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-xs">
              📂 No payslip records found for this workspace.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    {canManage && <th className="px-6 py-4 text-left">Employee</th>}
                    <th className="px-6 py-4 text-left">Period</th>
                    <th className="px-6 py-4 text-left">Basic Salary</th>
                    <th className="px-6 py-4 text-left">Net Salary</th>
                    <th className="px-6 py-4 text-left">Payment Status</th>
                    <th className="px-6 py-4 text-center">Payslip Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-medium">
                  {payslips.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/30 transition-all">
                      {canManage && (
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {p.employeeId?.firstName} {p.employeeId?.lastName}
                          <div className="text-[10px] text-slate-400 font-normal">{p.employeeId?.employeeId}</div>
                        </td>
                      )}
                      <td className="px-6 py-4 font-mono font-bold">
                        {getMonthName(p.month)} {p.year}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        ₹{(p.basicSalary || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-violet-750">
                        ₹{(p.netSalary || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.fileUrl ? (
                          <a 
                            href={p.fileUrl.startsWith('http') || p.fileUrl.startsWith('/') ? p.fileUrl : `/uploads/${p.fileUrl}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-violet-650 hover:text-violet-800 hover:underline font-bold transition-all"
                            download
                          >
                            ⬇️ Download Slip
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No file attached</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
