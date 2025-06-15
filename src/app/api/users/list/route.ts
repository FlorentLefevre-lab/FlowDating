// src/app/api/users/list/route.ts - API pour lister tous les utilisateurs
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('👥 API Liste des utilisateurs');
  
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    const currentUserEmail = session.user.email;

    // Récupérer tous les utilisateurs SAUF l'utilisateur connecté
    const users = await prisma.user.findMany({
      where: {
        AND: [
          // Exclure l'utilisateur connecté
          { email: { not: currentUserEmail } },
          // Optionnel: exclure les comptes administrateur ou système
          { email: { not: { endsWith: '@system.local' } } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        gender: true,
        interests: true,
        createdAt: true,
        // Statistiques utiles
        _count: {
          select: {
            sentMessages: true,
            receivedMessages: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: 500 // Limite raisonnable
    });

    console.log(`✅ ${users.length} utilisateurs récupérés`);

    // Enrichir les données avec des statistiques
    const enrichedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      age: user.age,
      bio: user.bio,
      location: user.location,
      profession: user.profession,
      gender: user.gender,
      interests: user.interests || [],
      
      // Métadonnées utiles
      memberSince: user.createdAt,
      messageCount: user._count.sentMessages + user._count.receivedMessages,
      hasMessages: user._count.sentMessages > 0 || user._count.receivedMessages > 0,
      
      // Pour le tri/filtrage
      searchText: [
        user.name,
        user.email,
        user.profession,
        user.location,
        ...(user.interests || [])
      ].filter(Boolean).join(' ').toLowerCase()
    }));

    // Statistiques globales
    const stats = {
      totalUsers: users.length,
      usersWithMessages: enrichedUsers.filter(u => u.hasMessages).length,
      avgAge: users.filter(u => u.age).reduce((sum, u) => sum + (u.age || 0), 0) / users.filter(u => u.age).length || 0,
      topProfessions: [...new Set(users.map(u => u.profession).filter(Boolean))].slice(0, 10),
      topLocations: [...new Set(users.map(u => u.location).filter(Boolean))].slice(0, 10),
      allInterests: [...new Set(users.flatMap(u => u.interests || []))].slice(0, 20)
    };

    return NextResponse.json({
      users: enrichedUsers,
      stats,
      currentUser: {
        email: currentUserEmail,
        name: session.user.name,
        image: session.user.image
      },
      meta: {
        timestamp: new Date().toISOString(),
        count: users.length,
        chatType: 'universal_free',
        requiresMatch: false
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API liste utilisateurs:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message,
      users: [] // Fallback vide
    }, { status: 500 });
  }
}

// Optionnel: endpoint POST pour recherche avancée
export async function POST(request: NextRequest) {
  console.log('🔍 API Recherche utilisateurs avancée');
  
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      search = '', 
      ageMin, 
      ageMax, 
      location, 
      profession, 
      interests = [],
      gender,
      limit = 100 
    } = body;

    const { prisma } = await import('@/lib/db');
    const currentUserEmail = session.user.email;

    // Construire les filtres de recherche
    const whereClause: any = {
      AND: [
        { email: { not: currentUserEmail } },
        { email: { not: { endsWith: '@system.local' } } }
      ]
    };

    // Filtre de recherche textuelle
    if (search) {
      whereClause.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { profession: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { bio: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    // Filtres par âge
    if (ageMin) {
      whereClause.AND.push({ age: { gte: parseInt(ageMin) } });
    }
    if (ageMax) {
      whereClause.AND.push({ age: { lte: parseInt(ageMax) } });
    }

    // Filtres par localisation
    if (location) {
      whereClause.AND.push({ 
        location: { contains: location, mode: 'insensitive' } 
      });
    }

    // Filtres par profession
    if (profession) {
      whereClause.AND.push({ 
        profession: { contains: profession, mode: 'insensitive' } 
      });
    }

    // Filtres par genre
    if (gender) {
      whereClause.AND.push({ gender });
    }

    // Filtres par centres d'intérêt
    if (interests.length > 0) {
      whereClause.AND.push({
        interests: {
          hasSome: interests
        }
      });
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        gender: true,
        interests: true,
        createdAt: true
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: Math.min(limit, 200) // Limite de sécurité
    });

    console.log(`🔍 ${users.length} utilisateurs trouvés avec filtres`);

    return NextResponse.json({
      users,
      searchCriteria: {
        search,
        ageMin,
        ageMax,
        location,
        profession,
        interests,
        gender
      },
      meta: {
        count: users.length,
        hasFilters: !!(search || ageMin || ageMax || location || profession || interests.length || gender)
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur recherche utilisateurs:', error);
    return NextResponse.json({
      error: 'Erreur recherche',
      message: error.message,
      users: []
    }, { status: 500 });
  }
}