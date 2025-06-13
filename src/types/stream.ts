// ================================
// 🔧 types/stream.ts - VERSION CORRIGÉE
// ================================

// ================================
// TYPES UTILISATEUR DE BASE
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
// TYPES STREAM (sans imports directs)
// ================================

export interface StreamUser {
  id: string;
  name: string;
  image?: string;
  role?: string;
  custom?: Record<string, any>;
}

export interface StreamTokenResponse {
  token: string;
  apiKey: string;
  userId: string;
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

export interface CallState {
  id: string;
  type: 'audio' | 'video';
  participants: number;
  duration: number;
  status: 'ringing' | 'active' | 'ended';
}

// ================================
// TYPES COMPOSANTS
// ================================

export type TabType = 'chat' | 'video' | 'profile' | 'settings';

export interface ChatComponentProps {
  chatClient: any | null; // StreamChat
  channel: any | null; // Channel
  otherUser: User;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
}

export interface VideoCallComponentProps {
  videoClient: any | null; // StreamVideoClient
  call: any | null; // Call
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
// HOOKS RETURN TYPES
// ================================

// ✅ CORRECTION: Ajout du token manquant
export interface UseStreamReturn {
  chatClient: any | null; // StreamChat
  videoClient: any | null; // StreamVideoClient  
  channel: any | null; // Channel
  token: string | null; // ✅ AJOUTÉ
  loading: boolean;
  error: string | null;
}

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

// ================================
// TYPES POUR CHAT
// ================================

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userImage?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size?: number;
}

export interface ChannelData {
  id: string;
  name?: string;
  image?: string;
  members: string[];
  lastMessage?: MessagePreview;
  unreadCount?: number;
  created_at: Date;
  updated_at: Date;
}

// ================================
// TYPES POUR STATUTS
// ================================

export interface OnlineStatus {
  isOnline: boolean;
  text: string;
  color: string;
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: Date | null;
}

// ================================
// TYPES POUR ERREURS
// ================================

export interface StreamError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}
