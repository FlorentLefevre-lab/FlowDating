// app/api/admin/email-marketing/campaigns/[id]/test/route.ts
// POST - Send a test email for a campaign

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { renderTemplateString } from '@/lib/email/templates';
import { createTransport } from 'nodemailer';

// Get SMTP transporter
async function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '587');
  const useImplicitTLS = port === 465;

  return createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: port,
    secure: useImplicitTLS,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

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
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email de test requis' },
        { status: 400 }
      );
    }

    // Get campaign with template
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        template: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campagne non trouvee' }, { status: 404 });
    }

    // Get HTML content
    const htmlContent = campaign.htmlContent || campaign.template?.htmlContent;
    const textContent = campaign.textContent || campaign.template?.textContent;

    if (!htmlContent) {
      return NextResponse.json(
        { error: 'Contenu HTML requis' },
        { status: 400 }
      );
    }

    // Get current user for test data
    const testUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        gender: true,
        region: true,
        isPremium: true,
      },
    });

    // Sample data for template rendering
    const sampleData = {
      firstName: testUser?.name?.split(' ')[0] || 'Prenom',
      lastName: testUser?.name?.split(' ').slice(1).join(' ') || 'Nom',
      name: testUser?.name || 'Utilisateur',
      email: email,
      age: '30',
      region: testUser?.region || 'France',
      isPremium: testUser?.isPremium || false,
      totalMatches: '5',
      unsubscribe_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/email-marketing/unsubscribe/test-token`,
      preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`,
    };

    // Render template with sample data
    const renderedHtml = renderTemplateString(htmlContent, sampleData);
    const renderedText = textContent ? renderTemplateString(textContent, sampleData) : undefined;

    // Add [TEST] prefix to subject
    const testSubject = `[TEST] ${campaign.subject}`;

    // Send test email
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@flow.dating',
      to: email,
      subject: testSubject,
      html: renderedHtml,
      text: renderedText,
    });

    return NextResponse.json({
      success: true,
      message: `Email de test envoye a ${email}`,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email de test" },
      { status: 500 }
    );
  }
}
