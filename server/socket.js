const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ChatServer {
  constructor(server) {
    this.connectedUsers = new Map();
    
    this.io = new Server(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const userId = socket.handshake.auth.userId;

        if (!userId) {
          throw new Error('UserId manquant');
        }

        // Vérifier que l'utilisateur existe
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true }
        });

        if (!user) {
          throw new Error('Utilisateur non trouvé');
        }

        socket.data.userId = userId;
        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentification échouée'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Utilisateur connecté:', socket.data.userId);

      // Gérer la connexion utilisateur
      socket.on('user:online', (userId) => {
        this.connectedUsers.set(userId, {
          id: userId,
          socketId: socket.id,
          name: socket.data.user.name
        });

        // Notifier les autres utilisateurs
        socket.broadcast.emit('user:online', userId);
      });

      // Rejoindre un match
      socket.on('match:join', (matchId) => {
        socket.join(matchId);
        console.log(`Utilisateur ${socket.data.userId} a rejoint le match ${matchId}`);
      });

      // Quitter un match
      socket.on('match:leave', (matchId) => {
        socket.leave(matchId);
      });

      // Envoyer un message
      socket.on('message:send', async (messageData) => {
        try {
          // Vérifier que l'utilisateur fait partie du match
          const match = await prisma.match.findFirst({
            where: {
              id: messageData.matchId,
              users: {
                some: { id: socket.data.userId }
              }
            }
          });

          if (!match) {
            socket.emit('message:error', { error: 'Match non trouvé' });
            return;
          }

          // Créer le message en base
          const message = await prisma.message.create({
            data: {
              content: messageData.content,
              senderId: socket.data.userId,
              receiverId: messageData.receiverId,
              matchId: messageData.matchId
            },
            include: {
              sender: {
                select: { id: true, name: true, image: true }
              }
            }
          });

          // Envoyer à tous les participants du match
          this.io.to(messageData.matchId).emit('message:new', message);

        } catch (error) {
          console.error('Erreur lors de l\'envoi du message:', error);
          socket.emit('message:error', { error: 'Erreur lors de l\'envoi' });
        }
      });

      // Marquer un message comme lu
      socket.on('message:read', async (messageId) => {
        try {
          await prisma.message.update({
            where: { id: messageId },
            data: { readAt: new Date() }
          });

          socket.broadcast.emit('message:read', messageId);
        } catch (error) {
          console.error('Erreur lors du marquage comme lu:', error);
        }
      });

      // Indicateur de frappe
      socket.on('typing:start', ({ matchId, userId }) => {
        socket.to(matchId).emit('user:typing', userId);
      });

      socket.on('typing:stop', ({ matchId, userId }) => {
        socket.to(matchId).emit('user:stop-typing', userId);
      });

      // Déconnexion
      socket.on('disconnect', () => {
        console.log('Utilisateur déconnecté:', socket.data.userId);
        this.connectedUsers.delete(socket.data.userId);
        socket.broadcast.emit('user:offline', socket.data.userId);
      });

      socket.on('user:offline', (userId) => {
        this.connectedUsers.delete(userId);
        socket.broadcast.emit('user:offline', userId);
      });
    });
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.values());
  }
}

module.exports = ChatServer;