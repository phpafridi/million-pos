'use client'
import React from 'react'
import { useSession } from 'next-auth/react'
import Dashboard from './Dashboard'
import HeadOfficeDashboard from './HeadOfficeDashboard'

export default function DashboardRouter() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="right-side" style={{ minHeight: '945px' }}>Loading...</div>
  }

  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)
  return isSuperAdmin ? <HeadOfficeDashboard /> : <Dashboard />
}
