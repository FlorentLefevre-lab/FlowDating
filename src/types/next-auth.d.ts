import { DefaultSession } from 'next-auth'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      provider?: string
      emailVerified?: Date | null
    } & DefaultSession['user']
    instanceInfo?: {
      currentInstance: string
      lastInstance?: string
      color?: string
    }
  }

  interface User {
    id: string
    role: string
    provider?: string
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    role: string
    provider?: string
    emailVerified?: Date | null
  }
}
