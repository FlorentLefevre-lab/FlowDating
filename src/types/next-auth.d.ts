import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
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
    provider?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    provider?: string
    emailVerified?: Date | null
  }
}