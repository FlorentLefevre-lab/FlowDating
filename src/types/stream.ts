// src/types/stream.ts - Types pour l'intégration Stream.io

import { StreamChat, Channel } from 'stream-chat';
import { StreamVideoClient, Call } from '@stream-io/video-react-sdk';

// ================================
// TYPES UTILISATEUR
// ================================

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  age?: number | null;
  bio?: string | null;
  location?: string | null;
  profession?: string | null;
  gender?: string | null;
  interests?: string[];
  isOnline?: boolean;
  lastSeen?: Date | null;
}

export interface PrismaUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  age?: number | null;
  bio?: string | null;
  location?: string | null;
  profession?: string | null;
  gender?: string | null;
  interests?: string[];
  isOnline?: boolean;
  lastSeen?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ================================
// TYPES COMPOSANTS
// ================================

export type TabType = 'chat' | 'video' | 'profile' | 'settings';

export interface ChatComponentProps {
  chatClient: StreamChat | null;
  channel: Channel | null;
  otherUser: User;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
}

export interface VideoCallComponentProps {
  videoClient: StreamVideoClient | null;
  call: Call | null;
  onEndCall: () => void;
  otherUser: User;
}

export interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isInCall: boolean;
  onStartVideoCall: () => void;
  onEndCall: () => void;
}

export interface SidebarProps {
  matchedUser: User;
}

export interface ProfileTabProps {
  currentUser: User;
}

// ================================
// TYPES STREAM SDK
// ================================

export interface StreamTokenResponse {
  token: string;
  apiKey: string;
  userId: string;
}

export interface CallState {
  id: string;
  type: 'audio' | 'video';
  participants: number;
  duration: number;
  status: 'ringing' | 'active' | 'ended';
}

export interface MessagePreview {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
  created_at: string;
  type: string;
}

// ================================
// HOOKS ET UTILITAIRES
// ================================

export interface UseStreamReturn {
  chatClient: StreamChat | null;
  videoClient: StreamVideoClient | null;
  channel: Channel | null;
  loading: boolean;
  error: string | null;
}

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

// ================================
// FONCTIONS UTILITAIRES
// ================================

export const prismaUserToStreamUser = (prismaUser: PrismaUser): User => ({
  id: prismaUser.id,
  name: prismaUser.name || 'Utilisateur',
  email: prismaUser.email,
  image: prismaUser.image || undefined,
  age: prismaUser.age,
  bio: prismaUser.bio,
  location: prismaUser.location,
  profession: prismaUser.profession,
  gender: prismaUser.gender,
  interests: prismaUser.interests || [],
  isOnline: prismaUser.isOnline || false,
  lastSeen: prismaUser.lastSeen,
});

export const generateChannelId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return `match_${sortedIds[0]}_${sortedIds[1]}`;
};

export const formatLastSeen = (lastSeen: Date | null): string => {
  if (!lastSeen) return 'Jamais vu';
  
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'À l\'instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
  if (diffMinutes < 1440) return `Il y a ${Math.floor(diffMinutes / 60)}h`;
  return `Il y a ${Math.floor(diffMinutes / 1440)}j`;
};

export const getOnlineStatus = (user: User): { isOnline: boolean; text: string; color: string } => {
  if (user.isOnline) {
    return { isOnline: true, text: 'En ligne', color: 'text-green-600' };
  }
  
  if (user.lastSeen) {
    const diffMs = Date.now() - user.lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 5) {
      return { isOnline: false, text: 'À l\'instant', color: 'text-green-500' };
    }
    if (diffMinutes < 60) {
      return { isOnline: false, text: `Il y a ${diffMinutes}min`, color: 'text-yellow-600' };
    }
    if (diffMinutes < 1440) {
      return { isOnline: false, text: `Il y a ${Math.floor(diffMinutes / 60)}h`, color: 'text-gray-500' };
    }
  }
  
  return { isOnline: false, text: 'Hors ligne', color: 'text-gray-400' };
};