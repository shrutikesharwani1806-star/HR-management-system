import React, { useState } from 'react';
import api from '../api/axios';

export default function NoticeModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', fromDate: '', toDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMsg(''); setLoading(true);

    if (new Date(form.fromDate) > new Date(form.toDate)) {
      setError('Start date must be before or equal to End date');
      setLoading(false);
      return;
    }

    try {
      await api.post('/notices', form);
      setMsg('✅ Holiday notice successfully published to all employees.');
      setTimeout(() => { onClose(); setForm({ title: '', description: '', fromDate: '', toDate: '' }); }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish notice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in-up">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">📢 Announce Holiday</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">✕</button>
        </div>

        {msg && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold rounded-xl animate-fade-in">{msg}</div>}
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold rounded-xl animate-fade-in">{error}</div>}

        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1.5">Notice Title</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Diwali Holiday" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-50 transition-all" />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1.5">Description & Reason</label>
            <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="3" placeholder="Provide details about the holiday..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-50 transition-all resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1.5">From Date</label>
              <input required type="date" value={form.fromDate} onChange={e => setForm({...form, fromDate: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-50 transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1.5">To Date (Auto-Expires)</label>
              <input required type="date" value={form.toDate} onChange={e => setForm({...form, toDate: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-50 transition-all" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-2">
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50">
              {loading ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
