/**
 * Authorization Middleware for API Routes
 *
 * Provides authentication and ownership verification for all protected routes.
 * Prevents IDOR (Insecure Direct Object Reference) vulnerabilities.
 */

import { getServerSession, Session } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Extended session type with user ID
export interface AuthSession extends Session {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

// Resource types for ownership checks
export type ResourceType = 'user' | 'profile' | 'photo' | 'match' | 'message' | 'like' | 'preferences';

// Context passed to authenticated handlers
export interface AuthContext {
  session: AuthSession;
  userId: string;
}

// Context passed to ownership-verified handlers
export interface OwnershipContext extends AuthContext {
  resourceId: string;
}

// Context for match participant verification
export interface MatchContext extends AuthContext {
  matchId: string;
  otherUserId: string;
}

// Type for route handler functions
type AuthenticatedHandler<T = AuthContext> = (
  req: NextRequest,
  context: T
) => Promise<NextResponse>;

// Type for route handler with Next.js params
type AuthenticatedHandlerWithParams<T = AuthContext> = (
  req: NextRequest,
  context: T,
  params: Record<string, string>
) => Promise<NextResponse>;

/**
 * Log unauthorized access attempts for security monitoring
 */
function logUnauthorizedAccess(
  action: string,
  userId: string | null,
  resourceType: string,
  resourceId: string,
  reason: string
): void {
  console.warn(`[SECURITY] Unauthorized access attempt:`, {
    timestamp: new Date().toISOString(),
    action,
    userId,
    resourceType,
    resourceId,
    reason,
  });
}

/**
 * Middleware that ensures the user is authenticated
 * Returns 401 if not authenticated
 */
export function withAuth(handler: AuthenticatedHandler): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        logUnauthorizedAccess('access', null, 'unknown', 'N/A', 'No valid session');
        return NextResponse.json(
          { error: 'Non authentifie' },
          { status: 401 }
        );
      }

      // Check if account is active
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { accountStatus: true }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Utilisateur non trouve' },
          { status: 404 }
        );
      }

      if (user.accountStatus === 'BANNED') {
        return NextResponse.json(
          { error: 'Compte banni' },
          { status: 403 }
        );
      }

      if (user.accountStatus === 'DELETED') {
        return NextResponse.json(
          { error: 'Compte supprime' },
          { status: 403 }
        );
      }

      const authContext: AuthContext = {
        session: session as AuthSession,
        userId: session.user.id,
      };

      return handler(req, authContext);
    } catch (error) {
      console.error('[AUTH] Error in withAuth middleware:', error);
      return NextResponse.json(
        { error: 'Erreur d\'authentification' },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper function to extract resource ID from various sources
 */
export function getResourceIdFromPath(req: NextRequest, paramName: string = 'id'): string | null {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');

  // Try to find the ID after the param name in common API patterns
  // e.g., /api/users/[userId]/stats -> extract userId
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === paramName || pathParts[i].includes('[')) {
      if (i + 1 < pathParts.length && pathParts[i + 1]) {
        return pathParts[i + 1];
      }
    }
  }

  // For patterns like /api/users/{id} or /api/profile/photos/{photoId}
  // Return the last non-empty segment that looks like an ID
  const lastSegment = pathParts.filter(p => p && !p.startsWith('[') && p !== 'api').pop();
  return lastSegment || null;
}

/**
 * Check if a user owns a specific resource
 */
async function checkOwnership(
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean> {
  try {
    switch (resourceType) {
      case 'user':
      case 'profile':
        // User can only access their own user/profile data
        return userId === resourceId;

      case 'photo':
        const photo = await prisma.photo.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return photo?.userId === userId;

      case 'preferences':
        const preferences = await prisma.userPreferences.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return preferences?.userId === userId;

      case 'like':
        const like = await prisma.like.findUnique({
          where: { id: resourceId },
          select: { senderId: true }
        });
        return like?.senderId === userId;

      case 'message':
        // Messages can be accessed by sender OR receiver
        // Note: Adjust based on your Message model
        return false; // Implement when Message model is available

      case 'match':
        // Check if user is part of the match via reciprocal likes
        const reciprocalLikes = await prisma.like.findMany({
          where: {
            OR: [
              { senderId: userId, receiverId: resourceId },
              { senderId: resourceId, receiverId: userId }
            ]
          }
        });
        return reciprocalLikes.length === 2;

      default:
        console.warn(`[AUTH] Unknown resource type: ${resourceType}`);
        return false;
    }
  } catch (error) {
    console.error(`[AUTH] Error checking ownership for ${resourceType}:`, error);
    return false;
  }
}

/**
 * Middleware that ensures the user owns the resource they're accessing
 * Returns 403 if user doesn't own the resource
 */
export function withOwnership(
  handler: AuthenticatedHandler<OwnershipContext>,
  resourceType: ResourceType,
  getResourceId: (req: NextRequest) => string | null
): (req: NextRequest) => Promise<NextResponse> {
  return withAuth(async (req: NextRequest, authContext: AuthContext) => {
    const resourceId = getResourceId(req);

    if (!resourceId) {
      return NextResponse.json(
        { error: 'ID de ressource requis' },
        { status: 400 }
      );
    }

    const isOwner = await checkOwnership(authContext.userId, resourceType, resourceId);

    if (!isOwner) {
      logUnauthorizedAccess(
        'ownership',
        authContext.userId,
        resourceType,
        resourceId,
        'User does not own resource'
      );
      return NextResponse.json(
        { error: 'Acces refuse' },
        { status: 403 }
      );
    }

    const ownershipContext: OwnershipContext = {
      ...authContext,
      resourceId,
    };

    return handler(req, ownershipContext);
  });
}

/**
 * Middleware that ensures the user is a participant in a match
 * Verifies reciprocal likes exist between current user and target user
 */
export function withMatchParticipant(
  handler: AuthenticatedHandler<MatchContext>,
  getTargetUserId: (req: NextRequest) => string | null
): (req: NextRequest) => Promise<NextResponse> {
  return withAuth(async (req: NextRequest, authContext: AuthContext) => {
    const targetUserId = getTargetUserId(req);

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'ID utilisateur cible requis' },
        { status: 400 }
      );
    }

    // Verify reciprocal likes exist (= valid match)
    const reciprocalLikes = await prisma.like.findMany({
      where: {
        OR: [
          { senderId: authContext.userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: authContext.userId }
        ]
      }
    });

    const hasMatch = reciprocalLikes.length === 2;

    if (!hasMatch) {
      logUnauthorizedAccess(
        'match_access',
        authContext.userId,
        'match',
        targetUserId,
        'No valid match exists'
      );
      return NextResponse.json(
        { error: 'Match non valide' },
        { status: 403 }
      );
    }

    const matchContext: MatchContext = {
      ...authContext,
      matchId: `match-${[authContext.userId, targetUserId].sort().join('-')}`,
      otherUserId: targetUserId,
    };

    return handler(req, matchContext);
  });
}

/**
 * Middleware that ensures the user owns the photo they're accessing
 */
export function withPhotoOwner(
  handler: AuthenticatedHandler<OwnershipContext>
): (req: NextRequest, params: { params: Promise<{ photoId: string }> }) => Promise<NextResponse> {
  return async (req: NextRequest, { params }: { params: Promise<{ photoId: string }> }) => {
    const { photoId } = await params;

    return withOwnership(
      handler,
      'photo',
      () => photoId
    )(req);
  };
}

/**
 * Middleware that ensures the user can only access their own stats/activity
 */
export function withSelfOnly(
  handler: AuthenticatedHandler<OwnershipContext>
): (req: NextRequest, params: { params: Promise<{ userId: string }> }) => Promise<NextResponse> {
  return async (req: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
    const { userId: targetUserId } = await params;

    return withOwnership(
      handler,
      'user',
      () => targetUserId
    )(req);
  };
}

/**
 * Verify that the request body doesn't contain forbidden fields
 * Prevents users from modifying sensitive fields like userId, forceUserId, etc.
 */
export function sanitizeRequestBody<T extends Record<string, unknown>>(
  body: T,
  forbiddenFields: string[]
): T {
  const sanitized = { ...body };
  for (const field of forbiddenFields) {
    if (field in sanitized) {
      console.warn(`[SECURITY] Attempted to modify forbidden field: ${field}`);
      delete sanitized[field];
    }
  }
  return sanitized;
}

/**
 * List of fields that should never be accepted from client requests
 */
export const FORBIDDEN_BODY_FIELDS = [
  'forceUserId',
  'forceUserEmail',
  'userId', // When it should be derived from session
  'id', // When modifying the user's own resource
  'accountStatus',
  'suspensionReason',
  'suspendedAt',
  'suspendedUntil',
  'emailVerified',
  'hashedPassword',
  'primaryAuthMethod',
];

/**
 * Middleware wrapper for route handlers that need Next.js params
 * Use this for dynamic routes like [userId] or [photoId]
 */
export function withAuthAndParams<P extends Record<string, string>>(
  handler: (req: NextRequest, context: AuthContext, params: P) => Promise<NextResponse>
): (req: NextRequest, routeContext: { params: Promise<P> }) => Promise<NextResponse> {
  return async (req: NextRequest, { params }: { params: Promise<P> }) => {
    const resolvedParams = await params;

    return withAuth(async (req: NextRequest, authContext: AuthContext) => {
      return handler(req, authContext, resolvedParams);
    })(req);
  };
}
