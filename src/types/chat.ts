// src/types/chat.ts
export interface FirebaseMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  clientId: string;
  status: MessageStatus;
  timestamp: Date | null;
  synced: boolean;
  edited?: boolean;
  editedAt?: Date | null;
}

export interface PrismaMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  readAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  editedAt: Date | null;
  clientId: string | null;
  replyToId: string | null;
  status: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
  receiver?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: Date;
  clientId: string;
  status: MessageStatus;
  readAt?: Date | null;
  edited?: boolean;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface SendMessageRequest {
  senderId: string;
  receiverId: string;
  content: string;
  clientId: string;
  firebaseId?: string;
}

export interface ChatUser {
  id: string;
  name: string | null;
  image: string | null;
  email: string;
  age?: number | null;
  bio?: string | null;
}

export interface TypingEvent {
  userId: string;
  userName: string;
  conversationId: string;
  timestamp: Date;
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
}