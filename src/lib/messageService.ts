// src/lib/messageService.ts
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  where,
  limit,
  setDoc,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { 
  FirebaseMessage, 
  SendMessageRequest, 
  MessageStatus, 
  TypingEvent,
  UserPresence
} from '../types/chat';

export class MessageService {
  /**
   * Générer l'ID unique de conversation entre deux utilisateurs
   */
  static generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('-');
  }

  /**
   * Envoyer un message
   */
  static async sendMessage(
    senderId: string, 
    receiverId: string, 
    content: string, 
    clientId: string
  ): Promise<string> {
    const conversationId = this.generateConversationId(senderId, receiverId);
    
    try {
      // 1. Sauvegarder dans Firebase (temps réel)
      const firebaseRef = await addDoc(
        collection(db, 'conversations', conversationId, 'messages'), 
        {
          senderId,
          receiverId,
          content: content.trim(),
          clientId,
          status: 'SENT' as MessageStatus,
          timestamp: serverTimestamp(),
          synced: false,
          edited: false
        }
      );

      // 2. Mettre à jour la conversation
      await setDoc(doc(db, 'conversations', conversationId), {
        participants: [senderId, receiverId],
        lastMessage: {
          content: content.trim(),
          senderId,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 3. Sauvegarder dans Prisma (persistance)
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId,
          receiverId,
          content: content.trim(),
          clientId,
          firebaseId: firebaseRef.id
        } as SendMessageRequest)
      });

      if (response.ok) {
        // Marquer comme synchronisé dans Firebase
        await updateDoc(firebaseRef, { synced: true });
      } else {
        throw new Error('Erreur sauvegarde Prisma');
      }

      return firebaseRef.id;
    } catch (error) {
      console.error('Erreur envoi message:', error);
      throw error;
    }
  }

  /**
   * Écouter les messages en temps réel
   */
  static subscribeToMessages(
    userId1: string, 
    userId2: string, 
    callback: (messages: FirebaseMessage[]) => void,
    limitCount: number = 50
  ): Unsubscribe {
    const conversationId = this.generateConversationId(userId1, userId2);
    
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const messages: FirebaseMessage[] = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            senderId: data.senderId,
            receiverId: data.receiverId,
            content: data.content,
            clientId: data.clientId,
            status: data.status as MessageStatus,
            timestamp: data.timestamp?.toDate() || null,
            synced: data.synced || false,
            edited: data.edited || false,
            editedAt: data.editedAt?.toDate() || null
          };
        })
        .reverse(); // Inverser pour avoir l'ordre chronologique

      callback(messages);
    });
  }

  /**
   * Marquer les messages comme lus
   */
  static async markAsRead(
    currentUserId: string, 
    otherUserId: string,
    messageIds?: string[]
  ): Promise<void> {
    try {
      // Mettre à jour dans Prisma
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationWith: otherUserId,
          messageIds 
        })
      });
    } catch (error) {
      console.error('Erreur marquer comme lu:', error);
    }
  }

  /**
   * Gestion du typing
   */
  static async setTypingStatus(
    userId: string,
    otherUserId: string,
    userName: string,
    isTyping: boolean
  ): Promise<void> {
    const conversationId = this.generateConversationId(userId, otherUserId);

    try {
      if (isTyping) {
        await setDoc(
          doc(db, 'typing', `${conversationId}_${userId}`),
          {
            userId,
            userName,
            conversationId,
            timestamp: serverTimestamp()
          }
        );
      } else {
        await deleteDoc(doc(db, 'typing', `${conversationId}_${userId}`));
      }
    } catch (error) {
      console.error('Erreur typing status:', error);
    }
  }

  /**
   * Écouter le typing
   */
  static subscribeToTyping(
    userId1: string,
    userId2: string,
    callback: (typingUsers: TypingEvent[]) => void
  ): Unsubscribe {
    const conversationId = this.generateConversationId(userId1, userId2);

    const q = query(
      collection(db, 'typing'),
      where('conversationId', '==', conversationId)
    );

    return onSnapshot(q, (snapshot) => {
      const typingUsers: TypingEvent[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: data.userId,
          userName: data.userName,
          conversationId: data.conversationId,
          timestamp: data.timestamp?.toDate() || new Date()
        };
      });
      callback(typingUsers);
    });
  }

  /**
   * Mettre à jour la présence utilisateur
   */
  static async updatePresence(userId: string, isOnline: boolean): Promise<void> {
    try {
      await setDoc(doc(db, 'presence', userId), {
        userId,
        isOnline,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur mise à jour présence:', error);
    }
  }

  /**
   * Écouter la présence d'un utilisateur
   */
  static subscribeToPresence(
    userId: string,
    callback: (presence: UserPresence | null) => void
  ): Unsubscribe {
    return onSnapshot(doc(db, 'presence', userId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          userId: data.userId,
          isOnline: data.isOnline,
          lastSeen: data.lastSeen?.toDate() || new Date()
        });
      } else {
        callback(null);
      }
    });
  }
}