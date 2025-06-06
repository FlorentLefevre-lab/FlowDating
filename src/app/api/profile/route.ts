// /app/api/profile/route.ts - Version corrigée avec Prisma
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { PrismaClient } from '@prisma/client';

// Singleton pour Prisma (évite les multiples connexions)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// GET - Récupérer le profil utilisateur
export async function GET(request: NextRequest) {
  try {
    console.log('📋 API GET Profile - Début');
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('❌ Session invalide:', session);
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    console.log('👤 Recherche utilisateur:', session.user.id);

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
      console.log('❌ Utilisateur non trouvé:', session.user.id);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    console.log('✅ Profil chargé:', user.email);
    
    const profileData = {
      id: user.id,
      email: user.email,
      name: user.name,
      age: user.age,
      bio: user.bio,
      location: user.location,
      profession: user.profession,
      gender: user.gender,
      maritalStatus: user.maritalStatus,
      zodiacSign: user.zodiacSign,
      dietType: user.dietType,
      religion: user.religion,
      ethnicity: user.ethnicity,
      interests: user.interests || [],
      photos: user.photos || [],
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json(profileData);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du profil:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour le profil utilisateur
export async function PUT(request: NextRequest) {
  try {
    console.log('📝 API PUT Profile - Début');
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('❌ Session invalide pour PUT:', session);
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    console.log('👤 Mise à jour pour utilisateur:', session.user.id);

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!existingUser) {
      console.log('❌ Utilisateur non trouvé pour PUT:', session.user.id);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Lire les données du body
    const body = await request.json();
    console.log('📝 Données reçues pour PUT:', JSON.stringify(body, null, 2));

    // ✅ CONSTRUIRE L'OBJET DE MISE À JOUR AVEC SEULEMENT LES CHAMPS EXISTANTS
    const updateData: any = {};
    
    // Champs texte existants dans votre schéma
    if (body.name !== undefined) {
      updateData.name = body.name?.trim() || null;
    }
    if (body.bio !== undefined) {
      updateData.bio = body.bio?.trim() || null;
    }
    if (body.location !== undefined) {
      updateData.location = body.location?.trim() || null;
    }
    if (body.profession !== undefined) {
      updateData.profession = body.profession?.trim() || null;
    }
    if (body.gender !== undefined) {
      updateData.gender = body.gender?.trim() || null;
    }
    if (body.maritalStatus !== undefined) {
      updateData.maritalStatus = body.maritalStatus?.trim() || null;
    }
    if (body.zodiacSign !== undefined) {
      updateData.zodiacSign = body.zodiacSign?.trim() || null;
    }
    if (body.dietType !== undefined) {
      updateData.dietType = body.dietType?.trim() || null;
    }
    if (body.religion !== undefined) {
      updateData.religion = body.religion?.trim() || null;
    }
    if (body.ethnicity !== undefined) {
      updateData.ethnicity = body.ethnicity?.trim() || null;
    }
    
    // ✅ IGNORER les champs qui n'existent pas dans le schéma
    // Les champs department, region, postcode sont ignorés car ils n'existent pas
    
    // Traitement de l'âge
    if (body.age !== undefined) {
      if (body.age === null || body.age === '') {
        updateData.age = null;
      } else {
        const age = parseInt(body.age);
        if (isNaN(age) || age < 18 || age > 100) {
          console.log('❌ Âge invalide:', body.age);
          return NextResponse.json(
            { error: 'Âge invalide (doit être entre 18 et 100 ans)' },
            { status: 400 }
          );
        }
        updateData.age = age;
      }
    }
    
    // Traitement des centres d'intérêt
    if (body.interests !== undefined) {
      if (Array.isArray(body.interests)) {
        updateData.interests = body.interests
          .map(interest => String(interest).trim())
          .filter(interest => interest.length > 0)
          .slice(0, 15); // Limite à 15 intérêts
      } else {
        updateData.interests = [];
      }
    }

    // Validation de la bio
    if (updateData.bio && updateData.bio.length > 500) {
      console.log('❌ Bio trop longue:', updateData.bio.length);
      return NextResponse.json(
        { error: 'Bio limitée à 500 caractères' },
        { status: 400 }
      );
    }

    console.log('📝 Données à mettre à jour (champs valides uniquement):', JSON.stringify(updateData, null, 2));

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

    console.log('✅ Profil mis à jour avec succès:', updatedUser.email);
    
    const responseData = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      age: updatedUser.age,
      bio: updatedUser.bio,
      location: updatedUser.location,
      profession: updatedUser.profession,
      gender: updatedUser.gender,
      maritalStatus: updatedUser.maritalStatus,
      zodiacSign: updatedUser.zodiacSign,
      dietType: updatedUser.dietType,
      religion: updatedUser.religion,
      ethnicity: updatedUser.ethnicity,
      interests: updatedUser.interests || [],
      photos: updatedUser.photos || [],
      preferences: updatedUser.preferences,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du profil:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}