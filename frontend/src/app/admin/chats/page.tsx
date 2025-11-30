'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ChatsMonitoring() {
  const [matches, setMatches] = useState<any[]>([]);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 20;

  useEffect(() => {
    loadMatches();
  }, [offset]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminChats(limit, offset);
      const matchesList = data.matches || [];
      setAllMatches(matchesList);
      setMatches(matchesList);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMatches = (query: string) => {
    if (!query.trim()) {
      setMatches(allMatches);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = allMatches.filter((match) => {
      const userAName = (match.userA.displayName || match.userA.email || '').toLowerCase();
      const userBName = (match.userB.displayName || match.userB.email || '').toLowerCase();
      const lastMessage = match.messages[0]?.content?.toLowerCase() || '';
      return userAName.includes(lowerQuery) || userBName.includes(lowerQuery) || lastMessage.includes(lowerQuery);
    });
    setMatches(filtered);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    filterMatches(searchQuery);
  };

  const viewMessages = async (match: any) => {
    try {
      setLoadingMessages(true);
      setSelectedMatch(match);
      const data = await api.getAdminChatMessages(match.id);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const hasInappropriateContent = (text: string) => {
    const keywords = ['spam', 'scam', 'fake', 'inappropriate']; // Simplified example
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Conversations List */}
      <div className="w-1/3 flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Chat Monitoring</h1>
          <p className="text-gray-400">Monitor all conversations on the platform</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                filterMatches(e.target.value);
              }}
              placeholder="Search by name, email, or message..."
              className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-500">🔍</span>
          </div>
        </form>

        <div className="bg-gray-800 rounded-xl border border-gray-700 flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <div className="text-gray-400 text-sm">
              Showing {matches.length} of {total} conversations
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                {matches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => viewMessages(match)}
                    className={`w-full p-4 text-left border-b border-gray-700 hover:bg-gray-700/50 transition ${
                      selectedMatch?.id === match.id ? 'bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-white font-medium">
                        {match.userA.displayName || match.userA.email} ↔️ {match.userB.displayName || match.userB.email}
                      </div>
                    </div>
                    {match.messages[0] && (
                      <div className="text-gray-400 text-sm truncate">
                        {match.messages[0].content}
                      </div>
                    )}
                    <div className="text-gray-500 text-xs mt-1">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-gray-700 flex justify-between items-center">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <span className="text-gray-400 text-sm">
                  {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages View */}
      <div className="flex-1 flex flex-col">
        {!selectedMatch ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <div className="text-xl font-bold text-white mb-2">Select a Conversation</div>
              <div className="text-gray-400">Choose a conversation from the list to view messages</div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-white mb-1">
                    {selectedMatch.userA.displayName || selectedMatch.userA.email} ↔️{' '}
                    {selectedMatch.userB.displayName || selectedMatch.userB.email}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Matched on {new Date(selectedMatch.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Messages */}
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📭</div>
                  <div className="text-gray-400">No messages yet</div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => {
                  const isUserA = message.senderId === selectedMatch.userA.id;
                  const sender = isUserA ? selectedMatch.userA : selectedMatch.userB;
                  const flagged = hasInappropriateContent(message.content);

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUserA ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[70%] ${isUserA ? 'items-start' : 'items-end'} flex flex-col`}>
                        <div className="text-xs text-gray-500 mb-1">
                          {sender.displayName || sender.email}
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            flagged
                              ? 'bg-red-500/20 border-2 border-red-500'
                              : isUserA
                              ? 'bg-gray-700'
                              : 'bg-purple-600'
                          }`}
                        >
                          <div className="text-white break-words">{message.content}</div>
                          {flagged && (
                            <div className="text-red-400 text-xs mt-1 flex items-center gap-1">
                              ⚠️ Flagged for review
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(message.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats */}
            <div className="p-4 border-t border-gray-700 bg-gray-900">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-gray-400 text-xs mb-1">Total Messages</div>
                  <div className="text-white font-bold">{messages.length}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Flagged</div>
                  <div className="text-red-400 font-bold">
                    {messages.filter(m => hasInappropriateContent(m.content)).length}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Match Duration</div>
                  <div className="text-white font-bold">
                    {Math.floor(
                      (new Date().getTime() - new Date(selectedMatch.createdAt).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{' '}
                    days
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
