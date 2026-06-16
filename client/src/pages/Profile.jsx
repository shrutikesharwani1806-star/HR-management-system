import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { refreshUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)

  const [activityLogs, setActivityLogs] = useState([])
  const [fetchingActivity, setFetchingActivity] = useState(false)

  const calculateCompletion = (p) => {
    if (!p) return 0;
    const fields = [
      p.firstName,
      p.lastName,
      p.dateOfBirth,
      p.gender,
      p.photoUrl,
      p.maritalStatus,
      p.nationality,
      p.personalEmail,
      p.phone,
      p.currentAddress?.line1 || p.currentAddress,
      p.permanentAddress?.line1 || p.permanentAddress,
      p.emergencyContact?.name,
      p.emergencyContact?.phone,
      p.emergencyContact?.relationship,
      p.bankDetails?.accountNumber,
      p.bankDetails?.ifscCode,
      p.bankDetails?.bankName,
      p.pan,
      p.aadhaar,
      p.pf,
      p.uan,
      p.education && p.education.length > 0,
      p.experience && p.experience.length > 0,
      p.skills && p.skills.length > 0,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const fetchActivity = async (empId) => {
    setFetchingActivity(true)
    try {
      const res = await api.get(`/employees/${empId}/activity`)
      setActivityLogs(res.data.data || [])
    } catch (err) {
      console.error(err)
    }
    setFetchingActivity(false)
  }

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await api.get('/employees/me')
      const empData = res.data.data
      setProfile(empData)
      setForm(empData)
      if (empData?._id) {
        fetchActivity(empData._id)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchProfile() }, [])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    
    try {
      const res = await api.put(`/employees/${profile._id}`, form)
      
      // Save details to localStorage
      const stored = localStorage.getItem('user')
      if (stored) {
        const userData = JSON.parse(stored)
        userData.employee = res.data.data
        localStorage.setItem('user', JSON.stringify(userData))
      }

      setMsg('✅ Profile updated successfully.')
      setEditing(false)
      fetchProfile()
      if (refreshUser) refreshUser()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile')
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    setMsg('')

    const formData = new FormData()
    formData.append('photo', file)

    try {
      await api.post(`/employees/${profile._id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMsg('✅ Profile photo updated successfully.')
      fetchProfile()
      if (refreshUser) refreshUser()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return (
    <Layout title="My Profile">
      <div className="flex justify-center items-center py-20"><div className="spin" /></div>
    </Layout>
  )

  return (
    <Layout title="My Profile">
      <div className="max-w-6xl mx-auto space-y-6">
        {msg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">{msg}</div>}
        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">{error}</div>}

        {/* Profile Card Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              {profile?.photoUrl ? (
                <img 
                  src={profile.photoUrl} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-indigo-150 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-750 text-3xl font-bold flex items-center justify-center shadow-md">
                  {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                </div>
              )}
              
              <label className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-1.5 shadow-md cursor-pointer transition-colors" title="Upload Photo">
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                <span className="text-[10px] font-bold">{uploading ? '⌛' : '📸'}</span>
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-slate-800">{profile?.firstName} {profile?.lastName}</h2>
              <p className="text-sm text-slate-500 capitalize">{profile?.designationId?.name || 'Employee'} • {profile?.departmentId?.name || 'Department'}</p>
              <p className="text-xs text-slate-400 mt-1">Employee ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{profile?.employeeId}</code></p>
            </div>
            <button 
              className="px-4 py-2 border border-indigo-200 text-indigo-650 hover:bg-indigo-50 rounded-lg text-sm font-semibold transition-colors"
              onClick={() => setEditing(!editing)}
            >
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Profile Completion Indicator */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1.5">
              <span className="flex items-center gap-1">📊 Profile Completion Status</span>
              <span className={calculateCompletion(profile) === 100 ? "text-emerald-600" : "text-indigo-600"}>{calculateCompletion(profile)}% Complete</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${calculateCompletion(profile) === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                style={{ width: `${calculateCompletion(profile)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form / Details View */}
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">First Name</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.firstName : profile?.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} disabled={!editing} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Last Name</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.lastName : profile?.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} disabled={!editing} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Official Email</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 outline-none" value={profile?.officialEmail || ''} disabled />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.phone : profile?.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? (form.dateOfBirth?.substring(0, 10)) : (profile?.dateOfBirth?.substring(0, 10) || '')} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} disabled={!editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Gender</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.gender : profile?.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })} disabled={!editing}>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer Not To Say</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Marital Status</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.maritalStatus : profile?.maritalStatus || ''} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })} disabled={!editing}>
                  <option value="">Select Status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nationality</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.nationality : profile?.nationality || ''} onChange={(e) => setForm({ ...form, nationality: e.target.value })} disabled={!editing} />
              </div>
            </div>

            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pt-4 pb-3">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Name</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.emergencyContact?.name : profile?.emergencyContact?.name || ''} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })} disabled={!editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Relationship</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.emergencyContact?.relationship : profile?.emergencyContact?.relationship || ''} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: e.target.value } })} disabled={!editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.emergencyContact?.phone : profile?.emergencyContact?.phone || ''} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })} disabled={!editing} />
              </div>
            </div>

            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pt-4 pb-3">Employment Details (View Only)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-650">
              <div>
                <span className="block text-xs font-semibold text-slate-400">Joining Date</span>
                <span className="text-sm font-semibold">{profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400">Manager</span>
                <span className="text-sm font-semibold">
                  {profile?.managerId ? `${profile.managerId.firstName} ${profile.managerId.lastName}` : 'None'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400">Location</span>
                <span className="text-sm font-semibold">{profile?.locationId?.name || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400">Grade / Band</span>
                <span className="text-sm font-semibold">{profile?.grade || '—'}</span>
              </div>
            </div>

            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pt-4 pb-3">Bank Account & Statutory Details (Sensitive)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Bank Name</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.bankDetails?.bankName : profile?.bankDetails?.bankName || ''} onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, bankName: e.target.value } })} disabled={!editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Account Number</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.bankDetails?.accountNumber : profile?.bankDetails?.accountNumber || ''} onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, accountNumber: e.target.value } })} disabled={!editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">IFSC Code</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.bankDetails?.ifscCode : profile?.bankDetails?.ifscCode || ''} onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, ifscCode: e.target.value } })} disabled={!editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">PAN Card Number</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.pan : profile?.pan || ''} onChange={(e) => setForm({ ...form, pan: e.target.value })} disabled={!editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Aadhaar Number</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.aadhaar : profile?.aadhaar || ''} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} disabled={!editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">PF Number</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.pf : profile?.pf || ''} onChange={(e) => setForm({ ...form, pf: e.target.value })} disabled={!editing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">UAN Number</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-75" value={editing ? form.uan : profile?.uan || ''} onChange={(e) => setForm({ ...form, uan: e.target.value })} disabled={!editing} />
              </div>
            </div>

            {editing && (
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" className="px-4 py-2 border border-slate-200 text-slate-650 rounded-lg text-sm" onClick={() => { setForm(profile); setEditing(false) }}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">Save Changes</button>
              </div>
            )}
          </div>
        </form>

        {/* Documents Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">My Documents</h3>
          <div className="divide-y divide-slate-100">
            {profile?.documents?.length === 0 ? (
              <div className="text-center py-6 text-slate-400">No documents uploaded</div>
            ) : (
              profile?.documents?.map((doc, i) => (
                <div key={i} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-slate-800">{doc.name}</div>
                    <div className="text-xs text-slate-400 capitalize">{doc.type} • Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noreferrer" className="px-3 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-semibold rounded-lg text-slate-700">
                    View Document
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Professional Details Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">💼 Professional Information</h3>
          
          {/* Skills */}
          <div>
            <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {profile?.skills && profile.skills.length > 0 ? (
                profile.skills.map((skill, index) => (
                  <span key={index} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">{skill}</span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No skills listed</span>
              )}
            </div>
          </div>

          {/* Education */}
          <div>
            <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Education</h4>
            {profile?.education && profile.education.length > 0 ? (
              <div className="space-y-3">
                {profile.education.map((edu, index) => (
                  <div key={index} className="text-xs border-l-2 border-indigo-200 pl-3 py-0.5">
                    <div className="font-semibold text-slate-800">{edu.degree}</div>
                    <div className="text-slate-500">{edu.institution} • Year: {edu.year}</div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">No education entries listed</span>
            )}
          </div>

          {/* Work Experience */}
          <div>
            <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Work Experience</h4>
            {profile?.experience && profile.experience.length > 0 ? (
              <div className="space-y-3">
                {profile.experience.map((exp, index) => (
                  <div key={index} className="text-xs border-l-2 border-indigo-200 pl-3 py-0.5">
                    <div className="font-semibold text-slate-800">{exp.designation}</div>
                    <div className="text-slate-500">{exp.company} • {exp.from ? new Date(exp.from).getFullYear() : ''} - {exp.to ? new Date(exp.to).getFullYear() : 'Present'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">No work experience listed</span>
            )}
          </div>
        </div>

        {/* Activity History & Audit Trail */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">📜 Activity History & Audit Trail</h3>
          <div className="flow-root mt-4">
            {fetchingActivity ? (
              <div className="text-center py-6 text-xs text-slate-400">Loading activity trail...</div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">No activity logs recorded</div>
            ) : (
              <ul className="-mb-8">
                {activityLogs.map((log, index) => (
                  <li key={log._id}>
                    <div className="relative pb-8">
                      {index !== activityLogs.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs">
                            {log.action === 'create' ? '🆕' : log.action === 'update' ? '✏️' : '⚙️'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-800 capitalize">
                              {log.action} <span className="font-mono text-[9px] text-slate-500 bg-slate-50 px-1 py-0.5 rounded border border-slate-100">{log.module}</span>
                            </p>
                            {log.userEmail && (
                              <p className="text-[10px] text-slate-400 mt-0.5">By {log.userEmail}</p>
                            )}
                          </div>
                          <div className="text-right text-[10px] whitespace-nowrap text-slate-400 pt-0.5">
                            <time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString()}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
