import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const res = await api.get('/employees/me')
        const stored = localStorage.getItem('user')
        const userData = stored ? JSON.parse(stored) : {}
        const fullUser = { ...userData, employee: res.data.data, tenant: res.data.tenant || userData.tenant }
        setUser(fullUser)
        localStorage.setItem('user', JSON.stringify(fullUser))
      } catch (err) {
        // Token might be invalid or expired
        console.error('Failed to load profile', err)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const login = async (tenantId, email, password, expectedRole) => {
    const res = await api.post('/auth/login', { tenantId, email, password, expectedRole })
    if (res.data.mfaRequired) {
      return { mfaRequired: true, mfaToken: res.data.mfaToken }
    }
    const { accessToken, refreshToken, user: userData } = res.data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    
    // Set temp user data first
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    
    // Fetch profile and merge
    try {
      const meRes = await api.get('/employees/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const fullUser = { ...userData, employee: meRes.data.data, tenant: meRes.data.tenant || userData.tenant }
      localStorage.setItem('user', JSON.stringify(fullUser))
      setUser(fullUser)
      return fullUser
    } catch {
      return userData
    }
  }

  const handleMfaVerification = async (mfaToken, code) => {
    const res = await api.post('/auth/verify-mfa', { mfaToken, code })
    const { accessToken, refreshToken, user: userData } = res.data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    
    try {
      const meRes = await api.get('/employees/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const fullUser = { ...userData, employee: meRes.data.data, tenant: meRes.data.tenant || userData.tenant }
      localStorage.setItem('user', JSON.stringify(fullUser))
      setUser(fullUser)
      return fullUser
    } catch {
      return userData
    }
  }

  const handleSsoLogin = async (ssoData) => {
    const { accessToken, refreshToken, user: userData } = ssoData
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    
    try {
      const meRes = await api.get('/employees/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const fullUser = { ...userData, employee: meRes.data.data, tenant: meRes.data.tenant || userData.tenant }
      localStorage.setItem('user', JSON.stringify(fullUser))
      setUser(fullUser)
      return fullUser
    } catch {
      return userData
    }
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user, refreshUser: fetchCurrentUser, handleMfaVerification, handleSsoLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
