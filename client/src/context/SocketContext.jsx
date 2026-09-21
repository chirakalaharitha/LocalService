import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext({
  socket: null,
  connectionStatus: 'disconnected',
  isConnected: false
});

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const socketRef = useRef(null);

  useEffect(() => {
    // If no user or no token, ensure socket is disconnected
    if (!user || !token) {
      disconnectSocket();
      setConnectionStatus('disconnected');
      return;
    }

    // Connect with JWT token
    setConnectionStatus('connecting');
    const socket = connectSocket(token);
    socketRef.current = socket;

    if (!socket) {
      setConnectionStatus('disconnected');
      return;
    }

    // Set initial status if already connected
    if (socket.connected) {
      setConnectionStatus('connected');
    }

    // Lifecycle handlers
    const onConnect = () => {
      setConnectionStatus('connected');
    };

    const onDisconnect = (reason) => {
      setConnectionStatus('disconnected');
    };

    const onConnectError = (error) => {
      console.warn('[Socket.IO Client] Connection error:', error.message || error);
      setConnectionStatus('disconnected');
    };

    const onReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    const onReconnect = () => {
      setConnectionStatus('connected');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      if (socket.io) {
        socket.io.off('reconnect_attempt', onReconnectAttempt);
        socket.io.off('reconnect', onReconnect);
      }
    };
  }, [user, token]);

  const isConnected = connectionStatus === 'connected';

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current || getSocket(),
        connectionStatus,
        isConnected
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
