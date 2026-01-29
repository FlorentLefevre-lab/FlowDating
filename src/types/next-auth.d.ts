import { DefaultSession } from 'next-auth'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
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
    role: UserRole
    provider?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    provider?: string
    emailVerified?: Date | null
  }
}