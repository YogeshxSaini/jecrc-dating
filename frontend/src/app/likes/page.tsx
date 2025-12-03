'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import Skeleton from '@/components/ui/Skeleton';

export default function LikesPage() {
  const router = useRouter();
  const [likes, setLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMatched, setShowMatched] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadLikes();
  }, [router]);

  const loadLikes = async () => {
    try {
      const data = await api.getReceivedLikes();
      // Map fromUser to liker for consistency
      const mappedLikes = (data.likes || []).map((like: any) => ({
        ...like,
        liker: like.fromUser,
        likerId: like.fromUserId,
      }));
      setLikes(mappedLikes);
    } catch (error) {
      console.error('Error loading likes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeBack = async (userId: string) => {
    try {
      await api.likeUser(userId);
      await loadLikes(); // Refresh the list
      alert('Liked back! Check your matches 💕');
    } catch (error) {
      console.error('Error liking back:', error);
      alert('Failed to like back');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Likes</h1>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              ← Back
            </Link>
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <Skeleton variant="circle" className="w-16 h-16" />
                  <div className="ml-4 flex-1 space-y-2">
                    <Skeleton variant="text" className="w-32 h-5" />
                    <Skeleton variant="text" className="w-48 h-4" />
                  </div>
                </div>
                <Skeleton variant="text" className="w-full h-4 mb-2" />
                <Skeleton variant="text" className="w-3/4 h-4 mb-4" />
                <Skeleton variant="rectangle" className="w-full h-10 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Separate likes into unmatched and matched
  const unmatchedLikes = likes.filter(like => !like.isMatched);
  const matchedLikes = likes.filter(like => like.isMatched);

  const renderProfileCard = (like: any, showLikeBackButton: boolean) => {
    const displayName = like.liker?.displayName || 'Anonymous';
    const firstLetter = displayName[0]?.toUpperCase() || '?';
    
    return (
      <div key={like.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
              {like.liker?.profile?.photos?.[0]?.url ? (
                <img 
                  src={like.liker.profile.photos[0].url} 
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                firstLetter
              )}
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">{displayName}</h3>
                {like.isMatched && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    Matched ✓
                  </span>
                )}
              </div>
              {like.liker?.profile && (
                <p className="text-gray-600">
                  {like.liker.profile.department || 'Department not set'} • Year {like.liker.profile.year || 'N/A'}
                </p>
              )}
            </div>
          </div>
          
          {like.liker?.profile?.bio && (
            <p className="text-gray-700 mb-4">{like.liker.profile.bio}</p>
          )}
          
          {like.liker?.profile?.interests && like.liker.profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {like.liker.profile.interests.slice(0, 3).map((interest: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  {interest}
                </span>
              ))}
            </div>
          )}
          
          {showLikeBackButton ? (
            <button
              onClick={() => handleLikeBack(like.likerId)}
              className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
            >
              💕 Like Back
            </button>
          ) : (
            <Link
              href="/matches"
              className="block w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition text-center"
            >
              💬 Message
            </Link>
          )}
          
          <p className="text-sm text-gray-500 text-center mt-2">
            Liked you {new Date(like.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Likes</h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-purple-600 hover:text-purple-700 font-medium"
          >
            ← Back
          </Link>
        </div>

        {likes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Likes Yet</h2>
              <p className="text-gray-600 mb-8">
                When someone likes you, they'll appear here
              </p>
              <Link
                href="/discover"
                className="inline-block px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
              >
                Start Discovering
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Unmatched Likes Section */}
            {unmatchedLikes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  New Likes ({unmatchedLikes.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {unmatchedLikes.map((like) => renderProfileCard(like, true))}
                </div>
              </div>
            )}

            {/* Matched Likes Section */}
            {matchedLikes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Already Matched ({matchedLikes.length})
                  </h2>
                  <button
                    onClick={() => setShowMatched(!showMatched)}
                    className="px-4 py-2 text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
                  >
                    {showMatched ? (
                      <>
                        <span>Hide</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Show</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
                
                {showMatched && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {matchedLikes.map((like) => renderProfileCard(like, false))}
                  </div>
                )}
              </div>
            )}

            {/* Show message when only matched profiles exist */}
            {unmatchedLikes.length === 0 && matchedLikes.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-6 mb-6 text-center">
                <p className="text-purple-900 font-medium">
                  🎉 You've already matched with everyone who liked you!
                </p>
                <p className="text-purple-700 text-sm mt-2">
                  Check below to see your matched profiles
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
