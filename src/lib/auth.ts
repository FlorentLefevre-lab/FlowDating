import { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // 🔥 IMPORTANT: Credentials en premier pour priorité
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
        console.log("🔐 Tentative d'authentification avec credentials:", credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Email ou mot de passe manquant")
          return null // ⚠️ Retourner null au lieu de throw
        }

        try {
          // Rechercher l'utilisateur dans la base
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user) {
            console.log("❌ Utilisateur non trouvé:", credentials.email)
            return null
          }

          if (!user.hashedPassword) {
            console.log("❌ Utilisateur sans mot de passe (compte OAuth uniquement)")
            return null
          }

          // Vérifier le mot de passe
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
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },

  callbacks: {
    // 🔥 JWT CALLBACK SIMPLIFIÉ
    async jwt({ token, user, account }) {
      // Première connexion : ajouter les infos user au token
      if (user) {
        token.id = user.id
        token.provider = account?.provider || "credentials"
        
        // Récupérer emailVerified seulement si nécessaire
        if (account?.provider !== "credentials") {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { emailVerified: true }
            })
            token.emailVerified = dbUser?.emailVerified
          } catch (error) {
            console.error("Erreur récupération emailVerified:", error)
          }
        }
      }
      
      return token
    },

    // 🔥 SESSION CALLBACK SIMPLIFIÉ
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.provider = token.provider as string
        session.user.emailVerified = token.emailVerified as Date | null
      }
      
      return session
    },

    // 🔥 SIGNIN CALLBACK SIMPLIFIÉ
    async signIn({ user, account, profile }) {
      console.log(`🔑 Tentative de connexion: ${user.email} via ${account?.provider}`)
      
      // Pour les providers OAuth, vérifier si l'utilisateur existe
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          // Si l'utilisateur n'existe pas, empêcher la création automatique
          if (!existingUser) {
            console.log("❌ Tentative de création de compte OAuth bloquée:", user.email)
            return `/auth/error?error=OAuthAccountNotLinked&email=${encodeURIComponent(user.email!)}`
          }

          // Lier le compte social si pas déjà fait
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

    // 🔥 REDIRECT CALLBACK SIMPLIFIÉ
    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirection:", { url, baseUrl })
      
      // Si c'est une URL relative, l'ajouter au baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      
      // Si c'est une URL du même domaine
      if (new URL(url).origin === baseUrl) {
        return url
      }
      
      // Par défaut, rediriger vers le profil
      return `${baseUrl}/profile`
    }
  },

  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register', 
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`✅ Utilisateur connecté: ${user.email} via ${account?.provider}`)
    },
    async signOut({ session, token }) {
      console.log(`👋 Utilisateur déconnecté: ${session?.user?.email}`)
    },
  },

  debug: process.env.NODE_ENV === "development",
}

export default NextAuth(authOptions)