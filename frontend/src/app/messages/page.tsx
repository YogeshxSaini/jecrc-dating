'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadMatches();
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

  const loadMatches = async () => {
    try {
      const data = await api.getMatches();
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMatch) return;

    setSending(true);
    try {
      await api.sendMessage(selectedMatch.id, newMessage);
      setNewMessage('');
      await loadMessages(selectedMatch.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const selectMatch = (match: any) => {
    setSelectedMatch(match);
    router.push(`/messages?matchId=${match.id}`);
    loadMessages(match.id);
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
                  const otherUser = match.userAId === localStorage.getItem('userId') ? match.userB : match.userA;
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
                          {otherUser.displayName[0]}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-gray-900">{otherUser.displayName}</p>
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
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                      {(selectedMatch.userAId === localStorage.getItem('userId') ? selectedMatch.userB : selectedMatch.userA).displayName[0]}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">
                        {(selectedMatch.userAId === localStorage.getItem('userId') ? selectedMatch.userB : selectedMatch.userA).displayName}
                      </p>
                      <p className="text-sm text-gray-500">Active now</p>
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
                      const isMe = msg.senderId === localStorage.getItem('userId');
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
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
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
