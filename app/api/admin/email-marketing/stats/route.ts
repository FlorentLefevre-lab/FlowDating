import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Fetch all stats in parallel
    const [
      campaignsTotal,
      campaignsDraft,
      campaignsSending,
      campaignsCompleted,
      templatesTotal,
      templatesActive,
      segmentsTotal,
      recentCampaigns,
      globalStats,
    ] = await Promise.all([
      prisma.emailCampaign.count(),
      prisma.emailCampaign.count({ where: { status: 'DRAFT' } }),
      prisma.emailCampaign.count({ where: { status: 'SENDING' } }),
      prisma.emailCampaign.count({ where: { status: 'COMPLETED' } }),
      prisma.emailTemplate.count(),
      prisma.emailTemplate.count({ where: { isActive: true } }),
      prisma.emailSegment.count(),
      prisma.emailCampaign.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          sentCount: true,
          openCount: true,
          clickCount: true,
          createdAt: true,
        },
      }),
      // Calculate global open/click rates from completed campaigns
      prisma.emailCampaign.aggregate({
        where: { status: 'COMPLETED', sentCount: { gt: 0 } },
        _sum: {
          sentCount: true,
          openCount: true,
          clickCount: true,
        },
      }),
    ]);

    // Calculate average rates
    const totalSent = globalStats._sum.sentCount || 0;
    const totalOpened = globalStats._sum.openCount || 0;
    const totalClicked = globalStats._sum.clickCount || 0;

    const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : null;
    const avgClickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : null;

    return NextResponse.json({
      campaigns: {
        total: campaignsTotal,
        draft: campaignsDraft,
        sending: campaignsSending,
        completed: campaignsCompleted,
      },
      templates: {
        total: templatesTotal,
        active: templatesActive,
      },
      segments: {
        total: segmentsTotal,
      },
      rates: {
        open: avgOpenRate,
        click: avgClickRate,
      },
      recentCampaigns,
    });
  } catch (error) {
    console.error('Error fetching email marketing stats:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
