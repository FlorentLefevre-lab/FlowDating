// ===========================================
// ÉTAPE 2: Types TypeScript
// FICHIER: src/types/chat.ts
// ===========================================

export interface Message {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    matchId: string;
    createdAt: string;
    readAt?: string;
    sender: {
      id: string;
      name: string;
      image?: string;
    };
  }
  
  export interface MatchConversation {
    id: string; // Match ID
    users: Array<{
      id: string;
      name: string;
      image?: string;
      isOnline?: boolean;
      lastSeen?: string;
    }>;
    lastMessage?: Message;
    unreadCount: number;
    createdAt: string;
  }
  
  export interface TypingIndicator {
    userId: string;
    matchId: string;
    isTyping: boolean;
  }
  
  export interface OnlineStatus {
    userId: string;
    isOnline: boolean;
    lastSeen?: string;
  }
  
  export interface ChatUser {
    id: string;
    name: string;
    image?: string;
    isOnline?: boolean;
    lastSeen?: string;
  }
  
  export interface MessageData {
    content: string;
    matchId: string;
    senderId: string;
    receiverId: string;
    type?: 'text' | 'image' | 'emoji';
  }
  
  export interface SocketEvents {
    'user:online': (userId: string) => void;
    'user:offline': (userId: string) => void;
    'match:join': (matchId: string) => void;
    'match:leave': (matchId: string) => void;
    'message:send': (data: MessageData) => void;
    'message:new': (message: Message) => void;
    'message:read': (messageId: string) => void;
    'typing:start': (data: { matchId: string; userId: string }) => void;
    'typing:stop': (data: { matchId: string; userId: string }) => void;
    'user:typing': (userId: string) => void;
    'user:stop-typing': (userId: string) => void;
  }