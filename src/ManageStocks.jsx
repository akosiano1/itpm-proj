// src/ManageInventory.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'

import ManageChickenStock from './components/admin/ManageChickenStock'
import EditMenuPrices from './components/admin/EditMenuPrices'
import StallStatusOverview from './components/admin/StallStatusOverview'
import ExpensesOverview from './components/admin/ExpensesOverview'

async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, full_name, stall_id, status')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export default function ManageInventory() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)

  const canAccess = useMemo(() => profile?.role === 'admin', [profile])

  useEffect(() => {
    let isMounted = true
    async function loadProfile() {
      if (!user) return
      try {
        const p = await fetchUserProfile(user.id)
        if (isMounted) setProfile(p)
      } catch (err) {
        console.error('Failed to load profile in ManageInventory:', err)
      }
    }
    loadProfile()
    return () => {
      isMounted = false
    }
  }, [user])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  if (profile && profile.role !== 'admin') {
    alert('Access denied. Only admins can manage inventory.')
    navigate('/dashboard')
    return null
  }

  return (
    <Layout userProfile={profile}>
      <div className="container mx-auto p-6 space-y-6">
        <ManageChickenStock />
        <EditMenuPrices />
        <StallStatusOverview />
        <ExpensesOverview />
      </div>
    </Layout>
  )
}
