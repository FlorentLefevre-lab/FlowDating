// app/api/cron/process-emails/route.ts
// Cron endpoint to process email queue
// Configure in vercel.json or call via external cron service

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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
  getRetryReady,
  QueuedEmail,
} from '@/lib/email/queue';

const dnsLookup = promisify(dns.lookup);

// Transporter cache
let _transporter: ReturnType<typeof createTransport> | null = null;

async function getTransporter() {
  if (!_transporter) {
    const port = parseInt(process.env.SMTP_PORT || '587');
    const useImplicitTLS = port === 465;
    const smtpHost = process.env.SMTP_HOST || 'localhost';

    let resolvedHost = smtpHost;
    try {
      const result = await dnsLookup(smtpHost, { family: 4 });
      resolvedHost = result.address;
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
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      // Pool settings - Safe config for Infomaniak (~200 emails/min)
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      rateDelta: 1000,
      rateLimit: 4, // 4 messages per second
    });
  }
  return _transporter;
}

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

function addTracking(html: string, trackingId: string, baseUrl: string, unsubscribeUrl: string): string {
  const trackingPixel = `<img src="${baseUrl}/api/email/track/open/${trackingId}" width="1" height="1" alt="" style="display:none;" />`;

  if (html.includes('</body>')) {
    html = html.replace('</body>', `${trackingPixel}</body>`);
  } else {
    html += trackingPixel;
  }

  // Track clicks but skip unsubscribe URLs
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

// Note: Templates should include {{unsubscribe_url}} for RGPD compliance
// This function is kept for backwards compatibility but does nothing if link already exists
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

async function processEmailBatch(
  campaignId: string,
  campaign: {
    subject: string;
    sendRate: number;
    htmlContent: string | null;
    template: { htmlContent: string } | null;
  },
  batchSize: number = 20
): Promise<{ sent: number; failed: number; done: boolean }> {
  const result = { sent: 0, failed: 0, done: false };

  const htmlContent = campaign.htmlContent || campaign.template?.htmlContent;
  if (!htmlContent) {
    return { ...result, done: true };
  }

  // Check if paused
  if (await isCampaignPaused(campaignId)) {
    return result;
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://flow.dating';
  const transporter = await getTransporter();

  // Pop multiple emails from queue at once
  const emailsToProcess: QueuedEmail[] = [];
  for (let i = 0; i < batchSize; i++) {
    const email = await popFromQueue(campaignId);
    if (!email) break;
    emailsToProcess.push(email);
  }

  if (emailsToProcess.length === 0) {
    result.done = await isQueueEmpty(campaignId);
    return result;
  }

  // Batch fetch all users at once (much faster than individual queries)
  const userIds = [...new Set(emailsToProcess.map(e => e.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  // Process emails in parallel - Safe config for Infomaniak
  const PARALLEL_LIMIT = 5;
  for (let i = 0; i < emailsToProcess.length; i += PARALLEL_LIMIT) {
    const batch = emailsToProcess.slice(i, i + PARALLEL_LIMIT);

    const promises = batch.map(async (email) => {
      try {
        const user = userMap.get(email.userId);

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

        const subject = personalizeContent(campaign.subject, {
          firstName: user.name?.split(' ')[0],
          name: user.name,
        });

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

        // Batch these updates - don't await individually
        markProcessed(email);
        recordSend(campaignId);

        return { success: true, email };
      } catch (error) {
        console.error(`[Cron] Failed to send email ${email.sendId}:`, error);
        pushToRetry(email, error instanceof Error ? error.message : 'Unknown error');
        return { success: false, email, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(promises);
    const successEmails = results.filter(r => r.success);
    const failedEmails = results.filter(r => !r.success);

    result.sent += successEmails.length;
    result.failed += failedEmails.length;

    // Batch update database for successful sends
    if (successEmails.length > 0) {
      await prisma.emailSend.updateMany({
        where: { id: { in: successEmails.map(r => r.email.sendId) } },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    }

    // Batch update database for failed sends
    if (failedEmails.length > 0) {
      for (const failed of failedEmails) {
        await prisma.emailSend.update({
          where: { id: failed.email.sendId },
          data: {
            status: failed.email.attempts >= 2 ? 'FAILED' : 'PENDING',
            lastError: (failed as { error?: string }).error || 'Unknown error',
            attempts: failed.email.attempts + 1,
          },
        });
      }
    }
  }

  // Update campaign counts in one go
  if (result.sent > 0) {
    await updateCampaignProgress(campaignId, 'sent', result.sent);
  }
  if (result.failed > 0) {
    await updateCampaignProgress(campaignId, 'failed', result.failed);
  }
  if (result.sent > 0 || result.failed > 0) {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: result.sent },
        bounceCount: { increment: result.failed },
      },
    });
  }

  // Check if queue is empty after processing
  result.done = await isQueueEmpty(campaignId);

  return result;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Acquire global lock
  const lockAcquired = await acquireLock('cron-process-emails', 55000); // 55s lock for 1min cron
  if (!lockAcquired) {
    return NextResponse.json({ message: 'Another process is running', skipped: true });
  }

  try {
    const startTime = Date.now();
    const maxRuntime = 50000; // 50 seconds max (leave buffer for cleanup)
    const results: Record<string, { sent: number; failed: number; completed: boolean }> = {};

    // Get all active campaigns
    const activeCampaigns = await prisma.emailCampaign.findMany({
      where: { status: 'SENDING' },
      include: { template: true },
    });

    if (activeCampaigns.length === 0) {
      return NextResponse.json({ message: 'No active campaigns', results: {} });
    }

    // Process retries first
    const retryEmails = await getRetryReady(50);
    if (retryEmails.length > 0) {
      console.log(`[Cron] Processing ${retryEmails.length} retry emails`);
      for (const email of retryEmails) {
        const campaign = activeCampaigns.find(c => c.id === email.campaignId);
        if (campaign) {
          // Re-add to pending queue for processing
          const { pushToQueue } = await import('@/lib/email/queue');
          await pushToQueue(email.campaignId, [email]);
        }
      }
    }

    // Process campaigns continuously until time runs out
    let keepProcessing = true;
    while (keepProcessing && Date.now() - startTime < maxRuntime) {
      keepProcessing = false;

      for (const campaign of activeCampaigns) {
        if (Date.now() - startTime > maxRuntime) {
          console.log('[Cron] Max runtime reached, stopping');
          break;
        }

        const isPaused = await isCampaignPaused(campaign.id);
        if (isPaused) continue;

        // Process a batch of 20 emails at a time - Safe for Infomaniak
        const batchResult = await processEmailBatch(campaign.id, campaign, 20);

        // Accumulate results
        if (!results[campaign.id]) {
          results[campaign.id] = { sent: 0, failed: 0, completed: false };
        }
        results[campaign.id].sent += batchResult.sent;
        results[campaign.id].failed += batchResult.failed;
        results[campaign.id].completed = batchResult.done;

        // If we sent something, there might be more to process
        if (batchResult.sent > 0 && !batchResult.done) {
          keepProcessing = true;
        }

        // Mark campaign as completed if done
        if (batchResult.done) {
          const progress = await getCampaignProgress(campaign.id);
          if (progress && progress.queued === 0) {
            await prisma.emailCampaign.update({
              where: { id: campaign.id },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
              },
            });
            console.log(`[Cron] Campaign ${campaign.id} completed`);
          }
        }
      }
    }

    const totalSent = Object.values(results).reduce((sum, r) => sum + r.sent, 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
    const allCompleted = Object.values(results).every(r => r.completed);

    console.log(`[Cron] Processed: ${totalSent} sent, ${totalFailed} failed`);

    // If there's more work and we haven't hit runtime limit, trigger another run
    if (!allCompleted && Date.now() - startTime < maxRuntime) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      // Release lock before triggering next run
      await releaseLock('cron-process-emails');

      // Small delay to prevent tight loop
      setTimeout(() => {
        fetch(`${baseUrl}/api/cron/process-emails`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
          },
        }).catch(() => {});
      }, 1000);

      return NextResponse.json({
        success: true,
        results,
        summary: { sent: totalSent, failed: totalFailed },
        runtime: Date.now() - startTime,
        continuing: true,
      });
    }

    return NextResponse.json({
      success: true,
      results,
      summary: { sent: totalSent, failed: totalFailed },
      runtime: Date.now() - startTime,
    });
  } finally {
    await releaseLock('cron-process-emails');
  }
}

// Also support POST for manual triggers
export { GET as POST };
