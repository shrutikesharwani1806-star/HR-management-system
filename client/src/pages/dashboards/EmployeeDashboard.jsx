import React from 'react'
import Layout from '../../components/Layout'

export default function EmployeeDashboard() {
  return (
    <Layout title="My Workspace">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white rounded-3xl p-6 md:p-8 mb-6 shadow-xl animate-fade-in-up relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 80% 20%, #a78bfa 0%, transparent 50%)'}} />
        <div className="relative">
          <h2 className="text-2xl font-black mb-1 flex items-center gap-2">🚀 Welcome to your Workspace!</h2>
          <p className="text-sm text-indigo-200 mb-6">Your personal self-service portal. Mark attendance, apply leaves, manage your profile, and download documents.</p>

          <h3 className="text-xs font-bold text-indigo-200 mb-3 uppercase tracking-wider">Quick Actions</h3>
          <div className="flex flex-wrap gap-3 mb-6">
            <a href="/attendance" className="px-5 py-2.5 bg-white text-indigo-700 font-bold rounded-xl shadow-sm hover:scale-105 transition-all text-sm">🕐 Punch In / Out</a>
            <a href="/leave" className="px-5 py-2.5 bg-indigo-500/50 hover:bg-indigo-500 text-white border border-indigo-400 font-bold rounded-xl transition-all text-sm">📅 Apply Leave</a>
            <a href="/profile" className="px-5 py-2.5 bg-indigo-500/50 hover:bg-indigo-500 text-white border border-indigo-400 font-bold rounded-xl transition-all text-sm">👤 View & Edit Profile</a>
          </div>

          <h3 className="text-xs font-bold text-indigo-200 mb-3 uppercase tracking-wider">My Records</h3>
          <div className="flex flex-wrap gap-3">
            <a href="/attendance" className="px-4 py-2 bg-indigo-800/40 hover:bg-indigo-800/60 text-white font-semibold rounded-lg transition-all text-sm">📈 Attendance History</a>
            <a href="/leave" className="px-4 py-2 bg-indigo-800/40 hover:bg-indigo-800/60 text-white font-semibold rounded-lg transition-all text-sm">⚖️ Leave Balances</a>
            <a href="/payslips" className="px-4 py-2 bg-indigo-800/40 hover:bg-indigo-800/60 text-white font-semibold rounded-lg transition-all text-sm">📄 Download Payslips</a>
          </div>
        </div>
      </div>

      {/* Self-Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up" style={{animationDelay:'200ms'}}>
        <ServiceCard icon="⏰" title="Attendance" desc="Punch in/out, view history, and submit regularization requests." href="/attendance" color="bg-emerald-50 border-emerald-100 text-emerald-700" />
        <ServiceCard icon="📅" title="Leave" desc="Apply for leave, check balances, and track approval status." href="/leave" color="bg-amber-50 border-amber-100 text-amber-700" />
        <ServiceCard icon="👤" title="Profile" desc="View and edit your personal information and documents." href="/profile" color="bg-indigo-50 border-indigo-100 text-indigo-700" />
        <ServiceCard icon="📄" title="Documents" desc="Download salary slips, HR documents, and company files." href="/payslips" color="bg-purple-50 border-purple-100 text-purple-700" />
        <ServiceCard icon="🔔" title="Requests" desc="Submit attendance regularization and profile update requests." href="/attendance" color="bg-sky-50 border-sky-100 text-sky-700" />
        <ServiceCard icon="📊" title="My Reports" desc="View your monthly attendance reports and leave summaries." href="/attendance" color="bg-rose-50 border-rose-100 text-rose-700" />
      </div>
    </Layout>
  )
}

function ServiceCard({ icon, title, desc, href, color }) {
  return (
    <a href={href} className={`${color} border rounded-2xl p-5 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 block group`}>
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-bold text-sm mb-1 group-hover:underline">{title}</h3>
      <p className="text-xs opacity-80">{desc}</p>
    </a>
  )
}
