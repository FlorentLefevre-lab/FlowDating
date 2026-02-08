// app/api/admin/email-marketing/process-queue/route.ts
// POST - Process pending emails from the queue
// This endpoint should be called periodically (via cron, polling, or trigger)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createTransport } from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';
import {
  popFromQueue,
  markProcessed,
  pushToRetry,
  updateCampaignProgress,
  checkRateLimit,
  recordSend,
  isQueueEmpty,
  isCampaignPaused,
  getCampaignProgress,
  acquireLock,
  releaseLock,
  QueuedEmail,
} from '@/lib/email/queue';

const dnsLookup = promisify(dns.lookup);

// Cache for SMTP transporter
let _transporter: ReturnType<typeof createTransport> | null = null;
let _resolvedHost: string | null = null;

async function getTransporter() {
  if (!_transporter) {
    const port = parseInt(process.env.SMTP_PORT || '587');
    const useImplicitTLS = port === 465;
    const smtpHost = process.env.SMTP_HOST || 'localhost';

    // Resolve to IPv4 to avoid timeout issues
    let resolvedHost = smtpHost;
    try {
      const result = await dnsLookup(smtpHost, { family: 4 });
      resolvedHost = result.address;
      _resolvedHost = resolvedHost;
    } catch {
      // Use hostname directly
    }

    _transporter = createTransport({
      host: resolvedHost,
      port: port,
      secure: useImplicitTLS,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
        servername: smtpHost,
      },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
    });
  }
  return _transporter;
}

// Personalization: replace {{variable}} with values
function personalizeContent(
  content: string,
  variables: Record<string, string | null | undefined>
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    result = result.replace(regex, value || '');
  }
  return result;
}

// Add tracking pixel and link tracking (excludes unsubscribe URLs)
function addTracking(html: string, trackingId: string, baseUrl: string, unsubscribeUrl: string): string {
  // Add tracking pixel
  const trackingPixel = `<img src="${baseUrl}/api/email/track/open/${trackingId}" width="1" height="1" alt="" style="display:none;" />`;

  // Insert before closing body tag or at the end
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${trackingPixel}</body>`);
  } else {
    html += trackingPixel;
  }

  // Track links - replace href with tracking URL (skip unsubscribe)
  html = html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (match, url) => {
      // Don't track unsubscribe links
      if (url.includes('/unsubscribe') || url === unsubscribeUrl) {
        return match;
      }
      const trackUrl = `${baseUrl}/api/email/track/click/${trackingId}?url=${encodeURIComponent(url)}`;
      return `href="${trackUrl}"`;
    }
  );

  return html;
}

// Ensure unsubscribe link exists for RGPD compliance
// Templates should include {{unsubscribe_url}} - this is a fallback
function ensureUnsubscribeLink(html: string, unsubscribeUrl: string): string {
  // If the URL is already in the HTML (from template variable), return as-is
  if (html.includes(unsubscribeUrl)) {
    return html;
  }

  // If there's any unsubscribe-related content, assume it's handled
  const hasUnsubscribe = /unsubscribe|désabonner|desabonner|désinscription|desinscription/i.test(html);
  if (hasUnsubscribe) {
    return html;
  }

  // Only add footer if absolutely no unsubscribe mechanism exists
  const footer = `
    <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
      <p style="margin: 0;">
        <a href="${unsubscribeUrl}" style="color: #666;">Se désabonner</a>
      </p>
    </div>
  `;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }
  return html + footer;
}

interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  rateLimited: boolean;
  completed: boolean;
}

async function processQueue(campaignId: string, batchSize: number = 10): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    rateLimited: false,
    completed: false,
  };

  // Get campaign details
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { template: true },
  });

  if (!campaign || campaign.status !== 'SENDING') {
    result.completed = true;
    return result;
  }

  // Check if paused
  if (await isCampaignPaused(campaignId)) {
    return result;
  }

  const htmlContent = campaign.htmlContent || campaign.template?.htmlContent;
  if (!htmlContent) {
    console.error(`[ProcessQueue] No HTML content for campaign ${campaignId}`);
    return result;
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const transporter = await getTransporter();

  for (let i = 0; i < batchSize; i++) {
    // Check rate limit
    const rateCheck = await checkRateLimit(campaignId, campaign.sendRate || 100);
    if (!rateCheck.allowed) {
      result.rateLimited = true;
      console.log(`[ProcessQueue] Rate limited for campaign ${campaignId}, wait ${rateCheck.waitMs}ms`);
      break;
    }

    // Check if paused again
    if (await isCampaignPaused(campaignId)) {
      break;
    }

    // Pop email from queue
    const email = await popFromQueue(campaignId);
    if (!email) {
      // Queue is empty
      result.completed = await isQueueEmpty(campaignId);
      break;
    }

    result.processed++;

    try {
      // Get user data for personalization
      const user = await prisma.user.findUnique({
        where: { id: email.userId },
        select: { name: true, email: true, gender: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate unsubscribe URL first
      const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email.email)}`;

      // Personalize content including unsubscribe_url
      let personalizedHtml = personalizeContent(htmlContent, {
        firstName: user.name?.split(' ')[0],
        name: user.name,
        email: user.email,
        unsubscribe_url: unsubscribeUrl,
      });

      // Add tracking (excludes unsubscribe URLs)
      personalizedHtml = addTracking(personalizedHtml, email.trackingId, baseUrl, unsubscribeUrl);

      // Ensure unsubscribe link exists (RGPD compliance)
      personalizedHtml = ensureUnsubscribeLink(personalizedHtml, unsubscribeUrl);

      // Build subject
      const subject = personalizeContent(campaign.subject, {
        firstName: user.name?.split(' ')[0],
        name: user.name,
      });

      // Send email
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email.email,
        subject: subject,
        html: personalizedHtml,
        headers: {
          'List-Unsubscribe': `<${baseUrl}/unsubscribe?email=${encodeURIComponent(email.email)}>`,
          'X-Campaign-Id': campaignId,
          'X-Tracking-Id': email.trackingId,
        },
      });

      // Record send for rate limiting
      await recordSend(campaignId);

      // Mark as processed in Redis
      await markProcessed(email);

      // Update Redis progress
      await updateCampaignProgress(campaignId, 'sent');

      // Update DB
      await prisma.emailSend.update({
        where: { id: email.sendId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          attempts: email.attempts + 1,
        },
      });

      // Update campaign sent count
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
        },
      });

      result.sent++;
      console.log(`[ProcessQueue] Sent email to ${email.email} for campaign ${campaignId}`);
    } catch (error) {
      console.error(`[ProcessQueue] Failed to send email ${email.sendId}:`, error);

      // Update Redis progress
      await updateCampaignProgress(campaignId, 'failed');

      // Push to retry queue
      await pushToRetry(email, error instanceof Error ? error.message : 'Unknown error');

      // Update DB
      await prisma.emailSend.update({
        where: { id: email.sendId },
        data: {
          status: email.attempts >= 2 ? 'FAILED' : 'PENDING', // Failed after 3 attempts
          lastError: error instanceof Error ? error.message : 'Unknown error',
          attempts: email.attempts + 1,
        },
      });

      result.failed++;
    }
  }

  // Check if campaign is complete
  if (result.completed) {
    const progress = await getCampaignProgress(campaignId);
    if (progress && progress.queued === 0) {
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      console.log(`[ProcessQueue] Campaign ${campaignId} completed`);
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Allow admin or internal calls (via cron header)
    const isCronCall = request.headers.get('x-cron-secret') === process.env.CRON_SECRET;

    if (!isCronCall && (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as any).role))) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const campaignId = body.campaignId as string | undefined;
    const batchSize = Math.min(body.batchSize || 10, 50); // Max 50 per call

    // Try to acquire processing lock
    const lockName = campaignId ? `process-${campaignId}` : 'process-all';
    const lockAcquired = await acquireLock(lockName, 60000); // 1 minute lock

    if (!lockAcquired) {
      return NextResponse.json({
        success: true,
        message: 'Un autre processus traite deja la queue',
        skipped: true,
      });
    }

    try {
      const results: Record<string, ProcessResult> = {};

      if (campaignId) {
        // Process specific campaign
        results[campaignId] = await processQueue(campaignId, batchSize);
      } else {
        // Process all active campaigns
        const activeCampaigns = await prisma.emailCampaign.findMany({
          where: { status: 'SENDING' },
          select: { id: true },
        });

        for (const campaign of activeCampaigns) {
          results[campaign.id] = await processQueue(campaign.id, batchSize);
        }
      }

      return NextResponse.json({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      });
    } finally {
      await releaseLock(lockName);
    }
  } catch (error) {
    console.error('[ProcessQueue] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la queue' },
      { status: 500 }
    );
  }
}

// GET - Check processing status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const activeCampaigns = await prisma.emailCampaign.findMany({
      where: { status: 'SENDING' },
      select: {
        id: true,
        name: true,
        totalRecipients: true,
        sentCount: true,
        sendRate: true,
      },
    });

    const campaignStatus = await Promise.all(
      activeCampaigns.map(async (campaign) => {
        const progress = await getCampaignProgress(campaign.id);
        const isPaused = await isCampaignPaused(campaign.id);
        const rateCheck = await checkRateLimit(campaign.id, campaign.sendRate || 100);

        return {
          id: campaign.id,
          name: campaign.name,
          totalRecipients: campaign.totalRecipients,
          sentCount: campaign.sentCount,
          progress: progress,
          isPaused,
          rateLimit: rateCheck,
        };
      })
    );

    return NextResponse.json({
      success: true,
      activeCampaigns: campaignStatus,
    });
  } catch (error) {
    console.error('[ProcessQueue] Status check error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la verification du statut' },
      { status: 500 }
    );
  }
}
