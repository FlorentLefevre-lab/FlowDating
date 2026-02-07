// src/lib/email/tracking.ts - Email tracking utilities (open pixel, click tracking)

import { prisma } from '../db';
import { EmailEventType } from '@prisma/client';
import crypto from 'crypto';

// ==========================================
// Constants
// ==========================================

// 1x1 transparent GIF pixel (base64 encoded)
export const TRACKING_PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Base URL for tracking endpoints
const getBaseUrl = () => process.env.NEXTAUTH_URL || 'https://flowdating.com';

// ==========================================
// URL Generation
// ==========================================

/**
 * Generate tracking pixel URL for email opens
 */
export function generateOpenTrackingUrl(trackingId: string): string {
  return `${getBaseUrl()}/api/admin/email-marketing/track/open/${trackingId}.gif`;
}

/**
 * Generate click tracking URL for links
 */
export function generateClickTrackingUrl(
  trackingId: string,
  originalUrl: string,
  linkId?: string
): string {
  const encodedUrl = Buffer.from(originalUrl).toString('base64url');
  const params = new URLSearchParams({ url: encodedUrl });
  if (linkId) {
    params.set('link', linkId);
  }
  return `${getBaseUrl()}/api/admin/email-marketing/track/click/${trackingId}?${params.toString()}`;
}

/**
 * Generate unsubscribe URL
 */
export function generateUnsubscribeUrl(unsubscribeToken: string): string {
  return `${getBaseUrl()}/api/admin/email-marketing/unsubscribe/${unsubscribeToken}`;
}

/**
 * Generate preferences URL (one-click access to email preferences)
 */
export function generatePreferencesUrl(unsubscribeToken: string): string {
  return `${getBaseUrl()}/email-preferences?token=${unsubscribeToken}`;
}

// ==========================================
// HTML Processing
// ==========================================

/**
 * Insert tracking pixel into HTML email content
 */
export function insertTrackingPixel(html: string, trackingId: string): string {
  const pixelUrl = generateOpenTrackingUrl(trackingId);
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;

  // Insert before closing body tag, or at the end if no body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelHtml}</body>`);
  } else {
    return html + pixelHtml;
  }
}

/**
 * Rewrite links in HTML to use click tracking
 * Preserves links that should not be tracked (unsubscribe, mailto, etc.)
 */
export function rewriteLinksForTracking(
  html: string,
  trackingId: string,
  options: {
    excludePatterns?: RegExp[];
    trackMailto?: boolean;
  } = {}
): string {
  const {
    excludePatterns = [/^mailto:/i, /^tel:/i, /^#/],
    trackMailto = false,
  } = options;

  // Default exclusions
  const defaultExclusions = [
    /unsubscribe/i,
    /preferences/i,
    /email-preferences/i,
  ];

  const allExclusions = [...excludePatterns, ...defaultExclusions];
  if (!trackMailto) {
    allExclusions.push(/^mailto:/i);
  }

  // Match href attributes in anchor tags
  const hrefRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*)>/gi;
  let linkCounter = 0;

  return html.replace(hrefRegex, (match, before, href, after) => {
    // Check if this link should be excluded
    const shouldExclude = allExclusions.some(pattern => pattern.test(href));
    if (shouldExclude) {
      return match;
    }

    // Skip if already a tracking URL
    if (href.includes('/track/click/')) {
      return match;
    }

    linkCounter++;
    const trackingUrl = generateClickTrackingUrl(trackingId, href, `link_${linkCounter}`);
    return `<a ${before}href="${trackingUrl}"${after}>`;
  });
}

/**
 * Process email HTML for full tracking (pixel + link rewriting)
 */
export function processEmailForTracking(
  html: string,
  trackingId: string,
  unsubscribeToken: string
): string {
  // Replace placeholder variables for unsubscribe
  let processed = html
    .replace(/\{\{unsubscribeUrl\}\}/g, generateUnsubscribeUrl(unsubscribeToken))
    .replace(/\{\{preferencesUrl\}\}/g, generatePreferencesUrl(unsubscribeToken));

  // Rewrite links for click tracking
  processed = rewriteLinksForTracking(processed, trackingId);

  // Insert tracking pixel
  processed = insertTrackingPixel(processed, trackingId);

  return processed;
}

// ==========================================
// Event Recording
// ==========================================

/**
 * Hash IP address for privacy (RGPD compliance)
 */
function hashIpAddress(ip: string): string {
  // Use a daily salt to allow some temporal analysis while preventing long-term tracking
  const dailySalt = new Date().toISOString().split('T')[0];
  return crypto
    .createHash('sha256')
    .update(`${ip}:${dailySalt}:${process.env.IP_HASH_SECRET || 'flowdating'}`)
    .digest('hex')
    .substring(0, 16); // Truncate for storage efficiency
}

/**
 * Record an email open event
 */
export async function recordOpenEvent(
  trackingId: string,
  metadata: {
    ip?: string;
    userAgent?: string;
  } = {}
): Promise<{ success: boolean; isFirstOpen: boolean }> {
  try {
    const send = await prisma.emailSend.findUnique({
      where: { trackingId },
      select: { id: true, openedAt: true, campaignId: true },
    });

    if (!send) {
      console.warn(`[Tracking] Open event for unknown trackingId: ${trackingId}`);
      return { success: false, isFirstOpen: false };
    }

    const isFirstOpen = !send.openedAt;

    // Create event record
    await prisma.emailEvent.create({
      data: {
        sendId: send.id,
        eventType: EmailEventType.OPENED,
        metadata: {
          ipHash: metadata.ip ? hashIpAddress(metadata.ip) : null,
          userAgent: metadata.userAgent?.substring(0, 255) || null,
          isFirstOpen,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Update send record on first open
    if (isFirstOpen) {
      await prisma.emailSend.update({
        where: { id: send.id },
        data: { openedAt: new Date() },
      });

      // Increment campaign counters
      await prisma.emailCampaign.update({
        where: { id: send.campaignId },
        data: {
          openCount: { increment: 1 },
          uniqueOpens: { increment: 1 },
        },
      });
    } else {
      // Just increment total opens (not unique)
      await prisma.emailCampaign.update({
        where: { id: send.campaignId },
        data: {
          openCount: { increment: 1 },
        },
      });
    }

    return { success: true, isFirstOpen };
  } catch (error) {
    console.error('[Tracking] Error recording open event:', error);
    return { success: false, isFirstOpen: false };
  }
}

/**
 * Record an email click event
 */
export async function recordClickEvent(
  trackingId: string,
  originalUrl: string,
  metadata: {
    ip?: string;
    userAgent?: string;
    linkId?: string;
  } = {}
): Promise<{ success: boolean; isFirstClick: boolean }> {
  try {
    const send = await prisma.emailSend.findUnique({
      where: { trackingId },
      select: { id: true, clickedAt: true, openedAt: true, campaignId: true },
    });

    if (!send) {
      console.warn(`[Tracking] Click event for unknown trackingId: ${trackingId}`);
      return { success: false, isFirstClick: false };
    }

    const isFirstClick = !send.clickedAt;

    // Create event record
    await prisma.emailEvent.create({
      data: {
        sendId: send.id,
        eventType: EmailEventType.CLICKED,
        metadata: {
          ipHash: metadata.ip ? hashIpAddress(metadata.ip) : null,
          userAgent: metadata.userAgent?.substring(0, 255) || null,
          url: originalUrl,
          linkId: metadata.linkId || null,
          isFirstClick,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Update send record
    const updateData: Record<string, unknown> = {};
    if (isFirstClick) {
      updateData.clickedAt = new Date();
    }
    // A click implies an open (user had to see the email)
    if (!send.openedAt) {
      updateData.openedAt = new Date();
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.emailSend.update({
        where: { id: send.id },
        data: updateData,
      });
    }

    // Update campaign counters
    const campaignUpdate: Record<string, unknown> = {
      clickCount: { increment: 1 },
    };
    if (isFirstClick) {
      campaignUpdate.uniqueClicks = { increment: 1 };
    }
    // If this click also counts as first open
    if (!send.openedAt) {
      campaignUpdate.openCount = { increment: 1 };
      campaignUpdate.uniqueOpens = { increment: 1 };
    }

    await prisma.emailCampaign.update({
      where: { id: send.campaignId },
      data: campaignUpdate,
    });

    return { success: true, isFirstClick };
  } catch (error) {
    console.error('[Tracking] Error recording click event:', error);
    return { success: false, isFirstClick: false };
  }
}

/**
 * Record a bounce event
 */
export async function recordBounceEvent(
  trackingId: string,
  bounceType: 'hard' | 'soft',
  errorMessage?: string
): Promise<{ success: boolean }> {
  try {
    const send = await prisma.emailSend.findUnique({
      where: { trackingId },
      select: { id: true, campaignId: true, userId: true },
    });

    if (!send) {
      console.warn(`[Tracking] Bounce event for unknown trackingId: ${trackingId}`);
      return { success: false };
    }

    // Create event record
    await prisma.emailEvent.create({
      data: {
        sendId: send.id,
        eventType: EmailEventType.BOUNCED,
        metadata: {
          bounceType,
          errorMessage: errorMessage?.substring(0, 500) || null,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Update send record
    await prisma.emailSend.update({
      where: { id: send.id },
      data: {
        status: 'BOUNCED',
        bouncedAt: new Date(),
        lastError: errorMessage?.substring(0, 255) || 'Bounce detected',
      },
    });

    // Update campaign counter
    await prisma.emailCampaign.update({
      where: { id: send.campaignId },
      data: {
        bounceCount: { increment: 1 },
      },
    });

    // Update email preference for hard bounces
    if (bounceType === 'hard') {
      await prisma.emailPreference.upsert({
        where: { userId: send.userId },
        create: {
          userId: send.userId,
          email: '', // Will be updated from user record
          bounceCount: 1,
          lastBounceAt: new Date(),
          isHardBounce: true,
        },
        update: {
          bounceCount: { increment: 1 },
          lastBounceAt: new Date(),
          isHardBounce: true,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[Tracking] Error recording bounce event:', error);
    return { success: false };
  }
}

// ==========================================
// Email Headers Generation
// ==========================================

/**
 * Generate RFC 8058 compliant unsubscribe headers
 */
export function generateUnsubscribeHeaders(unsubscribeToken: string): {
  'List-Unsubscribe': string;
  'List-Unsubscribe-Post': string;
} {
  const unsubscribeUrl = generateUnsubscribeUrl(unsubscribeToken);

  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/**
 * Generate all tracking-related email headers
 */
export function generateEmailHeaders(
  trackingId: string,
  unsubscribeToken: string
): Record<string, string> {
  return {
    ...generateUnsubscribeHeaders(unsubscribeToken),
    'X-Campaign-Tracking-Id': trackingId,
  };
}

// ==========================================
// URL Decoding
// ==========================================

/**
 * Decode a click tracking URL to get the original URL
 */
export function decodeTrackingUrl(encodedUrl: string): string | null {
  try {
    return Buffer.from(encodedUrl, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Validate a decoded URL is safe to redirect to
 */
export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Allow http and https only
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Block javascript: URLs that might be encoded
    if (url.toLowerCase().includes('javascript:')) {
      return false;
    }

    // Block data: URLs
    if (parsed.protocol === 'data:') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
