import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types';

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let currentPlayerId: string | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socketInstance) {
    socketInstance = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      if (currentPlayerId) {
        socketInstance?.emit('user:online', { playerId: currentPlayerId });
      }
    });

    socketInstance.on('disconnect', () => {
      if (currentPlayerId) {
        socketInstance?.emit('user:offline', { playerId: currentPlayerId });
      }
    });
  }
  return socketInstance;
}

export function connectSocket(playerId?: string): void {
  if (playerId) {
    currentPlayerId = playerId;
  }
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  } else if (currentPlayerId) {
    socket.emit('user:online', { playerId: currentPlayerId });
  }
}

export function disconnectSocket(): void {
  if (socketInstance && currentPlayerId) {
    socketInstance.emit('user:offline', { playerId: currentPlayerId });
  }
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  currentPlayerId = null;
}

export function setCurrentPlayerId(playerId: string): void {
  currentPlayerId = playerId;
  if (socketInstance?.connected) {
    socketInstance.emit('user:online', { playerId });
  }
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
