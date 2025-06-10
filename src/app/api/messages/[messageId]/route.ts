import { auth } from '../../../../auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma' // Ajustez le chemin


export async function PATCH(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { content } = await request.json();
    const { messageId } = params;

    // Vérifier que l'utilisateur est l'auteur du message
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message || message.senderId !== session.user.id) {
      return NextResponse.json({ error: 'Message non trouvé ou non autorisé' }, { status: 404 });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        editedAt: new Date()
      },
      include: {
        sender: { select: { id: true, name: true, image: true } }
      }
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error('Erreur édition message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { messageId } = params;

    // Vérifier que l'utilisateur est l'auteur du message
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message || message.senderId !== session.user.id) {
      return NextResponse.json({ error: 'Message non trouvé ou non autorisé' }, { status: 404 });
    }

    // Suppression douce
    await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        content: 'Message supprimé'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}