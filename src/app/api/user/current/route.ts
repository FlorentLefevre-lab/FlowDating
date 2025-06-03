// src/app/api/user/current/route.ts - API pour récupérer l'utilisateur actuel
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

interface CurrentUserResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
    age?: number;
    bio?: string;
    location?: string;
    profession?: string;
    interests: string[];
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<CurrentUserResponse>> {
  console.log('👤 API Current User - Récupération utilisateur actuel');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false,
        error: 'Non authentifié'
      }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    
    // Récupérer l'utilisateur complet depuis la base de données
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        interests: true,
        photos: {
          select: {
            url: true,
            isPrimary: true
          },
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Utilisateur introuvable en base de données'
      }, { status: 404 });
    }

    // Utiliser la photo primaire ou la première photo disponible
    const primaryPhoto = user.photos.find(photo => photo.isPrimary);
    const imageUrl = primaryPhoto?.url || user.photos[0]?.url || session.user.image;

    const currentUser = {
      id: user.id, // ✅ Vrai ID
      name: user.name || session.user.name || 'Utilisateur',
      email: user.email,
      image: imageUrl || undefined,
      age: user.age || undefined,
      bio: user.bio || undefined,
      location: user.location || undefined,
      profession: user.profession || undefined,
      interests: user.interests || []
    };

    console.log('✅ Utilisateur actuel récupéré:', {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name
    });

    return NextResponse.json({
      success: true,
      user: currentUser
    });

  } catch (error: any) {
    console.error('❌ Erreur API current user:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500 });
  }
}