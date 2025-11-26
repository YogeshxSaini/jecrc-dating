'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function DiscoverPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadProfiles();
  }, [router]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await api.getDiscoverFeed(20, 0);
      setProfiles(data.users || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!profiles[currentIndex]) return;
    
    try {
      await api.likeUser(profiles[currentIndex].id);
      setCurrentIndex(currentIndex + 1);
    } catch (err: any) {
      console.error('Like error:', err);
      setError(err.response?.data?.error || 'Failed to like user');
    }
  };

  const handlePass = () => {
    setCurrentIndex(currentIndex + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

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

      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          Discover
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {profiles.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="text-6xl mb-4">😊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No More Profiles</h2>
            <p className="text-gray-600 mb-6">
              Check back later for more people to discover!
            </p>
            <button
              onClick={loadProfiles}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition"
            >
              Refresh
            </button>
          </div>
        ) : currentIndex >= profiles.length ? (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You've Seen Everyone!</h2>
            <p className="text-gray-600 mb-6">
              Great job exploring! Check back later for new profiles.
            </p>
            <button
              onClick={() => setCurrentIndex(0)}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition"
            >
              Start Over
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="h-96 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-8xl">
              {currentProfile?.displayName?.[0] || '👤'}
            </div>
            
            <div className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentProfile?.displayName}</h2>
              <p className="text-gray-600 mb-4">
                {currentProfile?.profile?.department || 'Department not set'} • Year {currentProfile?.profile?.year || 'N/A'}
              </p>
              <p className="text-gray-700 mb-4">{currentProfile?.profile?.bio || 'No bio yet'}</p>
              
              {currentProfile?.profile?.interests && currentProfile.profile.interests.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">Interests:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.profile.interests.map((interest: string, idx: number) => (
                      <span key={idx} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handlePass}
                  className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-semibold hover:bg-gray-200 transition text-xl"
                >
                  ✕ Pass
                </button>
                <button
                  onClick={handleLike}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:shadow-xl transition text-xl"
                >
                  ❤️ Like
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
