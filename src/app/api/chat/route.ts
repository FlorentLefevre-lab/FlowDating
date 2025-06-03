// src/app/api/chat/route.ts - API Messages pure universelle CORRIGÉE
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 API Messages Pure Universelle (SANS Match) - CORRIGÉE');
  
  try {
    const session = await getServerSession(authOptions);
    
    // ✅ CORRECTION: Vérifier l'email au lieu de l'ID
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('otherUserId');
    const conversationId = searchParams.get('conversationId');
    
    if (!otherUserId && !conversationId) {
      return NextResponse.json({ 
        error: 'Paramètre requis: otherUserId ou conversationId' 
      }, { status: 400 });
    }

    const { prisma } = await import('@/lib/db');
    
    // ✅ CORRECTION: Récupérer le vrai ID de l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        image: true 
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const userId = currentUser.id; // ✅ Maintenant on a le vrai ID !

    let messages = [];
    let otherUser = null;
    let finalOtherUserId = otherUserId;

    // CAS 1: Récupération via conversationId (format: conv_userId1_userId2)
    if (conversationId && conversationId.startsWith('conv_')) {
      console.log('🆔 Récupération via conversationId:', conversationId);
      
      // Extraire les IDs des utilisateurs depuis conversationId
      const parts = conversationId.replace('conv_', '').split('_');
      if (parts.length >= 2) {
        // Gestion améliorée pour les IDs complexes
        const user1Id = parts[0];
        const user2Id = parts[1];
        
        finalOtherUserId = user1Id === userId ? user2Id : user1Id;
        console.log('📝 IDs extraits:', { user1Id, user2Id, finalOtherUserId, currentUserId: userId });
      }
    }

    // CAS 2: Vérifier que l'autre utilisateur existe
    if (finalOtherUserId) {
      console.log('👤 Recherche utilisateur:', finalOtherUserId);
      
      otherUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: finalOtherUserId },
            { email: finalOtherUserId }
          ]
        },
        select: { 
          id: true, 
          name: true, 
          image: true, 
          email: true, 
          bio: true, 
          age: true, 
          location: true,
          photos: {
            select: {
              url: true,
              isPrimary: true
            },
            orderBy: { isPrimary: 'desc' }
          }
        }
      });

      if (!otherUser) {
        return NextResponse.json({ 
          error: 'Utilisateur introuvable',
          requestedUserId: finalOtherUserId 
        }, { status: 404 });
      }

      // Utiliser la photo primaire si disponible
      const primaryPhoto = otherUser.photos.find(photo => photo.isPrimary);
      const userImage = primaryPhoto?.url || otherUser.photos[0]?.url || otherUser.image;

      // Récupérer TOUS les messages entre ces deux utilisateurs (sans référence à match)
      messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUser.id },
            { senderId: otherUser.id, receiverId: userId }
          ]
        },
        include: {
          sender: {
            select: { id: true, name: true, image: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: 100
      });

      // Mettre à jour l'image de l'autre utilisateur avec la photo primaire
      otherUser.image = userImage;
    }

    console.log(`✅ ${messages.length} messages purs récupérés entre ${userId} et ${otherUser?.id}`);

    // Marquer les messages reçus comme lus
    try {
      if (otherUser) {
        const updateResult = await prisma.message.updateMany({
          where: {
            senderId: otherUser.id,
            receiverId: userId,
            readAt: null
          },
          data: { readAt: new Date() }
        });
        console.log(`✅ ${updateResult.count} messages marqués comme lus`);
      }
    } catch (readError) {
      console.warn('⚠️ Erreur marquage comme lu:', readError);
    }

    // Formatage des messages
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString() || null,
      type: 'text',
      timestamp: msg.createdAt.toISOString(),
      sender: msg.sender
    }));

    // ✅ Converstion ID avec les vrais IDs
    const conversationIdFormatted = conversationId || `conv_${[userId, otherUser?.id].sort().join('_')}`;

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      conversation: {
        type: 'pure_universal',
        otherUser: otherUser ? {
          ...otherUser,
          photos: undefined // Ne pas renvoyer le array photos dans la réponse
        } : null,
        currentUser: {
          id: userId, // ✅ Vrai ID
          name: currentUser.name || session.user.name,
          image: currentUser.image || session.user.image,
          email: currentUser.email
        },
        conversationId: conversationIdFormatted
      },
      debug: {
        messageCount: messages.length,
        currentUserId: userId,
        otherUserId: otherUser?.id,
        conversationId: conversationIdFormatted,
        chatType: 'Pure Universal (No Match System) - CORRIGÉ',
        hasMatchSystem: false,
        sessionEmail: session.user.email,
        userResolved: !!currentUser
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API messages pure universelle:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('📤 API Messages Pure Universelle - Envoi CORRIGÉ');
  
  try {
    const session = await getServerSession(authOptions);
    
    // ✅ CORRECTION: Vérifier l'email au lieu de l'ID
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { content, receiverId, otherUserId } = body;

    if (!content || (!receiverId && !otherUserId)) {
      return NextResponse.json({ 
        error: 'Contenu et destinataire requis',
        received: { content, receiverId, otherUserId }
      }, { status: 400 });
    }

    const { prisma } = await import('@/lib/db');
    
    // ✅ CORRECTION: Récupérer le vrai ID de l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        image: true 
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const senderId = currentUser.id; // ✅ Maintenant on a le vrai ID !
    let finalReceiverId = receiverId || otherUserId;

    console.log('📤 Envoi message:', {
      senderId,
      finalReceiverId,
      content: content.substring(0, 50) + '...'
    });

    // Vérifier que le destinataire existe
    const receiver = await prisma.user.findFirst({
      where: {
        OR: [
          { id: finalReceiverId },
          { email: finalReceiverId }
        ]
      },
      select: { id: true, name: true, image: true, email: true }
    });

    if (!receiver) {
      return NextResponse.json({ 
        error: 'Destinataire introuvable',
        requestedReceiverId: finalReceiverId
      }, { status: 404 });
    }

    // Créer le message pur universel (SANS matchId, SANS référence à Match)
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId: receiver.id
        // AUCUNE référence à match - Chat 100% libre !
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, email: true }
        }
      }
    });

    console.log('✅ Message pur universel créé:', {
      id: message.id,
      from: senderId,
      to: receiver.id
    });

    const formattedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() || null,
      type: 'text',
      timestamp: message.createdAt.toISOString(),
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        image: currentUser.image,
        email: currentUser.email
      }
    };

    return NextResponse.json({
      success: true,
      message: formattedMessage,
      chatType: 'pure_universal_corrected',
      conversationId: `conv_${[senderId, receiver.id].sort().join('_')}`,
      debug: {
        originalSenderId: senderId,
        resolvedReceiverId: receiver.id,
        sessionEmail: session.user.email
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur envoi message pur universel:', error);
    return NextResponse.json({
      error: 'Erreur envoi message',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}