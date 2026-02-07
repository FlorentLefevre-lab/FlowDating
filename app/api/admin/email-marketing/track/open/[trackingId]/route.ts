// app/api/admin/email-marketing/track/open/[trackingId]/route.ts
// Public endpoint - No auth required (accessed from email clients)

import { NextRequest, NextResponse } from 'next/server';
import { TRACKING_PIXEL_GIF, recordOpenEvent } from '@/lib/email/tracking';

// Cache the pixel response for performance
const PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Content-Length': TRACKING_PIXEL_GIF.length.toString(),
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  // Prevent tracking pixel from being cached by proxies
  'X-Content-Type-Options': 'nosniff',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId: rawTrackingId } = await params;

  // Remove .gif extension if present
  const trackingId = rawTrackingId.replace(/\.gif$/i, '');

  if (!trackingId) {
    // Still return pixel to avoid broken images
    return new NextResponse(TRACKING_PIXEL_GIF, {
      status: 200,
      headers: PIXEL_HEADERS,
    });
  }

  // Record the open event asynchronously (don't block response)
  // We use waitUntil if available, otherwise fire-and-forget
  const metadata = {
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
  };

  // Fire and forget - don't delay the pixel response
  recordOpenEvent(trackingId, metadata).catch((error) => {
    console.error('[Track Open] Error recording event:', error);
  });

  // Always return the tracking pixel
  return new NextResponse(TRACKING_PIXEL_GIF, {
    status: 200,
    headers: PIXEL_HEADERS,
  });
}

// Also support HEAD requests (some email clients check first)
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: PIXEL_HEADERS,
  });
}

/**
 * Get client IP address from request headers
 * Handles various proxy headers
 */
function getClientIp(request: NextRequest): string | undefined {
  // Check common proxy headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback - may not be available in all environments
  return undefined;
}
