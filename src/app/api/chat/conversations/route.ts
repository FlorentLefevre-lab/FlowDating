// src/app/api/chat/conversations/route.ts - API pour récupérer les conversations
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

interface ConversationUser {
  id: string;
  name: string | null;
  email: string;
  image?: string;
  age?: number;
  bio?: string;
  location?: string;
  profession?: string;
  interests: string[];
}

interface Conversation {
  id: string;
  user: ConversationUser;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  messageCount: number;
  unreadCount: number;
  lastActivity: string;
}

interface ConversationsResponse {
  success: boolean;
  conversations: Conversation[];
  count: number;
  currentUser: {
    id: string;
    email: string;
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<ConversationsResponse>> {
  console.log('💬 API Chat Conversations - Récupération des conversations actives');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false,
        error: 'Non authentifié',
        conversations: [],
        count: 0,
        currentUser: { id: '', email: '' }
      }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    
    // Récupérer l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true }
    });

    if (!currentUser) {
      return NextResponse.json({ 
        success: false,
        error: 'Utilisateur introuvable',
        conversations: [],
        count: 0,
        currentUser: { id: '', email: session.user.email }
      }, { status: 404 });
    }

    // Récupérer les conversations (groupes de messages entre 2 utilisateurs)
    const messageGroups = await prisma.$queryRaw`
      WITH conversation_partners AS (
        SELECT DISTINCT
          CASE 
            WHEN "senderId" = ${currentUser.id} THEN "receiverId"
            ELSE "senderId"
          END as partner_id,
          MAX("createdAt") as last_activity
        FROM "Message"
        WHERE "senderId" = ${currentUser.id} OR "receiverId" = ${currentUser.id}
        GROUP BY partner_id
      )
      SELECT 
        cp.partner_id,
        cp.last_activity,
        COUNT(m.id) as message_count,
        COUNT(CASE WHEN m."senderId" = cp.partner_id AND m."readAt" IS NULL THEN 1 END) as unread_count
      FROM conversation_partners cp
      LEFT JOIN "Message" m ON (
        (m."senderId" = ${currentUser.id} AND m."receiverId" = cp.partner_id) OR
        (m."senderId" = cp.partner_id AND m."receiverId" = ${currentUser.id})
      )
      GROUP BY cp.partner_id, cp.last_activity
      ORDER BY cp.last_activity DESC
    ` as Array<{
      partner_id: string;
      last_activity: Date;
      message_count: bigint;
      unread_count: bigint;
    }>;

    console.log(`📊 ${messageGroups.length} conversations trouvées`);

    if (messageGroups.length === 0) {
      return NextResponse.json({
        success: true,
        conversations: [],
        count: 0,
        currentUser: {
          id: currentUser.id,
          email: currentUser.email
        }
      });
    }

    // Récupérer les détails des utilisateurs partenaires
    const partnerIds = messageGroups.map(group => group.partner_id);
    const partners = await prisma.user.findMany({
      where: {
        id: { in: partnerIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        interests: true,
        photos: {
          select: {
            url: true,
            isPrimary: true
          },
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    // Récupérer le dernier message de chaque conversation
    const conversationsWithLastMessage = await Promise.all(
      messageGroups.map(async (group) => {
        const partner = partners.find(p => p.id === group.partner_id);
        if (!partner) return null;

        // Dernier message de la conversation
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: currentUser.id, receiverId: partner.id },
              { senderId: partner.id, receiverId: currentUser.id }
            ]
          },
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            senderId: true,
            createdAt: true
          }
        });

        // Utiliser la photo primaire
        const primaryPhoto = partner.photos.find(photo => photo.isPrimary);
        const imageUrl = primaryPhoto?.url || partner.photos[0]?.url;

        const conversation: Conversation = {
          id: `conv_${[currentUser.id, partner.id].sort().join('_')}`,
          user: {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            image: imageUrl,
            age: partner.age || undefined,
            bio: partner.bio || undefined,
            location: partner.location || undefined,
            profession: partner.profession || undefined,
            interests: partner.interests || []
          },
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt.toISOString()
          } : undefined,
          messageCount: Number(group.message_count),
          unreadCount: Number(group.unread_count),
          lastActivity: group.last_activity.toISOString()
        };

        return conversation;
      })
    );

    // Filtrer les conversations valides et trier par activité récente
    const validConversations = conversationsWithLastMessage
      .filter(conv => conv !== null) as Conversation[];
    
    validConversations.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    console.log(`✅ ${validConversations.length} conversations formatées`);

    return NextResponse.json({
      success: true,
      conversations: validConversations,
      count: validConversations.length,
      currentUser: {
        id: currentUser.id,
        email: currentUser.email
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API conversations:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur',
      conversations: [],
      count: 0,
      currentUser: { id: '', email: '' }
    }, { status: 500 });
  }
}