import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Unauthorized() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      
      <div className="z-10 max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl animate-fade-in-up">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-rose-500/10">
          🚫
        </div>
        
        <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          You do not have the required permissions to view this resource. If you believe this is an error, please contact your administrator.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all text-sm shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all text-sm border border-slate-750"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
