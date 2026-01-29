/**
 * Admin API: Single Report Management
 * GET /api/admin/moderation/reports/[id] - Get report details
 * PATCH /api/admin/moderation/reports/[id] - Update report status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAndParams, AdminContext, logAdminAction } from '@/lib/middleware/authorize';
import { prisma } from '@/lib/db';
import { ReportStatus, AccountStatus } from '@prisma/client';

type RouteParams = { id: string };

// Get report details
async function handleGet(
  req: NextRequest,
  ctx: AdminContext,
  params: RouteParams
) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            _count: {
              select: {
                reportsSubmitted: true,
              }
            }
          }
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            accountStatus: true,
            createdAt: true,
            bio: true,
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
        resolver: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Signalement non trouve' },
        { status: 404 }
      );
    }

    // Get other reports against this user
    const otherReports = await prisma.report.findMany({
      where: {
        targetUserId: report.targetUserId,
        id: { not: params.id },
      },
      select: {
        id: true,
        category: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get admin actions taken against this user
    const adminActions = await prisma.adminLog.findMany({
      where: {
        targetUserId: report.targetUserId,
      },
      select: {
        id: true,
        actionType: true,
        details: true,
        createdAt: true,
        admin: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      report,
      context: {
        otherReports,
        adminActions,
        totalReportsAgainstUser: report.targetUser._count.reportsReceived,
      }
    });

  } catch (error) {
    console.error('[ADMIN] Get report error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation' },
      { status: 500 }
    );
  }
}

// Update report status and optionally take action
async function handlePatch(
  req: NextRequest,
  ctx: AdminContext,
  params: RouteParams
) {
  try {
    const body = await req.json();
    const { status, resolution, userAction } = body;

    // Validate status
    if (!status || !Object.values(ReportStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    // Get current report
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        targetUser: {
          select: {
            id: true,
            accountStatus: true,
          }
        }
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Signalement non trouve' },
        { status: 404 }
      );
    }

    // Start a transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Update report
      const updatedReport = await tx.report.update({
        where: { id: params.id },
        data: {
          status,
          resolution: resolution || null,
          resolvedAt: ['RESOLVED', 'DISMISSED'].includes(status) ? new Date() : null,
          resolvedBy: ['RESOLVED', 'DISMISSED'].includes(status) ? ctx.userId : null,
        }
      });

      // Take action against user if requested
      let userActionResult = null;
      if (userAction && status === 'RESOLVED') {
        const targetUserId = report.targetUserId;

        switch (userAction) {
          case 'warn':
            // Just log a warning
            userActionResult = { action: 'warned' };
            break;

          case 'suspend':
            // Suspend for 7 days
            await tx.user.update({
              where: { id: targetUserId },
              data: {
                accountStatus: 'SUSPENDED',
                suspensionReason: `Signalement: ${report.category}`,
                suspendedAt: new Date(),
                suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              }
            });
            userActionResult = { action: 'suspended', duration: '7 days' };

            // Log the suspension
            await tx.adminLog.create({
              data: {
                adminId: ctx.userId,
                actionType: 'USER_SUSPENDED',
                targetUserId,
                details: {
                  reason: `Report: ${report.category}`,
                  reportId: params.id,
                  duration: '7 days',
                }
              }
            });
            break;

          case 'ban':
            // Only admins can ban
            if (!ctx.isAdmin) {
              throw new Error('Seuls les administrateurs peuvent bannir');
            }

            await tx.user.update({
              where: { id: targetUserId },
              data: {
                accountStatus: 'BANNED',
                suspensionReason: `Banni: ${report.category}`,
                suspendedAt: new Date(),
              }
            });
            userActionResult = { action: 'banned' };

            // Log the ban
            await tx.adminLog.create({
              data: {
                adminId: ctx.userId,
                actionType: 'USER_BANNED',
                targetUserId,
                details: {
                  reason: `Report: ${report.category}`,
                  reportId: params.id,
                }
              }
            });
            break;
        }
      }

      return { updatedReport, userActionResult };
    });

    // Log the report resolution
    await logAdminAction(
      ctx.userId,
      status === 'RESOLVED' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      report.targetUserId,
      {
        reportId: params.id,
        category: report.category,
        resolution,
        userAction: result.userActionResult,
      },
      req
    );

    // Update pending reports count
    if (['RESOLVED', 'DISMISSED'].includes(status)) {
      await prisma.globalStats.upsert({
        where: { id: 'singleton' },
        update: {
          pendingReports: { decrement: 1 },
          lastCalculated: new Date(),
        },
        create: {
          id: 'singleton',
        }
      });
    }

    return NextResponse.json({
      success: true,
      report: result.updatedReport,
      userAction: result.userActionResult,
      message: `Signalement ${status === 'RESOLVED' ? 'resolu' : status === 'DISMISSED' ? 'rejete' : 'mis a jour'}`,
    });

  } catch (error) {
    console.error('[ADMIN] Update report error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise a jour' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAndParams<RouteParams>(handleGet);
export const PATCH = withAdminAndParams<RouteParams>(handlePatch);
