import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API GET /profile/preferences - Début');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        preferences: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    console.log('✅ Préférences trouvées:', user.preferences);

    return NextResponse.json(user.preferences || {
      minAge: 18,
      maxAge: 35,
      maxDistance: 50,
      gender: null
    });

  } catch (error) {
    console.error('❌ Erreur API GET /profile/preferences:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des préférences' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 API PUT /profile/preferences - Début');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ Pas de session utilisateur');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    console.log('📝 Données préférences reçues:', body);

    const {
      minAge = 18,
      maxAge = 35,
      maxDistance = 50,
      gender,
      interests = [],
      lookingFor
    } = body;

    // Vérifier si des préférences existent déjà
    const existingPreferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id }
    });

    let preferences;

    if (existingPreferences) {
      console.log('🔄 Mise à jour des préférences existantes');
      preferences = await prisma.userPreferences.update({
        where: { userId: user.id },
        data: {
          minAge: parseInt(minAge),
          maxAge: parseInt(maxAge),
          maxDistance: parseInt(maxDistance),
          gender: gender || null,
        }
      });
    } else {
      console.log('✨ Création de nouvelles préférences');
      preferences = await prisma.userPreferences.create({
        data: {
          userId: user.id,
          minAge: parseInt(minAge),
          maxAge: parseInt(maxAge),
          maxDistance: parseInt(maxDistance),
          gender: gender || null,
        }
      });
    }

    console.log('✅ Préférences sauvegardées:', preferences);

    const responseData = {
      id: preferences.id,
      minAge: preferences.minAge,
      maxAge: preferences.maxAge,
      maxDistance: preferences.maxDistance,
      gender: preferences.gender,
      interests: interests,
      lookingFor: lookingFor
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('❌ Erreur API PUT /profile/preferences:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde des préférences' }, 
      { status: 500 }
    );
  }
}