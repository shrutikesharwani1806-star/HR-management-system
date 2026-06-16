import React, { useState, useEffect } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function ProfileEditModal({ isOpen, onClose }) {
  const { refreshUser } = useAuth()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    nationality: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [employeeId, setEmployeeId] = useState(null)

  useEffect(() => {
    if (isOpen) {
      const fetchProfile = async () => {
        setLoading(true)
        setError('')
        setMsg('')
        try {
          const res = await api.get('/employees/me')
          const data = res.data.data || {}
          setEmployeeId(data._id)
          setForm({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            dateOfBirth: data.dateOfBirth ? data.dateOfBirth.substring(0, 10) : '',
            gender: data.gender || '',
            maritalStatus: data.maritalStatus || '',
            nationality: data.nationality || ''
          })
        } catch (err) {
          setError('Failed to fetch profile details.')
        } finally {
          setLoading(false)
        }
      }
      fetchProfile()
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!employeeId) return

    setSubmitting(true)
    setError('')
    setMsg('')

    try {
      const res = await api.put(`/employees/${employeeId}`, form)
      
      // Save details to localStorage immediately
      const stored = localStorage.getItem('user')
      if (stored) {
        const userData = JSON.parse(stored)
        userData.employee = res.data.data
        localStorage.setItem('user', JSON.stringify(userData))
      }

      setMsg('✅ Profile updated successfully.')
      if (refreshUser) refreshUser()
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-fade-in-up my-8">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            👤 Quick Edit Profile
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
        </div>

        {msg && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-xl">{msg}</div>}
        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">First Name</label>
                <input
                  required
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Last Name</label>
                <input
                  required
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer Not To Say</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Marital Status</label>
                <select
                  value={form.maritalStatus}
                  onChange={e => setForm({ ...form, maritalStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                >
                  <option value="">Select Status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Nationality</label>
                <input
                  value={form.nationality}
                  onChange={e => setForm({ ...form, nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all text-sm shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
