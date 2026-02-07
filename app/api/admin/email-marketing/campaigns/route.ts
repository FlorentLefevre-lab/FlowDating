// app/api/admin/email-marketing/campaigns/route.ts
// GET (list) and POST (create) email campaigns

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET - List all campaigns with pagination
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
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Fetch campaigns with pagination
    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          subject: true,
          status: true,
          totalRecipients: true,
          sentCount: true,
          deliveredCount: true,
          openCount: true,
          clickCount: true,
          bounceCount: true,
          unsubscribeCount: true,
          uniqueOpens: true,
          uniqueClicks: true,
          scheduledAt: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          segment: {
            select: {
              id: true,
              name: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.emailCampaign.count({ where }),
    ]);

    // Get status breakdown
    const statusStats = await prisma.emailCampaign.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusStats: statusStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des campagnes' },
      { status: 500 }
    );
  }
}

// POST - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      subject,
      templateId,
      htmlContent,
      textContent,
      previewText,
      segmentId,
      excludeSegmentId,
      scheduledAt,
      sendRate,
    } = body;

    // Validate required fields
    if (!name || !subject) {
      return NextResponse.json(
        { error: 'Nom et sujet sont requis' },
        { status: 400 }
      );
    }

    // Must have either templateId or htmlContent
    if (!templateId && !htmlContent) {
      return NextResponse.json(
        { error: 'Template ou contenu HTML requis' },
        { status: 400 }
      );
    }

    // Validate template exists if provided
    if (templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) {
        return NextResponse.json(
          { error: 'Template non trouve' },
          { status: 400 }
        );
      }
    }

    // Validate segment exists if provided
    if (segmentId) {
      const segment = await prisma.emailSegment.findUnique({
        where: { id: segmentId },
      });
      if (!segment) {
        return NextResponse.json(
          { error: 'Segment non trouve' },
          { status: 400 }
        );
      }
    }

    // Determine initial status
    const status = scheduledAt ? 'SCHEDULED' : 'DRAFT';

    // Create campaign
    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        subject,
        templateId: templateId || null,
        htmlContent: htmlContent || null,
        textContent: textContent || null,
        previewText: previewText || null,
        segmentId: segmentId || null,
        excludeSegmentId: excludeSegmentId || null,
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        sendRate: sendRate || 100,
        createdBy: session.user.id,
      },
      include: {
        segment: {
          select: { id: true, name: true, cachedCount: true },
        },
        template: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      campaign,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la creation de la campagne' },
      { status: 500 }
    );
  }
}
