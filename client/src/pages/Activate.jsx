import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

// ─── Toast Notification Component ──────────────────────────────────────────
function Toast({ toasts, dismiss }) {
  return (
    <div className="fixed top-5 right-5 z-55 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full">
      {toasts.map(t => (
        <div key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-xl border text-sm font-bold backdrop-blur-md animate-fade-in-up ${
            t.type === 'error'
              ? 'bg-rose-50/95 border-rose-100 text-rose-700 shadow-rose-100/30'
              : 'bg-emerald-50/95 border-emerald-100 text-emerald-700 shadow-emerald-100/30'
          }`}
        >
          <span className="text-base mt-0.5 shrink-0">
            {t.type === 'error' ? '⚠️' : '✅'}
          </span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="shrink-0 text-slate-400 hover:text-slate-600 cursor-pointer font-black">×</button>
        </div>
      ))}
    </div>
  )
}

export default function Activate() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [verifyingError, setVerifyingError] = useState('')
  const [toasts, setToasts] = useState([])

  // Account information resolved from token or current session
  const [accountInfo, setAccountInfo] = useState({
    email: '',
    role: '',
    name: '',
    tenantId: ''
  })

  // Form fields
  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
    personalEmail: '',
    phone: '',
    currentAddress: '',
    gender: 'male',
    maritalStatus: 'single',
    bloodGroup: '',
    acceptedPolicies: false
  })

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  // 1. Verify token or load current session
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      if (token) {
        try {
          const res = await api.get(`/auth/activate/verify?token=${token}`)
          const { email, role, tenantId, employee } = res.data.data
          setAccountInfo({
            email,
            role,
            name: employee ? `${employee.firstName} ${employee.lastName}` : 'New Employee',
            tenantId
          })
          if (employee) {
            setForm(f => ({
              ...f,
              phone: employee.phone || '',
              gender: employee.gender || 'male',
              maritalStatus: employee.maritalStatus || 'single',
              bloodGroup: employee.bloodGroup || ''
            }))
          }
        } catch (err) {
          setVerifyingError(err.response?.data?.message || 'Invalid or expired activation link.')
        }
      } else if (user && user.isActivated === false) {
        setAccountInfo({
          email: user.email,
          role: user.role,
          name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'New Employee',
          tenantId: user.tenantId
        })
        if (user.employee) {
          setForm(f => ({
            ...f,
            phone: user.employee.phone || '',
            gender: user.employee.gender || 'male',
            maritalStatus: user.employee.maritalStatus || 'single',
            bloodGroup: user.employee.bloodGroup || ''
          }))
        }
      } else {
        // If already activated, send to dashboard
        if (user && user.isActivated) {
          navigate('/dashboard')
        } else {
          setVerifyingError('Activation token is missing. Please use the link provided in your invitation email or log in with your temporary password.')
        }
      }
      setLoading(false)
    }
    init()
  }, [token, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      showToast('Passwords do not match.', 'error')
      return
    }
    if (form.password.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error')
      return
    }
    if (!form.acceptedPolicies) {
      showToast('You must accept the company policies to activate your account.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        token: token || undefined,
        password: form.password,
        personalEmail: form.personalEmail || undefined,
        phone: form.phone || undefined,
        currentAddress: form.currentAddress ? { line1: form.currentAddress } : undefined,
        maritalStatus: form.maritalStatus,
        bloodGroup: form.bloodGroup || undefined,
        gender: form.gender
      }

      const res = await api.post('/auth/activate', payload)
      const { accessToken, refreshToken, user: userData } = res.data.data
      
      // Save tokens & user to localStorage
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(userData))

      showToast('Account activated successfully! Redirecting you to your dashboard...', 'success')
      
      // Refresh AuthContext user state
      await refreshUser()

      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to activate account. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(79,70,229,0.06),transparent_50%)]" />
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-600 animate-spin" />
        <p className="text-slate-400 text-sm font-semibold mt-4">Verifying activation invitation...</p>
      </div>
    )
  }

  if (verifyingError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.08),transparent_50%)]" />
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center text-2xl mx-auto">
            ⚠️
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Activation Failed</h2>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">{verifyingError}</p>
          </div>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700"
          >
            Back to Login Screen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
      <Toast toasts={toasts} dismiss={dismissToast} />
      
      {/* Decorative gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(79,70,229,0.06),transparent_50%)]" />

      <div className="w-full max-w-3xl bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10">
        
        {/* Banner header */}
        <div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-8 border-b border-slate-800 text-center">
          <h1 className="text-2xl font-bold text-slate-100">Welcome to {accountInfo.tenantId || 'HRMS'}</h1>
          <p className="text-indigo-300 text-xs font-semibold mt-1">Onboarding Profile Completion & Account Activation</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Read Only Invitation Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 p-4 border border-slate-800 rounded-2xl">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-black">Employee Name</span>
              <span className="text-sm font-bold text-slate-200">{accountInfo.name}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-black">Official Email</span>
              <span className="text-sm font-bold text-slate-200">{accountInfo.email}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-black">Organization Workspace</span>
              <span className="text-sm font-mono font-bold text-indigo-400">{accountInfo.tenantId}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-black">Assigned System Role</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 capitalize mt-1">
                {accountInfo.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Password & Policies */}
            <div className="space-y-6">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">1. Security Credentials</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Set Password *</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
                  placeholder="Repeat new password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2 mb-4">2. Policies & Privacy</h3>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.acceptedPolicies}
                    onChange={(e) => setForm({ ...form, acceptedPolicies: e.target.checked })}
                    className="mt-1 accent-indigo-600 rounded"
                  />
                  <span className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                    I agree to the company policies, NDA terms, security protocols, and authorize the collection and verification of my professional profile details.
                  </span>
                </label>
              </div>
            </div>

            {/* Right Column: Personal & Contact Information */}
            <div className="space-y-6">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">3. Profile Onboarding Info</h3>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Personal Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
                  placeholder="personal@gmail.com"
                  value={form.personalEmail}
                  onChange={(e) => setForm({ ...form, personalEmail: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
                    placeholder="+1 234-567-890"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Gender</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:border-indigo-500 focus:outline-none transition-all"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Marital Status</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:border-indigo-500 focus:outline-none transition-all"
                    value={form.maritalStatus}
                    onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Blood Group</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
                    placeholder="e.g. O+"
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Current Address</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
                  placeholder="Street Address, City, State, Country"
                  value={form.currentAddress}
                  onChange={(e) => setForm({ ...form, currentAddress: e.target.value })}
                />
              </div>

            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="px-6 py-3 border border-slate-800 hover:bg-slate-900 text-slate-405 rounded-xl text-xs font-semibold transition-all w-full sm:w-auto"
            >
              Cancel & Log Out
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 w-full sm:w-auto"
            >
              {submitting ? 'Activating Profile...' : 'Complete Activation & Proceed'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
