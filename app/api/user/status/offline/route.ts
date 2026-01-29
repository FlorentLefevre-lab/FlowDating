// app/api/user/status/offline/route.ts
// Endpoint spécial pour sendBeacon (marquer offline à la fermeture de page)
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Marquer comme hors ligne
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        isOnline: false,
        lastSeen: new Date()
      }
    });

    console.log('🔴 [Status] Utilisateur marqué offline via sendBeacon:', currentUser.id);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Erreur API offline:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}
