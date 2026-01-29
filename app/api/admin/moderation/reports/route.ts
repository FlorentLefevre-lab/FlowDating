/**
 * Admin API: Reports Management
 * GET /api/admin/moderation/reports - List reports
 * POST /api/admin/moderation/reports - Create report (also available to users)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, withAuth, AdminContext, AuthContext, logAdminAction } from '@/lib/middleware/authorize';
import { prisma } from '@/lib/db';
import { ReportStatus, ReportCategory } from '@prisma/client';

// Admin: Get reports list
async function handleGetAdmin(req: NextRequest, ctx: AdminContext) {
  try {
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status') as ReportStatus | null;
    const category = searchParams.get('category') as ReportCategory | null;
    const priority = searchParams.get('priority');
    const targetUserId = searchParams.get('targetUserId');

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    } else {
      // By default, show pending reports
      where.status = { in: ['PENDING', 'UNDER_REVIEW'] };
    }

    if (category) {
      where.category = category;
    }

    if (priority) {
      where.priority = parseInt(priority);
    }

    if (targetUserId) {
      where.targetUserId = targetUserId;
    }

    // Get reports with related info
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              accountStatus: true,
              photos: {
                select: {
                  url: true,
                  isPrimary: true,
                },
                where: { isPrimary: true },
                take: 1,
              }
            }
          },
          resolver: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        skip,
        take: limit,
      }),
      prisma.report.count({ where })
    ]);

    // Get stats
    const stats = await prisma.report.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get category breakdown
    const categoryStats = await prisma.report.groupBy({
      by: ['category'],
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      _count: { id: true }
    });

    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        pending: statsMap.PENDING || 0,
        underReview: statsMap.UNDER_REVIEW || 0,
        resolved: statsMap.RESOLVED || 0,
        dismissed: statsMap.DISMISSED || 0,
      },
      categoryBreakdown: categoryStats.reduce((acc, c) => {
        acc[c.category] = c._count.id;
        return acc;
      }, {} as Record<string, number>)
    });

  } catch (error) {
    console.error('[ADMIN] Reports list error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des signalements' },
      { status: 500 }
    );
  }
}

// User or Admin: Create a report
async function handlePostUser(req: NextRequest, ctx: AuthContext) {
  try {
    const body = await req.json();
    const { targetUserId, category, description, evidenceUrls, photoId } = body;

    // Validation
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Utilisateur cible requis' },
        { status: 400 }
      );
    }

    if (!category || !Object.values(ReportCategory).includes(category)) {
      return NextResponse.json(
        { error: 'Categorie de signalement invalide' },
        { status: 400 }
      );
    }

    // Can't report yourself
    if (targetUserId === ctx.userId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas vous signaler vous-meme' },
        { status: 400 }
      );
    }

    // Check target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Utilisateur cible non trouve' },
        { status: 404 }
      );
    }

    // Check for duplicate recent report
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: ctx.userId,
        targetUserId,
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
        }
      }
    });

    if (existingReport) {
      return NextResponse.json(
        { error: 'Vous avez deja signale cet utilisateur recemment' },
        { status: 400 }
      );
    }

    // Determine priority based on category
    let priority = 0;
    if (['UNDERAGE', 'SCAM'].includes(category)) {
      priority = 2; // High
    } else if (['HARASSMENT', 'INAPPROPRIATE_CONTENT'].includes(category)) {
      priority = 1; // Medium
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        reporterId: ctx.userId,
        targetUserId,
        category,
        description: description || null,
        evidenceUrls: evidenceUrls || [],
        photoId: photoId || null,
        priority,
      },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Update pending reports count in global stats
    await prisma.globalStats.upsert({
      where: { id: 'singleton' },
      update: {
        pendingReports: { increment: 1 },
        lastCalculated: new Date(),
      },
      create: {
        id: 'singleton',
        pendingReports: 1,
      }
    });

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        category: report.category,
        status: report.status,
      },
      message: 'Signalement envoye. Merci de nous aider a maintenir la communaute sûre.',
    });

  } catch (error) {
    console.error('[REPORT] Create report error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du signalement' },
      { status: 500 }
    );
  }
}

export const GET = withAdmin(handleGetAdmin);
export const POST = withAuth(handlePostUser);
