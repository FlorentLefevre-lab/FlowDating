// src/app/api/profile/route.ts - Version corrigée avec accountStatus et cache Redis

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { apiCache } from '@/lib/cache';
import { calculateAgeAndZodiac, isOldEnough } from '@/lib/zodiac';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 🔄 MAPPINGS français → enums Prisma
const genderMapping = {
  'homme': 'MALE',
  'femme': 'FEMALE',
  'autre': 'OTHER',
  'non-binaire': 'NON_BINARY'
} as const;

const maritalStatusMapping = {
  'celibataire': 'SINGLE',
  'divorce': 'DIVORCED',
  'veuf': 'WIDOWED',
  'separe': 'SEPARATED',
  'complique': 'COMPLICATED'
} as const;

// 🔄 MAPPINGS inverses pour le retour des données
const genderMappingReverse = {
  'MALE': 'homme',
  'FEMALE': 'femme',
  'OTHER': 'autre',
  'NON_BINARY': 'non-binaire'
} as const;

const maritalStatusMappingReverse = {
  'SINGLE': 'celibataire',
  'DIVORCED': 'divorce',
  'WIDOWED': 'veuf',
  'SEPARATED': 'separe',
  'COMPLICATED': 'complique'
} as const;

export async function PUT(request: NextRequest) {
  try {
    console.log('📝 API PUT Profile - Début');
    
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    console.log('👤 Mise à jour pour utilisateur:', session.user.id);

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    console.log('📝 [API Profile] Données reçues pour PUT:', body);
    console.log('📝 [API Profile] Champ name reçu:', body.name);

    // 🔄 MAPPING ET VALIDATION des enums
    const updateData: any = {};

    // Traitement de birthDate - calcul automatique de age et zodiacSign
    if (body.birthDate) {
      const birthDate = new Date(body.birthDate);

      // Valider que la date est correcte
      if (isNaN(birthDate.getTime())) {
        return NextResponse.json({
          error: 'Date de naissance invalide. Format attendu: YYYY-MM-DD'
        }, { status: 400 });
      }

      // Vérifier l'âge minimum (18 ans)
      if (!isOldEnough(birthDate, 18)) {
        return NextResponse.json({
          error: 'Vous devez avoir au moins 18 ans pour utiliser ce service'
        }, { status: 400 });
      }

      // Calculer age et zodiacSign automatiquement
      const { age, zodiacSign } = calculateAgeAndZodiac(birthDate);
      updateData.birthDate = birthDate;
      updateData.age = age;
      updateData.zodiacSign = zodiacSign;

      console.log('🎂 birthDate traité:', { birthDate: body.birthDate, age, zodiacSign });
    }

    // Traitement de chaque champ avec mapping si nécessaire
    // Note: age et zodiacSign sont exclus car calculés automatiquement depuis birthDate
    const fieldsToUpdate = [
      'name', 'bio', 'location', 'profession',
      'dietType', 'religion', 'ethnicity', 'interests',
      // Caractéristiques physiques
      'height', 'weight', 'bodyType', 'eyeColor', 'hairColor',
      // Style de vie
      'smoking', 'drinking', 'drugs', 'children', 'pets', 'education',
      // Localisation
      'department', 'region', 'postcode'
    ];

    // Copier les champs simples (sans mapping)
    fieldsToUpdate.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    console.log('📝 [API Profile] updateData construit:', updateData);
    console.log('📝 [API Profile] name dans updateData:', updateData.name);

    // 🔄 MAPPING pour gender
    if (body.gender && body.gender.trim()) {
      const trimmedGender = body.gender.trim();
      if (!Object.keys(genderMapping).includes(trimmedGender)) {
        return NextResponse.json({
          error: `Valeur gender invalide: ${trimmedGender}. Valeurs acceptées: ${Object.keys(genderMapping).join(', ')}`
        }, { status: 400 });
      }
      updateData.gender = genderMapping[trimmedGender as keyof typeof genderMapping];
    }

    // 🔄 MAPPING pour maritalStatus
    if (body.maritalStatus && body.maritalStatus.trim()) {
      const trimmedMaritalStatus = body.maritalStatus.trim();
      if (!Object.keys(maritalStatusMapping).includes(trimmedMaritalStatus)) {
        return NextResponse.json({
          error: `Valeur maritalStatus invalide: ${trimmedMaritalStatus}. Valeurs acceptées: ${Object.keys(maritalStatusMapping).join(', ')}`
        }, { status: 400 });
      }
      updateData.maritalStatus = maritalStatusMapping[trimmedMaritalStatus as keyof typeof maritalStatusMapping];
    }

    console.log('📝 Données à mettre à jour (champs valides uniquement):', updateData);

    // Mise à jour en base de données
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: updateData,
      include: {
        photos: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        preferences: true
      }
    });

    console.log('✅ [API Profile] Utilisateur mis à jour avec succès');
    console.log('✅ [API Profile] Nouveau name en BDD:', updatedUser.name);

    // Invalider le cache après mise à jour
    await apiCache.invalidateUser(session.user.id);
    console.log('🗑️ Cache invalidé pour user:', session.user.id);

    // ✅ CORRECTION : Retourner les données avec accountStatus inclus
    const responseData = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      birthDate: updatedUser.birthDate,
      age: updatedUser.age,
      bio: updatedUser.bio,
      location: updatedUser.location,
      department: updatedUser.department,
      region: updatedUser.region,
      postcode: updatedUser.postcode,
      profession: updatedUser.profession,
      gender: updatedUser.gender ? genderMappingReverse[updatedUser.gender as keyof typeof genderMappingReverse] : null,
      maritalStatus: updatedUser.maritalStatus ? maritalStatusMappingReverse[updatedUser.maritalStatus as keyof typeof maritalStatusMappingReverse] : null,
      zodiacSign: updatedUser.zodiacSign,
      dietType: updatedUser.dietType,
      religion: updatedUser.religion,
      ethnicity: updatedUser.ethnicity,
      // Caractéristiques physiques
      height: updatedUser.height,
      weight: updatedUser.weight,
      bodyType: updatedUser.bodyType,
      eyeColor: updatedUser.eyeColor,
      hairColor: updatedUser.hairColor,
      // Style de vie
      smoking: updatedUser.smoking,
      drinking: updatedUser.drinking,
      drugs: updatedUser.drugs,
      children: updatedUser.children,
      pets: updatedUser.pets,
      education: updatedUser.education,
      interests: updatedUser.interests,
      photos: updatedUser.photos,
      preferences: updatedUser.preferences,
      accountStatus: updatedUser.accountStatus,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };

    // 🔍 LOG pour debugging
    console.log('📤 Données renvoyées au frontend (PUT):', {
      userId: responseData.id,
      accountStatus: responseData.accountStatus,
      typeAccountStatus: typeof responseData.accountStatus
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du profil:', error);
    return NextResponse.json({
      error: 'Erreur lors de la mise à jour du profil'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('📝 API GET Profile - Début');

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const userId = session.user.id;

    // Vérifier le cache d'abord
    const cachedProfile = await apiCache.profile.get(userId);
    if (cachedProfile) {
      console.log(`✅ Profile cache HIT for user ${userId} (${Date.now() - startTime}ms)`);
      const response = NextResponse.json(cachedProfile);
      response.headers.set('X-Cache', 'HIT');
      response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
      return response;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        photos: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        preferences: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    console.log(`✅ Profil récupéré depuis DB (${Date.now() - startTime}ms)`);

    // ✅ CORRECTION : Retourner les données avec accountStatus inclus
    const responseData = {
      id: user.id,
      email: user.email,
      name: user.name,
      birthDate: user.birthDate,
      age: user.age,
      bio: user.bio,
      location: user.location,
      department: user.department,
      region: user.region,
      postcode: user.postcode,
      profession: user.profession,
      gender: user.gender ? genderMappingReverse[user.gender as keyof typeof genderMappingReverse] : null,
      maritalStatus: user.maritalStatus ? maritalStatusMappingReverse[user.maritalStatus as keyof typeof maritalStatusMappingReverse] : null,
      zodiacSign: user.zodiacSign,
      dietType: user.dietType,
      religion: user.religion,
      ethnicity: user.ethnicity,
      // Caractéristiques physiques
      height: user.height,
      weight: user.weight,
      bodyType: user.bodyType,
      eyeColor: user.eyeColor,
      hairColor: user.hairColor,
      // Style de vie
      smoking: user.smoking,
      drinking: user.drinking,
      drugs: user.drugs,
      children: user.children,
      pets: user.pets,
      education: user.education,
      interests: user.interests,
      photos: user.photos,
      preferences: user.preferences,
      accountStatus: user.accountStatus,
      isPremium: user.isPremium || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Mettre en cache pour les prochaines requêtes (10 minutes)
    await apiCache.profile.set(userId, responseData);

    // 🔍 LOG pour debugging
    console.log('📤 Données renvoyées au frontend (GET):', {
      userId: responseData.id,
      accountStatus: responseData.accountStatus,
      cacheStatus: 'MISS',
      processingTime: `${Date.now() - startTime}ms`
    });

    const response = NextResponse.json(responseData);
    response.headers.set('X-Cache', 'MISS');
    response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
    return response;

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du profil:', error);
    return NextResponse.json({
      error: 'Erreur lors de la récupération du profil'
    }, { status: 500 });
  }
}