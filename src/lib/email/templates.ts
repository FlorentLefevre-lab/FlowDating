// src/lib/email/templates.ts - Email template rendering with variable substitution

import { prisma } from '../db';

// ==========================================
// Types
// ==========================================

export interface TemplateVariables {
  firstName?: string;
  email?: string;
  age?: string;
  region?: string;
  isPremium?: boolean;
  totalMatches?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  trackingPixelUrl?: string;
  [key: string]: string | boolean | undefined;
}

export interface RenderedEmail {
  subject: string;
  htmlContent: string;
  textContent: string | null;
  previewText: string | null;
}

export interface UserVariables {
  userId: string;
  email: string;
  firstName?: string | null;
  age?: number | null;
  region?: string | null;
  isPremium: boolean;
  totalMatches: number;
}

// ==========================================
// Variable Regex Pattern
// ==========================================

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

// ==========================================
// Template Rendering
// ==========================================

/**
 * Render a template string with variables
 * Replaces {{variableName}} with actual values
 */
export function renderTemplateString(
  template: string,
  variables: TemplateVariables
): string {
  return template.replace(VARIABLE_PATTERN, (match, variableName) => {
    const value = variables[variableName];

    if (value === undefined || value === null) {
      // Return empty string for undefined variables
      return '';
    }

    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }

    return String(value);
  });
}

/**
 * Extract all variable names from a template string
 */
export function extractVariables(template: string): string[] {
  const matches = Array.from(template.matchAll(VARIABLE_PATTERN));
  const variables: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * Validate that all required variables are provided
 */
export function validateVariables(
  template: string,
  variables: TemplateVariables,
  requiredVariables: string[] = []
): { valid: boolean; missing: string[] } {
  const templateVars = extractVariables(template);
  const allRequiredSet = new Set([...templateVars, ...requiredVariables]);
  const allRequired = Array.from(allRequiredSet);

  const missing = allRequired.filter(v => {
    const value = variables[v];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ==========================================
// Email Content Processing
// ==========================================

/**
 * Add tracking pixel to HTML content
 */
export function addTrackingPixel(
  htmlContent: string,
  trackingPixelUrl: string
): string {
  const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`;

  // Add before closing body tag if exists
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${trackingPixel}</body>`);
  }

  // Otherwise append at the end
  return htmlContent + trackingPixel;
}

/**
 * Rewrite links for click tracking
 * Replaces href URLs with tracking URLs
 */
export function rewriteLinksForTracking(
  htmlContent: string,
  trackingBaseUrl: string,
  trackingId: string
): string {
  // Match href attributes with URLs
  const hrefPattern = /href="(https?:\/\/[^"]+)"/gi;
  let linkIndex = 0;

  return htmlContent.replace(hrefPattern, (match, url) => {
    // Skip unsubscribe links (should not be tracked for compliance)
    if (url.includes('unsubscribe') || url.includes('preferences')) {
      return match;
    }

    const encodedUrl = Buffer.from(url).toString('base64url');
    const trackingUrl = `${trackingBaseUrl}/${trackingId}?url=${encodedUrl}&link=${linkIndex++}`;
    return `href="${trackingUrl}"`;
  });
}

/**
 * Add required email headers content (unsubscribe link)
 */
export function addUnsubscribeFooter(
  htmlContent: string,
  unsubscribeUrl: string
): string {
  const footer = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
      <p style="margin: 0;">
        Vous recevez cet email car vous etes inscrit(e) sur Flow Dating.
        <br />
        <a href="${unsubscribeUrl}" style="color: #7c3aed; text-decoration: underline;">Se desabonner</a>
      </p>
    </div>
  `;

  // Add before closing body tag if exists
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${footer}</body>`);
  }

  // Add before closing div or append
  if (htmlContent.includes('</div>')) {
    const lastDivIndex = htmlContent.lastIndexOf('</div>');
    return htmlContent.slice(0, lastDivIndex) + footer + htmlContent.slice(lastDivIndex);
  }

  return htmlContent + footer;
}

// ==========================================
// Template Fetching & Rendering
// ==========================================

/**
 * Get a template by ID and render with variables
 */
export async function renderTemplate(
  templateId: string,
  variables: TemplateVariables
): Promise<RenderedEmail | null> {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.isActive) {
      console.error(`[Templates] Template not found or inactive: ${templateId}`);
      return null;
    }

    const subject = renderTemplateString(template.subject, variables);
    const htmlContent = renderTemplateString(template.htmlContent, variables);
    const textContent = template.textContent
      ? renderTemplateString(template.textContent, variables)
      : null;
    const previewText = template.previewText
      ? renderTemplateString(template.previewText, variables)
      : null;

    return {
      subject,
      htmlContent,
      textContent,
      previewText,
    };
  } catch (error) {
    console.error('[Templates] Failed to render template:', error);
    return null;
  }
}

/**
 * Render campaign content (either from template or direct content)
 */
export async function renderCampaignEmail(
  campaign: {
    templateId?: string | null;
    subject: string;
    htmlContent?: string | null;
    textContent?: string | null;
    previewText?: string | null;
  },
  variables: TemplateVariables,
  trackingConfig: {
    trackingId: string;
    trackingBaseUrl: string;
    trackingPixelUrl: string;
    unsubscribeUrl: string;
  }
): Promise<RenderedEmail | null> {
  let rendered: RenderedEmail;

  // Use template if specified, otherwise use direct content
  if (campaign.templateId) {
    const templateRendered = await renderTemplate(campaign.templateId, variables);
    if (!templateRendered) {
      return null;
    }
    rendered = templateRendered;
  } else if (campaign.htmlContent) {
    rendered = {
      subject: renderTemplateString(campaign.subject, variables),
      htmlContent: renderTemplateString(campaign.htmlContent, variables),
      textContent: campaign.textContent
        ? renderTemplateString(campaign.textContent, variables)
        : null,
      previewText: campaign.previewText
        ? renderTemplateString(campaign.previewText, variables)
        : null,
    };
  } else {
    console.error('[Templates] Campaign has no template or content');
    return null;
  }

  // Add tracking and unsubscribe
  let processedHtml = rendered.htmlContent;

  // Add unsubscribe footer
  processedHtml = addUnsubscribeFooter(processedHtml, trackingConfig.unsubscribeUrl);

  // Rewrite links for tracking
  processedHtml = rewriteLinksForTracking(
    processedHtml,
    trackingConfig.trackingBaseUrl,
    trackingConfig.trackingId
  );

  // Add tracking pixel
  processedHtml = addTrackingPixel(processedHtml, trackingConfig.trackingPixelUrl);

  return {
    ...rendered,
    htmlContent: processedHtml,
  };
}

// ==========================================
// User Variable Building
// ==========================================

/**
 * Build template variables from user data
 */
export function buildUserVariables(
  user: UserVariables,
  trackingConfig: {
    unsubscribeToken: string;
    baseUrl: string;
  }
): TemplateVariables {
  return {
    firstName: user.firstName || '',
    email: user.email,
    age: user.age?.toString() || '',
    region: user.region || '',
    isPremium: user.isPremium,
    totalMatches: user.totalMatches.toString(),
    unsubscribeUrl: `${trackingConfig.baseUrl}/api/admin/email-marketing/unsubscribe/${trackingConfig.unsubscribeToken}`,
    preferencesUrl: `${trackingConfig.baseUrl}/settings/notifications`,
  };
}

/**
 * Fetch user data for template variables
 */
export async function getUserVariables(userId: string): Promise<UserVariables | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        region: true,
        isPremium: true,
        stats: {
          select: {
            totalMatches: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Extract first name from full name
    const firstName = user.name?.split(' ')[0] || null;

    return {
      userId: user.id,
      email: user.email,
      firstName,
      age: user.age,
      region: user.region,
      isPremium: user.isPremium,
      totalMatches: user.stats?.totalMatches || 0,
    };
  } catch (error) {
    console.error('[Templates] Failed to fetch user variables:', error);
    return null;
  }
}

// ==========================================
// Template Preview
// ==========================================

/**
 * Generate a preview of a template with sample data
 */
export async function generateTemplatePreview(
  templateId: string,
  sampleVariables?: Partial<TemplateVariables>
): Promise<RenderedEmail | null> {
  const defaultVariables: TemplateVariables = {
    firstName: 'Marie',
    email: 'marie.example@email.com',
    age: '28',
    region: 'Ile-de-France',
    isPremium: false,
    totalMatches: '12',
    unsubscribeUrl: '#unsubscribe-preview',
    preferencesUrl: '#preferences-preview',
    ...sampleVariables,
  };

  return renderTemplate(templateId, defaultVariables);
}

/**
 * Generate preview HTML for a raw template content
 */
export function generateContentPreview(
  htmlContent: string,
  subject: string,
  sampleVariables?: Partial<TemplateVariables>
): RenderedEmail {
  const defaultVariables: TemplateVariables = {
    firstName: 'Marie',
    email: 'marie.example@email.com',
    age: '28',
    region: 'Ile-de-France',
    isPremium: false,
    totalMatches: '12',
    unsubscribeUrl: '#unsubscribe-preview',
    preferencesUrl: '#preferences-preview',
    ...sampleVariables,
  };

  return {
    subject: renderTemplateString(subject, defaultVariables),
    htmlContent: renderTemplateString(htmlContent, defaultVariables),
    textContent: null,
    previewText: null,
  };
}

// ==========================================
// Template Validation
// ==========================================

/**
 * Validate a template's HTML content
 * Checks for required elements and potential issues
 */
export function validateTemplateContent(htmlContent: string): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for basic structure
  if (!htmlContent.includes('<')) {
    errors.push('Le contenu ne semble pas etre du HTML valide');
  }

  // Check for unsubscribe variable
  if (!htmlContent.includes('{{unsubscribeUrl}}') && !htmlContent.includes('unsubscribe')) {
    warnings.push('Le template ne contient pas de lien de desabonnement ({{unsubscribeUrl}})');
  }

  // Check for personalization
  if (!htmlContent.includes('{{firstName}}') && !htmlContent.includes('{{email}}')) {
    warnings.push('Le template ne contient aucune variable de personnalisation');
  }

  // Check for potential issues with special characters
  if (htmlContent.includes('{{') && !VARIABLE_PATTERN.test(htmlContent)) {
    warnings.push('Des accolades {{ }} sont presentes mais ne correspondent pas au format de variable');
  }

  // Check for alt text on images
  const imgPattern = /<img[^>]+>/gi;
  const images = htmlContent.match(imgPattern) || [];
  for (const img of images) {
    if (!img.includes('alt=')) {
      warnings.push('Certaines images n\'ont pas d\'attribut alt');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

// ==========================================
// Default Templates
// ==========================================

/**
 * Get default template HTML wrapper
 * Can be used as a base for new templates
 */
export function getDefaultTemplateWrapper(): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px; border-radius: 16px;">
    <div style="background: #ffffff; border-radius: 14px; overflow: hidden;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb7185 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Flow Dating</h1>
      </div>

      <!-- Content -->
      <div style="padding: 40px 30px;">
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Bonjour {{firstName}},
        </p>

        <!-- YOUR CONTENT HERE -->

      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #d1d5db; font-size: 11px; margin: 0;">
          Flow Dating - L'amour au fil de l'eau
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Convert HTML to plain text (basic implementation)
 */
export function htmlToPlainText(html: string): string {
  return html
    // Remove style and script tags with content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Replace common block elements with newlines
    .replace(/<\/?(div|p|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
    // Replace links with text and URL
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '$2 ($1)')
    // Remove remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
