'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    profileImage: string | null;
  };
}

interface TypingUser {
  matchId: string;
  userId: string;
  userName: string;
}

interface OnlineStatus {
  [userId: string]: boolean;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

interface MessagingContextType {
  socket: Socket | null;
  connectionStatus: ConnectionStatus;
  messages: Message[];
  typingUsers: TypingUser[];
  onlineStatus: OnlineStatus;
  sendMessage: (matchId: string, content: string) => void;
  markAsRead: (matchId: string) => void;
  startTyping: (matchId: string) => void;
  stopTyping: (matchId: string) => void;
  addMessageListener: (callback: (message: Message) => void) => () => void;
  addTypingListener: (callback: (data: TypingUser) => void) => () => void;
  addReadReceiptListener: (callback: (data: { matchId: string; readAt: string }) => void) => () => void;
}

const MessagingContext = createContext<MessagingContextType | null>(null);

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within MessagingProvider');
  }
  return context;
};

interface MessagingProviderProps {
  children: React.ReactNode;
}

export const MessagingProvider: React.FC<MessagingProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({});
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const messageListenersRef = useRef<Set<(message: Message) => void>>(new Set());
  const typingListenersRef = useRef<Set<(data: TypingUser) => void>>(new Set());
  const readReceiptListenersRef = useRef<Set<(data: { matchId: string; readAt: string }) => void>>(new Set());

  const getBackoffDelay = (attempt: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  };

  const connectSocket = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('No access token, skipping socket connection');
      return;
    }

    const backendUrl =
      typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : process.env.NEXT_PUBLIC_API_URL || 'https://jecrc-dating-backend.onrender.com';
    
    console.log('Initializing socket connection to:', backendUrl);
    setConnectionStatus('connecting');

    const newSocket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
      timeout: 60000,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('reconnecting');
      
      // Implement custom reconnection with backoff
      reconnectAttemptsRef.current++;
      const delay = getBackoffDelay(reconnectAttemptsRef.current);
      
      console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (newSocket.disconnected) {
          console.log('Attempting reconnection...');
          newSocket.connect();
        }
      }, delay);
    });

    // Message events
    newSocket.on('new_message', (message: Message) => {
      console.log('Received new message:', message);
      setMessages((prev) => [...prev, message]);
      
      // Notify all listeners
      messageListenersRef.current.forEach((listener) => listener(message));
    });

    newSocket.on('message_read', (data: { matchId: string; readAt: string }) => {
      console.log('Message read:', data);
      
      // Update messages
      setMessages((prev) =>
        prev.map((msg) =>
          msg.matchId === data.matchId && !msg.readAt
            ? { ...msg, readAt: data.readAt }
            : msg
        )
      );
      
      // Notify listeners
      readReceiptListenersRef.current.forEach((listener) => listener(data));
    });

    // Typing events
    newSocket.on('user_typing', (data: TypingUser) => {
      console.log('User typing:', data);
      setTypingUsers((prev) => {
        const exists = prev.find((u) => u.matchId === data.matchId && u.userId === data.userId);
        if (exists) return prev;
        return [...prev, data];
      });
      
      typingListenersRef.current.forEach((listener) => listener(data));
    });

    newSocket.on('user_stopped_typing', (data: { matchId: string; userId: string }) => {
      console.log('User stopped typing:', data);
      setTypingUsers((prev) =>
        prev.filter((u) => !(u.matchId === data.matchId && u.userId === data.userId))
      );
    });

    // Online status events
    newSocket.on('user_online', (data: { userId: string }) => {
      console.log('User online:', data);
      setOnlineStatus((prev) => ({ ...prev, [data.userId]: true }));
    });

    newSocket.on('user_offline', (data: { userId: string }) => {
      console.log('User offline:', data);
      setOnlineStatus((prev) => ({ ...prev, [data.userId]: false }));
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  const sendMessage = useCallback((matchId: string, content: string) => {
    if (!socket || !socket.connected) {
      console.error('Socket not connected, cannot send message');
      // TODO: Queue message for offline sending
      return;
    }

    socket.emit('send_message', { matchId, content }, (response: any) => {
      if (response?.error) {
        console.error('Error sending message:', response.error);
      } else {
        console.log('Message sent successfully:', response);
      }
    });
  }, [socket]);

  const markAsRead = useCallback((matchId: string) => {
    if (!socket || !socket.connected) {
      console.error('Socket not connected, cannot mark as read');
      return;
    }

    socket.emit('mark_as_read', { matchId });
  }, [socket]);

  const startTyping = useCallback((matchId: string) => {
    if (!socket || !socket.connected) return;
    socket.emit('typing', { matchId });
  }, [socket]);

  const stopTyping = useCallback((matchId: string) => {
    if (!socket || !socket.connected) return;
    socket.emit('stop_typing', { matchId });
  }, [socket]);

  const addMessageListener = useCallback((callback: (message: Message) => void) => {
    messageListenersRef.current.add(callback);
    return () => {
      messageListenersRef.current.delete(callback);
    };
  }, []);

  const addTypingListener = useCallback((callback: (data: TypingUser) => void) => {
    typingListenersRef.current.add(callback);
    return () => {
      typingListenersRef.current.delete(callback);
    };
  }, []);

  const addReadReceiptListener = useCallback((callback: (data: { matchId: string; readAt: string }) => void) => {
    readReceiptListenersRef.current.add(callback);
    return () => {
      readReceiptListenersRef.current.delete(callback);
    };
  }, []);

  const value: MessagingContextType = {
    socket,
    connectionStatus,
    messages,
    typingUsers,
    onlineStatus,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    addMessageListener,
    addTypingListener,
    addReadReceiptListener,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};
