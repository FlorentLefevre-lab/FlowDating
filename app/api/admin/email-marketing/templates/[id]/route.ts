// app/api/admin/email-marketing/templates/[id]/route.ts
// GET, PUT, DELETE individual email template

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single template by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template non trouve' }, { status: 404 });
    }

    // Get recent campaigns using this template
    const recentCampaigns = await prisma.emailCampaign.findMany({
      where: { templateId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        sentCount: true,
        openCount: true,
      },
    });

    return NextResponse.json({
      success: true,
      template,
      recentCampaigns,
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation du template' },
      { status: 500 }
    );
  }
}

// PUT - Update template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, subject, htmlContent, textContent, previewText, category, variables, isActive } = body;

    // Check template exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template non trouve' }, { status: 404 });
    }

    // Check for duplicate name (if name changed)
    if (name && name !== existingTemplate.name) {
      const duplicateName = await prisma.emailTemplate.findUnique({
        where: { name },
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: 'Un template avec ce nom existe deja' },
          { status: 400 }
        );
      }
    }

    // Update template
    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(htmlContent !== undefined && { htmlContent }),
        ...(textContent !== undefined && { textContent }),
        ...(previewText !== undefined && { previewText }),
        ...(category !== undefined && { category }),
        ...(variables !== undefined && { variables }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise a jour du template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;

    // Check template exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template non trouve' }, { status: 404 });
    }

    // Check if template is used by campaigns
    if (existingTemplate._count.campaigns > 0) {
      return NextResponse.json(
        { error: `Ce template est utilise par ${existingTemplate._count.campaigns} campagne(s). Desactivez-le plutot que de le supprimer.` },
        { status: 400 }
      );
    }

    // Delete template
    await prisma.emailTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Template supprime',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du template' },
      { status: 500 }
    );
  }
}
