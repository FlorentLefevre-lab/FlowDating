// src/lib/email/segments.ts - Segment query builder for email marketing

import { prisma } from '../db';
import { Prisma, AccountStatus, Gender, MaritalStatus } from '@prisma/client';

// ==========================================
// Types
// ==========================================

export type ConditionOperator = 'AND' | 'OR';

export type FieldOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'between'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isNull'
  | 'isNotNull'
  | 'olderThan'
  | 'newerThan';

export interface FieldCondition {
  field: string;
  operator: FieldOperator;
  value: unknown;
}

export interface GroupCondition {
  operator: ConditionOperator;
  conditions: (FieldCondition | GroupCondition)[];
}

export type SegmentCondition = FieldCondition | GroupCondition;

export interface SegmentConditions {
  operator: ConditionOperator;
  conditions: SegmentCondition[];
}

// ==========================================
// Field Definitions
// ==========================================

interface FieldDefinition {
  prismaPath: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';
  enumValues?: readonly string[];
  isRelation?: boolean;
  relationPath?: string;
}

const SEGMENTABLE_FIELDS: Record<string, FieldDefinition> = {
  // Demographics
  age: { prismaPath: 'age', type: 'number' },
  gender: { prismaPath: 'gender', type: 'enum', enumValues: Object.values(Gender) },
  region: { prismaPath: 'region', type: 'string' },
  department: { prismaPath: 'department', type: 'string' },
  location: { prismaPath: 'location', type: 'string' },
  postcode: { prismaPath: 'postcode', type: 'string' },

  // Account
  isPremium: { prismaPath: 'isPremium', type: 'boolean' },
  accountStatus: { prismaPath: 'accountStatus', type: 'enum', enumValues: Object.values(AccountStatus) },
  createdAt: { prismaPath: 'createdAt', type: 'date' },
  lastSeen: { prismaPath: 'lastSeen', type: 'date' },
  emailVerified: { prismaPath: 'emailVerified', type: 'date' },
  isOnline: { prismaPath: 'isOnline', type: 'boolean' },
  hasDonated: { prismaPath: 'hasDonated', type: 'boolean' },

  // Profile
  maritalStatus: { prismaPath: 'maritalStatus', type: 'enum', enumValues: Object.values(MaritalStatus) },
  interests: { prismaPath: 'interests', type: 'array' },
  languages: { prismaPath: 'languages', type: 'array' },
  zodiacSign: { prismaPath: 'zodiacSign', type: 'string' },
  religion: { prismaPath: 'religion', type: 'string' },
  ethnicity: { prismaPath: 'ethnicity', type: 'string' },

  // Lifestyle
  smoking: { prismaPath: 'smoking', type: 'string' },
  drinking: { prismaPath: 'drinking', type: 'string' },
  children: { prismaPath: 'children', type: 'string' },
  pets: { prismaPath: 'pets', type: 'string' },
  education: { prismaPath: 'education', type: 'string' },

  // Physical
  height: { prismaPath: 'height', type: 'number' },
  weight: { prismaPath: 'weight', type: 'number' },
  bodyType: { prismaPath: 'bodyType', type: 'string' },
  eyeColor: { prismaPath: 'eyeColor', type: 'string' },
  hairColor: { prismaPath: 'hairColor', type: 'string' },

  // Stats (via UserStats relation)
  totalMatches: { prismaPath: 'stats.totalMatches', type: 'number', isRelation: true, relationPath: 'stats' },
  totalLikesReceived: { prismaPath: 'stats.totalLikesReceived', type: 'number', isRelation: true, relationPath: 'stats' },
  totalLikesSent: { prismaPath: 'stats.totalLikesSent', type: 'number', isRelation: true, relationPath: 'stats' },
  totalProfileViews: { prismaPath: 'stats.totalProfileViews', type: 'number', isRelation: true, relationPath: 'stats' },
  totalMessages: { prismaPath: 'stats.totalMessages', type: 'number', isRelation: true, relationPath: 'stats' },
};

// ==========================================
// Duration Parsing
// ==========================================

/**
 * Parse duration string (e.g., "7d", "30d", "2h", "1w") to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhwm])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use format like "7d", "24h", "2w", "3m"`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    h: 60 * 60 * 1000,           // hours
    d: 24 * 60 * 60 * 1000,      // days
    w: 7 * 24 * 60 * 60 * 1000,  // weeks
    m: 30 * 24 * 60 * 60 * 1000, // months (approx 30 days)
  };

  return value * multipliers[unit];
}

// ==========================================
// Condition Builders
// ==========================================

/**
 * Build Prisma where clause for a single field condition
 */
function buildFieldCondition(condition: FieldCondition): Prisma.UserWhereInput {
  const fieldDef = SEGMENTABLE_FIELDS[condition.field];

  if (!fieldDef) {
    console.warn(`[Segments] Unknown field: ${condition.field}`);
    return {};
  }

  const { prismaPath, type, isRelation, relationPath } = fieldDef;
  const { operator, value } = condition;

  let prismaCondition: unknown;

  switch (operator) {
    case 'equals':
      prismaCondition = value;
      break;

    case 'notEquals':
      prismaCondition = { not: value };
      break;

    case 'greaterThan':
      prismaCondition = { gt: value };
      break;

    case 'lessThan':
      prismaCondition = { lt: value };
      break;

    case 'greaterThanOrEqual':
      prismaCondition = { gte: value };
      break;

    case 'lessThanOrEqual':
      prismaCondition = { lte: value };
      break;

    case 'between':
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error(`'between' operator requires array of 2 values for field ${condition.field}`);
      }
      prismaCondition = { gte: value[0], lte: value[1] };
      break;

    case 'in':
      if (!Array.isArray(value)) {
        throw new Error(`'in' operator requires array value for field ${condition.field}`);
      }
      prismaCondition = { in: value };
      break;

    case 'notIn':
      if (!Array.isArray(value)) {
        throw new Error(`'notIn' operator requires array value for field ${condition.field}`);
      }
      prismaCondition = { notIn: value };
      break;

    case 'contains':
      if (type === 'array') {
        // For array fields, use 'has' to check if array contains value
        prismaCondition = { has: value };
      } else {
        prismaCondition = { contains: value, mode: 'insensitive' };
      }
      break;

    case 'startsWith':
      prismaCondition = { startsWith: value as string, mode: 'insensitive' };
      break;

    case 'endsWith':
      prismaCondition = { endsWith: value as string, mode: 'insensitive' };
      break;

    case 'isNull':
      prismaCondition = null;
      break;

    case 'isNotNull':
      prismaCondition = { not: null };
      break;

    case 'olderThan':
      // For date fields: older than X duration means date < (now - duration)
      const olderThanMs = parseDuration(value as string);
      const olderThanDate = new Date(Date.now() - olderThanMs);
      prismaCondition = { lt: olderThanDate };
      break;

    case 'newerThan':
      // For date fields: newer than X duration means date > (now - duration)
      const newerThanMs = parseDuration(value as string);
      const newerThanDate = new Date(Date.now() - newerThanMs);
      prismaCondition = { gt: newerThanDate };
      break;

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }

  // Handle relation fields (e.g., stats.totalMatches)
  if (isRelation && relationPath) {
    const fieldName = prismaPath.split('.').pop()!;
    return {
      [relationPath]: {
        [fieldName]: prismaCondition,
      },
    };
  }

  // Direct field
  return { [prismaPath]: prismaCondition };
}

/**
 * Check if condition is a group condition
 */
function isGroupCondition(condition: SegmentCondition): condition is GroupCondition {
  return 'conditions' in condition && Array.isArray(condition.conditions);
}

/**
 * Build Prisma where clause from segment conditions (recursive)
 */
export function buildPrismaWhereClause(conditions: SegmentConditions): Prisma.UserWhereInput {
  const { operator, conditions: conditionList } = conditions;

  if (conditionList.length === 0) {
    return {};
  }

  const prismaConditions: Prisma.UserWhereInput[] = conditionList.map((condition) => {
    if (isGroupCondition(condition)) {
      // Recursively handle nested groups
      return buildPrismaWhereClause(condition);
    } else {
      // Handle field condition
      return buildFieldCondition(condition);
    }
  });

  // Combine with AND or OR
  if (operator === 'AND') {
    return { AND: prismaConditions };
  } else {
    return { OR: prismaConditions };
  }
}

// ==========================================
// Segment Query Execution
// ==========================================

/**
 * Count users matching segment conditions
 */
export async function countSegmentUsers(conditions: SegmentConditions): Promise<number> {
  try {
    const whereClause = buildPrismaWhereClause(conditions);

    // Add base filters: active accounts, verified email, marketing consent
    const fullWhere: Prisma.UserWhereInput = {
      AND: [
        whereClause,
        { accountStatus: 'ACTIVE' },
        { emailVerified: { not: null } },
      ],
    };

    const count = await prisma.user.count({ where: fullWhere });
    return count;
  } catch (error) {
    console.error('[Segments] Error counting segment users:', error);
    throw error;
  }
}

/**
 * Get user IDs and emails matching segment conditions
 * Used for campaign recipient generation
 */
export async function getSegmentUsers(
  conditions: SegmentConditions,
  options: {
    limit?: number;
    offset?: number;
    excludeUserIds?: string[];
  } = {}
): Promise<{ id: string; email: string; name: string | null }[]> {
  try {
    const whereClause = buildPrismaWhereClause(conditions);

    // Add base filters
    const baseFilters: Prisma.UserWhereInput[] = [
      whereClause,
      { accountStatus: 'ACTIVE' },
      { emailVerified: { not: null } },
    ];

    // Add exclusion if provided
    if (options.excludeUserIds && options.excludeUserIds.length > 0) {
      baseFilters.push({ id: { notIn: options.excludeUserIds } });
    }

    const fullWhere: Prisma.UserWhereInput = { AND: baseFilters };

    const users = await prisma.user.findMany({
      where: fullWhere,
      select: {
        id: true,
        email: true,
        name: true,
      },
      take: options.limit,
      skip: options.offset,
      orderBy: { createdAt: 'desc' },
    });

    return users;
  } catch (error) {
    console.error('[Segments] Error getting segment users:', error);
    throw error;
  }
}

/**
 * Get detailed user data for segment preview (admin UI)
 */
export async function previewSegmentUsers(
  conditions: SegmentConditions,
  limit: number = 10
): Promise<{
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    age: number | null;
    gender: Gender | null;
    region: string | null;
    isPremium: boolean;
    createdAt: Date;
    lastSeen: Date | null;
  }>;
  totalCount: number;
}> {
  try {
    const whereClause = buildPrismaWhereClause(conditions);

    const fullWhere: Prisma.UserWhereInput = {
      AND: [
        whereClause,
        { accountStatus: 'ACTIVE' },
        { emailVerified: { not: null } },
      ],
    };

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: fullWhere,
        select: {
          id: true,
          email: true,
          name: true,
          age: true,
          gender: true,
          region: true,
          isPremium: true,
          createdAt: true,
          lastSeen: true,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: fullWhere }),
    ]);

    return { users, totalCount };
  } catch (error) {
    console.error('[Segments] Error previewing segment users:', error);
    throw error;
  }
}

/**
 * Update cached count for a segment
 */
export async function updateSegmentCachedCount(segmentId: string): Promise<number> {
  try {
    const segment = await prisma.emailSegment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    const conditions = segment.conditions as SegmentConditions;
    const count = await countSegmentUsers(conditions);

    await prisma.emailSegment.update({
      where: { id: segmentId },
      data: {
        cachedCount: count,
        lastCountAt: new Date(),
      },
    });

    return count;
  } catch (error) {
    console.error('[Segments] Error updating segment cached count:', error);
    throw error;
  }
}

/**
 * Get users for a segment by ID
 */
export async function getSegmentUsersById(
  segmentId: string,
  options: {
    limit?: number;
    offset?: number;
    excludeUserIds?: string[];
  } = {}
): Promise<{ id: string; email: string; name: string | null }[]> {
  const segment = await prisma.emailSegment.findUnique({
    where: { id: segmentId },
  });

  if (!segment) {
    throw new Error(`Segment not found: ${segmentId}`);
  }

  const conditions = segment.conditions as SegmentConditions;
  return getSegmentUsers(conditions, options);
}

/**
 * Get users for a campaign (handles both include and exclude segments)
 */
export async function getCampaignRecipients(
  campaignId: string
): Promise<{ id: string; email: string; name: string | null }[]> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: {
      segment: true,
    },
  });

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  if (!campaign.segment) {
    throw new Error(`Campaign ${campaignId} has no segment assigned`);
  }

  // Get users to exclude (if exclude segment is set)
  let excludeUserIds: string[] = [];
  if (campaign.excludeSegmentId) {
    const excludeUsers = await getSegmentUsersById(campaign.excludeSegmentId);
    excludeUserIds = excludeUsers.map(u => u.id);
  }

  // Also exclude users who have already received this campaign
  const existingSends = await prisma.emailSend.findMany({
    where: { campaignId },
    select: { userId: true },
  });
  const existingUserIds = existingSends.map(s => s.userId);
  excludeUserIds = [...new Set([...excludeUserIds, ...existingUserIds])];

  // Get segment users
  const conditions = campaign.segment.conditions as SegmentConditions;
  return getSegmentUsers(conditions, { excludeUserIds });
}

// ==========================================
// Validation
// ==========================================

/**
 * Validate segment conditions structure
 */
export function validateSegmentConditions(conditions: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!conditions || typeof conditions !== 'object') {
    return { valid: false, errors: ['Conditions must be an object'] };
  }

  const cond = conditions as Record<string, unknown>;

  if (!cond.operator || !['AND', 'OR'].includes(cond.operator as string)) {
    errors.push('Root operator must be "AND" or "OR"');
  }

  if (!Array.isArray(cond.conditions)) {
    errors.push('Conditions must be an array');
    return { valid: false, errors };
  }

  // Validate each condition
  const validateCondition = (condition: unknown, path: string): void => {
    if (!condition || typeof condition !== 'object') {
      errors.push(`${path}: Condition must be an object`);
      return;
    }

    const c = condition as Record<string, unknown>;

    // Check if it's a group condition
    if ('conditions' in c) {
      if (!c.operator || !['AND', 'OR'].includes(c.operator as string)) {
        errors.push(`${path}: Group operator must be "AND" or "OR"`);
      }
      if (!Array.isArray(c.conditions)) {
        errors.push(`${path}: Nested conditions must be an array`);
      } else {
        c.conditions.forEach((nested, i) => {
          validateCondition(nested, `${path}.conditions[${i}]`);
        });
      }
    } else {
      // Field condition
      if (!c.field || typeof c.field !== 'string') {
        errors.push(`${path}: Field condition must have a "field" string`);
      } else if (!SEGMENTABLE_FIELDS[c.field]) {
        errors.push(`${path}: Unknown field "${c.field}"`);
      }

      if (!c.operator || typeof c.operator !== 'string') {
        errors.push(`${path}: Field condition must have an "operator" string`);
      }

      // Value validation depends on operator
      const op = c.operator as string;
      if (!['isNull', 'isNotNull'].includes(op) && c.value === undefined) {
        errors.push(`${path}: Field condition must have a "value" (except for isNull/isNotNull)`);
      }
    }
  };

  (cond.conditions as unknown[]).forEach((condition, i) => {
    validateCondition(condition, `conditions[${i}]`);
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Get available fields for segmentation (for UI)
 */
export function getSegmentableFields(): Array<{
  name: string;
  label: string;
  type: string;
  enumValues?: readonly string[];
  category: string;
}> {
  const categories: Record<string, string[]> = {
    'Demographics': ['age', 'gender', 'region', 'department', 'location', 'postcode'],
    'Account': ['isPremium', 'accountStatus', 'createdAt', 'lastSeen', 'emailVerified', 'isOnline', 'hasDonated'],
    'Profile': ['maritalStatus', 'interests', 'languages', 'zodiacSign', 'religion', 'ethnicity'],
    'Lifestyle': ['smoking', 'drinking', 'children', 'pets', 'education'],
    'Physical': ['height', 'weight', 'bodyType', 'eyeColor', 'hairColor'],
    'Engagement': ['totalMatches', 'totalLikesReceived', 'totalLikesSent', 'totalProfileViews', 'totalMessages'],
  };

  const labelMap: Record<string, string> = {
    age: 'Age',
    gender: 'Genre',
    region: 'Région',
    department: 'Département',
    location: 'Ville',
    postcode: 'Code postal',
    isPremium: 'Premium',
    accountStatus: 'Statut compte',
    createdAt: 'Date inscription',
    lastSeen: 'Dernière connexion',
    emailVerified: 'Email vérifié',
    isOnline: 'En ligne',
    hasDonated: 'Donateur',
    maritalStatus: 'Situation',
    interests: 'Centres d\'intérêt',
    languages: 'Langues',
    zodiacSign: 'Signe astro',
    religion: 'Religion',
    ethnicity: 'Origine',
    smoking: 'Tabac',
    drinking: 'Alcool',
    children: 'Enfants',
    pets: 'Animaux',
    education: 'Éducation',
    height: 'Taille (cm)',
    weight: 'Poids (kg)',
    bodyType: 'Morphologie',
    eyeColor: 'Yeux',
    hairColor: 'Cheveux',
    totalMatches: 'Total matchs',
    totalLikesReceived: 'Likes reçus',
    totalLikesSent: 'Likes envoyés',
    totalProfileViews: 'Vues profil',
    totalMessages: 'Messages',
  };

  const result: Array<{
    name: string;
    label: string;
    type: string;
    enumValues?: readonly string[];
    category: string;
  }> = [];

  for (const [category, fields] of Object.entries(categories)) {
    for (const fieldName of fields) {
      const fieldDef = SEGMENTABLE_FIELDS[fieldName];
      if (fieldDef) {
        result.push({
          name: fieldName,
          label: labelMap[fieldName] || fieldName,
          type: fieldDef.type,
          enumValues: fieldDef.enumValues,
          category,
        });
      }
    }
  }

  return result;
}

/**
 * Get available operators for a field type
 */
export function getOperatorsForFieldType(type: string): FieldOperator[] {
  const baseOperators: FieldOperator[] = ['equals', 'notEquals', 'isNull', 'isNotNull'];

  switch (type) {
    case 'string':
      return [...baseOperators, 'contains', 'startsWith', 'endsWith', 'in', 'notIn'];
    case 'number':
      return [...baseOperators, 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'between', 'in', 'notIn'];
    case 'boolean':
      return ['equals'];
    case 'date':
      return [...baseOperators, 'greaterThan', 'lessThan', 'between', 'olderThan', 'newerThan'];
    case 'enum':
      return ['equals', 'notEquals', 'in', 'notIn'];
    case 'array':
      return ['contains', 'isNull', 'isNotNull'];
    default:
      return baseOperators;
  }
}
