'use client'

import { useSession } from 'next-auth/react'
import AuthGuard from '@/components/auth/AuthGuard'
import ProfileManager from '@/components/profile/ProfileManager'

export default function ProfilePage() {
  return (
    <AuthGuard requireAuth={true}>
      <ProfileManager />
    </AuthGuard>
  )
}