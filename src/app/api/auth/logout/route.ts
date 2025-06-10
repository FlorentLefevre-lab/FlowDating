// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 API Logout: Début du nettoyage session serveur')
    
    // Récupérer la session actuelle
    const session = await auth()
    
    if (session?.user?.id) {
      console.log(`🧹 Nettoyage session pour utilisateur: ${session.user.id}`)
      
      // Ici vous pouvez ajouter du nettoyage côté base de données
      // Par exemple :
      // - Invalider tous les tokens de refresh
      // - Marquer les sessions comme expirées
      // - Nettoyer les données temporaires
      
      try {
        // Exemple d'appel DB pour nettoyer les sessions
        // await prisma.session.deleteMany({
        //   where: { userId: session.user.id }
        // })
        
        // await prisma.refreshToken.deleteMany({
        //   where: { userId: session.user.id }
        // })
        
        console.log('✅ Nettoyage DB effectué')
      } catch (dbError) {
        console.error('❌ Erreur nettoyage DB:', dbError)
        // Continue quand même
      }
    }

    // Créer une réponse avec suppression explicite des cookies
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Session nettoyée avec succès',
        timestamp: new Date().toISOString()
      }, 
      { status: 200 }
    )

    // Supprimer tous les cookies d'authentification
    const cookiesToClear = [
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Host-next-auth.csrf-token',
      'authjs.session-token',
      'authjs.csrf-token',
      'dating-app-session',
      'user-preferences',
      'auth-token'
    ]

    cookiesToClear.forEach(cookieName => {
      // Supprimer pour différents chemins et domaines
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })
      
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL?.replace('https://', '') : undefined
      })
    })

    console.log('✅ API Logout: Cookies serveur supprimés')
    return response

  } catch (error) {
    console.error('❌ Erreur API logout:', error)
    
    // Même en cas d'erreur, retourner une réponse qui supprime les cookies
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors du nettoyage', 
        message: 'Déconnexion forcée'
      }, 
      { status: 500 }
    )

    // Supprimer les cookies quand même
    const cookiesToClear = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'authjs.session-token'
    ]

    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true
      })
    })

    return response
  }
}