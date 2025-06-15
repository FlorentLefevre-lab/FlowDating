import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import { cache, userCache, sessionCache } from "@/lib/cache"
import bcrypt from "bcryptjs"

interface CachedUser {
  id: string
  email: string
  name: string | null
  image: string | null
  hashedPassword: string | null
  emailVerified: Date | null
  provider?: string
}

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
        console.log(`[${process.env.INSTANCE_ID}] 🔐 AUTHORIZE APPELÉ avec:`, credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log(`[${process.env.INSTANCE_ID}] ❌ Email ou mot de passe manquant`)
          return null
        }

        try {
          // TOUJOURS utiliser Redis pour éviter les incohérences entre instances
          let user = await userCache.get(credentials.email)
          
          if (!user) {
            console.log(`[${process.env.INSTANCE_ID}] 📦 Cache MISS - Requête DB pour:`, credentials.email)
            
            const dbUser = await prisma.user.findUnique({
              where: { email: credentials.email },
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
                hashedPassword: true,
                emailVerified: true
              }
            })

            if (!dbUser) {
              console.log(`[${process.env.INSTANCE_ID}] ❌ Utilisateur non trouvé:`, credentials.email)
              return null
            }

            user = dbUser as CachedUser
            // Cache avec TTL plus long pour les données utilisateur de base
            await userCache.set(credentials.email, user)
            console.log(`[${process.env.INSTANCE_ID}] 📦 Utilisateur mis en cache:`, credentials.email)
          } else {
            console.log(`[${process.env.INSTANCE_ID}] 📦 Cache HIT pour utilisateur:`, credentials.email)
          }

          if (!user.hashedPassword) {
            console.log(`[${process.env.INSTANCE_ID}] ❌ Utilisateur sans mot de passe (compte OAuth uniquement)`)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          )

          if (!isPasswordValid) {
            console.log(`[${process.env.INSTANCE_ID}] ❌ Mot de passe incorrect`)
            return null
          }

          console.log(`[${process.env.INSTANCE_ID}] ✅ Authentification credentials réussie:`, user.email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error(`[${process.env.INSTANCE_ID}] ❌ Erreur lors de l'authentification:`, error)
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
    updateAge: 24 * 60 * 60,   // Mise à jour quotidienne
  },

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
        maxAge: 30 * 24 * 60 * 60,
        // IMPORTANT: Pas de domain spécifique pour permettre le load balancing
      },
    },
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider || "credentials"
        
        try {
          // Utiliser une clé unique pour chaque utilisateur dans le cache de vérification
          const userKey = `verification:${user.id}`
          let emailVerified = await cache.get(userKey, { prefix: 'auth:', ttl: 900 })
          
          if (emailVerified === null) {
            console.log(`[${process.env.INSTANCE_ID}] 📦 Cache MISS - Requête DB pour vérification:`, user.id)
            
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { emailVerified: true }
            })
            
            emailVerified = dbUser?.emailVerified || null
            
            // Cache Redis partagé pour toutes les instances
            await cache.set(userKey, emailVerified, { prefix: 'auth:', ttl: 900 })
            console.log(`[${process.env.INSTANCE_ID}] 📦 Statut vérification mis en cache:`, user.id)
          } else {
            console.log(`[${process.env.INSTANCE_ID}] 📦 Cache HIT pour vérification:`, user.id)
          }
          
          token.emailVerified = emailVerified
        } catch (error) {
          console.error(`[${process.env.INSTANCE_ID}] ❌ Erreur lors de la récupération du statut de vérification:`, error)
        }
      }
      
      // Session multi-instances : stocker les infos avec rotation automatique
      if (token.id) {
        const sessionData = {
          userId: token.id,
          email: token.email,
          provider: token.provider,
          lastAccess: new Date(),
          instanceId: process.env.INSTANCE_ID,
          instanceColor: process.env.INSTANCE_COLOR,
          // Ajouter un timestamp pour la rotation des sessions
          lastUpdate: Date.now()
        }
        
        // Utiliser l'ID utilisateur comme clé pour permettre l'accès depuis toutes les instances
        await sessionCache.set(`user:${token.id}`, sessionData)
        console.log(`[${process.env.INSTANCE_ID}] 💾 Session stockée pour:`, token.id)
      }
      
      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.provider = token.provider as string
        session.user.emailVerified = token.emailVerified as Date | null
        
        // Récupérer les infos de session partagées
        try {
          const sessionData = await sessionCache.get(`user:${token.id}`)
          if (sessionData) {
            (session as any).instanceInfo = {
              currentInstance: process.env.INSTANCE_ID,
              lastInstance: sessionData.instanceId,
              color: process.env.INSTANCE_COLOR,
              lastAccess: sessionData.lastAccess,
              // Ajouter des infos de load balancing
              isLoadBalanced: sessionData.instanceId !== process.env.INSTANCE_ID
            }
            
            // Mettre à jour la dernière instance d'accès
            if (sessionData.instanceId !== process.env.INSTANCE_ID) {
              sessionData.instanceId = process.env.INSTANCE_ID
              sessionData.lastAccess = new Date()
              await sessionCache.set(`user:${token.id}`, sessionData)
              console.log(`[${process.env.INSTANCE_ID}] 🔄 Session migrée depuis:`, sessionData.lastInstance)
            }
          }
        } catch (error) {
          console.error(`[${process.env.INSTANCE_ID}] ❌ Erreur récupération session:`, error)
        }
      }
      
      return session
    },

    async signIn({ user, account, profile }) {
      console.log(`[${process.env.INSTANCE_ID}] 🔑 Tentative de connexion: ${user.email} via ${account?.provider}`)
      
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          // Cache partagé pour OAuth
          let existingUser = await userCache.get(user.email!)
          
          if (!existingUser) {
            console.log(`[${process.env.INSTANCE_ID}] 📦 Cache MISS - Vérification DB utilisateur OAuth:`, user.email)
            
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email! },
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
                hashedPassword: true,
                emailVerified: true
              }
            })

            if (!dbUser) {
              console.log(`[${process.env.INSTANCE_ID}] ❌ Tentative de création de compte OAuth bloquée:`, user.email)
              return `/auth/error?error=OAuthAccountNotLinked&email=${encodeURIComponent(user.email!)}`
            }

            existingUser = dbUser as CachedUser
            await userCache.set(user.email!, existingUser)
            console.log(`[${process.env.INSTANCE_ID}] 📦 Utilisateur OAuth mis en cache:`, user.email)
          } else {
            console.log(`[${process.env.INSTANCE_ID}] 📦 Cache HIT pour utilisateur OAuth:`, user.email)
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
            
            // Invalider le cache sur TOUTES les instances
            await userCache.delete(user.email!)
            await cache.invalidatePattern(`user:${existingUser.id}`, { prefix: 'auth:' })
            console.log(`[${process.env.INSTANCE_ID}] ✅ Compte OAuth lié et cache invalidé:`, account.provider)
          }
        } catch (error) {
          console.error(`[${process.env.INSTANCE_ID}] ❌ Erreur lors de la vérification OAuth:`, error)
          return false
        }
      }
      return true
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
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
      console.log(`[${process.env.INSTANCE_ID}] ✅ Utilisateur connecté: ${user.email} via ${account?.provider}`)
      
      if (user.id) {
        // Stocker les analytics de connexion avec l'instance
        const loginEvent = {
          userId: user.id,
          email: user.email,
          provider: account?.provider,
          timestamp: new Date(),
          isNewUser,
          instanceId: process.env.INSTANCE_ID,
          sessionId: `${user.id}-${Date.now()}`
        }
        
        await cache.set(
          `login:${user.id}:${Date.now()}`, 
          loginEvent,
          { prefix: 'analytics:', ttl: 86400 }
        )
        
        // Nettoyer les anciennes sessions pour cet utilisateur
        await this.cleanupOldSessions(user.id)
      }
    },
    
    async signOut({ session, token }) {
      console.log(`[${process.env.INSTANCE_ID}] 👋 Utilisateur déconnecté`)
      
      if (token?.id) {
        // Nettoyer toutes les données de session sur toutes les instances
        await Promise.all([
          sessionCache.delete(`user:${token.id}`),
          cache.delete(`verification:${token.id}`, { prefix: 'auth:' }),
          cache.invalidatePattern(`user:${token.id}`, { prefix: 'sessions:' })
        ])
        console.log(`[${process.env.INSTANCE_ID}] 🧹 Cache de session nettoyé pour:`, token.id)
      }
    },
  },

  // Fonction utilitaire pour nettoyer les anciennes sessions
  async cleanupOldSessions(userId: string) {
    try {
      // Supprimer les sessions de plus de 7 jours
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000)
      await cache.invalidatePattern(`login:${userId}`, { prefix: 'analytics:' })
      console.log(`[${process.env.INSTANCE_ID}] 🧹 Anciennes sessions nettoyées pour:`, userId)
    } catch (error) {
      console.error(`[${process.env.INSTANCE_ID}] ❌ Erreur nettoyage sessions:`, error)
    }
  },

  debug: process.env.NODE_ENV === "development",
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

// Fonction d'invalidation optimisée pour multi-instances
export async function invalidateUserCache(email: string, userId?: string) {
  // Invalider sur TOUTES les instances via Redis pub/sub
  await userCache.delete(email)
  
  if (userId) {
    await Promise.all([
      sessionCache.delete(`user:${userId}`),
      cache.delete(`verification:${userId}`, { prefix: 'auth:' }),
      cache.invalidateUserCache(userId) // Utilise le nouveau système d'invalidation
    ])
  }
  
  console.log(`[${process.env.INSTANCE_ID}] 🧹 Cache utilisateur invalidé globalement:`, email)
}

// Nouvelle fonction pour vérifier la santé des sessions
export async function getSessionHealth(userId: string) {
  try {
    const sessionData = await sessionCache.get(`user:${userId}`)
    return {
      exists: !!sessionData,
      lastAccess: sessionData?.lastAccess,
      instanceId: sessionData?.instanceId,
      isStale: sessionData ? (Date.now() - sessionData.lastUpdate) > 3600000 : true // 1h
    }
  } catch (error) {
    console.error(`[${process.env.INSTANCE_ID}] ❌ Erreur health check session:`, error)
    return { exists: false, isStale: true }
  }
}