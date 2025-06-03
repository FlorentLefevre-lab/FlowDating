// src/app/api/debug/user/route.ts - API pour débugger un utilisateur
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 API Debug User - Vérification utilisateur');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Paramètre userId requis' 
      }, { status: 400 });
    }

    const { prisma } = await import('@/lib/db');
    
    console.log('🔍 Recherche utilisateur:', userId);
    
    // Rechercher par ID
    const userById = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Rechercher par email (au cas où)
    const userByEmail = await prisma.user.findUnique({
      where: { email: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Rechercher des utilisateurs similaires (ID partiel)
    const similarUsers = await prisma.user.findMany({
      where: {
        id: {
          contains: userId.substring(0, 10) // Premiers 10 caractères
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      take: 5
    });
    
    // Compter le total d'utilisateurs
    const totalUsers = await prisma.user.count();
    
    return NextResponse.json({
      searchedUserId: userId,
      userById,
      userByEmail,
      similarUsers,
      found: !!(userById || userByEmail),
      totalUsers,
      debug: {
        searchMethod: 'id_and_email',
        partialIdSearch: userId.substring(0, 10),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API debug user:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}