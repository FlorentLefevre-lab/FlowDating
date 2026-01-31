// ===============================
// 📁 types/matches.ts - Types pour le système de matches (SANS messages)
// ===============================

export interface User {
  id: string;
  name: string;
  age: number;
  bio?: string;
  location?: string;
  department?: string;
  region?: string;
  profession?: string;
  gender?: string | null;
  interests: string[];
  photo?: {
    id: string;
    url: string;
    isPrimary: boolean;
  } | null;
  isOnline: boolean;
  lastSeen?: string;
  role?: 'USER' | 'MODERATOR' | 'ADMIN';
  hasDonated?: boolean; // Badge Supporter
}

export interface Conversation {
  hasStarted: boolean; // Indique si une conversation a été initiée
  lastActivity?: string; // Dernière activité du match
}

export interface Match {
  id: string;
  createdAt: string;
  user: User;
  conversation: Conversation;
  compatibility?: number;
  isNew?: boolean;
  status?: 'active' | 'dormant' | 'archived';
}

export interface MatchStats {
  totalMatches: number;
  newMatches: number;
  activeConversations: number;
  dormantMatches: number;
  averageResponseTime: string;
  thisWeekMatches: number;
}

export interface MatchFilters {
  status: 'all' | 'active' | 'dormant' | 'new';
  timeframe: 'all' | 'today' | 'week' | 'month';
  sortBy: 'recent' | 'activity' | 'compatibility' | 'name' | 'age';
  sortOrder: 'asc' | 'desc';
  searchQuery: string;
}

export interface MatchesResponse {
  matches: Match[];
  stats: MatchStats;
}

// Types pour l'API
export interface CreateMatchRequest {
  targetUserId: string;
}

export interface CreateMatchResponse {
  success: boolean;
  data: {
    likeId: string;
    isMatch: boolean;
    targetUser: {
      id: string;
      name: string;
      age: number;
      location?: string;
      photo?: string;
    };
    channelId: string | null;
  };
}