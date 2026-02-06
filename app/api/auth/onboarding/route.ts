// app/api/auth/onboarding/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiCache } from '@/lib/cache';
import { z } from 'zod';

// Schéma de validation
const onboardingSchema = z.object({
  // Profil utilisateur
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY']),
  birthDate: z.string().refine((date) => {
    const birth = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 18;
  }, { message: 'Vous devez avoir au moins 18 ans' }),
  location: z.string().min(1, 'La localisation est requise'),

  // Préférences de recherche
  preferredGender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'ALL']),
  minAge: z.number().min(18).max(99),
  maxAge: z.number().min(18).max(99),
  maxDistance: z.number().min(1).max(500),
  lookingFor: z.enum(['SERIOUS_RELATIONSHIP', 'CASUAL', 'FRIENDSHIP', 'ADVENTURE', 'MARRIAGE', 'UNSURE']),
  interests: z.array(z.string()).max(10).optional()
}).refine((data) => data.minAge <= data.maxAge, {
  message: 'L\'âge minimum doit être inférieur ou égal à l\'âge maximum'
});

// POST - Sauvegarder les données d'onboarding
export async function POST(request: Request) {
  try {
    // Vérifier l'authentification
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Parser et valider les données
    const body = await request.json();
    const validationResult = onboardingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Calculer l'âge à partir de la date de naissance
    const birthDate = new Date(data.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Mettre à jour le profil utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        gender: data.gender as any,
        birthDate: birthDate,
        age: age,
        location: data.location,
        interests: data.interests || [],
        accountStatus: 'ACTIVE',
        // Marquer l'onboarding comme complété définitivement
        onboardingCompletedAt: new Date()
      }
    });

    // Créer ou mettre à jour les préférences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        gender: data.preferredGender as any,
        minAge: data.minAge,
        maxAge: data.maxAge,
        maxDistance: data.maxDistance,
        lookingFor: data.lookingFor
      },
      update: {
        gender: data.preferredGender as any,
        minAge: data.minAge,
        maxAge: data.maxAge,
        maxDistance: data.maxDistance,
        lookingFor: data.lookingFor
      }
    });

    // Invalider le cache discover pour que les nouveaux filtres de genre soient appliqués
    await apiCache.invalidateUser(session.user.id);

    console.log('✅ Onboarding complété pour:', session.user.email);

    return NextResponse.json({
      success: true,
      message: 'Profil configuré avec succès',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        gender: updatedUser.gender,
        age: updatedUser.age,
        location: updatedUser.location
      },
      preferences: {
        gender: preferences.gender,
        minAge: preferences.minAge,
        maxAge: preferences.maxAge,
        maxDistance: preferences.maxDistance,
        lookingFor: preferences.lookingFor
      }
    });

  } catch (error) {
    console.error('💥 Erreur onboarding:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde' },
      { status: 500 }
    );
  }
}
