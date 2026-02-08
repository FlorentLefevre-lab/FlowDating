// app/api/email/track/click/[trackingId]/route.ts
// GET - Track email link click and redirect

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  // Default redirect if no URL provided
  const redirectUrl = url || process.env.NEXTAUTH_URL || 'https://flow.dating';

  const userAgent = request.headers.get('user-agent') || null;
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;

  // Track asynchronously, don't block redirect
  trackClick(trackingId, url, userAgent, ip).catch((err) => {
    console.error('[EmailTrack] Error tracking click:', err);
  });

  // Redirect to destination
  return NextResponse.redirect(redirectUrl, { status: 302 });
}

async function trackClick(
  trackingId: string,
  url: string | null,
  userAgent: string | null,
  ip: string | null
) {
  try {
    // Find email send by tracking ID
    const emailSend = await prisma.emailSend.findUnique({
      where: { trackingId },
      select: {
        id: true,
        campaignId: true,
        clickedAt: true,
      },
    });

    if (!emailSend) {
      return;
    }

    const isFirstClick = !emailSend.clickedAt;

    // Update emailSend with click timestamp
    await prisma.emailSend.update({
      where: { trackingId },
      data: {
        clickedAt: emailSend.clickedAt || new Date(),
      },
    });

    // Record event
    await prisma.emailEvent.create({
      data: {
        sendId: emailSend.id,
        eventType: 'CLICKED',
        metadata: {
          url,
          userAgent,
          ip,
        },
      },
    });

    // Update campaign counters
    await prisma.emailCampaign.update({
      where: { id: emailSend.campaignId },
      data: {
        clickCount: { increment: 1 },
        ...(isFirstClick ? { uniqueClicks: { increment: 1 } } : {}),
      },
    });
  } catch (error) {
    console.error('[EmailTrack] Error in trackClick:', error);
  }
}
