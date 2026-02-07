// app/api/admin/email-marketing/segments/route.ts
// GET (list) and POST (create) email segments

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { validateSegmentConditions } from '@/lib/email/segments';

// GET - List all segments with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Fetch segments with pagination
    const [segments, total] = await Promise.all([
      prisma.emailSegment.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          cachedCount: true,
          lastCountAt: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          _count: {
            select: {
              campaigns: true,
            },
          },
        },
      }),
      prisma.emailSegment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      segments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching segments:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des segments' },
      { status: 500 }
    );
  }
}

// POST - Create a new segment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, conditions } = body;

    // Validate required fields
    if (!name || !conditions) {
      return NextResponse.json(
        { error: 'Nom et conditions sont requis' },
        { status: 400 }
      );
    }

    // Validate conditions structure
    const validation = validateSegmentConditions(conditions);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Conditions invalides', details: validation.errors },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingSegment = await prisma.emailSegment.findUnique({
      where: { name },
    });

    if (existingSegment) {
      return NextResponse.json(
        { error: 'Un segment avec ce nom existe deja' },
        { status: 400 }
      );
    }

    // Create segment
    const segment = await prisma.emailSegment.create({
      data: {
        name,
        description: description || null,
        conditions,
        isActive: true,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      segment,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating segment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la creation du segment' },
      { status: 500 }
    );
  }
}
