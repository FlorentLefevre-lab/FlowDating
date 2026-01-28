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

    console.log(`🔄 [CHAT] Création channel - User: ${session.user.id}, Target: ${userId}, Match: ${matchId}`)

    // ✅ Vérifier le match via les likes réciproques
    console.log(`🔍 [CHAT] Vérification des likes réciproques...`)
    
    const reciprocalLikes = await prisma.like.findMany({
      where: {
        OR: [
          {
            senderId: session.user.id,
            receiverId: userId
          },
          {
            senderId: userId,
            receiverId: session.user.id
          }
        ]
      }
    })

    // Vérifier qu'on a bien les deux likes
    const like1to2 = reciprocalLikes.find(like => 
      like.senderId === session.user.id && like.receiverId === userId
    )
    const like2to1 = reciprocalLikes.find(like => 
      like.senderId === userId && like.receiverId === session.user.id
    )

    console.log(`🔍 [CHAT] Likes trouvés: ${reciprocalLikes.length}, Like 1->2: ${!!like1to2}, Like 2->1: ${!!like2to1}`)

    // Vérifier que les likes réciproques existent (= match valide)
    if (!like1to2 || !like2to1) {
      console.error(`❌ [CHAT] Pas de match valide: ${session.user.id} <-> ${userId}`)
      console.error(`Likes trouvés:`, reciprocalLikes.map(l => `${l.senderId} -> ${l.receiverId}`))
      return NextResponse.json(
        { error: 'Match introuvable - likes réciproques requis' },
        { status: 404 }
      )
    }

    // ✅ Récupérer les informations complètes des deux utilisateurs (avec photos)
    const [currentUser, targetUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { 
          id: true, 
          name: true, 
          email: true,
          photos: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1
          }
        }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          name: true, 
          email: true,
          photos: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1
          }
        }
      })
    ])

    if (!currentUser || !targetUser) {
      return NextResponse.json(
        { error: 'Utilisateur(s) introuvable(s)' },
        { status: 404 }
      )
    }

    // ✅ Créer la date de match basée sur le plus récent des deux likes
    const matchDate = new Date(Math.max(
      new Date(like1to2.createdAt).getTime(),
      new Date(like2to1.createdAt).getTime()
    ))

    console.log(`✅ [CHAT] Match valide confirmé: ${currentUser.name} <-> ${targetUser.name} (${matchDate.toLocaleDateString('fr-FR')})`)

    // Créer le client Stream serveur
    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
    const apiSecret = process.env.STREAM_API_SECRET || process.env.STREAM_SECRET_KEY

    if (!apiKey || !apiSecret) {
      console.error('❌ [CHAT] Variables d\'environnement Stream manquantes')
      return NextResponse.json(
        { error: 'Configuration serveur incorrecte' },
        { status: 500 }
      )
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret)

    // Créer l'ID du channel (toujours le même pour une paire d'utilisateurs)
    const channelId = `dm-${[session.user.id, userId].sort().join('-')}`

    // ✅ ÉTAPE 1 : Créer/Mettre à jour les utilisateurs Stream Chat
    console.log(`🔄 [CHAT] Création/MAJ utilisateurs Stream Chat...`)
    
    try {
      // Préparer les données utilisateurs pour Stream
      const streamUsers = [
        {
          id: session.user.id,
          name: currentUser.name || 'Utilisateur',
          email: currentUser.email,
          image: currentUser.photos?.[0]?.url || '/default-avatar.png',
          role: 'user'
        },
        {
          id: userId,
          name: targetUser.name || 'Utilisateur',
          email: targetUser.email,
          image: targetUser.photos?.[0]?.url || '/default-avatar.png',
          role: 'user'
        }
      ]

      // Créer ou mettre à jour les utilisateurs en batch
      await serverClient.upsertUsers(streamUsers)
      console.log(`✅ [CHAT] Utilisateurs Stream créés/MAJ: ${streamUsers.map(u => u.name).join(', ')}`)
      
    } catch (userError) {
      console.error(`⚠️ [CHAT] Erreur création utilisateurs Stream:`, userError)
      // Continuer même si cette étape échoue
    }

    // ✅ ÉTAPE 2 : Créer ou récupérer le channel
    console.log(`🔄 [CHAT] Création du channel Stream...`)
    const channelOptions: Record<string, unknown> = {
      members: [session.user.id, userId],
      created_by_id: session.user.id,
      match_id: matchId,
      match_date: matchDate.toISOString(),
      user1_name: currentUser.name,
      user2_name: targetUser.name,
      match_type: 'reciprocal_like'
    }
    const channel = serverClient.channel('messaging', channelId, channelOptions as any)

    // S'assurer que le channel existe
    await channel.create()
    console.log(`✅ [CHAT] Channel créé/récupéré: ${channelId}`)

    // Envoyer un message système si c'est un nouveau channel
    try {
      const state = await channel.query()
      if (!state.messages || state.messages.length === 0) {
        await channel.sendMessage({
          text: `🎉 Vous avez matché le ${matchDate.toLocaleDateString('fr-FR')} ! Commencez la conversation`,
          user_id: 'system',
          type: 'system'
        })
        console.log(`📨 [CHAT] Message de bienvenue envoyé`)
      }
    } catch (messageError) {
      // Ne pas faire échouer la création du channel si le message système échoue
      console.warn(`⚠️ [CHAT] Erreur envoi message système:`, messageError)
    }

    return NextResponse.json({
      success: true,
      channelId,
      matchId,
      matchDate: matchDate.toISOString(),
      users: {
        current: currentUser.name,
        target: targetUser.name
      }
    })

  } catch (error) {
    console.error('❌ [CHAT] Erreur création channel:', error)
    
    // Log détaillé pour debugging
    if (error instanceof Error) {
      console.error('❌ [CHAT] Message:', error.message)
      console.error('❌ [CHAT] Stack:', error.stack)
    }
    
    return NextResponse.json(
      { error: 'Erreur lors de la création du channel' },
      { status: 500 }
    )
  }
}