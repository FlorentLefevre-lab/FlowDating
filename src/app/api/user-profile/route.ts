// app/api/user-profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth'
import { PrismaClient } from '@prisma/client';

// Singleton pour Prisma (évite les multiples connexions)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// GET - Récupérer le profil complet de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        photos: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
        },
        preferences: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Formater la réponse selon l'interface attendue
    const profileData = {
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
      bio: user.bio,
      location: user.location,
      interests: user.interests || [],
      photos: user.photos,
      preferences: user.preferences ? {
        minAge: user.preferences.minAge,
        maxAge: user.preferences.maxAge,
        maxDistance: user.preferences.maxDistance,
        gender: user.preferences.gender
      } : undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    return NextResponse.json(profileData, { status: 200 });
    
  } catch (error) {
    console.error('Erreur GET profil:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 });
  }
}

// PUT - Mettre à jour le profil utilisateur
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
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
    console.log('🔥 API user-profile PUT - Body reçu:', body);
    
    const { name, age, bio, location, interests } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    if (age && (age < 18 || age > 100)) {
      return NextResponse.json({ error: 'L\'âge doit être entre 18 et 100 ans' }, { status: 400 });
    }

    if (bio && bio.length > 500) {
      return NextResponse.json({ error: 'La bio ne peut pas dépasser 500 caractères' }, { status: 400 });
    }

    if (interests && interests.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 centres d\'intérêt autorisés' }, { status: 400 });
    }

    // Mise à jour du profil
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name.trim(),
        age: age || null,
        bio: bio?.trim() || null,
        location: location?.trim() || null,
        interests: interests || []
      },
      include: {
        photos: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
        },
        preferences: true
      }
    });

    console.log('✅ Profil mis à jour avec succès');

    // Formater la réponse
    const profileData = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      age: updatedUser.age,
      bio: updatedUser.bio,
      location: updatedUser.location,
      interests: updatedUser.interests || [],
      photos: updatedUser.photos,
      preferences: updatedUser.preferences ? {
        minAge: updatedUser.preferences.minAge,
        maxAge: updatedUser.preferences.maxAge,
        maxDistance: updatedUser.preferences.maxDistance,
        gender: updatedUser.preferences.gender
      } : undefined,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString()
    };

    return NextResponse.json(profileData, { status: 200 });
    
  } catch (error) {
    console.error('Erreur PUT profil:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du profil' }, { status: 500 });
  }
}