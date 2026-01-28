import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: NextRequest) {
  try {
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
    const { imageUrl } = body;

    console.log('Body reçu:', body);
    console.log('ImageUrl:', imageUrl);

    if (!imageUrl) {
      console.log('Erreur: URL de l\'image manquante');
      return NextResponse.json({ error: 'URL de l\'image requise' }, { status: 400 });
    }

    const existingPhotos = await prisma.photo.count({
      where: { userId: user.id }
    });

    console.log('Nombre de photos existantes:', existingPhotos);

    if (existingPhotos >= 6) {
      console.log('Erreur: Maximum 6 photos atteint');
      return NextResponse.json({ error: 'Maximum 6 photos autorisées' }, { status: 400 });
    }

    const photo = await prisma.photo.create({
      data: {
        userId: user.id,
        url: imageUrl,
        isPrimary: existingPhotos === 0
      }
    });

    console.log('Photo créée avec succès:', photo);
    return NextResponse.json(photo, { status: 201 });

  } catch (error) {
    console.error('Erreur POST photos:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'ajout de la photo' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
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

    const photos = await prisma.photo.findMany({
      where: { userId: user.id },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json({ photos }, { status: 200 });

  } catch (error) {
    console.error('Erreur GET photos:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des photos' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');

    if (!photoId) {
      return NextResponse.json({ error: 'ID de la photo requis' }, { status: 400 });
    }

    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: user.id,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

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
      where: { id: photoId },
    });

    console.log('Photo supprimée avec succès:', photoId);

    return NextResponse.json({ message: 'Photo supprimée avec succès' });

  } catch (error) {
    console.error('Erreur DELETE photos:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}