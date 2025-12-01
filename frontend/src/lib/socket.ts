import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
  
  if (socket && socket.connected) {
    console.log('♻️ Reusing existing socket connection');
    return socket;
  }

  console.log('🔌 Initializing socket connection to:', SOCKET_URL);
  console.log('🔑 Using token:', token ? 'Present' : 'Missing');

  socket = io(SOCKET_URL, {
    path: '/socket.io/',
    auth: {
      token: token,
    },
    transports: ['polling', 'websocket'], // Try polling first for better compatibility
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 60000, // Increase timeout to 60 seconds
    autoConnect: true,
    forceNew: false,
    upgrade: true, // Allow upgrade from polling to websocket
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
    console.log('   Transport:', socket?.io.engine.transport.name);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    console.log('   Will attempt to reconnect:', socket?.io.reconnection());
    if (reason === 'io server disconnect') {
      // Server disconnected, try to reconnect
      socket?.connect();
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('🔄 Reconnection attempt:', attemptNumber);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
    console.log('   Attempting with URL:', SOCKET_URL);
    console.log('   Transport:', socket?.io.engine?.transport?.name || 'unknown');
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  socket.on('message_error', (data) => {
    console.error('❌ Message error:', data.error);
    alert(data.error || 'Failed to send message');
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

export const isSocketConnected = (): boolean => {
  return socket?.connected || false;
};

// Message-related socket functions
export const joinMatch = (matchId: string) => {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join_match', matchId);
    console.log('📩 Joining match room:', matchId);
  }
};

export const leaveMatch = (matchId: string) => {
  if (socket && socket.connected) {
    socket.emit('leave_match', matchId);
    console.log('📤 Leaving match room:', matchId);
  }
};

export const sendMessage = (matchId: string, content: string) => {
  if (socket) {
    if (!socket.connected) {
      console.error('Socket not connected, attempting to reconnect...');
      socket.connect();
      // Wait a bit for reconnection before sending
      setTimeout(() => {
        if (socket?.connected) {
          socket.emit('send_message', { matchId, content });
          console.log('📨 Sending message to match:', matchId);
        } else {
          alert('Connection lost. Please try again.');
        }
      }, 1000);
    } else {
      socket.emit('send_message', { matchId, content });
      console.log('📨 Sending message to match:', matchId);
    }
  }
};

export const onNewMessage = (callback: (data: any) => void) => {
  if (socket) {
    socket.off('new_message'); // Remove old listeners
    socket.on('new_message', (data) => {
      console.log('📬 New message received:', data);
      callback(data);
    });
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
    socket.off('user_typing'); // Remove old listeners
    socket.on('user_typing', callback);
  }
};

export const onUserStopTyping = (callback: (data: any) => void) => {
  if (socket) {
    socket.off('user_stop_typing'); // Remove old listeners
    socket.on('user_stop_typing', callback);
  }
};

export const offTypingEvents = () => {
  if (socket) {
    socket.off('user_typing');
    socket.off('user_stop_typing');
  }
};