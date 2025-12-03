'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatList } from '@/components/messaging/ChatList';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { MessagingProvider } from '@/contexts/MessagingContext';

interface User {
  id: string;
  displayName: string;
  department: string | null;
  year: number | null;
  profileImage: string | null;
}

const MessagesPageContent: React.FC = () => {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // Get current user ID from token (decode JWT)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.id);
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  }, [router]);

  const handleSelectChat = (matchId: string, user: User) => {
    setSelectedMatchId(matchId);
    setSelectedUser(user);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex w-full h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - Chat List */}
      <div className="w-full md:w-96 flex-shrink-0 h-full overflow-hidden flex flex-col">
        {/* Back button */}
        <div className="flex items-center gap-3 p-4 bg-white border-b">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        </div>
        
        <ChatList 
          onSelectChat={handleSelectChat} 
          selectedMatchId={selectedMatchId}
        />
      </div>

      {/* Main Content - Chat Window */}
      <div className="flex-1 hidden md:flex h-full overflow-hidden">
        {selectedMatchId && selectedUser ? (
          <ChatWindow 
            matchId={selectedMatchId} 
            user={selectedUser}
            currentUserId={currentUserId || undefined}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full bg-gray-50">
            <div className="text-center max-w-md px-4">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-6xl">
                💬
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Select a conversation
              </h2>
              <p className="text-gray-500">
                Choose a match from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Show chat window when selected */}
      {selectedMatchId && selectedUser && (
        <div className="fixed inset-0 z-50 bg-white md:hidden">
          <div className="flex items-center p-4 border-b bg-white">
            <button
              onClick={() => {
                setSelectedMatchId(null);
                setSelectedUser(null);
              }}
              className="mr-3 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Back to conversations</h1>
          </div>
          <div className="h-[calc(100vh-64px)]">
            <ChatWindow 
              matchId={selectedMatchId} 
              user={selectedUser}
              currentUserId={currentUserId || undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default function MessagesPage() {
  return (
    <MessagingProvider>
      <MessagesPageContent />
    </MessagingProvider>
  );
}
