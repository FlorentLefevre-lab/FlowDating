// src/types/matches.ts

export interface MatchUser {
    id: string;
    name: string;
    age: number;
    bio: string;
    location: string;
    department: string;
    region: string;
    profession: string;
    interests: string[];
    photo: {
      id: string;
      url: string;
      isPrimary: boolean;
    } | null;
  }
  
  export interface LastMessage {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    senderName: string;
    isFromCurrentUser: boolean;
  }
  
  export interface Conversation {
    messageCount: number;
    lastMessage: LastMessage | null;
    hasUnreadMessages: boolean;
  }
  
  export interface Match {
    id: string;
    createdAt: string;
    user: MatchUser;
    conversation: Conversation;
  }
  
  export interface MatchStats {
    totalMatches: number;
    newMatches: number;
    activeConversations: number;
  }
  
  export interface MatchesResponse {
    matches: Match[];
    stats: MatchStats;
  }