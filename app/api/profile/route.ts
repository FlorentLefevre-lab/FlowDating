// src/app/api/profile/route.ts - Version corrigée avec accountStatus

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

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
  'en-couple': 'IN_RELATIONSHIP',
  'marie': 'MARRIED',
  'divorce': 'DIVORCED',
  'veuf': 'WIDOWED',
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
  'IN_RELATIONSHIP': 'en-couple',
  'MARRIED': 'marie',
  'DIVORCED': 'divorce',
  'WIDOWED': 'veuf',
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
    console.log('📝 Données reçues pour PUT:', body);

    // 🔄 MAPPING ET VALIDATION des enums
    const updateData: any = {};

    // Traitement de chaque champ avec mapping si nécessaire
    const fieldsToUpdate = [
      'name', 'age', 'bio', 'location', 'profession', 
      'zodiacSign', 'dietType', 'religion', 'ethnicity', 'interests'
    ];

    // Copier les champs simples (sans mapping)
    fieldsToUpdate.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

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

    console.log('✅ Utilisateur mis à jour avec succès');

    // ✅ CORRECTION : Retourner les données avec accountStatus inclus
    const responseData = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      age: updatedUser.age,
      bio: updatedUser.bio,
      location: updatedUser.location,
      profession: updatedUser.profession,
      gender: updatedUser.gender ? genderMappingReverse[updatedUser.gender as keyof typeof genderMappingReverse] : null,
      maritalStatus: updatedUser.maritalStatus ? maritalStatusMappingReverse[updatedUser.maritalStatus as keyof typeof maritalStatusMappingReverse] : null,
      zodiacSign: updatedUser.zodiacSign,
      dietType: updatedUser.dietType,
      religion: updatedUser.religion,
      ethnicity: updatedUser.ethnicity,
      interests: updatedUser.interests,
      photos: updatedUser.photos,
      preferences: updatedUser.preferences,
      accountStatus: updatedUser.accountStatus, // ✅ AJOUT CRUCIAL
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
  try {
    console.log('📝 API GET Profile - Début');
    
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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

    console.log('✅ Profil récupéré avec succès');

    // ✅ CORRECTION : Retourner les données avec accountStatus inclus
    const responseData = {
      id: user.id,
      email: user.email,
      name: user.name,
      age: user.age,
      bio: user.bio,
      location: user.location,
      profession: user.profession,
      gender: user.gender ? genderMappingReverse[user.gender as keyof typeof genderMappingReverse] : null,
      maritalStatus: user.maritalStatus ? maritalStatusMappingReverse[user.maritalStatus as keyof typeof maritalStatusMappingReverse] : null,
      zodiacSign: user.zodiacSign,
      dietType: user.dietType,
      religion: user.religion,
      ethnicity: user.ethnicity,
      interests: user.interests,
      photos: user.photos,
      preferences: user.preferences,
      accountStatus: user.accountStatus, // ✅ AJOUT CRUCIAL
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // 🔍 LOG pour debugging
    console.log('📤 Données renvoyées au frontend (GET):', {
      userId: responseData.id,
      accountStatus: responseData.accountStatus,
      typeAccountStatus: typeof responseData.accountStatus,
      rawAccountStatusFromDB: user.accountStatus
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du profil:', error);
    return NextResponse.json({
      error: 'Erreur lors de la récupération du profil'
    }, { status: 500 });
  }
}