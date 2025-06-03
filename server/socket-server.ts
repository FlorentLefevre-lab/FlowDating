// server/socket-server.ts - Version corrigée avec gestion intelligente des sessions
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const httpServer = createServer();

// Configuration CORS pour Next.js
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true
});

// Types
interface ConnectedUser {
  userId: string;
  userName: string;
  userEmail: string;
  avatar?: string;
  socketId: string;
  connectedAt: Date;
  lastSeen: Date;
  sessionId: string;
}

interface ConversationData {
  conversationId: string;
  participants: string[];
  messages: any[];
  lastActivity: Date;
}

// États en mémoire avec gestion des sessions multiples
const connectedUsers = new Map<string, ConnectedUser>();
const userSockets = new Map<string, Set<string>>(); // userId -> Set de socketIds
const socketToUser = new Map<string, string>(); // socketId -> userId
const conversations = new Map<string, ConversationData>();
const conversationMappings = new Map<string, { conversationId: string, user1: string, user2: string }>();

// 🔧 Gestion intelligente des sessions multiples
const generateSessionId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

const addUserSocket = (userId: string, socketId: string, sessionId: string) => {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socketId);
  socketToUser.set(socketId, userId);
  
  console.log(`📱 Utilisateur ${userId} a maintenant ${userSockets.get(userId)!.size} session(s) active(s)`);
};

const removeUserSocket = (socketId: string) => {
  const userId = socketToUser.get(socketId);
  if (!userId) return;
  
  const userSocketSet = userSockets.get(userId);
  if (userSocketSet) {
    userSocketSet.delete(socketId);
    if (userSocketSet.size === 0) {
      userSockets.delete(userId);
    }
  }
  
  socketToUser.delete(socketId);
  connectedUsers.delete(socketId);
  
  console.log(`📱 Utilisateur ${userId} a maintenant ${userSocketSet?.size || 0} session(s) active(s)`);
};

const isUserOnline = (userId: string): boolean => {
  const userSocketSet = userSockets.get(userId);
  return userSocketSet !== undefined && userSocketSet.size > 0;
};

const getUserPrimarySockets = (userId: string): string[] => {
  const userSocketSet = userSockets.get(userId);
  return userSocketSet ? Array.from(userSocketSet) : [];
};

// 🔧 Nettoyage intelligent des connexions stales
const cleanupStaleConnections = () => {
  const now = new Date();
  const staleThreshold = 2 * 60 * 1000; // 2 minutes

  for (const [socketId, user] of connectedUsers.entries()) {
    const timeSinceLastSeen = now.getTime() - user.lastSeen.getTime();
    const socketExists = io.sockets.sockets.has(socketId);
    
    if (timeSinceLastSeen > staleThreshold || !socketExists) {
      console.log(`🧹 Nettoyage connexion stale: ${user.userId} (${socketId})`);
      removeUserSocket(socketId);
    }
  }
};

// Utilitaires pour les conversations
const generateConversationId = (userId1: string, userId2: string): string => {
  const sorted = [userId1, userId2].sort();
  const combined = sorted.join('::');
  const hash = crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
  
  const conversationId = `conv_${hash}`;
  const mapping = { conversationId, user1: sorted[0], user2: sorted[1] };
  conversationMappings.set(conversationId, mapping);
  
  return conversationId;
};

const getConversationParticipants = (conversationId: string): { user1: string, user2: string } | null => {
  return conversationMappings.get(conversationId) || null;
};

const logWithTimestamp = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logLevel = message.includes('❌') ? 'ERROR' : message.includes('⚠️') ? 'WARN' : 'INFO';
  console.log(`[${timestamp}] [${logLevel}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const validateUserId = (userId: string): boolean => {
  return userId && typeof userId === 'string' && userId.length > 0;
};

// 🔧 Monitoring avec nettoyage automatique
const startMaintenanceTasks = () => {
  // Nettoyage des connexions stales toutes les 30 secondes
  setInterval(() => {
    cleanupStaleConnections();
  }, 30000);

  // Stats et heartbeat toutes les 60 secondes
  setInterval(() => {
    const totalConnections = connectedUsers.size;
    const uniqueUsers = userSockets.size;
    const activeConversations = conversations.size;
    
    logWithTimestamp(`💓 Stats serveur`, {
      totalConnections,
      uniqueUsers,
      activeConversations,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });
    
    // Ping tous les clients
    io.emit('server_ping');
  }, 60000);
};

// 🔧 GESTION DES CONNEXIONS
io.on('connection', (socket) => {
  logWithTimestamp('🔌 Nouvelle connexion Socket.io', { socketId: socket.id });

  // Heartbeat response
  socket.on('pong', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.lastSeen = new Date();
    }
  });

  socket.on('server_ping', () => {
    socket.emit('server_pong');
  });

  // 🔧 AUTHENTIFICATION AVEC GESTION MULTI-SESSION
  socket.on('authenticate', async (userData) => {
    try {
      logWithTimestamp('🔐 Tentative authentification', { 
        userId: userData.userId,
        userName: userData.userName,
        socketId: socket.id
      });
      
      if (!validateUserId(userData.userId) || !userData.userName) {
        logWithTimestamp('❌ Données authentification invalides', userData);
        socket.emit('auth_error', { message: 'Données d\'authentification invalides' });
        return;
      }

      // Vérifier l'utilisateur en base
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: userData.userId },
            { email: userData.userId }
          ]
        },
        select: { id: true, email: true, name: true }
      });

      if (!dbUser) {
        logWithTimestamp('❌ Utilisateur introuvable en base', { userId: userData.userId });
        socket.emit('auth_error', { message: 'Utilisateur introuvable' });
        return;
      }

      // 🔧 GESTION INTELLIGENTE DES SESSIONS MULTIPLES
      const existingSockets = getUserPrimarySockets(dbUser.id);
      
      if (existingSockets.length > 0) {
        logWithTimestamp('⚠️ Sessions multiples détectées', {
          userId: dbUser.id,
          existingSessions: existingSockets.length,
          newSocket: socket.id
        });

        // Au lieu de déconnecter, on va nettoyer les sessions mortes
        const validSockets: string[] = [];
        
        for (const existingSocketId of existingSockets) {
          const existingSocket = io.sockets.sockets.get(existingSocketId);
          const existingUser = connectedUsers.get(existingSocketId);
          
          if (existingSocket && existingUser) {
            // Vérifier si la session est encore active (dernière activité < 30 secondes)
            const timeSinceLastSeen = Date.now() - existingUser.lastSeen.getTime();
            
            if (timeSinceLastSeen < 30000) {
              validSockets.push(existingSocketId);
            } else {
              // Session stale, la nettoyer
              logWithTimestamp('🧹 Nettoyage session stale lors de l\'auth', {
                userId: dbUser.id,
                staleSocket: existingSocketId,
                lastSeen: existingUser.lastSeen
              });
              
              existingSocket.emit('session_expired', { 
                message: 'Session expirée due à l\'inactivité' 
              });
              existingSocket.disconnect(true);
              removeUserSocket(existingSocketId);
            }
          } else {
            // Socket n'existe plus côté Socket.io, nettoyer
            removeUserSocket(existingSocketId);
          }
        }

        // Si on a encore des sessions valides, permettre la coexistence
        if (validSockets.length > 0) {
          logWithTimestamp('✅ Autorisation session multiple', {
            userId: dbUser.id,
            validSessions: validSockets.length,
            newSession: socket.id
          });
          
          // Notifier les autres sessions qu'une nouvelle session s'est connectée
          validSockets.forEach(validSocketId => {
            const validSocket = io.sockets.sockets.get(validSocketId);
            if (validSocket) {
              validSocket.emit('new_session_detected', {
                message: 'Nouvelle session détectée',
                sessionCount: validSockets.length + 1
              });
            }
          });
        }
      }

      // Créer la nouvelle session
      const sessionId = generateSessionId();
      const user: ConnectedUser = {
        userId: dbUser.id,
        userName: userData.userName,
        userEmail: dbUser.email,
        avatar: userData.avatar,
        socketId: socket.id,
        connectedAt: new Date(),
        lastSeen: new Date(),
        sessionId
      };

      connectedUsers.set(socket.id, user);
      addUserSocket(dbUser.id, socket.id, sessionId);

      logWithTimestamp('✅ Utilisateur authentifié avec succès', {
        userId: dbUser.id,
        email: dbUser.email,
        userName: userData.userName,
        socketId: socket.id,
        sessionId,
        totalSessions: getUserPrimarySockets(dbUser.id).length
      });

      // Réponse d'authentification
      socket.emit('authenticated', {
        userId: dbUser.id,
        userName: userData.userName,
        userEmail: dbUser.email,
        socketId: socket.id,
        sessionId,
        status: 'connected'
      });

      // Notifier les autres utilisateurs (pas les autres sessions du même utilisateur)
      socket.broadcast.emit('user_online', {
        userId: dbUser.id,
        userName: userData.userName,
        avatar: userData.avatar,
        online: true
      });

      // Envoyer la liste des utilisateurs en ligne (utilisateurs uniques)
      const onlineUserIds = new Set(Array.from(userSockets.keys()));
      const onlineUsers: any[] = [];
      
      for (const userId of onlineUserIds) {
        if (userId !== dbUser.id) { // Exclure soi-même
          const userSockets_list = getUserPrimarySockets(userId);
          if (userSockets_list.length > 0) {
            const firstSocket = userSockets_list[0];
            const userData = connectedUsers.get(firstSocket);
            if (userData) {
              onlineUsers.push({
                id: userData.userId,
                name: userData.userName,
                email: userData.userEmail,
                avatar: userData.avatar,
                online: true,
                sessions: userSockets_list.length
              });
            }
          }
        }
      }

      socket.emit('online_users', onlineUsers);

    } catch (error) {
      logWithTimestamp('❌ Erreur authentification', error);
      socket.emit('auth_error', { message: 'Erreur lors de l\'authentification' });
    }
  });

  // 🔧 DÉMARRAGE CONVERSATION
  socket.on('start_conversation', async (data) => {
    try {
      const currentUser = connectedUsers.get(socket.id);
      if (!currentUser) {
        socket.emit('error', { message: 'Non authentifié' });
        return;
      }

      const { targetUserId } = data;
      
      if (!validateUserId(targetUserId)) {
        socket.emit('error', { message: 'ID utilisateur cible invalide' });
        return;
      }

      logWithTimestamp('💬 Démarrage conversation', { 
        from: currentUser.userId, 
        to: targetUserId,
        socketId: socket.id
      });

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, email: true }
      });

      if (!targetUser) {
        socket.emit('error', { message: 'Utilisateur cible introuvable' });
        return;
      }

      const conversationId = generateConversationId(currentUser.userId, targetUserId);

      const existingMessages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: currentUser.userId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: currentUser.userId }
          ]
        },
        include: {
          sender: {
            select: { id: true, name: true, image: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: 50
      });

      const formattedMessages = existingMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        timestamp: msg.createdAt.toISOString(),
        conversationId,
        sender: msg.sender
      }));

      conversations.set(conversationId, {
        conversationId,
        participants: [currentUser.userId, targetUserId],
        messages: formattedMessages,
        lastActivity: new Date()
      });

      socket.emit('conversation_started', {
        conversationId,
        targetUserId,
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email
        },
        messages: formattedMessages,
        status: 'ready'
      });

      // Notifier TOUTES les sessions du destinataire
      const targetSockets = getUserPrimarySockets(targetUserId);
      targetSockets.forEach(targetSocketId => {
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.emit('conversation_ready', {
            conversationId,
            fromUserId: currentUser.userId,
            fromUser: {
              id: currentUser.userId,
              name: currentUser.userName,
              email: currentUser.userEmail
            },
            messages: formattedMessages,
            status: 'ready'
          });
        }
      });

      logWithTimestamp('✅ Conversation démarrée avec succès', { 
        conversationId, 
        messagesCount: formattedMessages.length,
        participants: [currentUser.userId, targetUserId],
        targetSessions: targetSockets.length
      });

    } catch (error) {
      logWithTimestamp('❌ Erreur démarrage conversation', error);
      socket.emit('error', { message: 'Impossible de démarrer la conversation' });
    }
  });

  // 🔧 ENVOI MESSAGE AVEC BROADCAST À TOUTES LES SESSIONS
  socket.on('send_message', async (data) => {
    try {
      const currentUser = connectedUsers.get(socket.id);
      if (!currentUser) {
        socket.emit('error', { message: 'Non authentifié' });
        return;
      }

      const { conversationId, content, type = 'text' } = data;
      
      if (!content?.trim()) {
        socket.emit('error', { message: 'Message vide' });
        return;
      }

      if (!conversationId || !conversationId.startsWith('conv_')) {
        socket.emit('error', { message: 'ID de conversation invalide' });
        return;
      }

      logWithTimestamp('📤 Envoi message', { 
        from: currentUser.userId, 
        conversationId,
        contentLength: content.length,
        socketId: socket.id
      });

      let participants = getConversationParticipants(conversationId);
      
      if (!participants) {
        const existingConv = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: currentUser.userId },
              { receiverId: currentUser.userId }
            ]
          },
          select: { senderId: true, receiverId: true }
        });

        if (existingConv) {
          const otherUserId = existingConv.senderId === currentUser.userId 
            ? existingConv.receiverId 
            : existingConv.senderId;
          participants = { user1: currentUser.userId, user2: otherUserId };
        } else {
          socket.emit('error', { message: 'Conversation introuvable' });
          return;
        }
      }

      const receiverId = participants.user1 === currentUser.userId 
        ? participants.user2 
        : participants.user1;

      const receiverExists = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, name: true, email: true }
      });

      if (!receiverExists) {
        logWithTimestamp('❌ Destinataire introuvable', { receiverId });
        socket.emit('error', { message: 'Destinataire introuvable' });
        return;
      }

      const savedMessage = await prisma.message.create({
        data: {
          content: content.trim(),
          senderId: currentUser.userId,
          receiverId: receiverExists.id
        },
        include: {
          sender: {
            select: { id: true, name: true, image: true, email: true }
          }
        }
      });

      const message = {
        id: savedMessage.id,
        content: savedMessage.content,
        senderId: savedMessage.senderId,
        receiverId: savedMessage.receiverId,
        timestamp: savedMessage.createdAt.toISOString(),
        conversationId,
        type,
        sender: savedMessage.sender
      };

      const conversation = conversations.get(conversationId);
      if (conversation) {
        conversation.messages.push(message);
        conversation.lastActivity = new Date();
      }

      // Envoyer à l'expéditeur
      socket.emit('message_sent', { 
        message, 
        conversationId,
        status: 'delivered'
      });

      // Envoyer à TOUTES les sessions du destinataire
      const receiverSockets = getUserPrimarySockets(receiverExists.id);
      let deliveredCount = 0;
      
      receiverSockets.forEach(receiverSocketId => {
        const receiverSocket = io.sockets.sockets.get(receiverSocketId);
        if (receiverSocket) {
          receiverSocket.emit('new_message', { 
            message, 
            conversationId,
            status: 'received'
          });
          deliveredCount++;
        }
      });

      logWithTimestamp('✅ Message envoyé avec succès', { 
        messageId: message.id,
        from: currentUser.userId,
        to: receiverExists.id,
        deliveredToSessions: deliveredCount,
        totalReceiverSessions: receiverSockets.length
      });

    } catch (error) {
      logWithTimestamp('❌ Erreur envoi message', error);
      socket.emit('error', { message: 'Impossible d\'envoyer le message' });
    }
  });

  // 🔧 RÉCUPÉRATION CONVERSATIONS
  socket.on('get_conversations', async () => {
    try {
      const currentUser = connectedUsers.get(socket.id);
      if (!currentUser) {
        socket.emit('error', { message: 'Non authentifié' });
        return;
      }

      const conversations = await prisma.$queryRaw`
        WITH conversation_partners AS (
          SELECT DISTINCT
            CASE 
              WHEN "senderId" = ${currentUser.userId} THEN "receiverId"
              ELSE "senderId"
            END as partner_id,
            MAX("createdAt") as last_activity,
            COUNT(*) as message_count
          FROM "Message"
          WHERE "senderId" = ${currentUser.userId} OR "receiverId" = ${currentUser.userId}
          GROUP BY partner_id
        )
        SELECT 
          cp.*,
          u.id as user_id, u.name, u.email, u.image,
          m.id as last_message_id, m.content as last_message_content, 
          m."senderId" as last_message_sender, m."createdAt" as last_message_time
        FROM conversation_partners cp
        INNER JOIN "User" u ON u.id = cp.partner_id
        LEFT JOIN LATERAL (
          SELECT id, content, "senderId", "createdAt"
          FROM "Message"
          WHERE ("senderId" = ${currentUser.userId} AND "receiverId" = cp.partner_id)
             OR ("senderId" = cp.partner_id AND "receiverId" = ${currentUser.userId})
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) m ON true
        ORDER BY cp.last_activity DESC
      ` as any[];

      const conversationsList = conversations.map((conv) => {
        const conversationId = generateConversationId(currentUser.userId, conv.partner_id);
        
        return {
          id: conversationId,
          with: {
            id: conv.user_id,
            name: conv.name,
            email: conv.email,
            image: conv.image,
            online: isUserOnline(conv.user_id)
          },
          lastMessage: conv.last_message_content ? {
            id: conv.last_message_id,
            content: conv.last_message_content,
            timestamp: conv.last_message_time,
            senderId: conv.last_message_sender
          } : null,
          lastActivity: conv.last_activity,
          messageCount: Number(conv.message_count),
          unreadCount: 0
        };
      });
      
      socket.emit('conversations_list', {
        conversations: conversationsList,
        count: conversationsList.length,
        status: 'success'
      });
      
      logWithTimestamp('✅ Conversations envoyées', { 
        count: conversationsList.length,
        userId: currentUser.userId
      });

    } catch (error) {
      logWithTimestamp('❌ Erreur récupération conversations', error);
      socket.emit('error', { message: 'Impossible de récupérer les conversations' });
    }
  });

  socket.on('get_online_users', () => {
    const currentUser = connectedUsers.get(socket.id);
    if (!currentUser) {
      socket.emit('error', { message: 'Non authentifié' });
      return;
    }

    const onlineUserIds = new Set(Array.from(userSockets.keys()));
    const onlineUsers: any[] = [];
    
    for (const userId of onlineUserIds) {
      if (userId !== currentUser.userId) {
        const userSocketsList = getUserPrimarySockets(userId);
        if (userSocketsList.length > 0) {
          const firstSocket = userSocketsList[0];
          const userData = connectedUsers.get(firstSocket);
          if (userData) {
            onlineUsers.push({
              id: userData.userId,
              name: userData.userName,
              email: userData.userEmail,
              avatar: userData.avatar,
              online: true,
              sessions: userSocketsList.length
            });
          }
        }
      }
    }

    socket.emit('online_users', onlineUsers);
  });

  // 🔧 DÉCONNEXION AMÉLIORÉE
  socket.on('disconnect', (reason) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      logWithTimestamp('❌ Utilisateur déconnecté', {
        userId: user.userId,
        userName: user.userName,
        reason: reason,
        duration: new Date().getTime() - user.connectedAt.getTime(),
        sessionId: user.sessionId
      });

      removeUserSocket(socket.id);

      // Ne notifier la déconnexion que si l'utilisateur n'a plus aucune session active
      if (!isUserOnline(user.userId)) {
        socket.broadcast.emit('user_offline', { 
          userId: user.userId,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  socket.on('error', (error) => {
    logWithTimestamp('❌ Erreur Socket', { socketId: socket.id, error });
  });
});

// Démarrage
const PORT = process.env.SOCKET_PORT || 3001;
startMaintenanceTasks();

httpServer.listen(PORT, () => {
  logWithTimestamp(`🚀 Serveur Socket.io démarré sur le port ${PORT}`);
  logWithTimestamp(`📡 WebSocket disponible sur ws://localhost:${PORT}`);
  logWithTimestamp(`🌐 Interface HTTP sur http://localhost:${PORT}/socket.io/`);
  logWithTimestamp(`✨ Gestion intelligente des sessions multiples activée`);
});

// Nettoyage gracieux
process.on('SIGTERM', async () => {
  logWithTimestamp('🛑 Arrêt gracieux du serveur Socket.io...');
  io.emit('server_shutdown', { message: 'Serveur en cours d\'arrêt' });
  io.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logWithTimestamp('🛑 Arrêt du serveur Socket.io (Ctrl+C)...');
  io.emit('server_shutdown', { message: 'Serveur en cours d\'arrêt' });
  io.close();
  await prisma.$disconnect();
  process.exit(0);
});