'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadMatches();
  }, [router]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl">💖</span>
              <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                JECRC Dating
              </span>
            </Link>
            <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
              ← Back
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          Your Matches 💕
        </h1>

        {matches.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">💑</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Matches Yet</h2>
            <p className="text-gray-600 mb-8">
              Start swiping to find your perfect match!
            </p>
            <Link
              href="/discover"
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition"
            >
              Discover People
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match: any) => {
              const otherUser = match.userA || match.userB;
              return (
                <Link
                  key={match.id}
                  href={`/messages?matchId=${match.id}`}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition"
                >
                  <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-6xl">
                    {otherUser?.displayName?.[0] || '👤'}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {otherUser?.displayName}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {otherUser?.profile?.department || 'JECRC'} • Year {otherUser?.profile?.year || 'N/A'}
                    </p>
                    <p className="text-gray-700 text-sm line-clamp-2">
                      {otherUser?.profile?.bio || 'No bio yet'}
                    </p>
                    <div className="mt-4 flex items-center text-purple-600 text-sm font-semibold">
                      <span>💬 Send a message</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-purple-50 border border-purple-200 rounded-xl p-6">
          <h3 className="font-semibold text-purple-900 mb-2">🎯 How Matching Works</h3>
          <ul className="text-purple-800 text-sm space-y-2">
            <li>• Browse profiles and like the ones you're interested in</li>
            <li>• If they like you back, it's a match!</li>
            <li>• Once matched, you can start chatting</li>
            <li>• Be respectful and have fun!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
