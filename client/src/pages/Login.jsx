import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

// â”€â”€â”€ Toast Notification Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Toast({ toasts, dismiss }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full">
      {toasts.map(t => (
        <div key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-xl border text-sm font-bold backdrop-blur-md animate-fade-in-up ${
            t.type === 'error'
              ? 'bg-rose-50/95 border-rose-100 text-rose-700 shadow-rose-100/30'
              : t.type === 'info'
              ? 'bg-blue-50/95 border-blue-100 text-blue-700 shadow-blue-100/30'
              : 'bg-emerald-50/95 border-emerald-100 text-emerald-700 shadow-emerald-100/30'
          }`}
        >
          <span className="text-base mt-0.5 shrink-0">
            {t.type === 'error' ? 'âš ï¸' : t.type === 'info' ? 'ðŸ’¡' : 'âœ…'}
          </span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="shrink-0 text-slate-400 hover:text-slate-600 cursor-pointer font-black">âœ•</button>
        </div>
      ))}
    </div>
  )
}

export default function Login() {
  const { login, logout, handleMfaVerification, handleSsoLogin } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token')

  // Modes: 'login', 'register', 'signup', 'forgot', 'reset'
  // 'register' = Create new company
  // 'signup' = Request employee access to existing company
  const [mode, setMode] = useState('login')
  
  // Login Sub-tabs: 'employee', 'manager', 'hr_admin', 'leadership'
  const [loginRole, setLoginRole] = useState('employee')
  
  // Forgot Sub-tabs: 'email', 'phone'
  const [forgotMethod, setForgotMethod] = useState('email')
  const [otpSent, setOtpSent] = useState(false) // Whether phone OTP was requested
  const [showPassword, setShowPassword] = useState(false) // Password visibility toggle
  const [welcomePopup, setWelcomePopup] = useState(null) // Welcome modal state

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  // Toast state
  const [toasts, setToasts] = useState([])
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  // MFA states
  const [mfaMode, setMfaMode] = useState(false)
  const [mfaToken, setMfaToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [registeredTenant, setRegisteredTenant] = useState(null)

  // Form States
  const [loginForm, setLoginForm] = useState({ tenantId: 'demo_company_01', email: 'anjali@democorp.com', password: 'Employee@1234' })
  const [forgotForm, setForgotForm] = useState({ tenantId: 'demo_company_01', email: '', phone: '' })
  const [otpResetForm, setOtpResetForm] = useState({ otp: '', newPassword: '', confirmPassword: '' })
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' })
  
  // Create Tenant Company Form
  const [registerForm, setRegisterForm] = useState({
    companyName: '',
    domain: '',
    contactEmail: '',
    contactPhone: '',
    industry: 'Technology',
    companySize: '10-50',
    address: '',
    logoUrl: '',
    leadershipName: '',
    leadershipEmail: '',
    password: ''
  })

  // Employee Signup Request Form
  const [employeeSignupForm, setEmployeeSignupForm] = useState({
    tenantId: 'demo_company_01',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'employee'
  })

  // Prefill demo credentials on role select
  const handleRoleChange = (role) => {
    setLoginRole(role)
    setError('')
    setMsg('')
    if (registeredTenant) {
      const { tenantId, domain, contactEmail, password } = registeredTenant
      const cleanDomain = domain.trim().toLowerCase()
      if (role === 'leadership') {
        setLoginForm({ tenantId, email: contactEmail, password })
      } else if (role === 'hr_admin') {
        setLoginForm({ tenantId, email: `hr@${cleanDomain}`, password })
      } else if (role === 'manager') {
        setLoginForm({ tenantId, email: `manager@${cleanDomain}`, password })
      } else if (role === 'employee') {
        setLoginForm({ tenantId, email: `employee@${cleanDomain}`, password })
      }
    } else {
      if (role === 'employee') {
        setLoginForm({ tenantId: 'demo_company_01', email: 'anjali@democorp.com', password: 'Employee@1234' })
      } else if (role === 'manager') {
        setLoginForm({ tenantId: 'demo_company_01', email: 'rahul@democorp.com', password: 'Manager@1234' })
      } else if (role === 'hr_admin') {
        setLoginForm({ tenantId: 'demo_company_01', email: 'priya@democorp.com', password: 'Admin@1234' })
      } else if (role === 'leadership') {
        setLoginForm({ tenantId: 'demo_company_01', email: 'vijay@democorp.com', password: 'Leadership@1234' })
      }
    }
  }

  const handleCompanyNameChange = (e) => {
    const name = e.target.value
    const generatedDomain = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
    setRegisterForm(prev => ({
      ...prev,
      companyName: name,
      domain: prev.domain ? prev.domain : generatedDomain
    }))
  }

  useEffect(() => {
    if (tokenFromUrl) {
      setMode('reset')
    }
  }, [tokenFromUrl])

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    setLoading(true)
    try {
      const loggedUser = await login(loginForm.tenantId, loginForm.email, loginForm.password, loginRole)

      if (loggedUser.mfaRequired) {
        setMfaToken(loggedUser.mfaToken)
        setMfaCode('')
        setMfaMode(true)
        showToast('MFA required — enter your authenticator code.', 'info')
        setMsg('MFA is enabled. Please enter your 6-digit code to continue.')
        setLoading(false)
        return
      }

      const actualRole = loggedUser.role
      const denyMap = {
        hr_admin: actualRole !== 'hr_admin' && actualRole !== 'super_admin',
        manager: actualRole !== 'manager',
        employee: actualRole !== 'employee',
        leadership: actualRole !== 'leadership',
      }
      if (denyMap[loginRole]) {
        const msg = `Access Denied: Your account does not have ${loginRole.replace('_', ' ')} privileges.`
        setError(msg)
        showToast(msg, 'error')
        logout()
        return
      }

      showToast(`Welcome back! Redirecting to your dashboard...`, 'success')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials. Please try again.'
      setError(msg)
      showToast(msg, 'error')
    } finally { setLoading(false) }
  }

  const handleMfaSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    setLoading(true)
    try {
      const loggedUser = await handleMfaVerification(mfaToken, mfaCode)
      const actualRole = loggedUser.role
      if (loginRole === 'hr_admin' && actualRole !== 'hr_admin' && actualRole !== 'super_admin') {
        const m = 'Access Denied: No HR Admin privileges on this account.'
        setError(m); showToast(m, 'error'); logout(); setMfaMode(false); return
      }
      if (loginRole === 'manager' && actualRole !== 'manager') {
        setError('Access Denied: No Manager privileges on this account.')
        showToast('Access Denied: No Manager privileges.', 'error')
        logout(); setMfaMode(false); return
      }
      if (loginRole === 'employee' && actualRole !== 'employee') {
        setError('Access Denied: Please use the correct tab for your role.')
        showToast('Access Denied: Wrong role tab selected.', 'error')
        logout(); setMfaMode(false); return
      }
      if (loginRole === 'leadership' && actualRole !== 'leadership') {
        setError('Access Denied: No Leadership privileges on this account.')
        showToast('Access Denied: No Leadership privileges.', 'error')
        logout(); setMfaMode(false); return
      }
      showToast('MFA verified! Welcome back.', 'success')
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid MFA code.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSso = async () => {
    if (!loginForm.tenantId) {
      const m = 'Enter your Company ID first.'
      setError(m); showToast(m, 'error'); return
    }
    const email = prompt('Simulate Google SSO — enter account email:', loginForm.email || 'employee@company.com')
    if (!email) return
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/google-sso', { tenantId: loginForm.tenantId, email, firstName: 'Google', lastName: 'User' })
      await handleSsoLogin(res.data.data)
      showToast('Google SSO verified! Redirecting...', 'success')
      navigate('/dashboard')
    } catch (err) {
      const m = err.response?.data?.message || 'Google SSO login failed.'
      setError(m); showToast(m, 'error')
    } finally { setLoading(false) }
  }

  const handleMicrosoftSso = async () => {
    if (!loginForm.tenantId) {
      const m = 'Enter your Company ID first.'
      setError(m); showToast(m, 'error'); return
    }
    const email = prompt('Simulate Microsoft SSO — enter account email:', loginForm.email || 'employee@company.com')
    if (!email) return
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/microsoft-sso', { tenantId: loginForm.tenantId, email, firstName: 'Microsoft', lastName: 'User' })
      await handleSsoLogin(res.data.data)
      showToast('Microsoft SSO verified! Redirecting...', 'success')
      navigate('/dashboard')
    } catch (err) {
      const m = err.response?.data?.message || 'Microsoft SSO login failed.'
      setError(m); showToast(m, 'error')
    } finally { setLoading(false) }
  }

  const handleSamlSso = async () => {
    if (!loginForm.tenantId) {
      const m = 'Enter your Company ID first.'
      setError(m); showToast(m, 'error'); return
    }
    const email = prompt('Simulate SAML SSO — enter account email:', loginForm.email || 'employee@company.com')
    if (!email) return
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/saml-sso', { tenantId: loginForm.tenantId, email, firstName: 'SAML', lastName: 'Enterprise' })
      await handleSsoLogin(res.data.data)
      showToast('SAML SSO verified! Redirecting...', 'success')
      navigate('/dashboard')
    } catch (err) {
      const m = err.response?.data?.message || 'SAML SSO login failed.'
      setError(m); showToast(m, 'error')
    } finally { setLoading(false) }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setLoading(true)
    try {
      const res = await api.post('/tenants/register', registerForm)
      const { accessToken, refreshToken, user: userData, tenantId: tid } = res.data.data
      
      setRegisteredTenant({
        tenantId: tid,
        domain: registerForm.domain,
        contactEmail: registerForm.leadershipEmail,
        password: registerForm.password
      })

      // Log in immediately using the returned credentials and SSO helper
      await handleSsoLogin(res.data.data)

      setWelcomePopup({ companyName: registerForm.companyName, tenantId: tid })
      setTimeout(() => {
        setWelcomePopup(null)
        navigate('/dashboard')
      }, 6000)
    } catch (err) {
      const m = err.response?.data?.message || 'Tenant registration failed.'
      setError(m); showToast(m, 'error')
    } finally { setLoading(false) }
  }

  const handleEmployeeSignupSubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setLoading(true)
    try {
      const res = await api.post('/auth/register', employeeSignupForm)
      const m = res.data.message || 'Account created successfully. You can now log in.'
      showToast(m, 'success'); setMsg(m)
      setLoginForm({ tenantId: employeeSignupForm.tenantId, email: employeeSignupForm.email, password: employeeSignupForm.password })
      setLoginRole('employee'); setMode('login')
    } catch (err) {
      const m = err.response?.data?.message || 'Signup request failed.'
      setError(m); showToast(m, 'error')
    } finally { setLoading(false) }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setLoading(true)
    if (forgotMethod === 'email') {
      try {
        const res = await api.post('/auth/forgot-password', { tenantId: forgotForm.tenantId, email: forgotForm.email })
        const m = res.data.message || 'Reset link sent if the email exists.'
        showToast('Reset link dispatched! Check your inbox.', 'success'); setMsg(m); setMode('login')
      } catch (err) {
        const m = err.response?.data?.message || 'Request failed.'
        setError(m); showToast(m, 'error')
      } finally { setLoading(false) }
    } else {
      try {
        const res = await api.post('/auth/forgot-password-otp', { tenantId: forgotForm.tenantId, phone: forgotForm.phone })
        showToast('OTP sent to your registered phone.', 'success')
        setMsg(`ðŸ“² OTP simulated. (Dev OTP: ${res.data.devOtp})`); setOtpSent(true)
      } catch (err) {
        const m = err.response?.data?.message || 'Failed to send OTP.'
        setError(m); showToast(m, 'error')
      } finally { setLoading(false) }
    }
  }

  const handleOtpVerifySubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg('')
    if (otpResetForm.newPassword !== otpResetForm.confirmPassword) {
      const m = 'Passwords do not match.'
      setError(m); showToast(m, 'error'); return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password-otp', { tenantId: forgotForm.tenantId, phone: forgotForm.phone, otp: otpResetForm.otp, newPassword: otpResetForm.newPassword })
      showToast('Password updated! You can now sign in.', 'success')
      setMsg('âœ… Password reset! You can now log in.'); setOtpSent(false); setMode('login')
    } catch (err) {
      const m = err.response?.data?.message || 'OTP verification failed.'
      setError(m); showToast(m, 'error')
    } finally { setLoading(false) }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg('')
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      const m = 'Passwords do not match.'
      setError(m); showToast(m, 'error'); return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token: tokenFromUrl, newPassword: resetForm.newPassword })
      showToast('Password updated! You can now sign in.', 'success')
      setMsg('âœ… Password reset! You can now log in.'); setMode('login')
    } catch (err) {
      const m = err.response?.data?.message || 'Reset token invalid or expired.'
      setError(m); showToast(m, 'error')
    } finally { setLoading(false) }
  }

  // â”€â”€â”€ Input & Button style helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const inputCls = 'w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white/70 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 outline-none transition-all'
  const labelCls = 'block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5'
  const primaryBtn = 'w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-extrabold rounded-2xl shadow-lg shadow-violet-200/50 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer'
  const backBtn = 'text-xs font-bold text-slate-400 hover:text-slate-700 hover:underline transition-colors cursor-pointer'
  const linkBtn = 'text-xs font-bold text-violet-600 hover:text-violet-800 hover:underline transition-colors cursor-pointer'

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4 sm:p-6 relative overflow-hidden font-sans">

      {/* Welcome Registration Popup */}
      {welcomePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-indigo-200/50 max-w-lg w-full text-center border border-indigo-50 transform scale-105 transition-all">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-indigo-200">
              👋
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">
              Welcome to HRsphere, <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">{welcomePopup.companyName}</span>
            </h2>
            <p className="text-slate-500 leading-relaxed font-medium px-4 mb-5">
              Your secure company workspace is ready. Start building your team and managing your organization with ease.
            </p>
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl mb-4 w-full mx-auto shadow-inner shadow-indigo-100/50">
              <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Your Unique Company ID</span>
              <span className="block text-2xl font-black text-indigo-700 font-mono tracking-tight select-all">{welcomePopup.tenantId}</span>
              <span className="block text-[9px] text-indigo-400 mt-1 font-semibold">Share this ID with your employees so they can log in</span>
            </div>
            <div className="mt-4 flex justify-center">
              <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-xs text-slate-400 mt-4 font-semibold uppercase tracking-widest">Preparing your workspace...</p>
          </div>
        </div>
      )}

      {/* Pastel blobs â€” subtle, no neon */}
      <div className="absolute top-[-8%] left-[-8%] w-96 h-96 rounded-full bg-violet-100/60 blur-3xl animate-float-slow pointer-events-none" />
      <div className="absolute bottom-[-8%] right-[-8%] w-[28rem] h-[28rem] rounded-full bg-indigo-100/50 blur-3xl animate-float-reverse pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-rose-100/20 blur-2xl pointer-events-none" />

      {/* Toast stack */}
      <Toast toasts={toasts} dismiss={dismissToast} />

      {/* Grid container */}
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Card */}
        <div className="lg:col-span-5 bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 p-8 flex flex-col justify-between relative">
          
          <button 
            onClick={() => navigate('/')} 
            className="absolute top-6 left-6 text-[10px] sm:text-xs font-bold text-slate-400 hover:text-violet-600 flex items-center gap-1.5 transition-all hover:-translate-x-1"
          >
            ← Home
          </button>

        {/* Brand */}
        <div className="flex flex-col items-center mb-7 mt-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200 mb-4">
            <span className="text-white font-black text-xl">H</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">
            {mode === 'login' && 'Sign in to HRSphere'}
            {mode === 'register' && 'Onboard Your Company'}
            {mode === 'signup' && 'Request Account Access'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Create New Password'}
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-widest">
            {mode === 'login' && 'Multi-tenant HR platform'}
            {mode === 'register' && 'Setup corporate workspace'}
            {mode === 'signup' && 'Request employee login'}
            {mode === 'forgot' && 'Account recovery'}
            {mode === 'reset' && 'Update security phrase'}
          </p>
        </div>

        {/* Inline status messages */}
        {msg && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-2xl flex items-start gap-2 animate-fade-in">
            <span>âœ…</span><span>{msg}</span>
          </div>
        )}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-2xl flex items-start gap-2 animate-fade-in">
            <span>âš ï¸</span><span>{error}</span>
          </div>
        )}

        {/* â”€â”€ LOGIN â”€â”€ */}
        {mode === 'login' && (
          <div className="space-y-5">
            {mfaMode ? (
              <form onSubmit={handleMfaSubmit} className="space-y-5">
                <p className="text-xs text-slate-500 leading-relaxed bg-blue-50 border border-blue-100 p-3 rounded-xl">Enter the 6-digit code from your authenticator app.</p>
                <div>
                  <label className={labelCls}>MFA Code</label>
                  <input className={`${inputCls} text-center font-mono text-lg tracking-widest`} maxLength="6" placeholder="000000" value={mfaCode} onChange={e => setMfaCode(e.target.value)} required autoFocus />
                </div>
                <button className={primaryBtn} disabled={loading}>{loading ? 'Verifying...' : 'Verify & Sign In'}</button>
                <div className="text-center"><button type="button" className={backBtn} onClick={() => { setMfaMode(false); setError(''); setMsg('') }}>Cancel â€” Back to Login</button></div>
              </form>
            ) : (
              <>
                {/* Role tabs */}
                <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                  {['employee', 'manager', 'hr_admin', 'leadership'].map(role => (
                    <button key={role} type="button"
                      className={`py-2 text-[10px] font-extrabold rounded-xl transition-all capitalize cursor-pointer ${loginRole === role ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      onClick={() => handleRoleChange(role)}>
                      {role === 'hr_admin' ? 'HR' : role}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div><label className={labelCls}>Company ID</label><input className={inputCls} placeholder="demo_company_01" value={loginForm.tenantId} onChange={e => setLoginForm({ ...loginForm, tenantId: e.target.value })} required /></div>
                  <div><label className={labelCls}>Email Address</label><input className={inputCls} type="email" placeholder="you@company.com" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} required /></div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className={labelCls.replace(' mb-1.5', '')}>Password</label>
                      <button type="button" className={linkBtn} onClick={() => { setError(''); setMsg(''); setMode('forgot') }}>Forgot?</button>
                    </div>
                    <div className="relative">
                      <input className={inputCls} type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 text-sm" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <button className={primaryBtn} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
                </form>

                {/* SSO */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Enterprise SSO</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Google', handleGoogleSso, 'G'], ['Azure', handleMicrosoftSso, 'M'], ['SAML', handleSamlSso, 'S']].map(([label, fn, icon]) => (
                      <button key={label} type="button" onClick={fn}
                        className="py-2.5 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-xl text-xs font-bold text-slate-600 hover:text-violet-700 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                        <span className="text-[10px] font-black">{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer links */}
                <div className="flex justify-center pt-4 border-t border-slate-100">
                  <button type="button" className={linkBtn} onClick={() => { setError(''); setMsg(''); setMode('register') }}>Register Company Workspace</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── EMPLOYEE SIGNUP (DISABLED) ── */}
        {mode === 'signup' && (
          <div className="space-y-4 text-center py-6 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center text-xl mx-auto mb-2">⚠️</div>
            <h3 className="font-bold text-slate-800 text-sm">Self-Registration Disabled</h3>
            <p className="text-xs text-slate-500 leading-relaxed px-4">
              Employee accounts must be created and provisioned by an HR Administrator. 
              Please contact your HR department or consult your manager for an invitation.
            </p>
            <div className="pt-2">
              <button type="button" className={backBtn} onClick={() => { setError(''); setMsg(''); setMode('login') }}>Back to Login</button>
            </div>
          </div>
        )}

        {/* ── REGISTER COMPANY ── */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-2">Company Information</p>
            
            <div>
              <label className={labelCls}>Company Name *</label>
              <input className={inputCls} placeholder="Acme Corp" value={registerForm.companyName} onChange={handleCompanyNameChange} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Company Domain *</label>
                <input className={inputCls} placeholder="acme.com" value={registerForm.domain} onChange={e => setRegisterForm({ ...registerForm, domain: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Industry</label>
                <input className={inputCls} placeholder="Technology" value={registerForm.industry} onChange={e => setRegisterForm({ ...registerForm, industry: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Company Email *</label>
                <input className={inputCls} type="email" placeholder="contact@acme.com" value={registerForm.contactEmail} onChange={e => setRegisterForm({ ...registerForm, contactEmail: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Company Phone Number</label>
                <input className={inputCls} placeholder="+1 555-019-2834" value={registerForm.contactPhone} onChange={e => setRegisterForm({ ...registerForm, contactPhone: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Company Size</label>
                <select className={inputCls} value={registerForm.companySize} onChange={e => setRegisterForm({ ...registerForm, companySize: e.target.value })}>
                  <option value="1-10">1 - 10 employees</option>
                  <option value="10-50">10 - 50 employees</option>
                  <option value="50-250">50 - 250 employees</option>
                  <option value="250-1000">250 - 1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Company Logo URL</label>
                <input className={inputCls} placeholder="https://logo.url/image.png" value={registerForm.logoUrl} onChange={e => setRegisterForm({ ...registerForm, logoUrl: e.target.value })} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Company Address</label>
              <textarea className={`${inputCls} resize-none py-2`} rows="2" placeholder="123 Corporate Blvd, Suite 100" value={registerForm.address} onChange={e => setRegisterForm({ ...registerForm, address: e.target.value })} />
            </div>

            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mt-4 mb-2">Leadership Account</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Leadership Full Name *</label>
                <input className={inputCls} placeholder="John Doe" value={registerForm.leadershipName} onChange={e => setRegisterForm({ ...registerForm, leadershipName: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Leadership Email *</label>
                <input className={inputCls} type="email" placeholder="john.doe@acme.com" value={registerForm.leadershipEmail} onChange={e => setRegisterForm({ ...registerForm, leadershipEmail: e.target.value })} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Leadership Password *</label>
              <div className="relative">
                <input className={inputCls} type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 text-sm" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button className={`${primaryBtn} mt-2`} disabled={loading}>{loading ? 'Creating workspace...' : 'Register Company'}</button>
            <div className="text-center"><button type="button" className={backBtn} onClick={() => { setError(''); setMsg(''); setMode('login') }}>Back to Login</button></div>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && !otpSent && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100">
              {['email', 'phone'].map(m => (
                <button key={m} type="button"
                  className={`py-2 text-[10px] font-black rounded-xl capitalize transition-all cursor-pointer ${forgotMethod === m ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  onClick={() => setForgotMethod(m)}>
                  {m === 'email' ? 'ðŸ“§ Email Link' : 'ðŸ“± Phone OTP'}
                </button>
              ))}
            </div>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div><label className={labelCls}>Company ID</label><input className={inputCls} placeholder="demo_company_01" value={forgotForm.tenantId} onChange={e => setForgotForm({ ...forgotForm, tenantId: e.target.value })} required /></div>
              {forgotMethod === 'email'
                ? <div><label className={labelCls}>Registered Email</label><input className={inputCls} type="email" placeholder="you@company.com" value={forgotForm.email} onChange={e => setForgotForm({ ...forgotForm, email: e.target.value })} required /></div>
                : <div><label className={labelCls}>Registered Phone</label><input className={inputCls} placeholder="9876543210" value={forgotForm.phone} onChange={e => setForgotForm({ ...forgotForm, phone: e.target.value })} required /></div>
              }
              <button className={primaryBtn} disabled={loading}>{loading ? 'Sending...' : forgotMethod === 'email' ? 'Send Reset Link' : 'Send OTP'}</button>
              <div className="text-center"><button type="button" className={backBtn} onClick={() => { setError(''); setMsg(''); setMode('login') }}>Back to Login</button></div>
            </form>
          </div>
        )}

        {/* â”€â”€ OTP VERIFY â”€â”€ */}
        {mode === 'forgot' && otpSent && (
          <form onSubmit={handleOtpVerifySubmit} className="space-y-4">
            <div><label className={labelCls}>6-Digit OTP</label><input className={`${inputCls} text-center font-mono tracking-widest`} maxLength="6" placeholder="123456" value={otpResetForm.otp} onChange={e => setOtpResetForm({ ...otpResetForm, otp: e.target.value })} required /></div>
            <div><label className={labelCls}>New Password</label><input className={inputCls} type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={otpResetForm.newPassword} onChange={e => setOtpResetForm({ ...otpResetForm, newPassword: e.target.value })} required /></div>
            <div><label className={labelCls}>Confirm Password</label><input className={inputCls} type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={otpResetForm.confirmPassword} onChange={e => setOtpResetForm({ ...otpResetForm, confirmPassword: e.target.value })} required /></div>
            <button className={primaryBtn} disabled={loading}>{loading ? 'Resetting...' : 'Verify OTP & Reset'}</button>
            <div className="flex justify-between">
              <button type="button" className={backBtn} onClick={() => setOtpSent(false)}>â† Back</button>
              <button type="button" className={linkBtn} onClick={() => { setError(''); setMsg(''); setOtpSent(false); setMode('login') }}>Back to Login</button>
            </div>
          </form>
        )}

        {/* â”€â”€ RESET PASSWORD (token) â”€â”€ */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div><label className={labelCls}>New Password</label><input className={inputCls} type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={resetForm.newPassword} onChange={e => setResetForm({ ...resetForm, newPassword: e.target.value })} required /></div>
            <div><label className={labelCls}>Confirm Password</label><input className={inputCls} type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={resetForm.confirmPassword} onChange={e => setResetForm({ ...resetForm, confirmPassword: e.target.value })} required /></div>
            <button className={primaryBtn} disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
            <div className="text-center"><button type="button" className={linkBtn} onClick={() => { setError(''); setMsg(''); setMode('login') }}>Back to Login</button></div>
          </form>
        )}

        </div>

        {/* Right Column: Walkthrough Video */}
        <div className="lg:col-span-7 bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-750 text-[10px] font-black uppercase tracking-wider font-mono">Platform Demo</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold">Watch How It Works</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">Welcome to HRSphere</h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Witness how multi-tenant isolation, manager delegation, and geofenced attendance logs streamline operations for HR managers and employees.
            </p>
            
            <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-inner bg-slate-950 relative aspect-video group">
              <video 
                src="/video/i_want_a_ai_video_to_explain_a.mp4" 
                controls 
                className="w-full h-full object-cover" 
                poster="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Platform Features Highlighted</h4>
            <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-violet-650">⚡</span> Direct HR Login (No approval)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-violet-650">🔒</span> Strict Tenant Data Isolation
              </div>
              <div className="flex items-center gap-2">
                <span className="text-violet-650">⏰</span> Verified Clock-in & Overtime
              </div>
              <div className="flex items-center gap-2">
                <span className="text-violet-650">💵</span> Direct Secure Payslip Downloads
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
