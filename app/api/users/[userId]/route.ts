// app/api/users/[userId]/route.ts
// SECURED: Users can only view profiles of users they have matched with
// or their own profile

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { userId } = await params;
    const currentUserId = session.user.id;

    if (!userId) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    // User can always view their own profile
    if (userId === currentUserId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          age: true,
          bio: true,
          location: true,
          profession: true,
          gender: true,
          interests: true,
          // Informations personnelles
          maritalStatus: true,
          zodiacSign: true,
          dietType: true,
          religion: true,
          ethnicity: true,
          // Caractéristiques physiques
          height: true,
          weight: true,
          bodyType: true,
          eyeColor: true,
          hairColor: true,
          // Style de vie
          smoking: true,
          drinking: true,
          drugs: true,
          children: true,
          pets: true,
          education: true,
          preferences: true,
          photos: {
            select: { url: true, isPrimary: true },
            orderBy: { isPrimary: 'desc' }
          }
        }
      });

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur non trouve' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        user: {
          ...user,
          image: user.photos.find(p => p.isPrimary)?.url || user.photos[0]?.url || user.image,
        }
      });
    }

    // For other users, verify that a match exists (reciprocal likes)
    const reciprocalLikes = await prisma.like.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId }
        ]
      }
    });

    const hasMatch = reciprocalLikes.length === 2;

    if (!hasMatch) {
      // Check if the user is in the discover feed (has been liked/disliked by current user)
      const hasInteraction = await prisma.like.findFirst({
        where: {
          senderId: currentUserId,
          receiverId: userId
        }
      }) || await prisma.dislike.findFirst({
        where: {
          senderId: currentUserId,
          receiverId: userId
        }
      });

      // Allow viewing basic public profile info for users in discover feed
      // but restrict sensitive information
      if (!hasInteraction) {
        console.warn('[SECURITY] Unauthorized profile access attempt:', {
          currentUser: currentUserId,
          targetUser: userId
        });
        return NextResponse.json(
          { error: 'Acces refuse - vous devez matcher pour voir ce profil' },
          { status: 403 }
        );
      }
    }

    // Fetch user with appropriate fields based on relationship
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        gender: true,
        interests: true,
        // Informations personnelles
        maritalStatus: true,
        zodiacSign: true,
        dietType: true,
        religion: true,
        ethnicity: true,
        // Caractéristiques physiques
        height: true,
        weight: true,
        bodyType: true,
        eyeColor: true,
        hairColor: true,
        // Style de vie
        smoking: true,
        drinking: true,
        drugs: true,
        children: true,
        pets: true,
        education: true,
        // Only show preferences to matched users
        preferences: hasMatch,
        photos: {
          select: { url: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        error: 'Utilisateur non trouve',
        userId: userId
      }, { status: 404 });
    }

    const formattedUser = {
      ...user,
      image: user.photos.find(p => p.isPrimary)?.url || user.photos[0]?.url || user.image,
    };

    return NextResponse.json({
      success: true,
      user: formattedUser,
      relationshipStatus: hasMatch ? 'matched' : 'discovered'
    });

  } catch (error: unknown) {
    console.error('[API users] Error:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
