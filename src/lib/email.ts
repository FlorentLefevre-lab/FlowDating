// src/lib/email.ts - Secure email service with Redis-backed token storage

import { createTransport, Transporter } from 'nodemailer';
import { getRedisClient } from './redis';
import crypto from 'crypto';

// Email validation regex (RFC 5322 compliant simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// SMTP Transporter with TLS configuration
const transporter: Transporter = createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: process.env.EMAIL_SERVER_PORT === '465', // TLS for port 465
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  tls: {
    // Verify certificates only in production
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
});

// ==========================================
// Security Helpers
// ==========================================

/**
 * Hash token before storage - never store tokens in plain text
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

/**
 * Sanitize email for logging (hide part of the address)
 */
function sanitizeEmailForLog(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  const hiddenLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  return `${hiddenLocal}@${domain}`;
}

// ==========================================
// Rate Limiting
// ==========================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check and enforce rate limit for email operations
 */
async function checkRateLimit(
  email: string,
  operation: 'reset' | 'verify',
  maxRequests: number = 3,
  windowSeconds: number = 3600
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const rateLimitKey = `email-rate:${operation}:${email.toLowerCase()}`;

  try {
    const count = await redis.incr(rateLimitKey);

    // Set expiration only on first request
    if (count === 1) {
      await redis.expire(rateLimitKey, windowSeconds);
    }

    const ttl = await redis.ttl(rateLimitKey);

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetInSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  } catch (error) {
    console.error('[Email] Rate limit check failed:', error);
    // Fail open but log the error - in production you might want to fail closed
    return { allowed: true, remaining: maxRequests, resetInSeconds: windowSeconds };
  }
}

// ==========================================
// Password Reset
// ==========================================

export interface EmailResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send password reset email with secure token
 * - Generates a cryptographically secure token
 * - Stores hashed token in Redis (never the plain token)
 * - Token expires in 15 minutes
 * - Rate limited to 3 requests per email per hour
 */
export async function sendPasswordResetEmail(email: string): Promise<EmailResult> {
  // Validate email format
  if (!isValidEmail(email)) {
    console.warn('[Email] Invalid email format attempted for password reset');
    return { success: false, error: 'Format email invalide' };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check rate limit
  const rateLimit = await checkRateLimit(normalizedEmail, 'reset', 3, 3600);
  if (!rateLimit.allowed) {
    console.warn(`[Email] Rate limit exceeded for password reset: ${sanitizeEmailForLog(normalizedEmail)}`);
    return {
      success: false,
      error: `Trop de demandes. Réessayez dans ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.`
    };
  }

  // Generate secure token
  const token = generateSecureToken();
  const hashedToken = hashToken(token);

  try {
    const redis = getRedisClient();

    // Store hashed token in Redis with 15 minute expiration
    await redis.setex(
      `password-reset:${hashedToken}`,
      15 * 60, // 15 minutes
      JSON.stringify({
        email: normalizedEmail,
        createdAt: Date.now()
      })
    );

    // Build reset URL - token is sent in URL, NOT the hash
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: 'Reinitialisation de votre mot de passe - LoveApp',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e91e63;">Reinitialisation de mot de passe</h2>

          <p>Bonjour,</p>

          <p>Vous avez demande la reinitialisation de votre mot de passe sur <strong>LoveApp</strong>.</p>

          <p>Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe :</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #e91e63; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reinitialiser mon mot de passe
            </a>
          </div>

          <p><strong>Ce lien expire dans 15 minutes.</strong></p>

          <p>Si vous n'avez pas demande cette reinitialisation, vous pouvez ignorer cet email. Votre compte reste securise.</p>

          <hr style="margin: 30px 0; border: 1px solid #eee;">

          <p style="color: #666; font-size: 12px;">
            Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </p>

          <p style="color: #999; font-size: 11px; margin-top: 20px;">
            Cet email a ete envoye automatiquement. Ne repondez pas a ce message.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Log success without exposing sensitive data
    console.log(`[Email] Password reset email sent to: ${sanitizeEmailForLog(normalizedEmail)}`);

    return { success: true, message: 'Email de reinitialisation envoye avec succes' };
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'Erreur lors de l\'envoi de l\'email. Veuillez reessayer.' };
  }
}

/**
 * Validate password reset token
 * - Hashes the received token and looks up in Redis
 * - Verifies email matches stored email
 * - Deletes token after successful validation (single-use)
 */
export async function validatePasswordResetToken(email: string, token: string): Promise<boolean> {
  if (!email || !token) {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const hashedToken = hashToken(token);

  try {
    const redis = getRedisClient();
    const data = await redis.get(`password-reset:${hashedToken}`);

    if (!data) {
      console.log(`[Email] Invalid or expired password reset token for: ${sanitizeEmailForLog(normalizedEmail)}`);
      return false;
    }

    const { email: storedEmail } = JSON.parse(data);

    // Verify email matches (case-insensitive)
    if (storedEmail.toLowerCase() !== normalizedEmail) {
      console.warn(`[Email] Email mismatch in password reset validation`);
      return false;
    }

    // Delete token after validation - single use only
    await redis.del(`password-reset:${hashedToken}`);

    console.log(`[Email] Password reset token validated and consumed for: ${sanitizeEmailForLog(normalizedEmail)}`);
    return true;
  } catch (error) {
    console.error('[Email] Error validating password reset token:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// ==========================================
// Email Verification
// ==========================================

/**
 * Send email verification with secure token
 * - Generates a cryptographically secure token
 * - Stores hashed token in Redis (never the plain token)
 * - Token expires in 24 hours
 * - Rate limited to 5 requests per email per hour
 */
export async function sendEmailVerification(email: string): Promise<EmailResult> {
  // Validate email format
  if (!isValidEmail(email)) {
    console.warn('[Email] Invalid email format attempted for verification');
    return { success: false, error: 'Format email invalide' };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check rate limit (5 per hour for verification)
  const rateLimit = await checkRateLimit(normalizedEmail, 'verify', 5, 3600);
  if (!rateLimit.allowed) {
    console.warn(`[Email] Rate limit exceeded for email verification: ${sanitizeEmailForLog(normalizedEmail)}`);
    return {
      success: false,
      error: `Trop de demandes. Reessayez dans ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.`
    };
  }

  // Generate secure token
  const token = generateSecureToken();
  const hashedToken = hashToken(token);

  try {
    const redis = getRedisClient();

    // Store hashed token in Redis with 24 hour expiration
    await redis.setex(
      `email-verify:${hashedToken}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify({
        email: normalizedEmail,
        createdAt: Date.now()
      })
    );

    // Build verification URL
    const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: 'Confirmez votre adresse email - LoveApp',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e91e63;">Bienvenue sur LoveApp !</h2>

          <p>Bonjour,</p>

          <p>Merci de vous etre inscrit(e) sur <strong>LoveApp</strong> !</p>

          <p>Pour commencer a utiliser votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}"
               style="background-color: #e91e63; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Confirmer mon email
            </a>
          </div>

          <p><strong>Ce lien expire dans 24 heures.</strong></p>

          <p>Si vous n'avez pas cree de compte sur LoveApp, vous pouvez ignorer cet email.</p>

          <hr style="margin: 30px 0; border: 1px solid #eee;">

          <p style="color: #666; font-size: 12px;">
            Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
            <a href="${verifyUrl}">${verifyUrl}</a>
          </p>

          <p style="color: #999; font-size: 11px; margin-top: 20px;">
            Cet email a ete envoye automatiquement. Ne repondez pas a ce message.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Log success without exposing sensitive data
    console.log(`[Email] Verification email sent to: ${sanitizeEmailForLog(normalizedEmail)}`);

    return { success: true, message: 'Email de verification envoye avec succes' };
  } catch (error) {
    console.error('[Email] Failed to send verification email:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'Erreur lors de l\'envoi de l\'email. Veuillez reessayer.' };
  }
}

/**
 * Validate email verification token
 * - Hashes the received token and looks up in Redis
 * - Verifies email matches stored email
 * - Deletes token after successful validation (single-use)
 */
export async function validateEmailVerificationToken(email: string, token: string): Promise<boolean> {
  if (!email || !token) {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const hashedToken = hashToken(token);

  try {
    const redis = getRedisClient();
    const data = await redis.get(`email-verify:${hashedToken}`);

    if (!data) {
      console.log(`[Email] Invalid or expired verification token for: ${sanitizeEmailForLog(normalizedEmail)}`);
      return false;
    }

    const { email: storedEmail } = JSON.parse(data);

    // Verify email matches (case-insensitive)
    if (storedEmail.toLowerCase() !== normalizedEmail) {
      console.warn(`[Email] Email mismatch in verification validation`);
      return false;
    }

    // Delete token after validation - single use only
    await redis.del(`email-verify:${hashedToken}`);

    console.log(`[Email] Email verification token validated and consumed for: ${sanitizeEmailForLog(normalizedEmail)}`);
    return true;
  } catch (error) {
    console.error('[Email] Error validating verification token:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// ==========================================
// Utility Exports
// ==========================================

/**
 * Check remaining rate limit for an email operation
 */
export async function getRateLimitStatus(
  email: string,
  operation: 'reset' | 'verify'
): Promise<{ remaining: number; resetInSeconds: number }> {
  const redis = getRedisClient();
  const rateLimitKey = `email-rate:${operation}:${email.toLowerCase()}`;
  const maxRequests = operation === 'reset' ? 3 : 5;

  try {
    const count = await redis.get(rateLimitKey);
    const ttl = await redis.ttl(rateLimitKey);

    return {
      remaining: Math.max(0, maxRequests - (parseInt(count || '0', 10))),
      resetInSeconds: ttl > 0 ? ttl : 3600,
    };
  } catch {
    return { remaining: maxRequests, resetInSeconds: 3600 };
  }
}

/**
 * Verify SMTP connection is working
 */
export async function verifySmtpConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('[Email] SMTP connection verified');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}
