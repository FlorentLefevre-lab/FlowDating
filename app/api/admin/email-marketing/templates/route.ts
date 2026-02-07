// app/api/admin/email-marketing/templates/route.ts
// GET (list) and POST (create) email templates

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET - List all templates with pagination and filters
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
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Fetch templates with pagination
    const [templates, total] = await Promise.all([
      prisma.emailTemplate.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          subject: true,
          previewText: true,
          category: true,
          variables: true,
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
      prisma.emailTemplate.count({ where }),
    ]);

    // Get category stats
    const categoryStats = await prisma.emailTemplate.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      categoryStats: categoryStats.reduce((acc, cat) => {
        acc[cat.category || 'uncategorized'] = cat._count.id;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des templates' },
      { status: 500 }
    );
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const body = await request.json();
    const { name, subject, htmlContent, textContent, previewText, category, variables } = body;

    // Validate required fields
    if (!name || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Nom, sujet et contenu HTML sont requis' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { name },
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Un template avec ce nom existe deja' },
        { status: 400 }
      );
    }

    // Create template
    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        htmlContent,
        textContent: textContent || null,
        previewText: previewText || null,
        category: category || null,
        variables: variables || ['firstName', 'email'],
        isActive: true,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      template,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la creation du template' },
      { status: 500 }
    );
  }
}
