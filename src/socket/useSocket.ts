import { useEffect, useCallback, useRef, useState } from 'react';
import { getSocket, connectSocket, disconnectSocket, type AppSocket } from './index';
import type { SocketState, ServerToClientEvents, ClientToServerEvents } from '@/types';

type EventHandlerMap = {
  [K in keyof ServerToClientEvents]?: ServerToClientEvents[K];
};

type EmitEvent = keyof ClientToServerEvents;

export function useSocket() {
  const socketRef = useRef<AppSocket | null>(null);
  const [state, setState] = useState<SocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      setState({ isConnected: true, isConnecting: false, error: null });
    };

    const handleDisconnect = () => {
      setState({ isConnected: false, isConnecting: false, error: null });
    };

    const handleConnectError = (error: Error) => {
      setState({ isConnected: false, isConnecting: false, error: error.message });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    setState({
      isConnected: socket.connected,
      isConnecting: socket.io._reconnecting,
      error: null,
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, []);

  const connect = useCallback((playerId?: string) => {
    connectSocket(playerId);
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
  }, []);

  const emit = useCallback(<K extends EmitEvent>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => {
    if (socketRef.current?.connected) {
      (socketRef.current.emit as any)(event, ...args);
    }
  }, []);

  const on = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ) => {
    const socket = socketRef.current;
    if (socket) {
      (socket.on as any)(event, handler);
      return () => {
        (socket.off as any)(event, handler);
      };
    }
    return () => {};
  }, []);

  const bindEvents = useCallback((handlers: EventHandlerMap): (() => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    const cleanups: (() => void)[] = [];

    Object.entries(handlers).forEach(([event, handler]) => {
      if (handler) {
        (socket.on as any)(event, handler);
        cleanups.push(() => {
          (socket.off as any)(event, handler);
        });
      }
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    connect,
    disconnect,
    emit,
    on,
    bindEvents,
  };
}
