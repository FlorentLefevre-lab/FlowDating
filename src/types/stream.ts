// src/types/stream.ts
import type { Gender } from '@prisma/client';

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  age: number | null;
  bio: string | null;
  location: string | null;
  profession: string | null;
  gender: Gender | null;
  isOnline?: boolean;
  lastSeen?: Date | null;
  photos?: Array<{ url: string; isPrimary: boolean }>;
}

export interface StreamTokenResponse {
  token: string;
}

export interface StreamTokenRequest {
  userId: string;
  otherUserId?: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
  message?: string;
}

export interface ChatComponentProps {
  chatClient: any | null;
  channel: any | null;
  otherUser: User;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
}

export interface VideoCallComponentProps {
  videoClient: any | null;
  call: any | null;
  onEndCall: () => void;
  otherUser: User;
}

export interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
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

export type TabType = 'chat' | 'video' | 'profile';

// Fonction utilitaire pour convertir les données Prisma en format Stream
export function prismaUserToStreamUser(prismaUser: any): User {
  return {
    id: prismaUser.id,
    name: prismaUser.name,
    email: prismaUser.email,
    image: prismaUser.image || prismaUser.photos?.[0]?.url || '/default-avatar.png',
    age: prismaUser.age,
    bio: prismaUser.bio,
    location: prismaUser.location,
    profession: prismaUser.profession,
    gender: prismaUser.gender,
    isOnline: prismaUser.isOnline || false,
    lastSeen: prismaUser.lastSeen ? new Date(prismaUser.lastSeen) : null,
    photos: prismaUser.photos
  };
}

export interface ChatComponentProps {
  chatClient: any; // StreamChat client
  channel: any; // Stream channel
  otherUser: User;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
}

export interface VideoCallComponentProps {
  videoClient: any; // StreamVideo client
  call: any; // Stream call
  onEndCall: () => void;
  otherUser: User;
}

export type TabType = 'chat' | 'video' | 'profile';

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

// Fonction utilitaire pour convertir les données Prisma
export function prismaUserToStreamUser(prismaUser: any): User {
  return {
    id: prismaUser.id,
    name: prismaUser.name || 'Utilisateur',
    email: prismaUser.email,
    image: prismaUser.image || prismaUser.photos?.[0]?.url || '/default-avatar.png',
    age: prismaUser.age,
    bio: prismaUser.bio,
    location: prismaUser.location,
    profession: prismaUser.profession,
    gender: prismaUser.gender,
    isOnline: prismaUser.isOnline || false,
    lastSeen: prismaUser.lastSeen ? new Date(prismaUser.lastSeen) : null
  };
}