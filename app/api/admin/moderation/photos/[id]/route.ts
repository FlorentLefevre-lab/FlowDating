/**
 * Admin API: Single Photo Moderation
 * GET /api/admin/moderation/photos/[id] - Get photo details
 * PATCH /api/admin/moderation/photos/[id] - Moderate single photo
 * DELETE /api/admin/moderation/photos/[id] - Delete photo (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAndParams, AdminContext, logAdminAction } from '@/lib/middleware/authorize';
import { prisma } from '@/lib/db';
import { PhotoModerationStatus } from '@prisma/client';

type RouteParams = { id: string };

// Get photo details
async function handleGet(
  req: NextRequest,
  ctx: AdminContext,
  params: RouteParams
) {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            accountStatus: true,
            createdAt: true,
            photos: {
              select: {
                id: true,
                url: true,
                moderationStatus: true,
              }
            },
            _count: {
              select: {
                reportsReceived: true,
              }
            }
          }
        },
        moderator: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo non trouvee' },
        { status: 404 }
      );
    }

    // Get reports related to this user's photos
    const relatedReports = await prisma.report.findMany({
      where: {
        targetUserId: photo.userId,
        category: 'INAPPROPRIATE_CONTENT',
      },
      select: {
        id: true,
        category: true,
        status: true,
        createdAt: true,
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      photo,
      relatedReports,
    });

  } catch (error) {
    console.error('[ADMIN] Get photo error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation' },
      { status: 500 }
    );
  }
}

// Moderate single photo
async function handlePatch(
  req: NextRequest,
  ctx: AdminContext,
  params: RouteParams
) {
  try {
    const body = await req.json();
    const { action, note } = body;

    if (!action || !['approve', 'reject', 'flag'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide (approve, reject, ou flag)' },
        { status: 400 }
      );
    }

    // Get current photo
    const photo = await prisma.photo.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        moderationStatus: true,
      }
    });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo non trouvee' },
        { status: 404 }
      );
    }

    // Determine new status
    const statusMap: Record<string, PhotoModerationStatus> = {
      approve: 'APPROVED',
      reject: 'REJECTED',
      flag: 'FLAGGED',
    };
    const newStatus = statusMap[action];

    // Update photo
    const updated = await prisma.photo.update({
      where: { id: params.id },
      data: {
        moderationStatus: newStatus,
        moderatedAt: new Date(),
        moderatedBy: ctx.userId,
        moderationNote: note || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Log admin action
    const actionType = action === 'approve' ? 'PHOTO_APPROVED' : 'PHOTO_REJECTED';
    await logAdminAction(
      ctx.userId,
      actionType,
      photo.userId,
      {
        photoId: params.id,
        previousStatus: photo.moderationStatus,
        newStatus,
        note,
      },
      req
    );

    return NextResponse.json({
      success: true,
      photo: updated,
      message: `Photo ${action === 'approve' ? 'approuvee' : action === 'reject' ? 'rejetee' : 'signalee'}`,
    });

  } catch (error) {
    console.error('[ADMIN] Moderate photo error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la moderation' },
      { status: 500 }
    );
  }
}

// Delete photo (admin only)
async function handleDelete(
  req: NextRequest,
  ctx: AdminContext,
  params: RouteParams
) {
  // Only admins can permanently delete
  if (!ctx.isAdmin) {
    return NextResponse.json(
      { error: 'Action reservee aux administrateurs' },
      { status: 403 }
    );
  }

  try {
    // Get photo info before deletion
    const photo = await prisma.photo.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        url: true,
      }
    });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo non trouvee' },
        { status: 404 }
      );
    }

    // Delete photo
    await prisma.photo.delete({
      where: { id: params.id }
    });

    // Log admin action
    await logAdminAction(
      ctx.userId,
      'PHOTO_REJECTED',
      photo.userId,
      {
        photoId: params.id,
        photoUrl: photo.url,
        action: 'deleted',
      },
      req
    );

    return NextResponse.json({
      success: true,
      message: 'Photo supprimee',
    });

  } catch (error) {
    console.error('[ADMIN] Delete photo error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAndParams<RouteParams>(handleGet);
export const PATCH = withAdminAndParams<RouteParams>(handlePatch);
export const DELETE = withAdminAndParams<RouteParams>(handleDelete, { requireAdmin: true });
