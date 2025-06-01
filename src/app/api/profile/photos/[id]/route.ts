import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// DELETE - Supprimer une photo par ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🗑️ API DELETE photo, ID:', params.id);
    
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

    const photoId = params.id;

    // Vérifier que la photo appartient à l'utilisateur
    const photo = await prisma.photo.findFirst({
      where: { 
        id: photoId,
        userId: user.id 
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    // Si c'est la photo principale, définir une autre comme principale
    if (photo.isPrimary) {
      const nextPhoto = await prisma.photo.findFirst({
        where: { 
          userId: user.id,
          id: { not: photoId }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (nextPhoto) {
        await prisma.photo.update({
          where: { id: nextPhoto.id },
          data: { isPrimary: true }
        });
      }
    }

    await prisma.photo.delete({
      where: { id: photoId }
    });

    console.log('✅ Photo supprimée avec succès');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('❌ Erreur DELETE photo:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la suppression de la photo' 
    }, { status: 500 });
  }
}

// PUT - Mettre à jour une photo (photo principale)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('⭐ API PUT photo, ID:', params.id);
    
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

    const photoId = params.id;

    // Vérifier que la photo appartient à l'utilisateur
    const photo = await prisma.photo.findFirst({
      where: { 
        id: photoId,
        userId: user.id 
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    // Retirer le statut principal de toutes les autres photos
    await prisma.photo.updateMany({
      where: { 
        userId: user.id,
        id: { not: photoId }
      },
      data: { isPrimary: false }
    });

    // Définir cette photo comme principale
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: { isPrimary: true }
    });

    console.log('✅ Photo principale mise à jour');
    return NextResponse.json(updatedPhoto);
    
  } catch (error) {
    console.error('❌ Erreur PUT photo:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la mise à jour de la photo' 
    }, { status: 500 });
  }
}