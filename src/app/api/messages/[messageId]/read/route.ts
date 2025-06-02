// ===========================================
// ÉTAPE 6: API Route Message Read
// FICHIER: src/app/api/messages/[messageId]/read/route.ts
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { messageId } = params;

    // Vérifier que le message existe et que l'utilisateur est le destinataire
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        receiverId: session.user.id
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message non trouvé' }, { status: 404 });
    }

    // Marquer le message comme lu
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() }
    });

    return NextResponse.json({ message: updatedMessage });

  } catch (error) {
    console.error('Erreur lors du marquage comme lu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}