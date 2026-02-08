// app/api/admin/email-marketing/campaigns/[id]/retry/route.ts
// POST - Reset a failed or cancelled campaign to DRAFT status for retry

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { clearCampaignQueue } from '@/lib/email/queue';

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

    // Get campaign
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campagne non trouvee' }, { status: 404 });
    }

    // Allow retry for FAILED or CANCELLED campaigns
    if (!['FAILED', 'CANCELLED'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Seules les campagnes echouees ou annulees peuvent etre relancees' },
        { status: 400 }
      );
    }

    // Clear any remaining queue data
    await clearCampaignQueue(id);

    // Delete all pending email sends for this campaign (they weren't sent)
    await prisma.emailSend.deleteMany({
      where: {
        campaignId: id,
        status: 'PENDING',
      },
    });

    // Reset campaign status to DRAFT
    const updatedCampaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: 'DRAFT',
        startedAt: null,
        completedAt: null,
        totalRecipients: 0,
        sentCount: 0,
        deliveredCount: 0,
        openCount: 0,
        clickCount: 0,
        bounceCount: 0,
        unsubscribeCount: 0,
        uniqueOpens: 0,
        uniqueClicks: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Campagne remise en brouillon',
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error('Error retrying campaign:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la reinitialisation de la campagne' },
      { status: 500 }
    );
  }
}
