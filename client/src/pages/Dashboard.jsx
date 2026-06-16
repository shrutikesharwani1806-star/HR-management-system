import React from 'react'
import { useAuth } from '../context/AuthContext'
import LeadershipDashboard from './dashboards/LeadershipDashboard'
import HrDashboard from './dashboards/HrDashboard'
import ManagerDashboard from './dashboards/ManagerDashboard'
import EmployeeDashboard from './dashboards/EmployeeDashboard'

export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'leadership') return <LeadershipDashboard />
  if (user?.role === 'hr_admin' || user?.role === 'super_admin') return <HrDashboard />
  if (user?.role === 'manager') return <ManagerDashboard />
  return <EmployeeDashboard />
}
