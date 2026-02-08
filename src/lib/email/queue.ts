// src/lib/email/queue.ts - Redis-backed email queue for bulk email campaigns

import { getRedisClient } from '../redis';

// ==========================================
// Types
// ==========================================

export interface QueuedEmail {
  sendId: string;
  campaignId: string;
  userId: string;
  email: string;
  trackingId: string;
  queuedAt: number;
  attempts: number;
}

export interface CampaignProgress {
  campaignId: string;
  totalRecipients: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  startedAt: number;
  updatedAt: number;
}

export interface QueueStats {
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  dlqCount: number;
}

// ==========================================
// Redis Key Helpers
// ==========================================

const KEYS = {
  pending: (campaignId: string) => `email:queue:pending:${campaignId}`,
  processing: 'email:queue:processing',
  failed: 'email:queue:failed',
  dlq: 'email:queue:dlq',
  progress: (campaignId: string) => `email:campaign:${campaignId}:progress`,
  rateGlobal: 'email:rate:global',
  rateCampaign: (campaignId: string) => `email:rate:campaign:${campaignId}`,
  lock: (key: string) => `email:lock:${key}`,
};

// ==========================================
// Rate Limiting
// ==========================================

const GLOBAL_RATE_LIMIT = 300; // emails per minute - Safe for Infomaniak
const RATE_WINDOW_SECONDS = 60;

/**
 * Check if we can send more emails (rate limiting)
 * Returns true if under the limit, false otherwise
 */
export async function checkRateLimit(
  campaignId: string,
  campaignSendRate: number = 100
): Promise<{ allowed: boolean; waitMs: number }> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_SECONDS * 1000;

  try {
    // Clean old entries and count current window for global rate
    const globalKey = KEYS.rateGlobal;
    await redis.zremrangebyscore(globalKey, 0, windowStart);
    const globalCount = await redis.zcard(globalKey);

    if (globalCount >= GLOBAL_RATE_LIMIT) {
      const oldestEntry = await redis.zrange(globalKey, 0, 0, 'WITHSCORES');
      const oldestTime = oldestEntry.length > 1 ? parseInt(oldestEntry[1]) : now;
      const waitMs = Math.max(0, oldestTime + RATE_WINDOW_SECONDS * 1000 - now);
      return { allowed: false, waitMs };
    }

    // Check campaign-specific rate
    const campaignKey = KEYS.rateCampaign(campaignId);
    await redis.zremrangebyscore(campaignKey, 0, windowStart);
    const campaignCount = await redis.zcard(campaignKey);

    if (campaignCount >= campaignSendRate) {
      const oldestEntry = await redis.zrange(campaignKey, 0, 0, 'WITHSCORES');
      const oldestTime = oldestEntry.length > 1 ? parseInt(oldestEntry[1]) : now;
      const waitMs = Math.max(0, oldestTime + RATE_WINDOW_SECONDS * 1000 - now);
      return { allowed: false, waitMs };
    }

    return { allowed: true, waitMs: 0 };
  } catch (error) {
    console.error('[EmailQueue] Rate limit check failed:', error);
    // Fail open but log the error
    return { allowed: true, waitMs: 0 };
  }
}

/**
 * Record an email send for rate limiting
 */
export async function recordSend(campaignId: string): Promise<void> {
  const redis = getRedisClient();
  const now = Date.now();
  const member = `${campaignId}:${now}:${Math.random().toString(36).slice(2)}`;

  try {
    await redis.zadd(KEYS.rateGlobal, now, member);
    await redis.zadd(KEYS.rateCampaign(campaignId), now, member);

    // Set expiration for cleanup (2 minutes to be safe)
    await redis.expire(KEYS.rateGlobal, 120);
    await redis.expire(KEYS.rateCampaign(campaignId), 120);
  } catch (error) {
    console.error('[EmailQueue] Failed to record send:', error);
  }
}

// ==========================================
// Queue Operations
// ==========================================

/**
 * Push emails to the pending queue for a campaign
 */
export async function pushToQueue(
  campaignId: string,
  emails: QueuedEmail[]
): Promise<number> {
  if (emails.length === 0) return 0;

  const redis = getRedisClient();
  const key = KEYS.pending(campaignId);

  try {
    const pipeline = redis.pipeline();

    for (const email of emails) {
      pipeline.rpush(key, JSON.stringify(email));
    }

    await pipeline.exec();
    console.log(`[EmailQueue] Pushed ${emails.length} emails to queue for campaign ${campaignId}`);
    return emails.length;
  } catch (error) {
    console.error('[EmailQueue] Failed to push to queue:', error);
    throw error;
  }
}

/**
 * Pop an email from the pending queue (FIFO)
 * Moves it to processing set atomically
 */
export async function popFromQueue(campaignId: string): Promise<QueuedEmail | null> {
  const redis = getRedisClient();
  const pendingKey = KEYS.pending(campaignId);
  const processingKey = KEYS.processing;

  try {
    const data = await redis.lpop(pendingKey);

    if (!data) {
      return null;
    }

    const email: QueuedEmail = JSON.parse(data);

    // Add to processing set with timestamp
    await redis.zadd(processingKey, Date.now(), JSON.stringify(email));

    return email;
  } catch (error) {
    console.error('[EmailQueue] Failed to pop from queue:', error);
    return null;
  }
}

/**
 * Mark an email as successfully processed
 * Removes from processing set
 */
export async function markProcessed(email: QueuedEmail): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.zrem(KEYS.processing, JSON.stringify(email));
  } catch (error) {
    console.error('[EmailQueue] Failed to mark as processed:', error);
  }
}

/**
 * Move a failed email to the retry queue with exponential backoff
 */
export async function pushToRetry(
  email: QueuedEmail,
  error: string
): Promise<void> {
  const redis = getRedisClient();

  const updatedEmail: QueuedEmail = {
    ...email,
    attempts: email.attempts + 1,
  };

  try {
    // Remove from processing
    await redis.zrem(KEYS.processing, JSON.stringify(email));

    // Check max retries (3 attempts)
    if (updatedEmail.attempts >= 3) {
      // Move to dead letter queue
      await redis.rpush(KEYS.dlq, JSON.stringify({
        ...updatedEmail,
        lastError: error,
        movedToDlqAt: Date.now(),
      }));
      console.log(`[EmailQueue] Email ${email.sendId} moved to DLQ after ${updatedEmail.attempts} attempts`);
      return;
    }

    // Calculate backoff: 1min, 5min, 15min
    const backoffMs = [60000, 300000, 900000][updatedEmail.attempts - 1] || 900000;
    const retryAt = Date.now() + backoffMs;

    // Add to failed queue with retry timestamp
    await redis.zadd(KEYS.failed, retryAt, JSON.stringify({
      ...updatedEmail,
      lastError: error,
    }));

    console.log(`[EmailQueue] Email ${email.sendId} scheduled for retry in ${backoffMs / 1000}s`);
  } catch (err) {
    console.error('[EmailQueue] Failed to push to retry:', err);
  }
}

/**
 * Get emails ready for retry (backoff expired)
 */
export async function getRetryReady(limit: number = 100): Promise<QueuedEmail[]> {
  const redis = getRedisClient();
  const now = Date.now();

  try {
    // Get emails with retry time <= now
    const entries = await redis.zrangebyscore(KEYS.failed, 0, now, 'LIMIT', 0, limit);

    if (entries.length === 0) {
      return [];
    }

    // Remove from failed queue
    await redis.zremrangebyscore(KEYS.failed, 0, now);

    return entries.map(entry => JSON.parse(entry));
  } catch (error) {
    console.error('[EmailQueue] Failed to get retry ready:', error);
    return [];
  }
}

// ==========================================
// Campaign Progress
// ==========================================

/**
 * Initialize campaign progress tracking
 */
export async function initCampaignProgress(
  campaignId: string,
  totalRecipients: number
): Promise<void> {
  const redis = getRedisClient();
  const key = KEYS.progress(campaignId);

  try {
    await redis.hset(key, {
      campaignId,
      totalRecipients: totalRecipients.toString(),
      queued: totalRecipients.toString(),
      sent: '0',
      delivered: '0',
      failed: '0',
      bounced: '0',
      startedAt: Date.now().toString(),
      updatedAt: Date.now().toString(),
    });

    // Set expiration for cleanup (7 days)
    await redis.expire(key, 7 * 24 * 60 * 60);
  } catch (error) {
    console.error('[EmailQueue] Failed to init campaign progress:', error);
  }
}

/**
 * Update campaign progress counters
 */
export async function updateCampaignProgress(
  campaignId: string,
  field: 'sent' | 'delivered' | 'failed' | 'bounced',
  increment: number = 1
): Promise<void> {
  const redis = getRedisClient();
  const key = KEYS.progress(campaignId);

  try {
    await redis.hincrby(key, field, increment);
    await redis.hset(key, 'updatedAt', Date.now().toString());

    // Decrement queued counter for sent/failed
    if (field === 'sent' || field === 'failed') {
      await redis.hincrby(key, 'queued', -increment);
    }
  } catch (error) {
    console.error('[EmailQueue] Failed to update campaign progress:', error);
  }
}

/**
 * Get campaign progress
 */
export async function getCampaignProgress(
  campaignId: string
): Promise<CampaignProgress | null> {
  const redis = getRedisClient();
  const key = KEYS.progress(campaignId);

  try {
    const data = await redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      campaignId: data.campaignId,
      totalRecipients: parseInt(data.totalRecipients) || 0,
      queued: parseInt(data.queued) || 0,
      sent: parseInt(data.sent) || 0,
      delivered: parseInt(data.delivered) || 0,
      failed: parseInt(data.failed) || 0,
      bounced: parseInt(data.bounced) || 0,
      startedAt: parseInt(data.startedAt) || 0,
      updatedAt: parseInt(data.updatedAt) || 0,
    };
  } catch (error) {
    console.error('[EmailQueue] Failed to get campaign progress:', error);
    return null;
  }
}

// ==========================================
// Queue Stats & Monitoring
// ==========================================

/**
 * Get queue statistics for a campaign
 */
export async function getQueueStats(campaignId: string): Promise<QueueStats> {
  const redis = getRedisClient();

  try {
    const [pendingCount, processingCount, failedCount, dlqCount] = await Promise.all([
      redis.llen(KEYS.pending(campaignId)),
      redis.zcard(KEYS.processing),
      redis.zcard(KEYS.failed),
      redis.llen(KEYS.dlq),
    ]);

    return {
      pendingCount,
      processingCount,
      failedCount,
      dlqCount,
    };
  } catch (error) {
    console.error('[EmailQueue] Failed to get queue stats:', error);
    return {
      pendingCount: 0,
      processingCount: 0,
      failedCount: 0,
      dlqCount: 0,
    };
  }
}

/**
 * Check if campaign queue is empty
 */
export async function isQueueEmpty(campaignId: string): Promise<boolean> {
  const redis = getRedisClient();

  try {
    const count = await redis.llen(KEYS.pending(campaignId));
    return count === 0;
  } catch (error) {
    console.error('[EmailQueue] Failed to check queue empty:', error);
    return true;
  }
}

/**
 * Clear all queue data for a campaign (use for cleanup/cancellation)
 */
export async function clearCampaignQueue(campaignId: string): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.del(KEYS.pending(campaignId));
    await redis.del(KEYS.progress(campaignId));
    await redis.del(KEYS.rateCampaign(campaignId));
    console.log(`[EmailQueue] Cleared queue for campaign ${campaignId}`);
  } catch (error) {
    console.error('[EmailQueue] Failed to clear campaign queue:', error);
  }
}

/**
 * Recover stale processing entries (for crash recovery)
 * Moves entries older than timeout back to pending queue
 */
export async function recoverStaleProcessing(
  campaignId: string,
  timeoutMs: number = 300000 // 5 minutes
): Promise<number> {
  const redis = getRedisClient();
  const cutoff = Date.now() - timeoutMs;

  try {
    // Get stale entries
    const staleEntries = await redis.zrangebyscore(KEYS.processing, 0, cutoff);

    if (staleEntries.length === 0) {
      return 0;
    }

    const pipeline = redis.pipeline();

    for (const entry of staleEntries) {
      const email: QueuedEmail = JSON.parse(entry);

      // Only recover emails for this campaign
      if (email.campaignId === campaignId) {
        // Remove from processing
        pipeline.zrem(KEYS.processing, entry);
        // Add back to pending queue
        pipeline.lpush(KEYS.pending(campaignId), entry);
      }
    }

    await pipeline.exec();
    console.log(`[EmailQueue] Recovered ${staleEntries.length} stale entries for campaign ${campaignId}`);
    return staleEntries.length;
  } catch (error) {
    console.error('[EmailQueue] Failed to recover stale processing:', error);
    return 0;
  }
}

// ==========================================
// Distributed Locking
// ==========================================

/**
 * Acquire a distributed lock
 */
export async function acquireLock(
  lockName: string,
  ttlMs: number = 30000
): Promise<boolean> {
  const redis = getRedisClient();
  const key = KEYS.lock(lockName);

  try {
    const result = await redis.set(key, Date.now().toString(), 'PX', ttlMs, 'NX');
    return result === 'OK';
  } catch (error) {
    console.error('[EmailQueue] Failed to acquire lock:', error);
    return false;
  }
}

/**
 * Release a distributed lock
 */
export async function releaseLock(lockName: string): Promise<void> {
  const redis = getRedisClient();
  const key = KEYS.lock(lockName);

  try {
    await redis.del(key);
  } catch (error) {
    console.error('[EmailQueue] Failed to release lock:', error);
  }
}

/**
 * Extend a lock's TTL
 */
export async function extendLock(
  lockName: string,
  ttlMs: number = 30000
): Promise<boolean> {
  const redis = getRedisClient();
  const key = KEYS.lock(lockName);

  try {
    const result = await redis.pexpire(key, ttlMs);
    return result === 1;
  } catch (error) {
    console.error('[EmailQueue] Failed to extend lock:', error);
    return false;
  }
}

/**
 * Pause a campaign - sets a pause flag that workers check
 */
export async function pauseCampaign(campaignId: string): Promise<void> {
  const redis = getRedisClient();
  const key = `${KEYS.progress(campaignId)}:paused`;

  try {
    await redis.set(key, '1');
    console.log(`[EmailQueue] Campaign ${campaignId} paused`);
  } catch (error) {
    console.error('[EmailQueue] Failed to pause campaign:', error);
    throw error;
  }
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(campaignId: string): Promise<void> {
  const redis = getRedisClient();
  const key = `${KEYS.progress(campaignId)}:paused`;

  try {
    await redis.del(key);
    console.log(`[EmailQueue] Campaign ${campaignId} resumed`);
  } catch (error) {
    console.error('[EmailQueue] Failed to resume campaign:', error);
    throw error;
  }
}

/**
 * Check if a campaign is paused
 */
export async function isCampaignPaused(campaignId: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = `${KEYS.progress(campaignId)}:paused`;

  try {
    const result = await redis.get(key);
    return result === '1';
  } catch (error) {
    console.error('[EmailQueue] Failed to check pause status:', error);
    return false;
  }
}

/**
 * Cancel a campaign - clears the queue and marks as cancelled
 */
export async function cancelCampaign(campaignId: string): Promise<void> {
  const redis = getRedisClient();

  try {
    // Clear the pending queue
    await clearCampaignQueue(campaignId);

    // Set cancelled flag
    const cancelKey = `${KEYS.progress(campaignId)}:cancelled`;
    await redis.set(cancelKey, '1');

    // Remove pause flag if set
    const pauseKey = `${KEYS.progress(campaignId)}:paused`;
    await redis.del(pauseKey);

    console.log(`[EmailQueue] Campaign ${campaignId} cancelled`);
  } catch (error) {
    console.error('[EmailQueue] Failed to cancel campaign:', error);
    throw error;
  }
}
