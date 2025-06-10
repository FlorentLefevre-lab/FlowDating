import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth'
import { prisma } from '../../../lib/prisma';
import type { SendMessageRequest, PrismaMessage } from '../../../types/chat';

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body: SendMessageRequest = await request.json();
    const { senderId, receiverId, content, clientId, firebaseId } = body;

    // Vérifier que l'utilisateur peut envoyer le message
    if (session.user.id !== senderId) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 });
    }

    // Vérifier que les utilisateurs ne sont pas bloqués
    const blockExists = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId }
        ]
      }
    });

    if (blockExists) {
      return NextResponse.json({ error: 'Utilisateur bloqué' }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId,
        receiverId,
        clientId,
        status: 'SENT',
        deliveredAt: new Date()
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        },
        receiver: {
          select: { id: true, name: true, image: true }
        }
      }
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Erreur création message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const conversationWith = searchParams.get('conversationWith');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // Pour la pagination
    const userId = session.user.id;

    if (!conversationWith) {
      return NextResponse.json({ error: 'conversationWith requis' }, { status: 400 });
    }

    // Construire la condition where
    const whereCondition: any = {
      OR: [
        { senderId: userId, receiverId: conversationWith },
        { senderId: conversationWith, receiverId: userId }
      ],
      deletedAt: null
    };

    // Ajouter la pagination par cursor si fournie
    if (before) {
      whereCondition.createdAt = {
        lt: new Date(before)
      };
    }

    const messages: PrismaMessage[] = await prisma.message.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { 
          select: { id: true, name: true, image: true } 
        },
        receiver: { 
          select: { id: true, name: true, image: true } 
        }
      }
    });

    return NextResponse.json(messages.reverse());
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}