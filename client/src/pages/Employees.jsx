import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Employees() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(12)
  const [sort, setSort] = useState('-createdAt')
  const [pagination, setPagination] = useState({})
  
  // Views
  const [viewMode, setViewMode] = useState('table') // 'table' or 'card'
  
  // Filters
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedDesig, setSelectedDesig] = useState('')
  const [selectedLoc, setSelectedLoc] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [selectedEmpDetail, setSelectedEmpDetail] = useState(null) // For Master Profile View Modal
  const [detailModalTab, setDetailModalTab] = useState('personal') // 'personal', 'employment', 'professional', 'documents'
  
  // Lookups
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [locations, setLocations] = useState([])
  const [managers, setManagers] = useState([])

  // Forms
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    officialEmail: '',
    phone: '',
    joiningDate: '',
    role: 'employee',
    status: 'probation',
    employmentType: 'permanent',
    departmentId: '',
    designationId: '',
    locationId: '',
    managerId: ''
  })
  const [transferForm, setTransferForm] = useState({ departmentId: '', designationId: '', locationId: '', managerId: '', transferDate: '', reason: '' })
  const [terminationForm, setTerminationForm] = useState({ reason: '', exitDate: '' })
  const [showTerminationForm, setShowTerminationForm] = useState(false)
  const [documentForm, setDocumentForm] = useState({ docType: 'id_proof', docName: '' })
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit,
        sort,
        search: search || undefined,
        department: selectedDept || undefined,
        designation: selectedDesig || undefined,
        location: selectedLoc || undefined,
        status: selectedStatus || undefined
      }
      const res = await api.get('/employees', { params })
      setEmployees(res.data.data)
      setPagination(res.data.pagination)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const fetchLookups = async () => {
    try {
      const [d, des, l, m] = await Promise.all([
        api.get('/organization/departments'),
        api.get('/organization/designations'),
        api.get('/organization/locations'),
        api.get('/employees?limit=100'),
      ])
      setDepartments(d.data.data || [])
      setDesignations(des.data.data || [])
      setLocations(l.data.data || [])
      setManagers((m.data.data || []).filter(e => ['manager', 'hr_admin', 'super_admin'].includes(e.role) || e.userId?.role !== 'employee'))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { 
    fetchEmployees()
  }, [page, limit, sort, search, selectedDept, selectedDesig, selectedLoc, selectedStatus])

  useEffect(() => {
    if (user?.role !== 'employee') {
      fetchLookups()
    }
  }, [user])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/employees', addForm)
      setShowAddModal(false)
      setAddForm({ firstName: '', lastName: '', officialEmail: '', phone: '', joiningDate: '', role: 'employee', status: 'probation', employmentType: 'permanent', departmentId: '', designationId: '', locationId: '', managerId: '' })
      fetchEmployees()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee')
    }
  }

  const handleTransfer = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/employees/${selectedEmp._id}/transfer`, transferForm)
      setShowTransferModal(false)
      setTransferForm({ departmentId: '', designationId: '', locationId: '', managerId: '', transferDate: '', reason: '' })
      alert('Transfer initiated and sent for approval.')
      fetchEmployees()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate transfer')
    }
  }

  const handleTerminate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/employees/${selectedEmpDetail._id}/terminate`, terminationForm)
      setShowTerminationForm(false);
      setTerminationForm({ reason: '', exitDate: '' })
      alert('Employment terminated successfully.')
      // Refresh details
      viewEmployeeDetails(selectedEmpDetail._id)
      fetchEmployees()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to terminate employment')
    }
  }

  const handleDocUpload = async (e) => {
    e.preventDefault()
    const file = e.target.elements.docFile.files[0]
    if (!file) return
    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('document', file)
    formData.append('docType', documentForm.docType)
    formData.append('docName', documentForm.docName || file.name)

    try {
      await api.post(`/employees/${selectedEmpDetail._id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Document uploaded successfully!')
      setDocumentForm({ docType: 'id_proof', docName: '' })
      viewEmployeeDetails(selectedEmpDetail._id)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('photo', file)

    try {
      await api.post(`/employees/${selectedEmpDetail._id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Photo uploaded successfully!')
      viewEmployeeDetails(selectedEmpDetail._id)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const viewEmployeeDetails = async (id) => {
    try {
      const res = await api.get(`/employees/${id}`)
      setSelectedEmpDetail(res.data.data)
      setDetailModalTab('personal')
    } catch (err) {
      alert('Failed to fetch employee details')
    }
  }

  const getInitials = (first, last) => ((first?.[0] || '') + (last?.[0] || '')).toUpperCase()
  
  const getStatusBadge = (status) => {
    const map = { 
      active: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
      probation: 'bg-amber-50 text-amber-700 border-amber-100', 
      terminated: 'bg-rose-50 text-rose-700 border-rose-100', 
      resigned: 'bg-slate-55 text-slate-700 border-slate-150',
      notice: 'bg-orange-50 text-orange-700 border-orange-100'
    }
    return map[status] || 'bg-slate-50 text-slate-700 border-slate-100'
  }

  return (
    <Layout title="Employees">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Employee Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage workforce profiles, roles, and transitions • Total Employees: {pagination.total ?? 0}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button 
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-xs text-indigo-750' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => setViewMode('table')}
            >
              📋 Table
            </button>
            <button 
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow-xs text-indigo-750' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => setViewMode('card')}
            >
              📇 Cards
            </button>
          </div>

          {user?.role !== 'employee' && (
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors" onClick={() => setShowAddModal(true)}>
              + Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          <div className="md:col-span-2 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔍</span>
            <input 
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" 
              placeholder="Search name, email, ID..." 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1) }} 
            />
          </div>

          {/* Department Filter */}
          <div>
            <select 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setPage(1) }}
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>

          {/* Designation Filter */}
          <div>
            <select 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
              value={selectedDesig}
              onChange={(e) => { setSelectedDesig(e.target.value); setPage(1) }}
            >
              <option value="">All Designations</option>
              {designations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <select 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
              value={selectedLoc}
              onChange={(e) => { setSelectedLoc(e.target.value); setPage(1) }}
            >
              <option value="">All Locations</option>
              {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1) }}
            >
              <option value="-createdAt">Newest First</option>
              <option value="firstName">Name (A-Z)</option>
              <option value="-firstName">Name (Z-A)</option>
              <option value="joiningDate">Joining Date (Oldest)</option>
              <option value="-joiningDate">Joining Date (Newest)</option>
              <option value="employeeId">Employee ID (A-Z)</option>
              <option value="-employeeId">Employee ID (Z-A)</option>
            </select>
          </div>

          {/* Page Size */}
          <div>
            <select 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
            >
              <option value="12">12 per page</option>
              <option value="24">24 per page</option>
              <option value="48">48 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(selectedDept || selectedDesig || selectedLoc || selectedStatus) && (
          <div className="flex justify-end">
            <button 
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              onClick={() => {
                setSelectedDept('')
                setSelectedDesig('')
                setSelectedLoc('')
                setSelectedStatus('')
                setPage(1)
              }}
            >
              🧹 Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Employee List */}
      {loading ? (
        <div className="flex justify-center items-center py-20"><div className="spin" /></div>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-20 text-center text-slate-400">No employees found matching criteria</div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Employee</th>
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-6 py-3 text-left">Department</th>
                  <th className="px-6 py-3 text-left">Designation</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Location</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => viewEmployeeDetails(emp._id)}>
                        {emp.photoUrl ? (
                          <img src={emp.photoUrl} alt="Photo" className="w-9 h-9 rounded-full object-cover border border-slate-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-750 flex items-center justify-center font-bold text-xs">
                            {getInitials(emp.firstName, emp.lastName)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors">{emp.firstName} {emp.lastName}</div>
                          <div className="text-xs text-slate-400">{emp.officialEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">{emp.employeeId}</code>
                    </td>
                    <td className="px-6 py-4 text-sm">{emp.departmentId?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm">{emp.designationId?.name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 uppercase tracking-wider border border-slate-200">
                        {emp.userId?.role ? emp.userId.role.replace('_', ' ') : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{emp.locationId?.name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(emp.status)}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                        onClick={() => viewEmployeeDetails(emp._id)}
                      >
                        👁️ Profile
                      </button>
                      {user?.role !== 'employee' && (
                        <button 
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold transition-colors"
                          onClick={() => { setSelectedEmp(emp); setTransferForm({ departmentId: emp.departmentId?._id || '', designationId: emp.designationId?._id || '', locationId: emp.locationId?._id || '', managerId: emp.managerId?._id || '', transferDate: '', reason: '' }); setShowTransferModal(true) }}
                        >
                          🔄 Transfer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {employees.map((emp) => (
            <div key={emp._id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col items-center text-center space-y-4 hover:shadow-md transition-shadow relative">
              <span className={`absolute top-4 right-4 px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadge(emp.status)}`}>
                {emp.status}
              </span>
              
              {emp.photoUrl ? (
                <img src={emp.photoUrl} alt="Photo" className="w-16 h-16 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-750 flex items-center justify-center font-bold text-lg">
                  {getInitials(emp.firstName, emp.lastName)}
                </div>
              )}

              <div>
                <h3 className="font-bold text-slate-800 text-sm hover:text-indigo-600 cursor-pointer" onClick={() => viewEmployeeDetails(emp._id)}>
                  {emp.firstName} {emp.lastName}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{emp.employeeId}</p>
                <p className="text-xs text-slate-500 font-semibold mt-2">{emp.designationId?.name || 'Designation'}</p>
                <div className="mt-1">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 uppercase tracking-wider border border-slate-200">
                    {emp.userId?.role ? emp.userId.role.replace('_', ' ') : '—'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{emp.departmentId?.name || 'Department'} • {emp.locationId?.name || 'Location'}</p>
              </div>

              <div className="w-full border-t border-slate-100 pt-3 flex gap-2">
                <button 
                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                  onClick={() => viewEmployeeDetails(emp._id)}
                >
                  👁️ Profile
                </button>
                {user?.role !== 'employee' && (
                  <button 
                    className="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold transition-colors"
                    onClick={() => { setSelectedEmp(emp); setTransferForm({ departmentId: emp.departmentId?._id || '', designationId: emp.designationId?._id || '', locationId: emp.locationId?._id || '', managerId: emp.managerId?._id || '', transferDate: '', reason: '' }); setShowTransferModal(true) }}
                  >
                    🔄
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="px-6 py-4 bg-white border border-slate-200 rounded-xl mt-6 flex items-center justify-between shadow-xs">
          <span className="text-xs text-slate-500">Showing {employees.length} of {pagination.total}</span>
          <div className="flex gap-2">
            <button 
              className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setPage(p => p - 1)} 
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className="px-3 py-1 text-xs text-slate-650 font-semibold">Page {page} of {pagination.pages}</span>
            <button 
              className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setPage(p => p + 1)} 
              disabled={page >= pagination.pages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* MASTER PROFILE DETAILED MODAL */}
      {selectedEmpDetail && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setSelectedEmpDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {selectedEmpDetail.photoUrl ? (
                    <img src={selectedEmpDetail.photoUrl} alt="Photo" className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-750 flex items-center justify-center font-bold text-sm">
                      {getInitials(selectedEmpDetail.firstName, selectedEmpDetail.lastName)}
                    </div>
                  )}
                  {user?.role !== 'employee' && (
                    <label className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-1 shadow-md cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                      <span className="text-[8px] font-bold">📸</span>
                    </label>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{selectedEmpDetail.firstName} {selectedEmpDetail.lastName}</h3>
                  <p className="text-xs text-slate-500 capitalize">{selectedEmpDetail.designationId?.name || 'Employee'} • {selectedEmpDetail.departmentId?.name || 'Department'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user?.role !== 'employee' && selectedEmpDetail.status !== 'terminated' && (
                  <button 
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors mr-2"
                    onClick={() => { setShowTerminationForm(!showTerminationForm); setSelectedEmp(selectedEmpDetail) }}
                  >
                    ⚠️ Terminate Employment
                  </button>
                )}
                <button className="text-slate-400 hover:text-slate-600 text-2xl leading-none" onClick={() => setSelectedEmpDetail(null)}>×</button>
              </div>
            </div>

            {/* Termination Form overlay */}
            {showTerminationForm && (
              <div className="bg-rose-50/70 border-b border-rose-200 p-4 flex-shrink-0">
                <form onSubmit={handleTerminate} className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-rose-800 mb-1">Reason for Termination</label>
                    <input className="w-full px-3 py-1.5 border border-rose-200 rounded-lg text-sm bg-white outline-none" placeholder="Reason details..." value={terminationForm.reason} onChange={(e) => setTerminationForm({ ...terminationForm, reason: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rose-800 mb-1">Exit Date</label>
                    <input type="date" className="w-full px-3 py-1.5 border border-rose-200 rounded-lg text-sm bg-white outline-none" value={terminationForm.exitDate} onChange={(e) => setTerminationForm({ ...terminationForm, exitDate: e.target.value })} required />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700">Submit Termination</button>
                    <button type="button" className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold" onClick={() => setShowTerminationForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-150 bg-slate-50/50 px-6 flex-shrink-0">
              {['personal', 'employment', 'professional', 'documents'].map(tab => (
                <button
                  key={tab}
                  className={`px-4 py-3 text-xs font-bold capitalize transition-all border-b-2 -mb-px ${detailModalTab === tab ? 'border-indigo-600 text-indigo-750 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  onClick={() => setDetailModalTab(tab)}
                >
                  {tab === 'personal' ? 'Personal & Contact' : tab === 'employment' ? 'Employment & Bank' : tab}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {detailModalTab === 'personal' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Personal Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="block text-xs text-slate-400">Gender</span>
                        <span className="text-sm font-semibold text-slate-800 capitalize">{selectedEmpDetail.gender || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Date of Birth</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.dateOfBirth ? new Date(selectedEmpDetail.dateOfBirth).toLocaleDateString() : '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Marital Status</span>
                        <span className="text-sm font-semibold text-slate-800 capitalize">{selectedEmpDetail.maritalStatus || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Nationality</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.nationality || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Blood Group</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.bloodGroup || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Contact Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="block text-xs text-slate-400">Official Email</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.officialEmail || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Personal Email</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.personalEmail || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Phone</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.phone || '—'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-xs text-slate-400">Current Address</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {selectedEmpDetail.currentAddress ? 
                            `${selectedEmpDetail.currentAddress.line1 || ''}, ${selectedEmpDetail.currentAddress.city || ''}, ${selectedEmpDetail.currentAddress.state || ''}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Emergency Contact</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="block text-xs text-slate-400">Name</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.emergencyContact?.name || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Relationship</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.emergencyContact?.relationship || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Phone</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.emergencyContact?.phone || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailModalTab === 'employment' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Employment Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="block text-xs text-slate-400">Employee ID</span>
                        <span className="text-sm font-semibold text-slate-850 font-mono">{selectedEmpDetail.employeeId}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Joining Date</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.joiningDate ? new Date(selectedEmpDetail.joiningDate).toLocaleDateString() : '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Employment Type</span>
                        <span className="text-sm font-semibold text-slate-800 capitalize">{selectedEmpDetail.employmentType || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Department</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.departmentId?.name || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Designation</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.designationId?.name || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Location</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.locationId?.name || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Manager</span>
                        <span className="text-sm font-semibold text-slate-850">
                          {selectedEmpDetail.managerId ? `${selectedEmpDetail.managerId.firstName} ${selectedEmpDetail.managerId.lastName}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Shift</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.shiftId?.name || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400">Grade / Band</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.grade || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Bank Details & Statutory Data</h4>
                    {selectedEmpDetail.pan || selectedEmpDetail.bankDetails ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <span className="block text-xs text-slate-400">Bank Name</span>
                          <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.bankDetails?.bankName || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-400">Account Number</span>
                          <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.bankDetails?.accountNumber || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-400">IFSC Code</span>
                          <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.bankDetails?.ifscCode || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-400">PAN Card</span>
                          <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.pan || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-400">Aadhaar Card</span>
                          <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.aadhaar || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-400">PF Account</span>
                          <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.pf || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-400">UAN Number</span>
                          <span className="text-sm font-semibold text-slate-800">{selectedEmpDetail.uan || '—'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-150">
                        🔒 Sensitive financial data is restricted to HR Admins, Super Admins, and the user themselves.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailModalTab === 'professional' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Education History</h4>
                    {selectedEmpDetail.education?.length === 0 ? (
                      <p className="text-xs text-slate-400">No education details recorded.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedEmpDetail.education?.map((edu, i) => (
                          <div key={i} className="border border-slate-150 rounded-lg p-3 text-sm">
                            <div className="font-semibold text-slate-850">{edu.degree}</div>
                            <div className="text-xs text-slate-500">{edu.institution} • {edu.year}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmpDetail.skills?.length === 0 ? (
                        <span className="text-xs text-slate-400">No skills listed.</span>
                      ) : (
                        selectedEmpDetail.skills?.map((s, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">{s}</span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {detailModalTab === 'documents' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Uploaded Documents</h4>
                  </div>
                  
                  {selectedEmpDetail.documents?.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">No documents uploaded.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      {selectedEmpDetail.documents?.map((doc, i) => (
                        <div key={i} className="px-4 py-3 flex items-center justify-between text-sm hover:bg-slate-50">
                          <div>
                            <div className="font-semibold text-slate-850">{doc.name}</div>
                            <div className="text-xs text-slate-400 capitalize">{doc.type.replace('_', ' ')} • Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                          </div>
                          <a href={doc.url} target="_blank" rel="noreferrer" className="px-3 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-700 transition-colors">
                            View Document
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Document Uploader */}
                  {user?.role !== 'employee' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6">
                      <h5 className="font-bold text-slate-800 text-xs mb-3">Upload Employee Document</h5>
                      <form onSubmit={handleDocUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Document Type</label>
                          <select className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none" value={documentForm.docType} onChange={(e) => setDocumentForm({ ...documentForm, docType: e.target.value })}>
                            <option value="id_proof">ID Proof</option>
                            <option value="offer_letter">Offer Letter</option>
                            <option value="contract">Contracts</option>
                            <option value="certificate">Certificates</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Custom Name (optional)</label>
                          <input className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none" value={documentForm.docName} onChange={(e) => setDocumentForm({ ...documentForm, docName: e.target.value })} placeholder="Offer_Letter_2026.pdf" />
                        </div>
                        <div className="flex gap-2">
                          <input type="file" name="docFile" className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" required />
                          <button type="submit" className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold" disabled={uploading}>
                            {uploading ? 'Uploading...' : 'Upload'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end flex-shrink-0">
              <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 font-semibold" onClick={() => setSelectedEmpDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Add New Employee</h3>
              <button className="text-slate-400 hover:text-slate-600 text-2xl leading-none" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{error}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">First Name *</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name *</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} required />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Official Email *</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" type="email" value={addForm.officialEmail} onChange={(e) => setAddForm({ ...addForm, officialEmail: e.target.value })} required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Joining Date *</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" type="date" value={addForm.joiningDate} onChange={(e) => setAddForm({ ...addForm, joiningDate: e.target.value })} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}>
                      <option value="probation">Probation</option>
                      <option value="active">Active</option>
                      <option value="notice">Notice Period</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Employment Type</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={addForm.employmentType} onChange={(e) => setAddForm({ ...addForm, employmentType: e.target.value })}>
                      <option value="permanent">Permanent</option>
                      <option value="contractual">Contractual</option>
                      <option value="intern">Intern</option>
                      <option value="consultant">Consultant</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={addForm.departmentId} onChange={(e) => setAddForm({ ...addForm, departmentId: e.target.value })}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Designation</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={addForm.designationId} onChange={(e) => setAddForm({ ...addForm, designationId: e.target.value })}>
                      <option value="">Select Designation</option>
                      {designations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={addForm.locationId} onChange={(e) => setAddForm({ ...addForm, locationId: e.target.value })}>
                      <option value="">Select Location</option>
                      {locations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Reporting Manager</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={addForm.managerId} onChange={(e) => setAddForm({ ...addForm, managerId: e.target.value })}>
                      <option value="">Select Manager</option>
                      {managers.map(m => <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">System Role</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    {user?.role === 'leadership' && <option value="hr_admin">HR Admin</option>}
                    {user?.role === 'leadership' && <option value="leadership">Leadership</option>}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors">Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Employee Modal */}
      {showTransferModal && selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowTransferModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Initiate Transfer: {selectedEmp.firstName} {selectedEmp.lastName}</h3>
              <button className="text-slate-400 hover:text-slate-600 text-2xl leading-none" onClick={() => setShowTransferModal(false)}>×</button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="p-6 space-y-4">
                {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{error}</div>}
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Department</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none" value={transferForm.departmentId} onChange={(e) => setTransferForm({ ...transferForm, departmentId: e.target.value })}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Designation</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none" value={transferForm.designationId} onChange={(e) => setTransferForm({ ...transferForm, designationId: e.target.value })}>
                    <option value="">Select Designation</option>
                    {designations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Location</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none" value={transferForm.locationId} onChange={(e) => setTransferForm({ ...transferForm, locationId: e.target.value })}>
                    <option value="">Select Location</option>
                    {locations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reporting Manager</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none" value={transferForm.managerId} onChange={(e) => setTransferForm({ ...transferForm, managerId: e.target.value })}>
                    <option value="">Select Manager</option>
                    {managers.map(m => <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Transfer Date *</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none" type="date" value={transferForm.transferDate} onChange={(e) => setTransferForm({ ...transferForm, transferDate: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for Transfer</label>
                  <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none" rows="2" value={transferForm.reason} onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })} />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => setShowTransferModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors">Initiate Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
