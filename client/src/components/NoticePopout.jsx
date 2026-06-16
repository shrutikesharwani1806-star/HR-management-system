import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function NoticePopout() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotices = async () => {
      try {
        const res = await api.get('/notices/active');
        const activeNotices = res.data.data || [];
        
        // Filter out notices the user has already acknowledged this session or permanently
        const unseenNotices = activeNotices.filter(n => !localStorage.getItem(`notice_seen_${n._id}`));
        
        if (unseenNotices.length > 0) {
          setNotices(unseenNotices);
          setTimeout(() => setVisible(true), 1500); // Small delay before popout
        }
      } catch (err) {
        console.error('Failed to fetch notices', err);
      }
    };

    fetchNotices();
  }, [user]);

  const handleDismiss = () => {
    const currentNotice = notices[currentIndex];
    if (currentNotice) {
      localStorage.setItem(`notice_seen_${currentNotice._id}`, 'true');
    }
    
    if (currentIndex < notices.length - 1) {
      // Show next notice
      setCurrentIndex(prev => prev + 1);
    } else {
      // All notices dismissed
      setVisible(false);
    }
  };

  if (!visible || notices.length === 0) return null;

  const notice = notices[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={handleDismiss} />
      
      <div className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
        
        <div className="absolute top-0 right-0 p-4 z-10">
          <button 
            onClick={handleDismiss} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors shadow-sm backdrop-blur-md"
          >
            ✕
          </button>
        </div>

        <div className="h-32 bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white_0%,_transparent_60%)]" />
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-white/10 to-transparent" />
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-white/30 animate-pulse">
            🎉
          </div>
        </div>

        <div className="p-8 text-center relative">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1 bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-rose-200 shadow-sm">
            Company Announcement
          </div>

          <h3 className="text-2xl font-black text-slate-800 mb-2 mt-4 tracking-tight">{notice.title}</h3>
          
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 mb-6 bg-slate-50 py-2 rounded-xl border border-slate-100">
            <span>📅</span>
            <span>{new Date(notice.fromDate).toLocaleDateString()}</span>
            <span className="text-slate-300">→</span>
            <span>{new Date(notice.toDate).toLocaleDateString()}</span>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mb-8 bg-rose-50/30 p-4 rounded-2xl border border-rose-50 text-left">
            {notice.description}
          </p>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-6 px-2">
            <span>Posted by: <span className="text-slate-600 font-bold">{notice.createdBy?.employeeId?.firstName ? `${notice.createdBy.employeeId.firstName} ${notice.createdBy.employeeId.lastName}` : notice.createdBy?.email}</span></span>
            <span>{currentIndex + 1} of {notices.length}</span>
          </div>

          <button 
            onClick={handleDismiss} 
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl shadow-lg shadow-rose-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Acknowledge & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
