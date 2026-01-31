import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Vérifier que l'utilisateur est admin
    if (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');

    const where: any = {};
    if (status) where.status = status;
    if (provider) where.provider = provider;

    // Récupérer les dons avec pagination
    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.donation.count({ where }),
    ]);

    // Statistiques globales des dons
    const stats = await prisma.donation.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
      _count: { id: true },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayStats, monthStats] = await Promise.all([
      prisma.donation.aggregate({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: todayStart },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.donation.aggregate({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: monthStart },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Stats par provider
    const byProvider = await prisma.donation.groupBy({
      by: ['provider'],
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
      _count: { id: true },
    });

    return NextResponse.json({
      donations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalAmount: stats._sum.amount || 0,
        totalCount: stats._count.id || 0,
        todayAmount: todayStats._sum.amount || 0,
        todayCount: todayStats._count.id || 0,
        monthAmount: monthStats._sum.amount || 0,
        monthCount: monthStats._count.id || 0,
        byProvider: byProvider.map(p => ({
          provider: p.provider,
          amount: p._sum.amount || 0,
          count: p._count.id || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Admin donations error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des dons' },
      { status: 500 }
    );
  }
}
