'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams?.get('matchId');
  
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    
    console.log('🎬 Messages page mounted');
    
    // Get current user ID
    const fetchUserData = async () => {
      try {
        const userData = await api.getMe();
        setCurrentUserId(userData.user.id);
        console.log('👤 Current user:', userData.user.displayName, userData.user.id);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
    loadMatches();
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Messages page unmounting');
    };
  }, [router]);

  useEffect(() => {
    if (matchId && matches.length > 0) {
      const match = matches.find((m) => m.id === matchId);
      if (match) {
        setSelectedMatch(match);
        loadMessages(matchId);
      }
    }
  }, [matchId, matches]);

  // Poll for new messages when match is selected
  useEffect(() => {
    if (!selectedMatch) return;

    console.log('📡 Setting up polling for match:', selectedMatch.id);
    setSocketConnected(true); // Fake it for UI

    // Poll every 2 seconds for new messages
    const pollInterval = setInterval(async () => {
      try {
        const data = await api.getMessages(selectedMatch.id, 50, 0);
        const newMessages = data.messages || [];
        
        // Only update if message count changed
        if (newMessages.length !== messages.length) {
          console.log('📬 New messages detected:', newMessages.length);
          setMessages(newMessages);
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 2000);

    return () => {
      console.log('🧹 Stopping poll for match:', selectedMatch.id);
      clearInterval(pollInterval);
    };
  }, [selectedMatch?.id, messages.length]);

  const loadMatches = async () => {
    try {
      const data = await api.getMatches();
      // Backend returns formatted matches with 'user' field
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (mId: string) => {
    try {
      const data = await api.getMessages(mId, 50, 0);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100);
    }
  }, [messages]);

  // Auto-scroll when typing status changes
  useEffect(() => {
    if (otherUserTyping) {
      // Small delay to ensure typing indicator is rendered
      setTimeout(scrollToBottom, 150);
    }
  }, [otherUserTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMatch) return;

    console.log('💬 Sending message via REST API:', newMessage);
    
    const messageContent = newMessage;
    setNewMessage(''); // Clear input immediately for better UX
    setSending(true);
    
    try {
      // Send via REST API
      const response = await api.sendMessage(selectedMatch.id, messageContent);
      console.log('✅ Message sent:', response);
      
      // Immediately add to local messages for instant feedback
      setMessages(prev => [...prev, response.message]);
      
      // Auto-scroll after sending message
      setTimeout(scrollToBottom, 150);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const selectMatch = (match: any) => {
    // Leave current match room if any
    if (selectedMatch) {
      leaveMatch(selectedMatch.id);
    }
    
    setSelectedMatch(match);
    router.push(`/messages?matchId=${match.id}`);
    loadMessages(match.id);
    
    // Join new match room for real-time messaging
    joinMatch(match.id);
    
    // Auto-scroll when selecting a new match
    setTimeout(scrollToBottom, 200);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-purple-600 hover:text-purple-700 font-medium"
          >
            ← Back
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex h-[calc(100vh-200px)]">
          {/* Matches List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Your Matches</h2>
            </div>
            {matches.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No matches yet</p>
                <Link href="/discover" className="text-purple-600 hover:underline mt-2 inline-block">
                  Start discovering →
                </Link>
              </div>
            ) : (
              <div>
                {matches.map((match) => {
                  // Backend returns formatted matches with 'user' field (the other user)
                  const otherUser = match.user;
                  return (
                    <div
                      key={match.id}
                      onClick={() => selectMatch(match)}
                      className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition ${
                        selectedMatch?.id === match.id ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                          {otherUser?.displayName?.[0] || '?'}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-gray-900">{otherUser?.displayName || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">Click to chat</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedMatch ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                        {selectedMatch.user?.displayName?.[0] || '?'}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          {selectedMatch.user?.displayName || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">Active now</p>
                      </div>
                    </div>
                    {/* Connection Status */}
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-xs text-gray-500">
                        {socketConnected ? 'Connected' : 'Reconnecting...'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No messages yet. Say hi! 👋</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUserId;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs px-4 py-2 rounded-lg ${
                            isMe ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-900'
                          }`}>
                            <p>{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMe ? 'text-purple-200' : 'text-gray-500'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  
                  {/* Typing Indicator */}
                  {otherUserTyping && (
                    <div className="flex justify-start">
                      <div className="max-w-xs px-4 py-2 rounded-lg bg-gray-200 text-gray-900">
                        <div className="flex items-center space-x-1">
                          <span className="text-sm text-gray-600">{typingUser} is typing</span>
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Invisible div to scroll to */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        
                        // Handle typing indicators
                        if (selectedMatch && e.target.value.trim()) {
                          if (!isTyping) {
                            setIsTyping(true);
                            startTyping(selectedMatch.id);
                          }
                          
                          // Clear existing timeout
                          if (typingTimeout) {
                            clearTimeout(typingTimeout);
                          }
                          
                          // Set new timeout to stop typing after 2 seconds
                          const timeout = setTimeout(() => {
                            setIsTyping(false);
                            if (selectedMatch) {
                              stopTyping(selectedMatch.id);
                            }
                          }, 2000);
                          setTypingTimeout(timeout);
                        } else if (isTyping) {
                          setIsTyping(false);
                          if (selectedMatch) {
                            stopTyping(selectedMatch.id);
                          }
                        }
                      }}
                      onBlur={() => {
                        if (isTyping && selectedMatch) {
                          setIsTyping(false);
                          stopTyping(selectedMatch.id);
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <p>Select a match to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
