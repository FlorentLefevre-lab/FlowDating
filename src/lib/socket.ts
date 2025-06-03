// src/lib/socket.ts - VERSION CORRIGÉE
import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  connect(userId?: string, userEmail?: string, userName?: string): Socket {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    console.log('🔌 Connexion à Socket.IO Next.js...');

    // ✅ CORRIGÉ : Pointe vers Next.js au lieu de localhost:3000
    this.socket = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners(userId, userEmail, userName);
    return this.socket;
  }

  private setupEventListeners(userId?: string, userEmail?: string, userName?: string) {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connecté à Socket.IO Next.js:', this.socket?.id);
      this.isConnected = true;
      
      // Auto-authentification
      if (userId) {
        this.authenticate(userId, userEmail, userName);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Déconnecté:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('💥 Erreur de connexion:', error);
      this.isConnected = false;
    });
  }

  authenticate(userId: string, userEmail?: string, userName?: string) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket non connecté pour authentification');
      return;
    }

    this.socket.emit('user:authenticate', {
      userId,
      userEmail,
      userName
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Instance singleton
const socketManager = new SocketManager();
export default socketManager;

// Export du type Socket pour TypeScript
export type { Socket };