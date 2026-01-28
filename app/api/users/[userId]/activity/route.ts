// src/app/api/users/[userId]/activity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth' // Si vous utilisez auth.js v5import { prisma } from '@/lib/db';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // ⚡ AWAIT des params pour Next.js 15
    const { userId } = await params
    
    const session = await auth()    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // 🎯 RÉCUPÉRATION DE L'ACTIVITÉ RÉCENTE
    const [recentLikes, recentMessages, recentViews] = await Promise.all([
      // Likes reçus récents
      prisma.like.findMany({
        where: {
          receiverId: userId
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      }),
      
      // Messages reçus récents
      prisma.message.findMany({
        where: {
          receiverId: userId,
          deletedAt: null
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      }),
      
      // Vues de profil récentes
      prisma.profileView.findMany({
        where: {
          viewedId: userId
        },
        include: {
          viewer: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      })
    ])

    // 🔄 DÉTECTION DES MATCHES (likes réciproques)
    const matchPromises = recentLikes.map(async (like) => {
      const reciprocalLike = await prisma.like.findFirst({
        where: {
          senderId: userId,
          receiverId: like.senderId
        }
      })
      
      return reciprocalLike ? {
        ...like,
        isMatch: true
      } : {
        ...like,
        isMatch: false
      }
    })
    
    const likesWithMatches = await Promise.all(matchPromises)

    // 📝 FORMATAGE DE L'ACTIVITÉ
    const activities = []
    
    // Ajout des matches et likes
    likesWithMatches.forEach(like => {
      activities.push({
        id: `like-${like.id}`,
        type: like.isMatch ? 'match' : 'like',
        userId: like.sender.id,
        userName: like.sender.name || 'Utilisateur',
        userAvatar: like.sender.image || '👤',
        timestamp: like.createdAt,
        isRead: true
      })
    })
    
    // Ajout des messages
    recentMessages.forEach(message => {
      activities.push({
        id: `message-${message.id}`,
        type: 'message',
        userId: message.sender.id,
        userName: message.sender.name || 'Utilisateur',
        userAvatar: message.sender.image || '👤',
        timestamp: message.createdAt,
        content: message.content.length > 50 ? 
          message.content.substring(0, 50) + '...' : 
          message.content,
        isRead: !!message.readAt
      })
    })
    
    // Ajout des vues de profil
    recentViews.forEach(view => {
      activities.push({
        id: `view-${view.id}`,
        type: 'visit',
        userId: view.viewer.id,
        userName: view.viewer.name || 'Utilisateur',
        userAvatar: view.viewer.image || '👤',
        timestamp: view.createdAt,
        isRead: true
      })
    })
    
    // Tri par date décroissante et limitation
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return NextResponse.json(sortedActivities)
    
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'activité:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération de l\'activité' },
      { status: 500 }
    )
  }
}