// src/app/api/user-preferences/route.ts - Version finale avec mappings complets

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 🔄 MAPPING des valeurs françaises vers les enums Prisma
const genderMapping = {
  'homme': 'MALE',
  'femme': 'FEMALE',
  'autre': 'OTHER',
  'non-binaire': 'NON_BINARY',
  'préfère ne pas dire': 'PREFER_NOT_TO_SAY',
  'tous': 'ALL'
} as const;

const lookingForMapping = {
  'relation-serieuse': 'SERIOUS_RELATIONSHIP',
  'relation-occasionnelle': 'CASUAL',
  'amitie': 'FRIENDSHIP',
  'aventure': 'ADVENTURE',
  'mariage': 'MARRIAGE',
  'pas-sur': 'UNSURE'
} as const;

// 🔄 MAPPING inverse pour le retour des données
const genderMappingReverse = {
  'MALE': 'homme',
  'FEMALE': 'femme',
  'OTHER': 'autre',
  'NON_BINARY': 'non-binaire',
  'PREFER_NOT_TO_SAY': 'préfère ne pas dire',
  'ALL': 'tous'
} as const;

const lookingForMappingReverse = {
  'SERIOUS_RELATIONSHIP': 'relation-serieuse',
  'CASUAL': 'relation-occasionnelle',
  'FRIENDSHIP': 'amitie',
  'ADVENTURE': 'aventure',
  'MARRIAGE': 'mariage',
  'UNSURE': 'pas-sur'
} as const;

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

    // 🔄 VALIDATION et MAPPING des enums
    let mappedGender = null;
    let mappedLookingFor = null;

    if (gender && gender.trim()) {
      const trimmedGender = gender.trim();
      if (!Object.keys(genderMapping).includes(trimmedGender)) {
        return NextResponse.json({
          error: `Valeur gender invalide: ${trimmedGender}. Valeurs acceptées: ${Object.keys(genderMapping).join(', ')}`
        }, { status: 400 });
      }
      mappedGender = genderMapping[trimmedGender as keyof typeof genderMapping];
    }

    if (lookingFor && lookingFor.trim()) {
      const trimmedLookingFor = lookingFor.trim();
      if (!Object.keys(lookingForMapping).includes(trimmedLookingFor)) {
        return NextResponse.json({
          error: `Valeur lookingFor invalide: ${trimmedLookingFor}. Valeurs acceptées: ${Object.keys(lookingForMapping).join(', ')}`
        }, { status: 400 });
      }
      mappedLookingFor = lookingForMapping[trimmedLookingFor as keyof typeof lookingForMapping];
    }

    console.log('✅ Validation préférences OK');

    // Préparer les données à sauvegarder avec les valeurs mappées
    const preferencesData = {
      minAge: minAgeNum,
      maxAge: maxAgeNum,
      maxDistance: maxDistanceNum,
      gender: mappedGender,
      lookingFor: mappedLookingFor
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

    // 🔄 Retourner les données avec mapping inverse (français)
    const responseData = {
      id: savedPreferences.id,
      minAge: savedPreferences.minAge,
      maxAge: savedPreferences.maxAge,
      maxDistance: savedPreferences.maxDistance,
      gender: savedPreferences.gender ? genderMappingReverse[savedPreferences.gender as keyof typeof genderMappingReverse] : null,
      lookingFor: savedPreferences.lookingFor ? lookingForMappingReverse[savedPreferences.lookingFor as keyof typeof lookingForMappingReverse] : null,
      createdAt: savedPreferences.createdAt,
      updatedAt: savedPreferences.updatedAt
    };

    return NextResponse.json(responseData);

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

    // 🔄 Retourner les préférences avec mapping inverse ou des valeurs par défaut
    const preferences = user.preferences ? {
      id: user.preferences.id,
      minAge: user.preferences.minAge,
      maxAge: user.preferences.maxAge,
      maxDistance: user.preferences.maxDistance,
      gender: user.preferences.gender ? genderMappingReverse[user.preferences.gender as keyof typeof genderMappingReverse] : null,
      lookingFor: user.preferences.lookingFor ? lookingForMappingReverse[user.preferences.lookingFor as keyof typeof lookingForMappingReverse] : null,
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