import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { usePermission } from './context/usePermission'
import Chatbot from './components/Chatbot'

// Lazy load all routes for maximum bundle splitting
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))

// Lazy load: App pages (only loaded after login)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Employees = lazy(() => import('./pages/Employees'))
const Attendance = lazy(() => import('./pages/Attendance'))
const Leave = lazy(() => import('./pages/Leave'))
const Organization = lazy(() => import('./pages/Organization'))
const Reports = lazy(() => import('./pages/Reports'))
const Approvals = lazy(() => import('./pages/Approvals'))
const Profile = lazy(() => import('./pages/Profile'))
const Payslips = lazy(() => import('./pages/Payslips'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const RoleManagement = lazy(() => import('./pages/RoleManagement'))
const Unauthorized = lazy(() => import('./pages/Unauthorized'))
const Activate = lazy(() => import('./pages/Activate'))

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <div className="spinner" />
  </div>
)

function PrivateRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth()
  if (loading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user && user.isActivated === false) {
    return <Navigate to="/activate" replace />
  }
  return <Suspense fallback={<Spinner />}>{children}</Suspense>
}

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated) {
    if (user && user.isActivated === false) {
      return <Navigate to="/activate" replace />
    }
    return <Navigate to="/dashboard" replace />
  }
  return <Suspense fallback={<Spinner />}>{children}</Suspense>
}

function PermissionRoute({ children, permission }) {
  const { hasPermission } = usePermission()
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing page — the first thing visitors see */}
          <Route path="/" element={<Suspense fallback={<Spinner />}><Landing /></Suspense>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/activate" element={<Activate />} />

          {/* Protected app routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/employees" element={<PrivateRoute><PermissionRoute permission="employee:view"><Employees /></PermissionRoute></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
          <Route path="/leave" element={<PrivateRoute><Leave /></PrivateRoute>} />
          <Route path="/organization" element={<PrivateRoute><PermissionRoute permission="settings:view"><Organization /></PermissionRoute></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><PermissionRoute permission="report:view"><Reports /></PermissionRoute></PrivateRoute>} />
          <Route path="/approvals" element={<PrivateRoute><PermissionRoute permission="leave:approve"><Approvals /></PermissionRoute></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/payslips" element={<PrivateRoute><PermissionRoute permission="payroll:view"><Payslips /></PermissionRoute></PrivateRoute>} />
          <Route path="/user-management" element={<PrivateRoute><PermissionRoute permission="user:manage"><UserManagement /></PermissionRoute></PrivateRoute>} />
          <Route path="/roles" element={<PrivateRoute><PermissionRoute permission="role:create"><RoleManagement /></PermissionRoute></PrivateRoute>} />
          <Route path="/unauthorized" element={<Suspense fallback={<Spinner />}><Unauthorized /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Chatbot />
      </BrowserRouter>
    </AuthProvider>
  )
}
