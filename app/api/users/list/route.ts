// app/api/users/list/route.ts
// SECURED: Removed sensitive data exposure, limited fields returned
// This endpoint should likely be admin-only or removed entirely

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  console.log('[API users/list] Request received');

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // SECURITY: This endpoint returns limited public data only
    // Emails and sensitive info are NOT exposed
    const currentUserId = session.user.id;

    // Get users excluding current user and system accounts
    // Only return public profile information suitable for discovery
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { email: { not: { endsWith: '@system.local' } } },
          { accountStatus: 'ACTIVE' } // Only show active accounts
        ]
      },
      select: {
        id: true,
        name: true,
        // SECURITY: Do NOT expose email to other users
        // email: true, // REMOVED
        image: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        gender: true,
        interests: true,
        createdAt: true,
        isOnline: true,
        lastSeen: true,
        photos: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1
        }
      },
      orderBy: [
        { lastSeen: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 100 // Limit results
    });

    console.log(`[API users/list] Found ${users.length} users`);

    // Format users with public info only
    const publicUsers = users.map(user => ({
      id: user.id,
      name: user.name || 'Utilisateur',
      image: user.photos[0]?.url || user.image,
      age: user.age,
      bio: user.bio,
      location: user.location,
      profession: user.profession,
      gender: user.gender,
      interests: user.interests || [],
      isOnline: user.isOnline,
      memberSince: user.createdAt
    }));

    return NextResponse.json({
      users: publicUsers,
      meta: {
        count: publicUsers.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('[API users/list] Error:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      users: []
    }, { status: 500 });
  }
}

// POST endpoint for search - also secured
export async function POST(request: NextRequest) {
  console.log('[API users/list] Search request received');

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
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
      limit = 50
    } = body;

    const currentUserId = session.user.id;

    // Build search filters
    const whereClause: Record<string, unknown> = {
      AND: [
        { id: { not: currentUserId } },
        { email: { not: { endsWith: '@system.local' } } },
        { accountStatus: 'ACTIVE' }
      ]
    };

    const andConditions = whereClause.AND as Record<string, unknown>[];

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { profession: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { bio: { contains: search, mode: 'insensitive' } }
          // SECURITY: Do NOT search by email
        ]
      });
    }

    if (ageMin) {
      andConditions.push({ age: { gte: parseInt(ageMin) } });
    }
    if (ageMax) {
      andConditions.push({ age: { lte: parseInt(ageMax) } });
    }
    if (location) {
      andConditions.push({ location: { contains: location, mode: 'insensitive' } });
    }
    if (profession) {
      andConditions.push({ profession: { contains: profession, mode: 'insensitive' } });
    }
    if (gender) {
      andConditions.push({ gender });
    }
    if (interests.length > 0) {
      andConditions.push({ interests: { hasSome: interests } });
    }

    const users = await prisma.user.findMany({
      where: whereClause,
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
        createdAt: true,
        photos: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1
        }
      },
      orderBy: [{ createdAt: 'desc' }],
      take: Math.min(limit, 100) // Security limit
    });

    const publicUsers = users.map(user => ({
      id: user.id,
      name: user.name || 'Utilisateur',
      image: user.photos[0]?.url || user.image,
      age: user.age,
      bio: user.bio,
      location: user.location,
      profession: user.profession,
      gender: user.gender,
      interests: user.interests || []
    }));

    return NextResponse.json({
      users: publicUsers,
      meta: {
        count: publicUsers.length,
        hasFilters: !!(search || ageMin || ageMax || location || profession || interests.length || gender)
      }
    });

  } catch (error: unknown) {
    console.error('[API users/list search] Error:', error);
    return NextResponse.json({
      error: 'Erreur recherche',
      users: []
    }, { status: 500 });
  }
}
