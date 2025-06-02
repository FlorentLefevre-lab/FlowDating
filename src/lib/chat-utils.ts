// ===========================================
// ÉTAPE 3: Utilitaires Chat
// FICHIER: src/lib/chat-utils.ts
// ===========================================

import { Message, MatchConversation } from '@/types/chat';

export const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'À l\'instant';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  });
};

export const truncateMessage = (content: string, maxLength: number = 50): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};

export const getOtherUser = (match: MatchConversation, currentUserId: string) => {
  return match.users.find(user => user.id !== currentUserId);
};

export const isMessageRead = (message: Message): boolean => {
  return Boolean(message.readAt);
};

export const validateMessageContent = (content: string): boolean => {
  return content.trim().length > 0 && content.length <= 1000;
};

export const sanitizeMessageContent = (content: string): string => {
  return content.trim().replace(/\s+/g, ' ');
};

export const sortMatchesByActivity = (matches: MatchConversation[]): MatchConversation[] => {
  return matches.sort((a, b) => {
    // Prioriser les matches avec des messages non lus
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    
    // Puis trier par date du dernier message
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    
    return bTime - aTime;
  });
};

export const getTotalUnreadCount = (matches: MatchConversation[]): number => {
  return matches.reduce((total, match) => total + match.unreadCount, 0);
};