// =====================================================
// src/app/api/chat/stream/token/route.ts
// =====================================================
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { StreamChat } from 'stream-chat'

export async function GET() {
  try {
    // Vérifier l'authentification
    const session = await auth();  

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier les variables d'environnement
    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
    const apiSecret = process.env.STREAM_API_SECRET || process.env.STREAM_SECRET_KEY
    
    if (!apiKey || !apiSecret) {
      console.error('❌ Configuration Stream manquante')
      return NextResponse.json(
        { error: 'Configuration serveur incorrecte' },
        { status: 500 }
      )
    }

    // Créer le client serveur
    const serverClient = StreamChat.getInstance(apiKey, apiSecret)
    
    // Générer le token pour l'utilisateur
    const token = serverClient.createToken(session.user.id)
    
    console.log('✅ Token créé pour:', session.user.id)
    
    return NextResponse.json({ 
      token,
      userId: session.user.id 
    })
    
  } catch (error) {
    console.error('❌ Erreur création token Stream:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}