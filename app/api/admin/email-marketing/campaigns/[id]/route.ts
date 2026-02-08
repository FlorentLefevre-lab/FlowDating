// app/api/admin/email-marketing/campaigns/[id]/route.ts
// GET, PUT, DELETE for a single campaign

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET - Get a single campaign with full details
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

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            subject: true,
            htmlContent: true,
            textContent: true,
            variables: true,
          },
        },
        segment: {
          select: {
            id: true,
            name: true,
            cachedCount: true,
            conditions: true,
          },
        },
        _count: {
          select: {
            sends: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campagne non trouvee' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation de la campagne' },
      { status: 500 }
    );
  }
}

// PUT - Update a campaign (only if DRAFT or SCHEDULED)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;
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

    // Check campaign exists
    const existingCampaign = await prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campagne non trouvee' }, { status: 404 });
    }

    // Can only edit DRAFT or SCHEDULED campaigns
    if (!['DRAFT', 'SCHEDULED'].includes(existingCampaign.status)) {
      return NextResponse.json(
        { error: 'Impossible de modifier une campagne en cours ou terminee' },
        { status: 400 }
      );
    }

    // Validate template if provided
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

    // Validate segment if provided
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

    // Determine status based on scheduledAt
    let status = existingCampaign.status;
    if (scheduledAt !== undefined) {
      status = scheduledAt ? 'SCHEDULED' : 'DRAFT';
    }

    // Update campaign
    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(templateId !== undefined && { templateId }),
        ...(htmlContent !== undefined && { htmlContent }),
        ...(textContent !== undefined && { textContent }),
        ...(previewText !== undefined && { previewText }),
        ...(segmentId !== undefined && { segmentId }),
        ...(excludeSegmentId !== undefined && { excludeSegmentId }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(sendRate !== undefined && { sendRate }),
        status,
      },
      include: {
        template: {
          select: { id: true, name: true },
        },
        segment: {
          select: { id: true, name: true, cachedCount: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise a jour de la campagne' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a campaign (DRAFT, FAILED, or CANCELLED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;

    // Check campaign exists
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campagne non trouvee' }, { status: 404 });
    }

    // Cannot delete campaigns that are currently sending
    if (campaign.status === 'SENDING') {
      return NextResponse.json(
        { error: 'Impossible de supprimer une campagne en cours d\'envoi. Annulez-la d\'abord.' },
        { status: 400 }
      );
    }

    // Clear any queue data if exists
    try {
      const { clearCampaignQueue } = await import('@/lib/email/queue');
      await clearCampaignQueue(id);
    } catch {
      // Ignore if queue clearing fails
    }

    // Delete campaign (cascades to sends and events)
    await prisma.emailCampaign.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Campagne supprimee',
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la campagne' },
      { status: 500 }
    );
  }
}
