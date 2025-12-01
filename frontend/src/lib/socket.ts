import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
  
  console.log('🚀 initializeSocket called');
  console.log('   URL:', SOCKET_URL);
  console.log('   Token:', token ? `${token.substring(0, 20)}...` : 'MISSING');
  
  // If socket exists and is connected, return it
  if (socket?.connected) {
    console.log('♻️ Reusing existing connected socket');
    return socket;
  }

  // If socket exists but disconnected, clean it up
  if (socket) {
    console.log('🧹 Cleaning up disconnected socket');
    socket.removeAllListeners();
    socket.close();
  }

  console.log('🔌 Creating new socket connection...');

  socket = io(SOCKET_URL, {
    path: '/socket.io/',
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 60000,
    autoConnect: true,
    withCredentials: true,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
    console.log('   Transport:', socket?.io?.engine?.transport?.name);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('🔄 Reconnection attempt:', attemptNumber);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Socket reconnection failed after all attempts');
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
    console.error('   Full error:', error);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  socket.on('message_error', (data) => {
    console.error('❌ Message error:', data);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    console.log('🔌 Disconnecting socket');
    socket.removeAllListeners();
    socket.close();
    socket = null;
  }
};

// Match room management
export const joinMatch = (matchId: string) => {
  if (!socket?.connected) {
    console.error('❌ Cannot join match: socket not connected');
    return;
  }
  console.log('📩 Joining match room:', matchId);
  socket.emit('join_match', matchId);
};

export const leaveMatch = (matchId: string) => {
  if (!socket?.connected) return;
  console.log('📤 Leaving match room:', matchId);
  socket.emit('leave_match', matchId);
};

// Message handling
export const sendMessage = (matchId: string, content: string) => {
  if (!socket?.connected) {
    console.error('❌ Cannot send message: socket not connected');
    return false;
  }
  console.log('📨 Sending message to match:', matchId, '| Content:', content.substring(0, 50));
  socket.emit('send_message', { matchId, content });
  return true;
};

export const onNewMessage = (callback: (data: any) => void) => {
  if (!socket) return;
  socket.off('new_message'); // Remove old listeners
  socket.on('new_message', (data) => {
    console.log('📬 New message received:', data);
    callback(data);
  });
};

export const offNewMessage = () => {
  socket?.off('new_message');
};

// Typing indicators
export const startTyping = (matchId: string) => {
  socket?.connected && socket.emit('typing_start', matchId);
};

export const stopTyping = (matchId: string) => {
  socket?.connected && socket.emit('typing_stop', matchId);
};

export const onUserTyping = (callback: (data: any) => void) => {
  if (!socket) return;
  socket.off('user_typing');
  socket.on('user_typing', callback);
};

export const onUserStopTyping = (callback: (data: any) => void) => {
  if (!socket) return;
  socket.off('user_stop_typing');
  socket.on('user_stop_typing', callback);
};

export const offTypingEvents = () => {
  socket?.off('user_typing');
  socket?.off('user_stop_typing');
};