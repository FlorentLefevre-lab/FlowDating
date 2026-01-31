// app/api/users/[userId]/view/route.ts
// Endpoint pour enregistrer les vues de profil

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cache } from '@/lib/cache';

// POST /api/users/[userId]/view - Enregistrer une vue de profil
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { userId: viewedUserId } = await params;
    const viewerId = session.user.id;

    // Ne pas enregistrer les vues de son propre profil
    if (viewerId === viewedUserId) {
      return NextResponse.json({ success: true, message: 'Self-view ignored' });
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: viewedUserId },
      select: { id: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Upsert la vue de profil (évite les doublons)
    const profileView = await prisma.profileView.upsert({
      where: {
        viewerId_viewedId: {
          viewerId,
          viewedId: viewedUserId
        }
      },
      update: {
        // Mettre à jour le timestamp pour les vues répétées
        createdAt: new Date()
      },
      create: {
        viewerId,
        viewedId: viewedUserId
      }
    });

    // Invalider le cache stats de l'utilisateur vu
    await cache.delete(`stats:${viewedUserId}`);

    console.log(`👁️ Vue enregistrée: ${viewerId} -> ${viewedUserId}`);

    return NextResponse.json({
      success: true,
      viewId: profileView.id,
      timestamp: profileView.createdAt
    });

  } catch (error: any) {
    console.error('❌ Erreur enregistrement vue:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
