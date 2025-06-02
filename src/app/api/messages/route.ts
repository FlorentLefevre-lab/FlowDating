// ===========================================
// ÉTAPE 5: API Routes Messages
// FICHIER: src/app/api/messages/route.ts
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const MessageSchema = z.object({
  content: z.string().min(1).max(1000),
  matchId: z.string(),
  receiverId: z.string(),
});

// GET - Récupérer les messages d'un match
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!matchId) {
      return NextResponse.json({ error: 'ID de match requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur fait partie du match
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        users: {
          some: { id: session.user.id }
        }
      }
    });

    if (!match) {
      return NextResponse.json({ error: 'Match non trouvé' }, { status: 404 });
    }

    // Récupérer les messages avec pagination
    const messages = await prisma.message.findMany({
      where: { matchId },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit
    });

    return NextResponse.json({
      messages: messages.reverse(),
      hasMore: messages.length === limit
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Envoyer un nouveau message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = MessageSchema.parse(body);

    // Vérifier que l'utilisateur fait partie du match
    const match = await prisma.match.findFirst({
      where: {
        id: validatedData.matchId,
        users: {
          some: { id: session.user.id }
        }
      },
      include: {
        users: true
      }
    });

    if (!match) {
      return NextResponse.json({ error: 'Match non trouvé' }, { status: 404 });
    }

    // Vérifier que le receiverId fait partie du match
    const isValidReceiver = match.users.some(user => user.id === validatedData.receiverId);
    if (!isValidReceiver) {
      return NextResponse.json({ error: 'Destinataire invalide' }, { status: 400 });
    }

    // Créer le message
    const message = await prisma.message.create({
      data: {
        content: validatedData.content,
        senderId: session.user.id,
        receiverId: validatedData.receiverId,
        matchId: validatedData.matchId
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      }
    });

    return NextResponse.json({ message }, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}