// =====================================================
// src/app/api/chat/create-channel/route.ts
// =====================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { StreamChat } from 'stream-chat'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth();  
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer les paramètres
    const body = await request.json()
    const { userId, matchId } = body

    if (!userId || !matchId) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    // Vérifier que le match existe et que l'utilisateur en fait partie
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        user1: true,
        user2: true
      }
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Match introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur actuel fait partie du match
    if (match.user1Id !== session.user.id && match.user2Id !== session.user.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Vérifier que l'autre utilisateur est bien celui spécifié
    const otherUserId = match.user1Id === session.user.id ? match.user2Id : match.user1Id
    if (otherUserId !== userId) {
      return NextResponse.json(
        { error: 'Utilisateur invalide pour ce match' },
        { status: 400 }
      )
    }

    // Créer le client Stream serveur
    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
    const apiSecret = process.env.STREAM_API_SECRET || process.env.STREAM_SECRET_KEY
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Configuration serveur incorrecte' },
        { status: 500 }
      )
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret)
    
    // Créer l'ID du channel (toujours le même pour une paire d'utilisateurs)
    const channelId = `dm-${[session.user.id, userId].sort().join('-')}`
    
    // Créer ou récupérer le channel
    const channel = serverClient.channel('messaging', channelId, {
      members: [session.user.id, userId],
      created_by_id: session.user.id,
      match_id: matchId,
      match_date: match.createdAt.toISOString()
    })

    // S'assurer que le channel existe
    await channel.create()
    
    console.log('✅ Channel créé/récupéré:', channelId)

    // Envoyer un message système si c'est un nouveau channel
    const state = await channel.query()
    if (!state.messages || state.messages.length === 0) {
      await channel.sendMessage({
        text: `🎉 Vous avez matché ! Commencez la conversation`,
        user_id: 'system',
        type: 'system'
      })
    }
    
    return NextResponse.json({ 
      success: true,
      channelId,
      matchId 
    })
    
  } catch (error) {
    console.error('❌ Erreur création channel:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du channel' },
      { status: 500 }
    )
  }
}