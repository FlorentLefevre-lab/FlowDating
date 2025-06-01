// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Ajustez selon votre config
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Récupérer le profil
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API GET /profile - Début');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ Pas de session utilisateur');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('👤 Utilisateur connecté:', session.user.email);

    // IMPORTANT : Inclure les photos dans la requête
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        photos: {
          orderBy: [
            { isPrimary: 'desc' }, // Photo principale en premier
            { createdAt: 'asc' }
          ]
        },
        preferences: true,
      }
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé en base');
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    console.log('✅ Profil trouvé:', user.id);
    console.log('📸 Photos trouvées:', user.photos.length); // ← Debug

    // Préparer la réponse avec tous les champs + photos
    const profileData = {
      id: user.id,
      name: user.name || '',
      age: user.age || null,
      bio: user.bio || '',
      location: user.location || '',
      profession: user.profession || '',
      gender: user.gender || '',
      maritalStatus: user.maritalStatus || '',
      zodiacSign: user.zodiacSign || '',
      dietType: user.dietType || '',
      religion: user.religion || '',
      interests: user.interests || [],
      preferences: user.preferences,
    };

    // IMPORTANT : Retourner les photos séparément
    return NextResponse.json({
      profile: profileData,
      photos: user.photos || [] // ← Cette ligne est cruciale
    });

  } catch (error) {
    console.error('❌ Erreur API GET /profile:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' }, 
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour le profil
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 API PUT /profile - Début');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ Pas de session utilisateur');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('👤 Utilisateur connecté:', session.user.email);

    let body;
    try {
      body = await request.json();
      console.log('📝 Données reçues:', JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error);
      return NextResponse.json({ error: 'Données JSON invalides' }, { status: 400 });
    }

    // Validation des données
    if (!body || typeof body !== 'object') {
      console.error('❌ Body vide ou invalide:', body);
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    console.log('🔍 Utilisateur trouvé, ID:', user.id);

    // Préparer les données pour la mise à jour (seulement les champs définis)
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Ajouter seulement les champs qui sont présents et valides
    if (body.name !== undefined && body.name !== null) {
      updateData.name = String(body.name).trim();
    }
    
    if (body.age !== undefined && body.age !== null && body.age !== '') {
      const ageNum = parseInt(body.age);
      if (!isNaN(ageNum) && ageNum > 0 && ageNum < 150) {
        updateData.age = ageNum;
      }
    }

    if (body.bio !== undefined && body.bio !== null) {
      updateData.bio = String(body.bio).trim();
    }

    if (body.location !== undefined && body.location !== null) {
      updateData.location = String(body.location).trim();
    }

    if (body.profession !== undefined && body.profession !== null) {
      updateData.profession = String(body.profession).trim();
    }

    if (body.gender !== undefined && body.gender !== null) {
      updateData.gender = String(body.gender).trim();
    }

    if (body.maritalStatus !== undefined && body.maritalStatus !== null) {
      updateData.maritalStatus = String(body.maritalStatus).trim();
    }

    if (body.zodiacSign !== undefined && body.zodiacSign !== null) {
      updateData.zodiacSign = String(body.zodiacSign).trim();
    }

    if (body.dietType !== undefined && body.dietType !== null) {
      updateData.dietType = String(body.dietType).trim();
    }

    if (body.religion !== undefined && body.religion !== null) {
      updateData.religion = String(body.religion).trim();
    }

    if (body.interests !== undefined && Array.isArray(body.interests)) {
      updateData.interests = body.interests.filter(interest => 
        typeof interest === 'string' && interest.trim().length > 0
      );
    }

    console.log('📝 Données préparées pour mise à jour:', JSON.stringify(updateData, null, 2));

    // Mettre à jour le profil
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    console.log('✅ Profil mis à jour avec succès:', updatedUser.id);

    // Retourner les données mises à jour
    const responseData = {
      id: updatedUser.id,
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
      interests: updatedUser.interests,
    };

    console.log('📤 Réponse envoyée:', JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Erreur API PUT /profile:', error);
    
    // Erreur Prisma spécifique
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Contrainte de base de données violée' }, 
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Erreur lors de la mise à jour: ${error.message}` }, 
      { status: 500 }
    );
  }
}