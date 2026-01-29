import { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { isEmailBlocked, trackFailedLogin, resetFailedLoginAttempts } from "@/lib/middleware/rateLimit"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  providers: [
    CredentialsProvider({
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

        const email = credentials.email.toLowerCase()

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
              accountStatus: true
            }
          })

          if (!user || !user.hashedPassword) {
            // Track failed attempt (user not found)
            await trackFailedLogin(email)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          )

          if (!isPasswordValid) {
            // Track failed attempt (wrong password)
            await trackFailedLogin(email)
            return null
          }

          // Check if account is banned or suspended
          if (user.accountStatus === 'BANNED') {
            throw new Error('Ce compte a ete banni.')
          }
          if (user.accountStatus === 'SUSPENDED') {
            throw new Error('Ce compte est temporairement suspendu.')
          }

          // Successful login - reset failed attempts counter
          await resetFailedLoginAttempts(email)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          }
        } catch (error) {
          // Re-throw custom errors (blocked, banned, suspended)
          if (error instanceof Error &&
              (error.message.includes('bloque') ||
               error.message.includes('banni') ||
               error.message.includes('suspendu'))) {
            throw error
          }
          console.error('Erreur authentification:', error)
          return null
        }
      }
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
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
      }
      // Refresh user data from database on session update
      if (trigger === 'update' && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, image: true, role: true }
        })
        if (dbUser) {
          token.name = dbUser.name
          token.image = dbUser.image
          token.role = dbUser.role
        }
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
        session.user.name = token.name as string | null
        session.user.image = token.image as string | null
        ;(session.user as any).role = token.role || 'USER'
      }
      return session
    },
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}

// Fonction helper pour récupérer la session côté serveur
export async function auth() {
  return await getServerSession(authOptions)
}

export default authOptions
