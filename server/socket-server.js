// ===========================================
// ÉTAPE 9: Serveur Socket.io Standalone
// FICHIER: server/socket-server.js
// ===========================================

const { createServer } = require('http');
const ChatServer = require('./socket');

const server = createServer();
const port = process.env.SOCKET_PORT || 3001;

// Initialiser le serveur de chat
const chatServer = new ChatServer(server);

server.listen(port, () => {
  console.log(`🚀 Serveur Socket.io démarré sur le port ${port}`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('Arrêt du serveur Socket.io...');
  server.close(() => {
    console.log('Serveur Socket.io arrêté');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Arrêt du serveur Socket.io...');
  server.close(() => {
    console.log('Serveur Socket.io arrêté');
    process.exit(0);
  });
});