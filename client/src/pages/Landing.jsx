import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } }, { threshold })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

// ─── Text Reveal (word by word) ───────────────────────────────────────────────
function RevealText({ text, className = '', delay = 0 }) {
  const [ref, visible] = useInView(0.1)
  const words = text.split(' ')
  return (
    <span ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} style={{
          display: 'inline-block', marginRight: '0.28em',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: `opacity 0.5s ease ${delay + i * 0.06}s, transform 0.5s ease ${delay + i * 0.06}s`,
        }}>{w}</span>
      ))}
    </span>
  )
}

// ─── FadeIn wrapper ───────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, up = true, className = '' }) {
  const [ref, visible] = useInView()
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : up ? 'translateY(28px)' : 'translateY(0) scale(0.97)',
      transition: `opacity 0.65s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.65s cubic-bezier(.16,1,.3,1) ${delay}s`,
    }}>{children}</div>
  )
}

// ─── Collage card (mini UI panel mock) ────────────────────────────────────────
function ColCard({ icon, label, value, color, rotate = 0, shadow = 'shadow-lg', delay = 0, visible = false }) {
  return (
    <div style={{
      transform: visible ? `rotate(${rotate}deg) scale(1)` : `rotate(${rotate}deg) scale(0.85)`,
      opacity: visible ? 1 : 0,
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s cubic-bezier(.34,1.56,.64,1) ${delay}s`,
    }}
      className={`bg-white rounded-2xl ${shadow} border border-slate-100 p-4 flex flex-col gap-2 select-none`}
    >
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-lg shadow`}>{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '👥', title: 'Employee Management', desc: 'Centralized profiles, org charts, department hierarchy. Manage the full employee lifecycle in one place.', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', border: 'border-violet-100' },
  { icon: '⏰', title: 'Smart Attendance', desc: 'GPS-verified punch-in/out, geofencing, IP restrictions and real-time dashboards with overtime tracking.', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', border: 'border-blue-100' },
  { icon: '📅', title: 'Leave Management', desc: 'Configurable leave types, auto-balance, holiday calendars and multi-level approval workflows.', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { icon: '🔐', title: 'Multi-Tenant SaaS', desc: 'Each company gets an isolated workspace. JWT, MFA, SSO — enterprise-grade security out of the box.', color: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', border: 'border-orange-100' },
  { icon: '📊', title: 'Reports & Analytics', desc: 'Headcount, attendance trends, attrition, overtime — all exportable as CSV or PDF.', color: 'from-pink-500 to-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
  { icon: '✅', title: 'Approval Workflows', desc: 'Multi-level approvals with SLA tracking, delegation, and escalation across all request types.', color: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  { icon: '📢', title: 'Global Announcements', desc: 'Broadcast holiday notices and alerts directly to all employee dashboards automatically.', color: 'from-rose-500 to-orange-400', bg: 'bg-rose-50', border: 'border-rose-100' },
]

const STEPS = [
  { num: '01', title: 'Register Company', desc: 'Create your admin account and company workspace in under 60 seconds.', icon: '🏢' },
  { num: '02', title: 'Configure Org', desc: 'Add departments, shifts, locations, and leave policies tailored to you.', icon: '⚙️' },
  { num: '03', title: 'Onboard Team', desc: 'Bulk import or add employees. Instant login credentials, instant access.', icon: '🧑‍💼' },
  { num: '04', title: 'Go Live', desc: 'Attendance, leaves, approvals — all running from one beautiful dashboard.', icon: '🚀' },
]

const PROBLEMS = [
  { bad: 'Scattered data across spreadsheets', good: 'One searchable employee database per company' },
  { bad: 'Manual attendance & buddy punching', good: 'GPS-verified, geofenced digital punch system' },
  { bad: 'Leave confusion & email approvals', good: 'Auto-calculated balances, in-app approvals' },
  { bad: 'No visibility into team performance', good: 'Real-time dashboards with exportable reports' },
]

const COLLAGE = [
  { icon: '✅', label: 'Leaves Approved', value: '48 Today', color: 'from-emerald-400 to-teal-500', rotate: -4, shadow: 'shadow-emerald-100/60 shadow-xl', delay: 0.1 },
  { icon: '👥', label: 'Active Employees', value: '1,240', color: 'from-violet-500 to-indigo-500', rotate: 3, shadow: 'shadow-violet-100/60 shadow-xl', delay: 0.2 },
  { icon: '⏰', label: 'Attendance Rate', value: '98.3%', color: 'from-blue-500 to-cyan-400', rotate: -2, shadow: 'shadow-blue-100/60 shadow-xl', delay: 0.3 },
  { icon: '📊', label: 'Reports Generated', value: '320', color: 'from-pink-500 to-rose-400', rotate: 4, shadow: 'shadow-rose-100/60 shadow-xl', delay: 0.4 },
  { icon: '🔐', label: 'MFA Logins', value: '100%', color: 'from-orange-400 to-amber-400', rotate: -3, shadow: 'shadow-amber-100/60 shadow-xl', delay: 0.5 },
  { icon: '🚀', label: 'Approvals Today', value: '72', color: 'from-indigo-500 to-blue-600', rotate: 2, shadow: 'shadow-indigo-100/60 shadow-xl', delay: 0.6 },
]

// ─── Welcome Popup ────────────────────────────────────────────────────────────
function WelcomePopup() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [isRendered, setIsRendered] = useState(false)

  useEffect(() => {
    if (user) return // Don't show if already logged in

    const hasSeen = localStorage.getItem('hrsphere_welcome_seen')
    if (!hasSeen) {
      // Small delay for smooth entrance after page load
      const timer = setTimeout(() => {
        setIsRendered(true)
        setTimeout(() => {
          setIsVisible(true)
          localStorage.setItem('hrsphere_welcome_seen', 'true')
        }, 50)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('hrsphere_welcome_seen', 'true')
    setIsVisible(false)
    setTimeout(() => setIsRendered(false), 500)
  }

  const handleJoin = () => {
    localStorage.setItem('hrsphere_welcome_seen', 'true')
    setIsVisible(false)
    setTimeout(() => {
      setIsRendered(false)
      navigate('/login') // standard navigate to keep history intact
    }, 300)
  }

  if (!isRendered) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 pointer-events-auto ${isVisible ? 'opacity-100' : 'opacity-0'}`} 
        onClick={handleClose}
      />
      
      {/* Popup Box */}
      <div 
        className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}
      >
        <div className="absolute top-0 right-0 p-4 z-10">
          <button 
            onClick={handleClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors shadow-sm backdrop-blur-md"
          >
            ✕
          </button>
        </div>

        {/* Decorative Header Banner */}
        <div className="h-36 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white_0%,_transparent_60%)]" />
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-white/10 to-transparent" />
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/30">
            👋
          </div>
        </div>

        <div className="p-8 text-center">
          <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Welcome to HRSphere</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-8">
            Join our growing HR community and explore a smarter way to manage employees, teams, and workplace operations.
            <br/><br/>
            <span className="font-semibold text-slate-700">Be part of the future of HR management.</span>
          </p>

          <button 
            onClick={handleJoin} 
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-violet-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Join Our Community
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [collageRef, collageVisible] = useInView(0.1)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif" }} className="bg-white text-slate-800 overflow-x-hidden">
      
      <WelcomePopup />

      {/* ══ NAVBAR ══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">H</div>
            <span className="text-xl font-black bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent">HRSphere</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
            <a href="#features" className="hover:text-violet-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-violet-600 transition-colors">How It Works</a>
            <a href="#how-to-use" className="hover:text-violet-600 transition-colors">How to Use</a>
            <a href="#why-us" className="hover:text-violet-600 transition-colors">Why Us</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="hidden sm:block px-5 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50 rounded-xl transition-all">Log In</button>
            <button onClick={() => navigate('/login')} className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl shadow-md hover:scale-105 transition-all">Get Started →</button>
            <button className="md:hidden p-2 text-slate-500" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-3">
            {['#features', '#how-it-works', '#how-to-use', '#why-us'].map((h, i) => (
              <a key={i} href={h} className="block text-sm font-semibold text-slate-600 hover:text-violet-600" onClick={() => setMenuOpen(false)}>
                {h.replace('#', '').replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
        {/* background blobs */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-violet-100/40 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-[100px] translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Text reveal ── */}
          <div>
            <FadeIn delay={0}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-black mb-6 uppercase tracking-widest">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Multi-Tenant SaaS Platform
              </div>
            </FadeIn>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-6">
              <RevealText text="HR Management," className="block text-slate-800" delay={0.1} />
              <RevealText text="Simplified." className="block bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent" delay={0.3} />
            </h1>

            <FadeIn delay={0.5}>
              <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-lg mb-8">
                HRSphere unifies attendance, leaves, employees, and approvals into one beautiful platform — so you focus on people, not paperwork.
              </p>
            </FadeIn>

            <FadeIn delay={0.65}>
              <div className="flex flex-wrap gap-3 mb-10">
                <button onClick={() => navigate('/login')} className="px-7 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-lg shadow-violet-200 hover:scale-105 transition-all">
                  Start Free Trial →
                </button>
                <a href="#features" className="px-7 py-3.5 text-sm font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded-2xl hover:bg-violet-100 transition-all">
                  Explore Features
                </a>
              </div>
              <div className="flex flex-wrap gap-5 text-xs text-slate-400 font-semibold">
                <span>✓ No credit card</span>
                <span>✓ 14-day free trial</span>
                <span>✓ Setup in 60s</span>
              </div>
            </FadeIn>
          </div>

          {/* ── Right: Collage ── */}
          <div ref={collageRef} className="relative h-[420px] lg:h-[480px] select-none">
            {/* Center glow */}
            <div className="absolute inset-8 bg-gradient-to-br from-violet-100/60 to-indigo-100/40 rounded-3xl blur-2xl" />

            {/* Collage cards positioned absolutely */}
            <div className="absolute top-[5%] left-[5%] w-44">
              <ColCard {...COLLAGE[0]} visible={collageVisible} />
            </div>
            <div className="absolute top-[5%] right-[5%] w-40">
              <ColCard {...COLLAGE[1]} visible={collageVisible} />
            </div>
            <div className="absolute top-[38%] left-[18%] w-44">
              <ColCard {...COLLAGE[2]} visible={collageVisible} />
            </div>
            <div className="absolute top-[35%] right-[12%] w-40">
              <ColCard {...COLLAGE[3]} visible={collageVisible} />
            </div>
            <div className="absolute bottom-[8%] left-[8%] w-40">
              <ColCard {...COLLAGE[4]} visible={collageVisible} />
            </div>
            <div className="absolute bottom-[8%] right-[8%] w-44">
              <ColCard {...COLLAGE[5]} visible={collageVisible} />
            </div>

            {/* Center badge */}
            <div style={{
              opacity: collageVisible ? 1 : 0,
              transform: collageVisible ? 'scale(1)' : 'scale(0.7)',
              transition: 'opacity 0.7s ease 0.7s, transform 0.7s cubic-bezier(.34,1.56,.64,1) 0.7s',
            }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl shadow-violet-200/50 border border-violet-100 px-6 py-4 text-center z-10">
              <div className="text-2xl mb-1">🎯</div>
              <p className="text-xs font-black uppercase tracking-widest text-violet-600">Live Dashboard</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Real-time insights</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section className="py-12 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[['99.9%','Uptime SLA'],['10x','Faster HR Ops'],['100%','Data Isolation'],['0','Manual Errors']].map(([v, l], i) => (
            <FadeIn key={i} delay={i * 0.1} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-white">{v}</div>
              <div className="text-xs text-violet-200 font-semibold mt-1">{l}</div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══ VIDEO DEMO ══ */}
      <section className="py-24 bg-white relative">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <FadeIn>
            <span className="text-xs font-black uppercase tracking-widest text-violet-600">Product Tour</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black mb-12">
              <RevealText text="See HRSphere in Action" delay={0.1} />
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-violet-200/50 border border-slate-100 bg-slate-900 aspect-video group">
              <video 
                src="/video/hrsphere.mp4" 
                preload="none"
                loading="lazy"
                autoPlay 
                loop 
                muted 
                controls 
                playsInline
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-violet-600">Everything You Need</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">
              <RevealText text="Powerful Features for Modern HR" delay={0.1} />
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto">From attendance tracking to multi-level approvals, HRSphere handles the complexity so your HR team doesn't have to.</p>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 0.09}>
                <div className={`${f.bg} border ${f.border} rounded-2xl p-6 h-full group hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-default`}>
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-xl shadow-md mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {f.icon}
                  </div>
                  <h3 className="text-base font-black text-slate-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-violet-600">Simple Setup</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">
              <RevealText text="Up and Running in 4 Steps" delay={0.1} />
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <FadeIn key={i} delay={i * 0.12}>
                <div className="relative bg-white rounded-2xl border border-slate-100 p-6 h-full shadow-sm hover:shadow-lg hover:border-violet-200 transition-all duration-300 group">
                  {/* connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-8 -right-3 w-6 h-0.5 bg-violet-200 z-10" />
                  )}
                  <div className="text-2xl mb-3">{s.icon}</div>
                  <div className="text-4xl font-black bg-gradient-to-br from-violet-200 to-indigo-200 bg-clip-text text-transparent mb-2">{s.num}</div>
                  <h3 className="text-base font-black text-slate-800 mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW TO USE THE APP (ROLE GUIDE) ══ */}
      <section id="how-to-use" className="py-24 bg-gradient-to-tr from-slate-50 via-white to-violet-50/20 border-t border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-violet-600">Platform Flow</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">
              <RevealText text="How to Use & Manage Your Work" delay={0.1} />
            </h2>
            <p className="mt-4 text-slate-500 max-w-2xl mx-auto">
              Learn how permissions, user requests, and role dynamics flow inside your isolated corporate tenant workspace.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Leadership Guide */}
            <FadeIn delay={0.1}>
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-violet-300 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold mb-4">👑</div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">1. Leadership</h3>
                  <p className="text-xs font-semibold uppercase text-violet-600 tracking-wider mb-3">Owner & Configurator</p>
                  <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside leading-relaxed">
                    <li>Registers the company tenant workspace.</li>
                    <li>Has full dashboard reporting view.</li>
                    <li><strong>Creates more HR Admin accounts</strong> directly.</li>
                    <li>No external approval required to log in.</li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                  ⚡ Prefill: <span className="text-slate-600">vijay@democorp.com</span>
                </div>
              </div>
            </FadeIn>

            {/* HR Admin Guide */}
            <FadeIn delay={0.2}>
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-violet-300 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold mb-4">🛡️</div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">2. HR Admin</h3>
                  <p className="text-xs font-semibold uppercase text-violet-600 tracking-wider mb-3">Tenant Gatekeeper</p>
                  <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside leading-relaxed">
                    <li>Can log in immediately with credentials (no approval needed).</li>
                    <li><strong>Receives & reviews signup requests</strong> from managers and employees.</li>
                    <li>Approves requests to activate user accounts or rejects to discard them.</li>
                    <li>Sets up departments, leave policies, shifts.</li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                  ⚡ Prefill: <span className="text-slate-600">priya@democorp.com</span>
                </div>
              </div>
            </FadeIn>

            {/* Manager Guide */}
            <FadeIn delay={0.3}>
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-violet-300 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold mb-4">👔</div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">3. Manager</h3>
                  <p className="text-xs font-semibold uppercase text-violet-600 tracking-wider mb-3">Team Supervisor</p>
                  <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside leading-relaxed">
                    <li>Signs up by providing company tenant ID.</li>
                    <li><strong>Requires approval by HR Admin</strong> before login is authorized.</li>
                    <li>Manages team attendance, calendars, and approvals.</li>
                    <li>Authorizes employee leave & regularization requests.</li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                  ⚡ Prefill: <span className="text-slate-600">rahul@democorp.com</span>
                </div>
              </div>
            </FadeIn>

            {/* Employee Guide */}
            <FadeIn delay={0.4}>
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-violet-300 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold mb-4">🏃‍♂️</div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">4. Employee</h3>
                  <p className="text-xs font-semibold uppercase text-violet-600 tracking-wider mb-3">Core User</p>
                  <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside leading-relaxed">
                    <li>Signs up with tenant ID and basic info.</li>
                    <li><strong>Requires approval by HR Admin</strong> to start logging in.</li>
                    <li>Punches daily attendance (GPS & IP verified).</li>
                    <li>Checks leave balances, files leave requests.</li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                  ⚡ Prefill: <span className="text-slate-600">anjali@democorp.com</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══ TRANSFORMATION: BEFORE VS AFTER ══ */}
      <section id="why-us" className="py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-violet-600 font-mono">HR Transformation</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">
              <RevealText text="Before vs. After HRSphere" delay={0.1} />
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto">
              See how moving from legacy administrative chaos to automated multi-tenant delegation liberates your HR department.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Before Card */}
            <FadeIn delay={0.1} className="bg-rose-50/50 border border-rose-100 rounded-3xl p-8 shadow-sm">
              <h3 className="text-lg font-black text-rose-800 flex items-center gap-2 mb-6">
                <span className="text-xl">🛑</span> Before HRSphere (Manual Chaos)
              </h3>
              <div className="space-y-5">
                {[
                  "HR is buried under manual onboarding, typing employee profiles into spreadsheets.",
                  "HR is constantly chased by email request threads for every single leave request.",
                  "Attendance is tracked via messy Excel logs or easily falsified check-in lists.",
                  "HR must manually compile and calculate monthly leave balances and audit histories."
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">✗</span>
                    <p className="text-sm text-rose-700 font-medium leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            {/* After Card */}
            <FadeIn delay={0.2} className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-8 shadow-sm">
              <h3 className="text-lg font-black text-emerald-800 flex items-center gap-2 mb-6">
                <span className="text-xl">✨</span> After HRSphere (Automated Bliss)
              </h3>
              <div className="space-y-5">
                {[
                  "HR receives registration requests automatically; manager and employee accounts are activated in one click.",
                  "Employees file requests in seconds; their tenant managers handle approvals directly, freeing HR from bottleneck duties.",
                  "Smart attendance is geofenced and IP restricted with real-time dashboards.",
                  "System auto-calculates balances, holiday rules, and publishes exportable analytical charts."
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">✓</span>
                    <p className="text-sm text-emerald-700 font-semibold leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-12 sm:p-16 text-center shadow-2xl shadow-violet-300/30">
              <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Ready to Transform Your HR?</h2>
                <p className="text-violet-200 max-w-lg mx-auto mb-8">Join companies that trust HRSphere to manage their most valuable asset — their people.</p>
                <button onClick={() => navigate('/login')} className="px-10 py-4 text-sm font-bold text-violet-700 bg-white rounded-2xl shadow-xl hover:scale-105 transition-all">
                  Get Started Free →
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            
            {/* Brand Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-650 flex items-center justify-center text-white font-black text-sm shadow-md shadow-violet-900/40">
                  H
                </div>
                <span className="text-lg font-black text-white tracking-tight">HRSphere</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                A premium multi-tenant SaaS workspace engineered to delegate administrative load from HR to managers and employees with absolute geofenced accuracy.
              </p>
              <div className="text-[10px] text-slate-600 font-mono">
                Isolated Encrypted Node Workspaces
              </div>
            </div>

            {/* Platform links */}
            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#how-to-use" className="hover:text-violet-400 transition-colors">How to Use</a></li>
                <li><a href="#demo" className="hover:text-violet-400 transition-colors">Interactive Demo</a></li>
                <li><a href="#why-us" className="hover:text-violet-400 transition-colors">Before vs. After</a></li>
                <li><a href="/login" className="hover:text-violet-400 transition-colors font-semibold text-slate-300">Sign In Workspace</a></li>
              </ul>
            </div>

            {/* Guides links */}
            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-wider mb-4">Role Guides</h4>
              <ul className="space-y-2.5 text-xs text-slate-500">
                <li><span className="text-slate-400">👑 Leadership:</span> Full Control</li>
                <li><span className="text-slate-400">🛡️ HR Admin:</span> Active Gatekeeper</li>
                <li><span className="text-slate-400">👔 Manager:</span> Team Approver</li>
                <li><span className="text-slate-400">🏃‍♂️ Employee:</span> Punch-in logs</li>
              </ul>
            </div>

            {/* Privacy & Security */}
            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-wider mb-4">Security & Trust</h4>
              <ul className="space-y-2.5 text-xs">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 text-[10px]">✔</span> 100% Multi-Tenant Isolated DB
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 text-[10px]">✔</span> Geofenced IP Checked Punching
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 text-[10px]">✔</span> Secure Document Vault
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} HRSphere Inc. All rights reserved. Multi-tenant secure deployment.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Security Audit</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
