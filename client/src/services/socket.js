import { io } from 'socket.io-client';

let socket = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('localfix_token');
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token: token || ''
      }
    });
  }
  return socket;
};

export const connectSocket = (customToken) => {
  const token = customToken || localStorage.getItem('localfix_token');
  if (!token) {
    disconnectSocket();
    return null;
  }

  const s = getSocket();

  // Update token in auth handshake in case it was refreshed or user switched
  s.auth = { token };

  if (!s.connected) {
    s.connect();
  }

  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    if (socket.connected) {
      socket.disconnect();
    }
  }
};

export const joinRequestRoom = (requestId) => {
  const s = getSocket();
  if (s && requestId) {
    s.emit('join_request', requestId);
  }
};

export const leaveRequestRoom = (requestId) => {
  const s = getSocket();
  if (s && requestId) {
    s.emit('leave_request', requestId);
  }
};


