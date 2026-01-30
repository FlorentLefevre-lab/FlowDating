import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./src/lib/db"
import * as bcrypt from "bcryptjs"
import { isEmailBlocked, trackFailedLogin, resetFailedLoginAttempts } from "./src/lib/middleware/rateLimit"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,

  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "votre.email@example.com"
        },
        password: {
          label: "Mot de passe",
          type: "password"
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = (credentials.email as string).toLowerCase()

        try {
          // Check if email is blocked due to too many failed attempts
          const blocked = await isEmailBlocked(email)
          if (blocked) {
            console.warn(`[AUTH] Blocked login attempt for email: ${email}`)
            throw new Error('Compte temporairement bloque. Reessayez dans 15 minutes.')
          }

          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              hashedPassword: true,
              emailVerified: true,
              role: true,
              accountStatus: true,
              suspendedUntil: true,
              suspensionReason: true
            }
          })

          if (!user || !user.hashedPassword) {
            // Track failed attempt (user not found)
            await trackFailedLogin(email)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.hashedPassword
          )

          if (!isPasswordValid) {
            // Track failed attempt (wrong password)
            await trackFailedLogin(email)
            return null
          }

          // Check if account is banned or suspended
          if (user.accountStatus === 'BANNED') {
            throw new Error('BANNED:Ce compte a ete definitivement banni pour violation des regles.')
          }
          if (user.accountStatus === 'SUSPENDED') {
            // Check if suspension has expired
            if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
              // Suspension expired, auto-reactivate
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  accountStatus: 'ACTIVE',
                  suspendedAt: null,
                  suspendedUntil: null,
                  suspensionReason: null
                }
              })
              // Continue with login
            } else {
              // Still suspended
              const untilDate = user.suspendedUntil
                ? new Date(user.suspendedUntil).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : null
              const message = untilDate
                ? `SUSPENDED:Votre compte est suspendu jusqu'au ${untilDate}.`
                : 'SUSPENDED:Votre compte est temporairement suspendu.'
              throw new Error(message)
            }
          }

          // Successful login - reset failed attempts counter
          await resetFailedLoginAttempts(email)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            accountStatus: user.accountStatus,
          }
        } catch (error) {
          // Re-throw custom errors (blocked, banned, suspended)
          if (error instanceof Error &&
              (error.message.includes('bloque') ||
               error.message.startsWith('BANNED:') ||
               error.message.startsWith('SUSPENDED:'))) {
            throw error
          }
          console.error('Erreur authentification:', error)
          return null
        }
      }
    }),

    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.image = user.image
        token.role = (user as any).role || 'USER'
        token.accountStatus = (user as any).accountStatus || 'ACTIVE'
      }
      // Refresh user data from database on session update or periodically
      if ((trigger === 'update' || !token.lastChecked || Date.now() - (token.lastChecked as number) > 60000) && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, image: true, role: true, accountStatus: true, suspendedUntil: true }
        })
        if (dbUser) {
          token.name = dbUser.name
          token.image = dbUser.image
          token.role = dbUser.role
          // Check if suspension expired
          if (dbUser.accountStatus === 'SUSPENDED' && dbUser.suspendedUntil && new Date(dbUser.suspendedUntil) <= new Date()) {
            token.accountStatus = 'ACTIVE'
          } else {
            token.accountStatus = dbUser.accountStatus
          }
          token.lastChecked = Date.now()
        }
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
        session.user.name = token.name as string | null
        session.user.image = token.image as string | null
        ;(session.user as any).role = (token.role as string) || 'USER'
        ;(session.user as any).accountStatus = (token.accountStatus as string) || 'ACTIVE'
      }
      return session
    },
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  // Utiliser AUTH_DEBUG=true pour activer le mode debug
  debug: process.env.AUTH_DEBUG === "true",
})
