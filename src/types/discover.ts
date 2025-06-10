// src/types/discover.ts

// ================================
// TYPES DE BASE
// ================================

interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
  alt?: string;
}

interface BaseUser {
  id: string;
  name: string;
  email: string;
  age: number | null;
  bio: string | null;
  location: string | null;
  department?: string | null;
  region?: string | null;
  profession: string | null;
  gender: string | null;
  interests: string[];
  photos: Photo[];
}

// ================================
// TYPES POUR LA DÉCOUVERTE
// ================================

interface DiscoverUserProfile extends BaseUser {
  compatibilityScore: number;
  isOnline?: boolean;
  lastActive?: string;
  memberSince?: string;
}

interface DiscoverableUserData extends BaseUser {
  compatibility: number;
  memberSince: string;
}

// ================================
// TYPES POUR LES MATCHS
// ================================

interface MatchedUser extends BaseUser {}

interface UserMatch {
  id: string;
  user: MatchedUser;
  matchedAt: string;
  lastMessageAt?: string;
  lastMessage?: {
    content: string;
    senderId: string;
  };
  messageCount: number;
  isOnline?: boolean;
  compatibility?: number;
}

// ================================
// TYPES POUR LES ACTIONS
// ================================

type DiscoverAction = 'like' | 'dislike' | 'super_like' | 'pass';

interface DiscoverMatchResult {
  isMatch: boolean;
  matchUser?: {
    id: string;
    name: string;
    email?: string;
  };
}

interface DiscoverActionPayload {
  profileId: string;
  targetUserId: string;
  action: DiscoverAction;
}

interface DiscoverActionResult {
  success: boolean;
  action: DiscoverAction;
  isMatch?: boolean;
  targetUser?: {
    id: string;
    name: string;
    email?: string;
  };
  message: string;
  error?: string;
}

// ================================
// TYPES POUR LES STATISTIQUES
// ================================

interface DiscoverStatsData {
  totalUsers: number;
  excludedCount: number;
  discoverableCount: number;
  breakdown: {
    alreadyLiked: number;
    alreadyDisliked: number;
    alreadyMatched: number;
  };
  avgCompatibility: number;
}

interface MatchStatsData {
  totalMatches: number;
  newMatches: number;
  activeConversations: number;
  responseRate: number;
}

interface RecentActionStats {
  likes: number;
  dislikes: number;
  superLikes: number;
}

// ================================
// TYPES POUR LE DIAGNOSTIC AVANCÉ
// ================================

interface DiscoverDiagnosticData {
  totalProfiles: number;
  availableProfiles: number;
  cooldownProfiles: number;
  totalInteractions: number;
  cycleCount: number;
  nextAvailableIn: number; // en heures
  timeSinceLastReset: number; // en heures
  needsReset: boolean;
  needsMoreProfiles: boolean;
  recentStats: RecentActionStats;
}

interface DiscoverSuggestionData {
  needsReset: boolean;
  needsMoreProfiles: boolean;
  canSmartReset: boolean;
  canFullReset: boolean;
  message: string;
}

// ================================
// TYPES POUR LES MÉTADONNÉES
// ================================

interface DiscoverMetaData {
  timestamp: string;
  algorithm: string;
  cycle?: number;
  totalInteractions?: number;
  excludedReasons?: {
    matches: number;
    likes: number;
    dislikes: number;
  };
}

interface CurrentUserData {
  id: string;
  interests: string[];
  age?: number | null;
  location?: string | null;
}

// ================================
// TYPES POUR LES RÉPONSES API
// ================================

interface BaseDiscoverApiResponse {
  success: boolean;
  error?: string;
  meta: DiscoverMetaData;
}

interface DiscoverEndpointResponse extends BaseDiscoverApiResponse {
  users?: DiscoverUserProfile[];
  profiles?: DiscoverUserProfile[];
  stats?: DiscoverStatsData;
  diagnostic?: DiscoverDiagnosticData;
  suggestions?: DiscoverSuggestionData;
  currentUser: CurrentUserData;
  metadata?: DiscoverMetaData;
}

interface MatchesEndpointResponse extends BaseDiscoverApiResponse {
  matches: UserMatch[];
  stats: MatchStatsData;
  currentUser: CurrentUserData;
}

// ================================
// TYPES POUR LES HOOKS
// ================================

interface DiscoverHookStats {
  total: number;
  remaining: number;
  currentIndex: number;
}

interface DiscoverHookActions {
  like: () => Promise<DiscoverMatchResult>;
  dislike: () => Promise<void>;
  superLike?: () => Promise<DiscoverMatchResult>;
  skip: () => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

interface DiscoverHookReturn {
  // Données
  profiles: DiscoverUserProfile[];
  currentProfile: DiscoverUserProfile | null;
  nextProfile: DiscoverUserProfile | null;
  
  // États
  loading: boolean;
  error: string | null;
  
  // Statistiques
  stats: DiscoverHookStats;
  diagnostic?: DiscoverDiagnosticData;
  suggestions?: DiscoverSuggestionData;
  
  // Actions
  actions: DiscoverHookActions;
}

// ================================
// TYPES POUR LES PARAMÈTRES
// ================================

type DiscoverResetType = 'smart' | 'full';

interface DiscoverRequestParams {
  reset?: boolean;
  resetType?: DiscoverResetType;
  diagnostic?: boolean;
  limit?: number;
}

interface DiscoverFilterOptions {
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  gender?: string;
  interests?: string[];
}

// ================================
// TYPES POUR LES PRÉFÉRENCES
// ================================

interface DiscoverUserPreferences {
  showOnlineStatus: boolean;
  showCompatibilityScore: boolean;
  autoAdvance: boolean;
  soundEffects: boolean;
  vibration: boolean;
}

// ================================
// TYPES POUR LES ERREURS
// ================================

interface DiscoverErrorData {
  code: string;
  message: string;
  details?: any;
}

type DiscoverErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR' 
  | 'NO_PROFILES'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR';

// ================================
// TYPES POUR LES ÉVÉNEMENTS
// ================================

interface DiscoverProfileViewEvent {
  profileId: string;
  duration: number; // en secondes
  interacted: boolean;
}

interface DiscoverSwipeEvent {
  profileId: string;
  action: DiscoverAction;
  timestamp: string;
  compatibility: number;
}

interface DiscoverMatchEvent {
  matchId: string;
  userId: string;
  userName: string;
  timestamp: string;
}

// ================================
// TYPES POUR LA COMPATIBILITÉ
// ================================

interface DiscoverCompatibilityFactors {
  commonInterests: number;
  ageCompatibility: number;
  locationProximity: number;
  activityLevel: number;
}

interface DiscoverCompatibilityResult {
  score: number; // 0-100
  factors: DiscoverCompatibilityFactors;
  explanation: string;
}

// ================================
// EXPORTS
// ================================

export type {
  // Types principaux
  DiscoverUserProfile,
  DiscoverableUserData,
  UserMatch,
  MatchedUser,
  DiscoverMatchResult,
  DiscoverAction,
  
  // Types API
  DiscoverEndpointResponse,
  MatchesEndpointResponse,
  DiscoverActionResult,
  
  // Types Hook
  DiscoverHookReturn,
  DiscoverHookActions,
  DiscoverHookStats,
  
  // Types Diagnostic
  DiscoverDiagnosticData,
  DiscoverSuggestionData,
  DiscoverStatsData,
  MatchStatsData,
  
  // Types Utilitaires
  DiscoverResetType,
  DiscoverRequestParams,
  DiscoverFilterOptions,
  DiscoverUserPreferences,
  DiscoverErrorData,
  DiscoverErrorCode,
  
  // Types Événements
  DiscoverProfileViewEvent,
  DiscoverSwipeEvent,
  DiscoverMatchEvent,
  
  // Types Compatibilité
  DiscoverCompatibilityFactors,
  DiscoverCompatibilityResult,
  
  // Types Base
  Photo,
  BaseUser,
  CurrentUserData,
  DiscoverMetaData
};

// ================================
// CONSTANTES ET ENUMS
// ================================

export const DISCOVER_SWIPE_ACTIONS = {
  LIKE: 'like',
  DISLIKE: 'dislike', 
  SUPER_LIKE: 'super_like',
  PASS: 'pass'
} as const;

export const DISCOVER_COMPATIBILITY_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  EXCELLENT: 90
} as const;

export const DISCOVER_RESET_TYPES = {
  SMART: 'smart',
  FULL: 'full'
} as const;

export const DISCOVER_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NO_PROFILES: 'NO_PROFILES', 
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const;