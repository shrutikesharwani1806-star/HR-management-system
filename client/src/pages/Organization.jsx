import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

export default function Organization() {
  const [activeTab, setActiveTab] = useState('departments')
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [locations, setLocations] = useState([])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [d, des, l, c] = await Promise.all([
        api.get('/organization/departments'),
        api.get('/organization/designations'),
        api.get('/organization/locations'),
        api.get('/organization/company'),
      ])
      setDepartments(d.data.data)
      setDesignations(des.data.data)
      setLocations(l.data.data)
      setCompany(c.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const tabFields = {
    departments: [
      { key: 'name', label: 'Department Name', required: true },
      { key: 'code', label: 'Code' },
      { key: 'description', label: 'Description' },
    ],
    designations: [
      { key: 'name', label: 'Designation Name', required: true },
      { key: 'grade', label: 'Grade' },
      { key: 'band', label: 'Band' },
    ],
    locations: [
      { key: 'name', label: 'Location Name', required: true },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'country', label: 'Country' },
    ],
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try {
      const endpoints = { departments: '/organization/departments', designations: '/organization/designations', locations: '/organization/locations' }
      if (isEdit) {
        await api.put(`${endpoints[activeTab]}/${editingId}`, form)
      } else {
        await api.post(endpoints[activeTab], form)
      }
      setShowModal(false); setForm({}); fetchAll()
    } catch (err) { setError(err.response?.data?.message || 'Failed') }
  }

  const handleEditClick = (row) => {
    setIsEdit(true)
    setEditingId(row._id)
    const newForm = {}
    tabFields[activeTab].forEach(f => {
      newForm[f.key] = row[f.key] || ''
    })
    setForm(newForm)
    setShowModal(true)
  }

  const handleDeleteClick = async (row) => {
    if (!window.confirm(`Are you sure you want to delete this ${activeTab.slice(0, -1)}?`)) return
    try {
      if (activeTab === 'departments') {
        await api.delete(`/organization/departments/${row._id}`)
      } else if (activeTab === 'designations') {
        await api.put(`/organization/designations/${row._id}`, { ...row, isActive: false })
      } else if (activeTab === 'locations') {
        await api.put(`/organization/locations/${row._id}`, { ...row, isActive: false })
      }
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete')
    }
  }

  return (
    <Layout title="Organization">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Organization Setup</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage departments, designations, and locations</p>
        </div>
        {activeTab !== 'company' && (
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors" onClick={() => { setIsEdit(false); setEditingId(null); setForm({}); setShowModal(true); }}>
            + Add {activeTab.slice(0, -1)}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        {['departments', 'designations', 'locations', 'company'].map(t => (
          <button key={t} className={`px-4 py-2 border-b-2 font-medium text-sm transition-all -mb-px capitalize whitespace-nowrap ${activeTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10"><div className="spin" /></div>
      ) : (
        <>
          {activeTab === 'departments' && <DataTable data={departments} cols={['name', 'code', 'description']} label="Department" onEdit={handleEditClick} onDelete={handleDeleteClick} />}
          {activeTab === 'designations' && <DataTable data={designations} cols={['name', 'grade', 'band']} label="Designation" onEdit={handleEditClick} onDelete={handleDeleteClick} />}
          {activeTab === 'locations' && <DataTable data={locations} cols={['name', 'city', 'state', 'country']} label="Location" onEdit={handleEditClick} onDelete={handleDeleteClick} />}
          {activeTab === 'company' && company && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Company Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><div className="text-xs font-semibold text-slate-500 mb-1">Company Name</div><div className="text-sm font-semibold text-slate-800">{company.companyName}</div></div>
                <div><div className="text-xs font-semibold text-slate-500 mb-1">Domain</div><div className="text-sm text-slate-800">{company.domain}</div></div>
                <div><div className="text-xs font-semibold text-slate-500 mb-1">Industry</div><div className="text-sm text-slate-800">{company.industry || '—'}</div></div>
                <div><div className="text-xs font-semibold text-slate-500 mb-1">Plan</div><span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-100">{company.plan}</span></div>
                <div><div className="text-xs font-semibold text-slate-500 mb-1">Status</div><span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${company.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{company.status}</span></div>
                <div><div className="text-xs font-semibold text-slate-500 mb-1">Timezone</div><div className="text-sm text-slate-800">{company.timezone}</div></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">{isEdit ? 'Edit' : 'Add'} {activeTab.slice(0, -1)}</h3>
              <button className="text-slate-400 hover:text-slate-600 text-2xl leading-none" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">{error}</div>}
                {(tabFields[activeTab] || []).map((f) => (
                   <div key={f.key} className="form-group">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}{f.required ? ' *' : ''}</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all" value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required} />
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors">{isEdit ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

function DataTable({ data, cols, label, onEdit, onDelete }) {
  if (data.length === 0) return <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">No {label.toLowerCase()}s configured</div>
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              {cols.map(c => <th key={c} className="px-6 py-3 text-left capitalize">{c}</th>)}
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {data.map((row) => (
              <tr key={row._id} className="hover:bg-slate-50/50">
                {cols.map(c => <td key={c} className="px-6 py-4 text-sm">{row[c] || '—'}</td>)}
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${row.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-3">
                  <button className="text-indigo-600 hover:text-indigo-900 font-semibold" onClick={() => onEdit(row)}>Edit</button>
                  <button className="text-rose-600 hover:text-rose-900 font-semibold" onClick={() => onDelete(row)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
