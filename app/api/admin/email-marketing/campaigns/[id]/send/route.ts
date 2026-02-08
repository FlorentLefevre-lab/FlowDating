// app/api/admin/email-marketing/campaigns/[id]/send/route.ts
// POST - Launch a campaign

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { getSegmentUsers, getSegmentUsersById } from '@/lib/email/segments';
import { pushToQueue, initCampaignProgress, QueuedEmail } from '@/lib/email/queue';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;

    // Get campaign with related data
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        template: true,
        segment: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campagne non trouvee' }, { status: 404 });
    }

    // Check campaign status
    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Cette campagne ne peut pas etre lancee' },
        { status: 400 }
      );
    }

    // Must have content (template or htmlContent)
    const htmlContent = campaign.htmlContent || campaign.template?.htmlContent;
    if (!htmlContent) {
      return NextResponse.json(
        { error: 'Contenu HTML requis (template ou contenu direct)' },
        { status: 400 }
      );
    }

    // Get recipients from segment
    let recipients: Array<{ id: string; email: string; name: string | null }> = [];

    // Get users to exclude if excludeSegmentId is set
    let excludeUserIds: string[] = [];
    if (campaign.excludeSegmentId) {
      const excludeUsers = await getSegmentUsersById(campaign.excludeSegmentId);
      excludeUserIds = excludeUsers.map(u => u.id);
    }

    if (campaign.segmentId && campaign.segment) {
      recipients = await getSegmentUsers(
        campaign.segment.conditions as any,
        { excludeUserIds }
      );
    } else {
      // No segment = all users with verified email
      // First get users with marketing consent from EmailPreference
      const preferences = await prisma.emailPreference.findMany({
        where: {
          marketingConsent: true,
          isHardBounce: false,
          unsubscribedAt: null,
        },
        select: {
          userId: true,
        },
      });

      const eligibleUserIds = preferences.map(p => p.userId);

      if (eligibleUserIds.length > 0) {
        const eligibleUsers = await prisma.user.findMany({
          where: {
            id: { in: eligibleUserIds },
            emailVerified: { not: null },
          },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });
        recipients = eligibleUsers;
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'Aucun destinataire eligible pour cette campagne' },
        { status: 400 }
      );
    }

    // Update campaign status to SENDING
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: 'SENDING',
        startedAt: new Date(),
        totalRecipients: recipients.length,
      },
    });

    // Create EmailSend records in batch (much faster than one by one)
    await prisma.emailSend.createMany({
      data: recipients.map(recipient => ({
        campaignId: id,
        userId: recipient.id,
        email: recipient.email,
        status: 'PENDING',
      })),
      skipDuplicates: true, // Handle idempotency - skip if already exists
    });

    // Fetch the created sends
    const emailSends = await prisma.emailSend.findMany({
      where: {
        campaignId: id,
        status: 'PENDING',
      },
    });

    // Initialize progress tracking
    await initCampaignProgress(id, emailSends.length);

    // Build queued emails and push to queue
    const queuedEmails: QueuedEmail[] = emailSends.map(send => ({
      sendId: send.id,
      campaignId: id,
      userId: send.userId,
      email: send.email,
      trackingId: send.trackingId,
      queuedAt: Date.now(),
      attempts: 0,
    }));

    await pushToQueue(id, queuedEmails);

    // Trigger background processing (fire and forget)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/cron/process-emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
      },
    }).catch((err) => {
      console.log('[Send] Background processing trigger failed:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Campagne lancee',
      totalRecipients: emailSends.length,
      campaignId: id,
    });
  } catch (error) {
    console.error('Error launching campaign:', error);

    // Revert campaign status on error
    const { id } = await params;
    await prisma.emailCampaign.update({
      where: { id },
      data: { status: 'FAILED' },
    }).catch(() => {});

    return NextResponse.json(
      { error: 'Erreur lors du lancement de la campagne' },
      { status: 500 }
    );
  }
}
