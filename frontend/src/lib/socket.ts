import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
  
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: token,
    },
    transports: ['websocket', 'polling'],
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Message-related socket functions
export const joinMatch = (matchId: string) => {
  if (socket && socket.connected) {
    socket.emit('join_match', matchId);
  }
};

export const leaveMatch = (matchId: string) => {
  if (socket && socket.connected) {
    socket.emit('leave_match', matchId);
  }
};

export const sendMessage = (matchId: string, content: string) => {
  if (socket && socket.connected) {
    socket.emit('send_message', { matchId, content });
  }
};

export const onNewMessage = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('new_message', callback);
  }
};

export const offNewMessage = () => {
  if (socket) {
    socket.off('new_message');
  }
};

// Typing indicators
export const startTyping = (matchId: string) => {
  if (socket && socket.connected) {
    socket.emit('typing_start', matchId);
  }
};

export const stopTyping = (matchId: string) => {
  if (socket && socket.connected) {
    socket.emit('typing_stop', matchId);
  }
};

export const onUserTyping = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('user_typing', callback);
  }
};

export const onUserStopTyping = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('user_stop_typing', callback);
  }
};

export const offTypingEvents = () => {
  if (socket) {
    socket.off('user_typing');
    socket.off('user_stop_typing');
  }
};