// app/api/email/track/open/[trackingId]/route.ts
// GET - Track email open via tracking pixel

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;
  const userAgent = request.headers.get('user-agent') || null;
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;

  // Track asynchronously, don't block response
  trackOpen(trackingId, userAgent, ip).catch((err) => {
    console.error('[EmailTrack] Error tracking open:', err);
  });

  // Return 1x1 transparent GIF
  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

async function trackOpen(trackingId: string, userAgent: string | null, ip: string | null) {
  try {
    // Find email send by tracking ID
    const emailSend = await prisma.emailSend.findUnique({
      where: { trackingId },
      select: {
        id: true,
        campaignId: true,
        openedAt: true,
      },
    });

    if (!emailSend) {
      return;
    }

    const isFirstOpen = !emailSend.openedAt;

    // Update emailSend with open timestamp
    await prisma.emailSend.update({
      where: { trackingId },
      data: {
        openedAt: emailSend.openedAt || new Date(),
      },
    });

    // Record event
    await prisma.emailEvent.create({
      data: {
        sendId: emailSend.id,
        eventType: 'OPENED',
        metadata: {
          userAgent,
          ip,
        },
      },
    });

    // Update campaign counters
    await prisma.emailCampaign.update({
      where: { id: emailSend.campaignId },
      data: {
        openCount: { increment: 1 },
        ...(isFirstOpen ? { uniqueOpens: { increment: 1 } } : {}),
      },
    });
  } catch (error) {
    console.error('[EmailTrack] Error in trackOpen:', error);
  }
}
