import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    // ✅ Next.js 15 : Il faut awaiter params
    const { photoId } = await params;
    console.log('🗑️ API DELETE photo:', photoId);
    
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: user.id
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    await prisma.photo.delete({
      where: { id: photoId }
    });

    console.log('✅ Photo supprimée:', photoId);
    return NextResponse.json({ message: 'Photo supprimée' });

  } catch (error) {
    console.error('❌ Erreur DELETE photo:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    // ✅ Next.js 15 : Il faut awaiter params
    const { photoId } = await params;
    console.log('⭐ API PUT photo:', photoId);
    
    const session = await auth();
    
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

    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: user.id
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    if (isPrimary) {
      await prisma.photo.updateMany({
        where: {
          userId: user.id,
          id: { not: photoId }
        },
        data: { isPrimary: false }
      });
    }

    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: { isPrimary }
    });

    console.log('✅ Photo mise à jour:', updatedPhoto);
    return NextResponse.json(updatedPhoto);

  } catch (error) {
    console.error('❌ Erreur PUT photo:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}