// app/api/email/unsubscribe/route.ts
// POST - Unsubscribe from marketing emails

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (!user) {
      // Don't reveal if email exists or not
      return NextResponse.json({ success: true });
    }

    // Update email preferences
    await prisma.emailPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email: user.email,
        marketingConsent: false,
        unsubscribedAt: new Date(),
      },
      update: {
        marketingConsent: false,
        unsubscribedAt: new Date(),
      },
    });

    // Track unsubscribe in any recent campaigns
    const recentSends = await prisma.emailSend.findMany({
      where: {
        email: normalizedEmail,
        sentAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        id: true,
        campaignId: true,
      },
      take: 10,
    });

    // Update the most recent send as unsubscribed
    if (recentSends.length > 0) {
      const latestSend = recentSends[0];

      // Record unsubscribe event
      await prisma.emailEvent.create({
        data: {
          sendId: latestSend.id,
          eventType: 'UNSUBSCRIBED',
          metadata: {
            email: normalizedEmail,
          },
        },
      });

      // Increment campaign unsubscribe count
      await prisma.emailCampaign.update({
        where: { id: latestSend.campaignId },
        data: {
          unsubscribeCount: { increment: 1 },
        },
      });
    }

    console.log(`[Unsubscribe] User unsubscribed: ${normalizedEmail}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Unsubscribe] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du desabonnement' },
      { status: 500 }
    );
  }
}
