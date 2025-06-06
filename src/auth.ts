// src/auth.ts - Configuration NextAuth v5 corrigée
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./lib/db"
import bcrypt from "bcryptjs"

// ✅ CORRECTION: Créer la configuration d'abord
const authConfig = {
  adapter: PrismaAdapter(prisma),
  
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
        console.log("🔐 AUTHORIZE APPELÉ avec:", credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Email ou mot de passe manquant")
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user) {
            console.log("❌ Utilisateur non trouvé:", credentials.email)
            return null
          }

          if (!user.hashedPassword) {
            console.log("❌ Utilisateur sans mot de passe (compte OAuth uniquement)")
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          )

          if (!isPasswordValid) {
            console.log("❌ Mot de passe incorrect")
            return null
          }

          console.log("✅ Authentification credentials réussie:", user.email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error("❌ Erreur lors de l'authentification:", error)
          return null
        }
      }
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 jours
    updateAge: 24 * 60 * 60, // 24 heures
  },

  // Configuration des cookies pour NextAuth v5
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 jours
      },
    },
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider || "credentials"
        
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { emailVerified: true }
          })
          token.emailVerified = dbUser?.emailVerified
        } catch (error) {
          console.error("❌ Erreur lors de la récupération du statut de vérification:", error)
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 JWT Token mis à jour:', {
          userId: token.id,
          email: token.email,
          provider: token.provider
        })
      }
      
      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.provider = token.provider as string
        session.user.emailVerified = token.emailVerified as Date | null
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Session créée:', {
          userId: session.user?.id,
          email: session.user?.email,
          provider: session.user?.provider
        })
      }
      
      return session
    },

    async signIn({ user, account, profile }) {
      console.log(`🔑 Tentative de connexion: ${user.email} via ${account?.provider}`)
      
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (!existingUser) {
            console.log("❌ Tentative de création de compte OAuth bloquée:", user.email)
            return `/auth/error?error=OAuthAccountNotLinked&email=${encodeURIComponent(user.email!)}`
          }

          const existingAccount = await prisma.account.findFirst({
            where: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            }
          })

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              }
            })
            console.log("✅ Compte OAuth lié:", account.provider)
          }
        } catch (error) {
          console.error("❌ Erreur lors de la vérification OAuth:", error)
          return false
        }
      }
      return true
    },

    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirection demandée:", { url, baseUrl })
      
      // Gestion de la déconnexion
      if (url === baseUrl || url === `${baseUrl}/` || url.includes('callbackUrl=%2F')) {
        console.log("🏠 Déconnexion détectée - redirection vers page publique")
        return baseUrl
      }
      
      // Si c'est une URL relative
      if (url.startsWith("/")) {
        const fullUrl = `${baseUrl}${url}`
        console.log("🔄 URL relative détectée:", fullUrl)
        
        if (url === '/' || url === '') {
          console.log("🏠 URL racine - vérification du contexte")
          return baseUrl
        }
        
        if (url === '/profile' || url.startsWith('/profile')) {
          console.log("✅ Redirection vers /profile autorisée")
          return fullUrl
        }
        
        if (url === '/dashboard') {
          console.log("🏠 Redirection dashboard vers /profile")
          return `${baseUrl}/profile`
        }
        
        return fullUrl
      }

      // Si c'est une URL du même domaine
      if (new URL(url).origin === baseUrl) {
        const urlObj = new URL(url)
        
        if (urlObj.pathname === '/' && urlObj.searchParams.get('callbackUrl') === '/') {
          console.log("🏠 URL de déconnexion complète - page publique")
          return baseUrl
        }
        
        if (urlObj.pathname === '/profile' || urlObj.pathname.startsWith('/profile')) {
          console.log("✅ URL complète /profile autorisée")
          return url
        }
        
        if (urlObj.pathname === '/dashboard') {
          console.log("🏠 Redirection URL complète dashboard vers /profile")
          return `${baseUrl}/profile`
        }
        
        return url
      }

      console.log("🏠 Redirection par défaut")
      return baseUrl
    }
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    verifyRequest: '/auth/verify-email',
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`✅ Utilisateur connecté: ${user.email} via ${account?.provider}`)
    },
    async signOut({ session, token }) {
      console.log(`👋 Utilisateur déconnecté`)
    },
  },

  debug: process.env.NODE_ENV === "development",
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
}

// ✅ CORRECTION: Exporter avec NextAuth et destructurer
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)