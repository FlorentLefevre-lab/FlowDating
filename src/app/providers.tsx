'use client'

import { SessionProvider } from 'next-auth/react'
import { SocketProvider } from '@/providers/SocketProvider'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </SessionProvider>
  )
}