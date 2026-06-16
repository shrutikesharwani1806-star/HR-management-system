import React, { useState } from 'react'
import Sidebar from './Sidebar'
import ProfileEditModal from './ProfileEditModal'
import NoticePopout from './NoticePopout'
import { useAuth } from '../context/AuthContext'

export default function Layout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileEditOpen, setProfileEditOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/20 via-stone-50/30 to-slate-50/20 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 w-full max-w-[100vw] overflow-x-hidden">
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-rose-100/40 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 w-full">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button 
              className="lg:hidden text-rose-500 hover:text-rose-700 focus:outline-none text-xl flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <h1 className="text-base sm:text-lg font-bold text-stone-850 tracking-wide flex items-center gap-2 truncate">
              <span className="truncate">{title}</span>
              <span className="text-sm opacity-80 hidden sm:inline">✨</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button 
              onClick={() => setProfileEditOpen(true)}
              className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full border border-indigo-150 transition-all shadow-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              👤 <span className="hidden sm:inline">Edit Profile</span>
            </button>
            <div className="text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1.5 bg-rose-50/60 text-rose-700/80 rounded-full border border-rose-100/50 shadow-xs hidden md:block whitespace-nowrap">
              🍬 {user?.tenant?.companyName ? `${user.tenant.companyName} Workspace` : 'Sweet Workspace'}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 flex-1 max-w-7xl w-full mx-auto overflow-x-hidden flex flex-col min-h-0">
          {children}
        </main>
      </div>

      <ProfileEditModal isOpen={profileEditOpen} onClose={() => setProfileEditOpen(false)} />
      <NoticePopout />
    </div>
  )
}
