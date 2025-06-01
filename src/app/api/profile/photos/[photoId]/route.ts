// src/app/api/profile/photos/[photoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Singleton pour Prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// DELETE - Supprimer une photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    console.log('🗑️ API DELETE photo:', params.photoId);
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Vérifier que la photo appartient à l'utilisateur
    const photo = await prisma.photo.findFirst({
      where: {
        id: params.photoId,
        userId: user.id
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    // Supprimer la photo
    await prisma.photo.delete({
      where: { id: params.photoId }
    });

    console.log('✅ Photo supprimée:', params.photoId);

    return NextResponse.json({ message: 'Photo supprimée' }, { status: 200 });

  } catch (error) {
    console.error('❌ Erreur DELETE photo:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' }, 
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour une photo (ex: définir comme principale)
export async function PUT(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    console.log('⭐ API PUT photo:', params.photoId);
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    const { isPrimary } = body;

    // Vérifier que la photo appartient à l'utilisateur
    const photo = await prisma.photo.findFirst({
      where: {
        id: params.photoId,
        userId: user.id
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    // Si on définit cette photo comme principale, retirer le statut des autres
    if (isPrimary) {
      await prisma.photo.updateMany({
        where: { 
          userId: user.id,
          id: { not: params.photoId }
        },
        data: { isPrimary: false }
      });
    }

    // Mettre à jour la photo
    const updatedPhoto = await prisma.photo.update({
      where: { id: params.photoId },
      data: { isPrimary }
    });

    console.log('✅ Photo mise à jour:', updatedPhoto);

    return NextResponse.json(updatedPhoto, { status: 200 });

  } catch (error) {
    console.error('❌ Erreur PUT photo:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' }, 
      { status: 500 }
    );
  }
}