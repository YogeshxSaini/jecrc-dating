'use client';

import React, { useEffect, useState } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { parseJWT } from '@/utils/tokenManager';

interface Match {
  matchId: string;
  user: {
    id: string;
    displayName: string;
    department: string | null;
    year: number | null;
    profileImage: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    sender: {
      displayName: string;
    };
  } | null;
  unreadCount: number;
  matchedAt: string;
}

interface ChatListProps {
  onSelectChat: (matchId: string, user: Match['user']) => void;
  selectedMatchId: string | null;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectChat, selectedMatchId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { connectionStatus, onlineStatus, addMessageListener, addReadReceiptListener } = useMessaging();

  useEffect(() => {
    // Get current user ID from token
    const token = localStorage.getItem('accessToken');
    if (token) {
      const payload = parseJWT(token);
      if (payload) {
        setCurrentUserId(payload.id);
      } else {
        console.error('Error decoding token in ChatList');
      }
    }
    fetchMatches();
  }, []);

  // Listen for new messages to update last message
  useEffect(() => {
    const unsubscribe = addMessageListener((message) => {
      setMatches((prev) =>
        prev.map((match) => {
          if (match.matchId === message.matchId) {
            // Only increment unread if message is from the other user AND chat is not selected
            const shouldIncrementUnread =
              message.senderId === match.user.id &&
              selectedMatchId !== match.matchId;

            return {
              ...match,
              lastMessage: {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                createdAt: message.createdAt,
                sender: {
                  displayName: (message as any).sender?.displayName || (message as any).sender?.name || 'User',
                },
              },
              unreadCount: shouldIncrementUnread ? match.unreadCount + 1 : match.unreadCount,
            };
          }
          return match;
        })
      );
    });

    return unsubscribe;
  }, [addMessageListener, selectedMatchId]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
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
      const response = await fetch(`${apiBase}/api/messages/matches`, {
        headers: {
          Authorization: authHeader,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMatches(data.matches);
      } else {
        setError(data.error || 'Failed to fetch matches');
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Messages</h2>
          <div className="text-xs mt-1 text-gray-500">
            {connectionStatus === 'connected' && '🟢 Connected'}
            {connectionStatus === 'connecting' && '🟡 Connecting...'}
            {connectionStatus === 'reconnecting' && '🟠 Reconnecting...'}
            {connectionStatus === 'disconnected' && '🔴 Disconnected'}
          </div>
        </div>
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-white border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Messages</h2>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 p-4">
          <p className="text-red-500 text-center">{error}</p>
          <button
            onClick={fetchMatches}
            className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Messages</h2>
        <div className="text-xs mt-1 text-gray-500">
          {connectionStatus === 'connected' && '🟢 Connected'}
          {connectionStatus === 'connecting' && '🟡 Connecting...'}
          {connectionStatus === 'reconnecting' && '🟠 Reconnecting...'}
          {connectionStatus === 'disconnected' && '🔴 Disconnected'}
        </div>
      </div>

      {/* Match List */}
      <div className="flex-1 overflow-y-auto">
        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <p className="text-gray-500">No matches yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Start swiping to find your match!
            </p>
          </div>
        ) : (
          matches.map((match) => {
            const isOnline = onlineStatus[match.user.id] || false;
            const isSelected = selectedMatchId === match.matchId;

            return (
              <div
                key={match.matchId}
                onClick={() => {
                  onSelectChat(match.matchId, match.user);
                  // Clear unread count when chat is selected
                  if (match.unreadCount > 0) {
                    setMatches((prev) =>
                      prev.map((m) =>
                        m.matchId === match.matchId ? { ...m, unreadCount: 0 } : m
                      )
                    );
                  }
                }}
                className={`p-4 border-b cursor-pointer transition-colors ${isSelected ? 'bg-pink-50' : 'hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-start gap-3">
                  {/* Profile Image */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                      {match.user.profileImage ? (
                        <img
                          src={match.user.profileImage}
                          alt={match.user.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        match.user.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    {/* Online indicator */}
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  {/* Match Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {match.user.displayName}
                      </h3>
                      {match.lastMessage && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatLastMessageTime(match.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mt-0.5">
                      {match.user.department && match.user.year && (
                        <span>
                          {match.user.department} • Year {match.user.year}
                        </span>
                      )}
                    </div>

                    {match.lastMessage ? (
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600 truncate">
                          {truncateMessage(match.lastMessage.content)}
                        </p>
                        {match.unreadCount > 0 && (
                          <span className="flex-shrink-0 ml-2 bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {match.unreadCount > 9 ? '9+' : match.unreadCount}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic mt-1">
                        Start a conversation...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
