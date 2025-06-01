import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function PUT(request: NextRequest) {
  try {
    console.log('🔥 API user-preferences PUT appelée');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    console.log('🔥 Body préférences reçu:', body);
    
    const { minAge, maxAge, maxDistance, gender } = body;

    if (!minAge || !maxAge || !maxDistance) {
      return NextResponse.json({ 
        error: 'Les âges minimum, maximum et la distance sont requis' 
      }, { status: 400 });
    }

    if (minAge > maxAge) {
      return NextResponse.json({ 
        error: 'L\'âge minimum ne peut pas être supérieur à l\'âge maximum' 
      }, { status: 400 });
    }

    console.log('✅ Validation préférences OK');

    const preferences = {
      minAge,
      maxAge,
      maxDistance,
      gender: gender || null
    };
    
    console.log('✅ Préférences sauvegardées:', preferences);
    return NextResponse.json(preferences);
    
  } catch (error) {
    console.error('❌ Erreur PUT user-preferences:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la mise à jour des préférences' 
    }, { status: 500 });
  }
}