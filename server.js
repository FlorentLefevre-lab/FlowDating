// server.js - Version finale corrigée WebRTC

const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

console.log('🚀 Démarrage serveur WebRTC...');

// App Next.js
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Stockage en mémoire
const connectedUsers = new Map();
const conversationHistory = new Map();
const messageQueue = new Map();

// Variables globales
let io = null;
let server = null;

// Fonctions utilitaires
function createConversationId(userId1, userId2) {
  return `chat_${[userId1, userId2].sort().join('_')}`;
}

function getUserSocket(userId, io) {
  const userData = connectedUsers.get(userId);
  if (userData && userData.socketId && io) {
    return io.sockets.sockets.get(userData.socketId);
  }
  return null;
}

// Configuration Socket.IO handlers
function setupSocketHandlers(socket, io) {
  let isAuthenticated = false;

  console.log(`🟢 Nouvelle connexion: ${socket.id}`);

  // Authentification
  socket.on('user:authenticate', (data) => {
    console.log(`🔐 Authentification:`, data);
    
    if (!data || !data.userId) {
      socket.emit('auth:error', { error: 'userId requis' });
      return;
    }
    
    const { userId, userEmail, userName } = data;
    
    connectedUsers.set(userId, {
      userId,
      socketId: socket.id,
      email: userEmail,
      name: userName || userEmail || 'Utilisateur',
      connectedAt: new Date(),
      lastSeen: new Date()
    });
    
    socket.userId = userId;
    socket.userEmail = userEmail;
    socket.userName = userName || userEmail || 'Utilisateur';
    isAuthenticated = true;
    
    console.log(`✅ ${socket.userName} (${userId}) authentifié`);
    
    socket.emit('user:authenticated', { 
      userId, 
      userName: socket.userName,
      connectedUsers: connectedUsers.size,
      status: 'success',
      timestamp: new Date().toISOString()
    });
  });

  // Test de connexion
  socket.on('test:connection', (data) => {
    console.log(`🧪 Test:`, data);
    socket.emit('test:response', { 
      message: 'Connexion OK - Serveur WebRTC', 
      timestamp: new Date().toISOString(),
      socketId: socket.id,
      userId: socket.userId || null,
      isAuthenticated,
      connectedUsers: connectedUsers.size
    });
  });

  // Messages
  socket.on('message:send', (data) => {
    if (!isAuthenticated) {
      socket.emit('auth:required', { error: 'Authentification requise' });
      return;
    }
    
    console.log(`💬 Message:`, data);
    
    const { content, to, conversationId, id } = data;
    const from = socket.userId;
    
    const messageData = {
      id: id || `msg_${Date.now()}`,
      conversationId: conversationId || createConversationId(from, to),
      content: content.trim(),
      from,
      to,
      timestamp: new Date().toISOString(),
      status: 'delivered'
    };
    
    const targetUser = connectedUsers.get(to);
    if (targetUser && targetUser.socketId) {
      const targetSocket = getUserSocket(to, io);
      if (targetSocket && targetSocket.connected) {
        targetSocket.emit('message:received', messageData);
        socket.emit('message:sent', { 
          messageId: messageData.id,
          status: 'delivered'
        });
        console.log(`✅ Message envoyé: ${from} -> ${to}`);
      }
    }
  });

  // Handlers appels vidéo WebRTC
  socket.on('call:offer', (data) => {
    if (!isAuthenticated) {
      socket.emit('auth:required', { error: 'Authentification requise' });
      return;
    }
    
    const targetUserId = data.to || data.targetUserId;
    console.log(`📡 Offre WebRTC:`, { from: socket.userId, to: targetUserId });
    
    if (!targetUserId) {
      socket.emit('call:error', { error: 'Destinataire non spécifié' });
      return;
    }
    
    const { offer, conversationId, callId, callerId, callerName, isVideoCall } = data;
    const targetSocket = getUserSocket(targetUserId, io);
    
    if (targetSocket && targetSocket.connected) {
      targetSocket.emit('call:incoming', {
        callId: callId || `call_${Date.now()}`,
        callerId: callerId || socket.userId,
        callerName: callerName || socket.userName || 'Utilisateur',
        isVideoCall: isVideoCall || false,
        offer,
        conversationId,
        from: socket.userId,
        fromName: socket.userName,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Appel envoyé: ${socket.userId} -> ${targetUserId}`);
    } else {
      socket.emit('call:error', { error: 'Destinataire non disponible' });
    }
  });

  socket.on('call:answer', (data) => {
    if (!isAuthenticated) return;
    
    const targetUserId = data.to || data.targetUserId || data.callerId;
    console.log(`📡 Réponse WebRTC:`, { from: socket.userId, to: targetUserId });
    
    const targetSocket = getUserSocket(targetUserId, io);
    if (targetSocket && targetSocket.connected) {
      targetSocket.emit('call:answered', {
        from: socket.userId,
        answer: data.answer,
        callId: data.callId,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('call:ice-candidate', (data) => {
    if (!isAuthenticated) return;
    
    const targetUserId = data.to || data.targetUserId;
    const targetSocket = getUserSocket(targetUserId, io);
    
    if (targetSocket && targetSocket.connected) {
      targetSocket.emit('call:ice-candidate', {
        from: socket.userId,
        candidate: data.candidate,
        callId: data.callId
      });
    }
  });

  socket.on('call:end', (data) => {
    if (!isAuthenticated) return;
    
    const targetUserId = data.to || data.targetUserId || data.callerId;
    const targetSocket = getUserSocket(targetUserId, io);
    
    if (targetSocket && targetSocket.connected) {
      targetSocket.emit('call:ended', {
        from: socket.userId,
        callId: data.callId
      });
    }
  });

  // Déconnexion
  socket.on('disconnect', (reason) => {
    console.log(`🔴 Déconnexion ${socket.id}: ${reason}`);
    
    if (isAuthenticated && socket.userId) {
      connectedUsers.delete(socket.userId);
    }
  });
}

// Initialisation
app.prepare().then(() => {
  console.log('✅ Next.js préparé');
  
  server = createServer((req, res) => {
    if (req.url === '/api/socket-stats' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Socket.IO WebRTC Server Ready',
        connectedUsers: connectedUsers.size,
        timestamp: new Date().toISOString()
      }));
      return;
    }
    handler(req, res);
  });
  
  io = new Server(server, {
    path: '/api/socketio',
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  console.log('✅ Socket.IO créé');

  io.on('connection', (socket) => {
    setupSocketHandlers(socket, io);
  });

  server.listen(port, () => {
    console.log(`🚀 Serveur WebRTC sur http://${hostname}:${port}`);
    console.log(`🔌 Socket.IO path: /api/socketio`);
  });

}).catch((err) => {
  console.error('💥 Erreur:', err);
});
