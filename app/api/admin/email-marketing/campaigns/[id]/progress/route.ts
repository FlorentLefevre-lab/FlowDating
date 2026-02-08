// app/api/admin/email-marketing/campaigns/[id]/progress/route.ts
// GET - Get real-time campaign progress

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { getCampaignProgress, getQueueStats, checkRateLimit } from '@/lib/email/queue';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;

    // Get campaign from database
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        deliveredCount: true,
        openCount: true,
        clickCount: true,
        bounceCount: true,
        sendRate: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campagne non trouvee' }, { status: 404 });
    }

    // Get real-time progress from Redis
    const redisProgress = await getCampaignProgress(id);
    const queueStats = await getQueueStats(id);

    // Check rate limit to get wait time
    let rateInfo = { allowed: true, waitMs: 0 };
    if (campaign.status === 'SENDING') {
      rateInfo = await checkRateLimit(id, campaign.sendRate || 100);
    }

    // Calculate estimated time remaining
    let estimatedTimeRemaining = 0;
    let emailsPerMinute = 0;

    if (redisProgress && redisProgress.startedAt && redisProgress.sent > 0) {
      const elapsedMs = Date.now() - redisProgress.startedAt;
      const elapsedMinutes = elapsedMs / 60000;
      emailsPerMinute = Math.round(redisProgress.sent / elapsedMinutes);

      const remaining = redisProgress.queued;
      if (emailsPerMinute > 0) {
        estimatedTimeRemaining = Math.ceil((remaining / emailsPerMinute) * 60); // in seconds
      }
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        status: campaign.status,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
      },
      progress: {
        // From database (persisted)
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        deliveredCount: campaign.deliveredCount,
        openCount: campaign.openCount,
        clickCount: campaign.clickCount,
        bounceCount: campaign.bounceCount,
        // From Redis (real-time)
        ...(redisProgress && {
          queued: redisProgress.queued,
          sent: redisProgress.sent,
          failed: redisProgress.failed,
        }),
      },
      queue: {
        pending: queueStats.pendingCount,
        processing: queueStats.processingCount,
        failed: queueStats.failedCount,
        dlq: queueStats.dlqCount,
      },
      rate: {
        allowed: rateInfo.allowed,
        waitMs: rateInfo.waitMs,
        waitSeconds: Math.ceil(rateInfo.waitMs / 1000),
        sendRate: campaign.sendRate || 100,
        currentRate: emailsPerMinute,
      },
      timing: {
        estimatedTimeRemaining,
        emailsPerMinute,
      },
    });
  } catch (error) {
    console.error('Error getting campaign progress:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation de la progression' },
      { status: 500 }
    );
  }
}
