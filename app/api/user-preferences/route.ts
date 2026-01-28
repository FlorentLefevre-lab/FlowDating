// src/app/api/user-preferences/route.ts - API préférences utilisateur (enums anglais uniquement)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Enums valides (uniquement anglais côté backend)
const validGenders = ['MALE', 'FEMALE', 'OTHER', 'NON_BINARY', 'PREFER_NOT_TO_SAY', 'ALL'] as const;
const validLookingFor = ['SERIOUS_RELATIONSHIP', 'CASUAL', 'FRIENDSHIP', 'ADVENTURE', 'MARRIAGE', 'UNSURE'] as const;

export async function PUT(request: NextRequest) {
  try {
    console.log('🔥 API user-preferences PUT appelée');
    
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    console.log('🔥 Body préférences reçu:', body);

    const { minAge, maxAge, maxDistance, gender, lookingFor } = body;

    // Validation des champs requis
    if (minAge === undefined || maxAge === undefined || maxDistance === undefined) {
      return NextResponse.json({
        error: 'Les âges minimum, maximum et la distance sont requis'
      }, { status: 400 });
    }

    const minAgeNum = parseInt(minAge);
    const maxAgeNum = parseInt(maxAge);
    const maxDistanceNum = parseInt(maxDistance);

    // Validation des valeurs numériques
    if (isNaN(minAgeNum) || isNaN(maxAgeNum) || isNaN(maxDistanceNum)) {
      return NextResponse.json({
        error: 'Les valeurs doivent être des nombres valides'
      }, { status: 400 });
    }

    if (minAgeNum < 18 || maxAgeNum > 99 || minAgeNum > maxAgeNum) {
      return NextResponse.json({
        error: 'Âges invalides (18-99 ans, min ≤ max)'
      }, { status: 400 });
    }

    if (maxDistanceNum < 1 || maxDistanceNum > 500) {
      return NextResponse.json({
        error: 'Distance invalide (1-500 km)'
      }, { status: 400 });
    }

    // Validation des enums
    let validatedGender: string | null = null;
    let validatedLookingFor: string | null = null;

    if (gender && gender.trim()) {
      const upperGender = gender.trim().toUpperCase();
      if (!validGenders.includes(upperGender as any)) {
        return NextResponse.json({
          error: `Valeur gender invalide: ${gender}. Valeurs acceptées: ${validGenders.join(', ')}`
        }, { status: 400 });
      }
      validatedGender = upperGender;
      console.log(`✅ Gender: ${validatedGender}`);
    }

    if (lookingFor && lookingFor.trim()) {
      const upperLookingFor = lookingFor.trim().toUpperCase();
      if (!validLookingFor.includes(upperLookingFor as any)) {
        return NextResponse.json({
          error: `Valeur lookingFor invalide: ${lookingFor}. Valeurs acceptées: ${validLookingFor.join(', ')}`
        }, { status: 400 });
      }
      validatedLookingFor = upperLookingFor;
      console.log(`✅ LookingFor: ${validatedLookingFor}`);
    }

    console.log('✅ Validation préférences OK');

    // Préparer les données à sauvegarder
    const preferencesData = {
      minAge: minAgeNum,
      maxAge: maxAgeNum,
      maxDistance: maxDistanceNum,
      gender: validatedGender,
      lookingFor: validatedLookingFor
    };

    console.log('📝 Données à sauvegarder:', preferencesData);

    // Vérifier si des préférences existent déjà pour cet utilisateur
    const existingPreferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id }
    });

    let savedPreferences;

    if (existingPreferences) {
      console.log('🔄 Mise à jour des préférences existantes');
      savedPreferences = await prisma.userPreferences.update({
        where: { userId: user.id },
        data: preferencesData
      });
    } else {
      console.log('✨ Création de nouvelles préférences');
      savedPreferences = await prisma.userPreferences.create({
        data: {
          userId: user.id,
          ...preferencesData
        }
      });
    }

    console.log('✅ Préférences sauvegardées en base:', savedPreferences);

    // Retourner les données (enums anglais)
    return NextResponse.json({
      id: savedPreferences.id,
      minAge: savedPreferences.minAge,
      maxAge: savedPreferences.maxAge,
      maxDistance: savedPreferences.maxDistance,
      gender: savedPreferences.gender,
      lookingFor: savedPreferences.lookingFor,
      createdAt: savedPreferences.createdAt,
      updatedAt: savedPreferences.updatedAt
    });

  } catch (error) {
    console.error('❌ Erreur PUT user-preferences:', error);
    return NextResponse.json({
      error: 'Erreur lors de la mise à jour des préférences'
    }, { status: 500 });
  }
}

// GET pour récupérer les préférences
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API user-preferences GET appelée');
    
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        preferences: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    console.log('✅ Préférences récupérées:', user.preferences);

    // Retourner les préférences (enums anglais) ou valeurs par défaut
    const preferences = user.preferences ? {
      id: user.preferences.id,
      minAge: user.preferences.minAge,
      maxAge: user.preferences.maxAge,
      maxDistance: user.preferences.maxDistance,
      gender: user.preferences.gender,
      lookingFor: user.preferences.lookingFor,
      createdAt: user.preferences.createdAt,
      updatedAt: user.preferences.updatedAt
    } : {
      minAge: 18,
      maxAge: 35,
      maxDistance: 50,
      gender: null,
      lookingFor: null
    };

    return NextResponse.json(preferences);

  } catch (error) {
    console.error('❌ Erreur GET user-preferences:', error);
    return NextResponse.json({
      error: 'Erreur lors de la récupération des préférences'
    }, { status: 500 });
  }
}