'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { MessageInput } from './MessageInput';

interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender: {
    id: string;
    displayName: string;
    profileImage: string | null;
  };
}

interface User {
  id: string;
  displayName: string;
  department: string | null;
  year: number | null;
  profileImage: string | null;
}

interface ChatWindowProps {
  matchId: string;
  user: User;
  currentUserId?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ matchId, user, currentUserId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const { 
    sendMessage, 
    markAsRead, 
    addMessageListener, 
    addTypingListener,
    typingUsers,
    onlineStatus 
  } = useMessaging();

  // Fetch initial messages
  useEffect(() => {
    fetchMessages();
    markAsRead(matchId);
  }, [matchId]);

  // Listen for new messages
  useEffect(() => {
    const unsubscribe = addMessageListener((message) => {
      if (message.matchId === matchId) {
        setMessages((prev): ChatMessage[] => {
          // Avoid duplicates
          if (prev.find((m) => m.id === message.id)) return prev;
          
          // Use the user prop for the other user's profile image
          const senderProfileImage = message.senderId === user.id 
            ? user.profileImage 
            : message.sender?.profileImage ?? null;
          
          return [
            ...prev,
            {
              id: message.id,
              matchId: message.matchId,
              senderId: message.senderId,
              content: message.content,
              readAt: message.readAt,
              createdAt: message.createdAt,
              sender: {
                id: message.sender?.id || message.senderId,
                displayName: (message as any).sender?.displayName || (message as any).sender?.name || user.displayName,
                profileImage: senderProfileImage,
              },
            },
          ];
        });
        
        // Mark as read when new message arrives
        setTimeout(() => markAsRead(matchId), 100);
      }
    });

    return unsubscribe;
  }, [matchId, addMessageListener, markAsRead, user]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      const isLocalHost = (
        typeof window !== 'undefined' &&
        ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(window.location.hostname)
      );
      const apiBase = isLocalHost
        ? 'http://localhost:4000'
        : process.env.NEXT_PUBLIC_API_URL || 'https://jecrc-dating-backend.onrender.com';
      const authHeader = token?.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
      const response = await fetch(`${apiBase}/api/messages/${matchId}`, {
        headers: {
          Authorization: authHeader,
        },
      });

      const data = await response.json();

      if (data.success) {
        const mapped: ChatMessage[] = data.messages.map((m: any) => ({
          id: m.id,
          matchId: m.matchId,
          senderId: m.senderId,
          content: m.content,
          readAt: m.readAt,
          createdAt: m.createdAt,
          sender: {
            id: m.sender.id,
            displayName: m.sender.displayName,
            profileImage: m.sender.profileImage ?? null,
          },
        }));

        setMessages(mapped);
        setHasMore(data.hasMore);
      } else {
        setError(data.error || 'Failed to fetch messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (content: string) => {
    sendMessage(matchId, content);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + 
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const isOnline = onlineStatus[user.id] || false;
  const isTyping = typingUsers.some((t) => t.matchId === matchId && t.userId === user.id);

  // Scroll to bottom on new messages or typing indicator
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                user.displayName.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">{user.displayName}</h2>
            {user.department && user.year && (
              <p className="text-sm text-gray-500">
                {user.department} • Year {user.year}
              </p>
            )}
          </div>
        </div>
        
        {/* Loading */}
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                user.displayName.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">{user.displayName}</h2>
          </div>
        </div>
        
        {/* Error */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-red-500 text-center">{error}</p>
          <button
            onClick={fetchMessages}
            className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              user.displayName.charAt(0).toUpperCase()
            )}
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">{user.displayName}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isOnline ? (
              <span className="text-green-600">Online</span>
            ) : (
              <span>Offline</span>
            )}
            {user.department && user.year && (
              <>
                <span>•</span>
                <span>{user.department} • Year {user.year}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-3xl mb-4">
              💬
            </div>
            <p className="text-gray-500 font-medium">No messages yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Say hi to {user.displayName} to start the conversation!
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwnMessage = message.senderId === currentUserId;
              const showAvatar = index === 0 || 
                messages[index - 1].senderId !== message.senderId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} gap-2 ${showAvatar ? 'mt-3' : 'mt-0.5'}`}
                >
                  {!isOwnMessage && showAvatar && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                      {message.sender.profileImage ? (
                        <img 
                          src={message.sender.profileImage} 
                          alt={message.sender.displayName} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        message.sender.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                  )}
                  {!isOwnMessage && !showAvatar && <div className="w-8" />}
                  
                  <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-2">
                      <span className="text-xs text-gray-500">
                        {formatMessageTime(message.createdAt)}
                      </span>
                      {isOwnMessage && message.readAt && (
                        <span className="text-xs text-blue-500">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start gap-2 mt-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    user.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="bg-white rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} matchId={matchId} />
    </div>
  );
};
