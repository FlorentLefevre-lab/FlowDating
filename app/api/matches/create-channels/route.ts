import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createMatchChannel } from '@/lib/stream'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { matchedUserId } = await req.json()

    if (!matchedUserId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      )
    }

    // SECURITY: Verify MUTUAL match exists (both users have liked each other)
    const reciprocalLikes = await prisma.like.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: matchedUserId },
          { senderId: matchedUserId, receiverId: session.user.id }
        ]
      }
    })

    // Verify BOTH likes exist (mutual match required)
    const hasCurrentUserLiked = reciprocalLikes.some(
      like => like.senderId === session.user.id && like.receiverId === matchedUserId
    )
    const hasOtherUserLiked = reciprocalLikes.some(
      like => like.senderId === matchedUserId && like.receiverId === session.user.id
    )

    if (!hasCurrentUserLiked || !hasOtherUserLiked) {
      console.warn('[SECURITY] Attempted channel creation without mutual match:', {
        currentUser: session.user.id,
        targetUser: matchedUserId,
        currentUserLiked: hasCurrentUserLiked,
        otherUserLiked: hasOtherUserLiked
      })
      return NextResponse.json(
        { error: 'Match non trouve - likes reciproques requis' },
        { status: 403 }
      )
    }

    // Get the match timestamp from the most recent like
    const match = reciprocalLikes[0]

    // Récupérer les infos des deux utilisateurs
    const [currentUser, matchedUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: { photos: { where: { isPrimary: true } } }
      }),
      prisma.user.findUnique({
        where: { id: matchedUserId },
        include: { photos: { where: { isPrimary: true } } }
      })
    ])

    // Créer le channel Stream
    const channel = await createMatchChannel(
      session.user.id,
      matchedUserId,
      {
        matchDate: match.createdAt,
        user1: {
          id: currentUser!.id,
          name: currentUser!.name,
          image: currentUser!.photos[0]?.url || currentUser!.image
        },
        user2: {
          id: matchedUser!.id,
          name: matchedUser!.name,
          image: matchedUser!.photos[0]?.url || matchedUser!.image
        }
      }
    )

    return NextResponse.json({
      channelId: channel.id,
      channelType: channel.type
    })
  } catch (error) {
    console.error('Erreur création channel:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du channel' },
      { status: 500 }
    )
  }
}