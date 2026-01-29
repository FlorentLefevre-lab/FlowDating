/**
 * Admin API: Photo Moderation Queue
 * GET /api/admin/moderation/photos - List photos pending moderation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, AdminContext, logAdminAction } from '@/lib/middleware/authorize';
import { prisma } from '@/lib/db';
import { PhotoModerationStatus } from '@prisma/client';

async function handleGet(req: NextRequest, ctx: AdminContext) {
  try {
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status') as PhotoModerationStatus | null;
    const autoFlagged = searchParams.get('autoFlagged');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build where clause
    const where: any = {};

    if (status) {
      where.moderationStatus = status;
    } else {
      // By default, show pending photos
      where.moderationStatus = 'PENDING';
    }

    if (autoFlagged === 'true') {
      where.autoFlagged = true;
    }

    // Get photos with user info
    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              accountStatus: true,
              createdAt: true,
            }
          },
          moderator: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: [
          // Prioritize auto-flagged photos
          { autoFlagged: 'desc' },
          // Then sort by selected field
          { [sortBy]: sortOrder }
        ],
        skip,
        take: limit,
      }),
      prisma.photo.count({ where })
    ]);

    // Get stats for the queue
    const stats = await prisma.photo.groupBy({
      by: ['moderationStatus'],
      _count: { id: true }
    });

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.moderationStatus] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      photos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        pending: statsMap.PENDING || 0,
        approved: statsMap.APPROVED || 0,
        rejected: statsMap.REJECTED || 0,
        flagged: statsMap.FLAGGED || 0,
      }
    });

  } catch (error) {
    console.error('[ADMIN] Photo moderation list error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des photos' },
      { status: 500 }
    );
  }
}

// Bulk moderation action
async function handlePost(req: NextRequest, ctx: AdminContext) {
  try {
    const body = await req.json();
    const { photoIds, action, note } = body;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'Liste de photos requise' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide (approve ou reject)' },
        { status: 400 }
      );
    }

    const newStatus: PhotoModerationStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // Update all photos
    const result = await prisma.photo.updateMany({
      where: {
        id: { in: photoIds },
        moderationStatus: { in: ['PENDING', 'FLAGGED'] }
      },
      data: {
        moderationStatus: newStatus,
        moderatedAt: new Date(),
        moderatedBy: ctx.userId,
        moderationNote: note || null,
      }
    });

    // Log admin action
    await logAdminAction(
      ctx.userId,
      action === 'approve' ? 'PHOTO_APPROVED' : 'PHOTO_REJECTED',
      undefined,
      {
        photoIds,
        count: result.count,
        note,
      },
      req
    );

    return NextResponse.json({
      success: true,
      message: `${result.count} photo(s) ${action === 'approve' ? 'approuvee(s)' : 'rejetee(s)'}`,
      moderated: result.count,
    });

  } catch (error) {
    console.error('[ADMIN] Bulk photo moderation error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la moderation' },
      { status: 500 }
    );
  }
}

export const GET = withAdmin(handleGet);
export const POST = withAdmin(handlePost);
