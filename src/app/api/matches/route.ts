// ===========================================
// ÉTAPE 7: API Route Matches (Mise à jour)
// FICHIER: src/app/api/matches/route.ts
// Ajoutez cette fonction GET à votre fichier existant ou remplacez-la
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Récupérer les matches de l'utilisateur avec les derniers messages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer les matches de l'utilisateur
    const matches = await prisma.match.findMany({
      where: {
        users: {
          some: { id: session.user.id }
        }
      },
      include: {
        users: {
          select: { 
            id: true, 
            name: true, 
            image: true 
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculer le nombre de messages non lus pour chaque match
    const matchesWithUnreadCount = await Promise.all(
      matches.map(async (match) => {
        const unreadCount = await prisma.message.count({
          where: {
            matchId: match.id,
            receiverId: session.user.id,
            readAt: null
          }
        });

        return {
          id: match.id,
          users: match.users,
          lastMessage: match.messages[0] || null,
          unreadCount,
          createdAt: match.createdAt.toISOString()
        };
      })
    );

    return NextResponse.json({ matches: matchesWithUnreadCount });

  } catch (error) {
    console.error('Erreur lors de la récupération des matches:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}