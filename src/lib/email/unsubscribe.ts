// src/lib/email/unsubscribe.ts - Email unsubscribe and preferences management (RGPD compliant)

import { prisma } from '../db';
import { EmailEventType } from '@prisma/client';

// ==========================================
// Types
// ==========================================

export interface EmailPreferenceData {
  userId: string;
  email: string;
  marketingConsent: boolean;
  consentGivenAt: Date | null;
  consentSource: string | null;
  unsubscribedAt: Date | null;
  unsubscribeReason: string | null;
}

export interface UnsubscribeResult {
  success: boolean;
  alreadyUnsubscribed?: boolean;
  error?: string;
}

export interface ConsentResult {
  success: boolean;
  error?: string;
}

// ==========================================
// Preference Lookup
// ==========================================

/**
 * Get email preferences by unsubscribe token
 */
export async function getPreferencesByToken(
  token: string
): Promise<EmailPreferenceData | null> {
  try {
    const preference = await prisma.emailPreference.findUnique({
      where: { unsubscribeToken: token },
      select: {
        userId: true,
        email: true,
        marketingConsent: true,
        consentGivenAt: true,
        consentSource: true,
        unsubscribedAt: true,
        unsubscribeReason: true,
      },
    });

    return preference;
  } catch (error) {
    console.error('[Unsubscribe] Error getting preferences by token:', error);
    return null;
  }
}

/**
 * Get email preferences by user ID
 */
export async function getPreferencesByUserId(
  userId: string
): Promise<EmailPreferenceData | null> {
  try {
    const preference = await prisma.emailPreference.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        marketingConsent: true,
        consentGivenAt: true,
        consentSource: true,
        unsubscribedAt: true,
        unsubscribeReason: true,
      },
    });

    return preference;
  } catch (error) {
    console.error('[Unsubscribe] Error getting preferences by userId:', error);
    return null;
  }
}

// ==========================================
// Unsubscribe Operations
// ==========================================

/**
 * Unsubscribe a user from marketing emails via token
 * This is the primary method used from unsubscribe links
 */
export async function unsubscribeByToken(
  token: string,
  reason?: string
): Promise<UnsubscribeResult> {
  try {
    const preference = await prisma.emailPreference.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!preference) {
      return { success: false, error: 'Token invalide ou expiré' };
    }

    if (preference.unsubscribedAt) {
      return { success: true, alreadyUnsubscribed: true };
    }

    await prisma.emailPreference.update({
      where: { unsubscribeToken: token },
      data: {
        marketingConsent: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason?.substring(0, 500) || null,
      },
    });

    console.log(`[Unsubscribe] User ${preference.userId} unsubscribed via token`);
    return { success: true };
  } catch (error) {
    console.error('[Unsubscribe] Error unsubscribing by token:', error);
    return { success: false, error: 'Erreur lors du désabonnement' };
  }
}

/**
 * Unsubscribe from a specific campaign (one-click unsubscribe via email header)
 */
export async function oneClickUnsubscribe(
  token: string
): Promise<UnsubscribeResult> {
  // One-click unsubscribe should work without any additional input
  return unsubscribeByToken(token, 'One-click unsubscribe');
}

/**
 * Unsubscribe and record event from a specific email send
 */
export async function unsubscribeFromSend(
  trackingId: string,
  reason?: string
): Promise<UnsubscribeResult> {
  try {
    const send = await prisma.emailSend.findUnique({
      where: { trackingId },
      select: {
        id: true,
        userId: true,
        campaignId: true,
      },
    });

    if (!send) {
      return { success: false, error: 'Email non trouvé' };
    }

    // Get or create email preference
    const user = await prisma.user.findUnique({
      where: { id: send.userId },
      select: { email: true },
    });

    if (!user) {
      return { success: false, error: 'Utilisateur non trouvé' };
    }

    // Update or create preference
    await prisma.emailPreference.upsert({
      where: { userId: send.userId },
      create: {
        userId: send.userId,
        email: user.email,
        marketingConsent: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason?.substring(0, 500) || null,
      },
      update: {
        marketingConsent: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason?.substring(0, 500) || null,
      },
    });

    // Record unsubscribe event
    await prisma.emailEvent.create({
      data: {
        sendId: send.id,
        eventType: EmailEventType.UNSUBSCRIBED,
        metadata: {
          reason: reason || null,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Update campaign counter
    await prisma.emailCampaign.update({
      where: { id: send.campaignId },
      data: {
        unsubscribeCount: { increment: 1 },
      },
    });

    console.log(`[Unsubscribe] User ${send.userId} unsubscribed from campaign ${send.campaignId}`);
    return { success: true };
  } catch (error) {
    console.error('[Unsubscribe] Error unsubscribing from send:', error);
    return { success: false, error: 'Erreur lors du désabonnement' };
  }
}

// ==========================================
// Consent Management
// ==========================================

/**
 * Record marketing consent (opt-in)
 * Required for RGPD compliance
 */
export async function recordConsent(
  userId: string,
  email: string,
  source: string
): Promise<ConsentResult> {
  try {
    await prisma.emailPreference.upsert({
      where: { userId },
      create: {
        userId,
        email,
        marketingConsent: true,
        consentGivenAt: new Date(),
        consentSource: source,
      },
      update: {
        email,
        marketingConsent: true,
        consentGivenAt: new Date(),
        consentSource: source,
        // Clear unsubscribe data if user re-subscribes
        unsubscribedAt: null,
        unsubscribeReason: null,
      },
    });

    console.log(`[Consent] User ${userId} gave marketing consent via ${source}`);
    return { success: true };
  } catch (error) {
    console.error('[Consent] Error recording consent:', error);
    return { success: false, error: 'Erreur lors de l\'enregistrement du consentement' };
  }
}

/**
 * Withdraw marketing consent (opt-out)
 */
export async function withdrawConsent(
  userId: string,
  reason?: string
): Promise<ConsentResult> {
  try {
    await prisma.emailPreference.upsert({
      where: { userId },
      create: {
        userId,
        email: '', // Will need to be updated
        marketingConsent: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason?.substring(0, 500) || 'User withdrew consent',
      },
      update: {
        marketingConsent: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason?.substring(0, 500) || 'User withdrew consent',
      },
    });

    console.log(`[Consent] User ${userId} withdrew marketing consent`);
    return { success: true };
  } catch (error) {
    console.error('[Consent] Error withdrawing consent:', error);
    return { success: false, error: 'Erreur lors du retrait du consentement' };
  }
}

// ==========================================
// Eligibility Checks
// ==========================================

/**
 * Check if a user is eligible to receive marketing emails
 * Used before sending campaigns
 */
export async function isEligibleForMarketing(userId: string): Promise<boolean> {
  try {
    const preference = await prisma.emailPreference.findUnique({
      where: { userId },
      select: {
        marketingConsent: true,
        unsubscribedAt: true,
        isHardBounce: true,
      },
    });

    // No preference record = not opted in (RGPD requires explicit consent)
    if (!preference) {
      return false;
    }

    // Check conditions
    if (!preference.marketingConsent) {
      return false;
    }

    if (preference.unsubscribedAt) {
      return false;
    }

    if (preference.isHardBounce) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Eligibility] Error checking marketing eligibility:', error);
    return false;
  }
}

/**
 * Batch check eligibility for multiple users
 * Returns user IDs that are eligible
 */
export async function filterEligibleUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  try {
    const preferences = await prisma.emailPreference.findMany({
      where: {
        userId: { in: userIds },
        marketingConsent: true,
        unsubscribedAt: null,
        isHardBounce: false,
      },
      select: { userId: true },
    });

    return preferences.map(p => p.userId);
  } catch (error) {
    console.error('[Eligibility] Error filtering eligible users:', error);
    return [];
  }
}

// ==========================================
// Token Management
// ==========================================

/**
 * Get unsubscribe token for a user, creating preference if needed
 */
export async function getOrCreateUnsubscribeToken(
  userId: string,
  email: string
): Promise<string> {
  try {
    const preference = await prisma.emailPreference.upsert({
      where: { userId },
      create: {
        userId,
        email,
        marketingConsent: false, // Default to no consent until explicitly given
      },
      update: {
        email, // Update email if changed
      },
      select: { unsubscribeToken: true },
    });

    return preference.unsubscribeToken;
  } catch (error) {
    console.error('[Token] Error getting unsubscribe token:', error);
    throw error;
  }
}

/**
 * Regenerate unsubscribe token (security measure)
 */
export async function regenerateUnsubscribeToken(userId: string): Promise<string> {
  try {
    // Generate new token (Prisma default will create new cuid)
    const result = await prisma.$executeRaw`
      UPDATE email_preferences
      SET unsubscribe_token = gen_random_uuid()::text
      WHERE user_id = ${userId}
    `;

    if (result === 0) {
      throw new Error('User not found');
    }

    const preference = await prisma.emailPreference.findUnique({
      where: { userId },
      select: { unsubscribeToken: true },
    });

    return preference!.unsubscribeToken;
  } catch (error) {
    console.error('[Token] Error regenerating unsubscribe token:', error);
    throw error;
  }
}

// ==========================================
// Cleanup and Maintenance
// ==========================================

/**
 * Sync email preferences with user table
 * Creates preferences for users who don't have them
 */
export async function syncEmailPreferences(): Promise<{
  created: number;
  updated: number;
}> {
  try {
    // Find users without email preferences
    const usersWithoutPrefs = await prisma.user.findMany({
      where: {
        accountStatus: 'ACTIVE',
        emailVerified: { not: null },
        // No preference exists
        NOT: {
          id: {
            in: await prisma.emailPreference
              .findMany({ select: { userId: true } })
              .then(prefs => prefs.map(p => p.userId)),
          },
        },
      },
      select: { id: true, email: true },
      take: 1000, // Process in batches
    });

    if (usersWithoutPrefs.length === 0) {
      return { created: 0, updated: 0 };
    }

    // Create preferences with consent = false (RGPD: no implicit consent)
    await prisma.emailPreference.createMany({
      data: usersWithoutPrefs.map(user => ({
        userId: user.id,
        email: user.email,
        marketingConsent: false,
      })),
      skipDuplicates: true,
    });

    console.log(`[Sync] Created ${usersWithoutPrefs.length} email preferences`);
    return { created: usersWithoutPrefs.length, updated: 0 };
  } catch (error) {
    console.error('[Sync] Error syncing email preferences:', error);
    throw error;
  }
}

/**
 * Get statistics about email preferences
 */
export async function getPreferenceStats(): Promise<{
  total: number;
  consented: number;
  unsubscribed: number;
  hardBounces: number;
}> {
  try {
    const [total, consented, unsubscribed, hardBounces] = await Promise.all([
      prisma.emailPreference.count(),
      prisma.emailPreference.count({
        where: { marketingConsent: true, unsubscribedAt: null, isHardBounce: false },
      }),
      prisma.emailPreference.count({
        where: { unsubscribedAt: { not: null } },
      }),
      prisma.emailPreference.count({
        where: { isHardBounce: true },
      }),
    ]);

    return { total, consented, unsubscribed, hardBounces };
  } catch (error) {
    console.error('[Stats] Error getting preference stats:', error);
    throw error;
  }
}
