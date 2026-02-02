// src/lib/email.ts - Secure email service with Redis-backed token storage

import { createTransport, Transporter } from 'nodemailer';
import { getRedisClient } from './redis';
import crypto from 'crypto';

// Email validation regex (RFC 5322 compliant simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// SMTP Transporter with TLS configuration (lazy initialization for build compatibility)
let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    const port = parseInt(process.env.SMTP_PORT || '587');
    const useImplicitTLS = port === 465;

    _transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: useImplicitTLS, // true for 465 (implicit TLS), false for 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
    });
  }
  return _transporter;
}

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
      from: process.env.SMTP_FROM,
      to: normalizedEmail,
      subject: 'Reinitialisation de votre mot de passe - Flow Dating',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px; border-radius: 16px;">
          <div style="background: #ffffff; border-radius: 14px; overflow: hidden;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Flow Dating</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Securite de votre compte</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <span style="font-size: 50px;">🔐</span>
              </div>

              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; text-align: center;">Reinitialiser votre mot de passe</h2>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                Bonjour,
              </p>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Vous avez demande la reinitialisation de votre mot de passe sur <strong style="color: #7c3aed;">Flow Dating</strong>. Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe :
              </p>

              <div style="text-align: center; margin: 35px 0;">
                <a href="${resetUrl}"
                   style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);">
                  Reinitialiser mon mot de passe
                </a>
              </div>

              <div style="background: #faf5ff; border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #7c3aed;">
                <p style="margin: 0; color: #6b21a8; font-size: 14px;">
                  <strong>Ce lien expire dans 15 minutes.</strong><br>
                  Si vous n'avez pas fait cette demande, ignorez cet email. Votre compte reste securise.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
                Si le bouton ne fonctionne pas, copiez ce lien :<br>
                <a href="${resetUrl}" style="color: #7c3aed; word-break: break-all;">${resetUrl}</a>
              </p>
              <p style="color: #d1d5db; font-size: 11px; margin: 15px 0 0 0;">
                Flow Dating - L'amour au fil de l'eau
              </p>
            </div>

          </div>
        </div>
      `,
    };

    await getTransporter().sendMail(mailOptions);

    // Log success without exposing sensitive data
    console.log(`[Email] Password reset email sent to: ${sanitizeEmailForLog(normalizedEmail)}`);

    return { success: true, message: 'Email de reinitialisation envoye avec succes' };
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'Erreur lors de l\'envoi de l\'email. Veuillez reessayer.' };
  }
}

/**
 * Check if password reset token is valid (without consuming it)
 * - Hashes the received token and looks up in Redis
 * - Verifies email matches stored email
 * - Does NOT delete the token (use validatePasswordResetToken for that)
 */
export async function checkPasswordResetToken(email: string, token: string): Promise<boolean> {
  if (!email || !token) {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const hashedToken = hashToken(token);

  try {
    const redis = getRedisClient();
    const data = await redis.get(`password-reset:${hashedToken}`);

    if (!data) {
      return false;
    }

    const { email: storedEmail } = JSON.parse(data);

    // Verify email matches (case-insensitive)
    return storedEmail.toLowerCase() === normalizedEmail;
  } catch (error) {
    console.error('[Email] Error checking password reset token:', error instanceof Error ? error.message : 'Unknown error');
    return false;
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
      from: process.env.SMTP_FROM,
      to: normalizedEmail,
      subject: 'Confirmez votre adresse email - Flow Dating',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px; border-radius: 16px;">
          <div style="background: #ffffff; border-radius: 14px; overflow: hidden;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb7185 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Flow Dating</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Bienvenue dans l'aventure</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <span style="font-size: 50px;">💖</span>
              </div>

              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; text-align: center;">Confirmez votre email</h2>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                Bonjour,
              </p>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Merci de vous etre inscrit(e) sur <strong style="color: #ec4899;">Flow Dating</strong> ! Pour commencer a faire de belles rencontres, confirmez votre adresse email :
              </p>

              <div style="text-align: center; margin: 35px 0;">
                <a href="${verifyUrl}"
                   style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                  Confirmer mon email
                </a>
              </div>

              <div style="background: #fdf2f8; border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #ec4899;">
                <p style="margin: 0; color: #9d174d; font-size: 14px;">
                  <strong>Ce lien expire dans 24 heures.</strong><br>
                  Si vous n'avez pas cree de compte, ignorez simplement cet email.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
                Si le bouton ne fonctionne pas, copiez ce lien :<br>
                <a href="${verifyUrl}" style="color: #ec4899; word-break: break-all;">${verifyUrl}</a>
              </p>
              <p style="color: #d1d5db; font-size: 11px; margin: 15px 0 0 0;">
                Flow Dating - L'amour au fil de l'eau
              </p>
            </div>

          </div>
        </div>
      `,
    };

    await getTransporter().sendMail(mailOptions);

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
    await getTransporter().verify();
    console.log('[Email] SMTP connection verified');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// ==========================================
// Donation Notifications
// ==========================================

interface DonationNotificationData {
  donorName?: string;
  donorEmail?: string;
  amount: number;
  currency?: string;
  provider: 'stripe' | 'paypal' | 'lightning';
  message?: string;
  donationId: string;
}

/**
 * Send donation notification email to admins
 */
export async function sendDonationNotificationEmail(data: DonationNotificationData): Promise<EmailResult> {
  const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS?.split(',').map(e => e.trim()) || [];

  if (adminEmails.length === 0) {
    console.warn('[Email] No admin emails configured for donation notifications');
    return { success: false, error: 'Aucun email admin configure' };
  }

  const providerLabel = {
    stripe: 'Carte bancaire (Stripe)',
    paypal: 'PayPal',
    lightning: 'Bitcoin Lightning',
  }[data.provider];

  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: data.currency || 'EUR',
  }).format(data.amount);

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: adminEmails.join(', '),
      subject: `Nouveau don de ${formattedAmount} sur Flow Dating`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Nouveau don recu !</h1>
          </div>

          <div style="background: #fdf2f8; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">

              <div style="text-align: center; margin-bottom: 25px;">
                <span style="font-size: 48px;">💖</span>
                <h2 style="color: #ec4899; margin: 10px 0;">${formattedAmount}</h2>
              </div>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3e8ff; color: #666;">Donateur</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3e8ff; text-align: right; font-weight: bold;">
                    ${data.donorName || 'Anonyme'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3e8ff; color: #666;">Email</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3e8ff; text-align: right;">
                    ${data.donorEmail || 'Non renseigne'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3e8ff; color: #666;">Methode</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3e8ff; text-align: right;">
                    ${providerLabel}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3e8ff; color: #666;">ID Don</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3e8ff; text-align: right; font-family: monospace; font-size: 12px;">
                    ${data.donationId}
                  </td>
                </tr>
              </table>

              ${data.message ? `
                <div style="margin-top: 20px; padding: 15px; background: #fdf2f8; border-radius: 8px; border-left: 4px solid #ec4899;">
                  <p style="margin: 0; color: #666; font-size: 12px;">Message du donateur :</p>
                  <p style="margin: 5px 0 0 0; color: #333;">"${data.message}"</p>
                </div>
              ` : ''}

              <div style="text-align: center; margin-top: 25px;">
                <a href="${process.env.NEXTAUTH_URL}/admin/donations"
                   style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">
                  Voir dans l'admin
                </a>
              </div>
            </div>

            <p style="text-align: center; color: #999; font-size: 11px; margin-top: 20px;">
              Email automatique - Flow Dating Admin
            </p>
          </div>
        </div>
      `,
    };

    await getTransporter().sendMail(mailOptions);
    console.log(`[Email] Donation notification sent for ${formattedAmount}`);
    return { success: true, message: 'Notification envoyee' };
  } catch (error) {
    console.error('[Email] Failed to send donation notification:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'Erreur lors de l\'envoi de la notification' };
  }
}

/**
 * Send thank you email to donor
 */
export async function sendDonationThankYouEmail(
  email: string,
  name: string | undefined,
  amount: number,
  currency: string = 'EUR'
): Promise<EmailResult> {
  if (!isValidEmail(email)) {
    return { success: false, error: 'Email invalide' };
  }

  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: `Merci pour votre don de ${formattedAmount} - Flow Dating`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Merci infiniment !</h1>
          </div>

          <div style="background: #fdf2f8; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 10px;">

              <p style="font-size: 16px; color: #333;">
                Bonjour${name ? ` ${name}` : ''} !
              </p>

              <p style="color: #666;">
                Nous avons bien recu votre don de <strong style="color: #ec4899;">${formattedAmount}</strong>.
              </p>

              <p style="color: #666;">
                Votre soutien est precieux et nous permet de continuer a developper Flow Dating
                en restant independants et focuses sur ce qui compte vraiment : vous aider a
                faire de vraies rencontres.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 64px;">💖</span>
              </div>

              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Avantages donateurs :</strong><br>
                  Un badge special sera bientot ajoute a votre profil pour vous remercier !
                </p>
              </div>

              <p style="color: #666;">
                L'equipe Flow Dating
              </p>
            </div>

            <p style="text-align: center; color: #999; font-size: 11px; margin-top: 20px;">
              Cet email a ete envoye automatiquement. Ne repondez pas a ce message.
            </p>
          </div>
        </div>
      `,
    };

    await getTransporter().sendMail(mailOptions);
    console.log(`[Email] Thank you email sent to donor: ${sanitizeEmailForLog(email)}`);
    return { success: true, message: 'Email de remerciement envoye' };
  } catch (error) {
    console.error('[Email] Failed to send thank you email:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'Erreur lors de l\'envoi du remerciement' };
  }
}
