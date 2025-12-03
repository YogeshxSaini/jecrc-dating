'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import DiscoverFilters, { DiscoverFiltersState } from '@/components/discover/DiscoverFilters';
import { SkeletonProfileCard } from '@/components/ui/Skeleton';
import PhotoGallery from '@/components/ui/PhotoGallery';

export default function DiscoverPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isActioning, setIsActioning] = useState(false);
  const [filters, setFilters] = useState<DiscoverFiltersState>({
    department: [],
    year: [],
    interests: []
  });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadProfiles();
  }, [router, filters]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await api.getDiscoverFeed(
        20, 
        0,
        filters.department,
        filters.year,
        filters.interests
      );
      setProfiles(data.users || []);
      setCurrentIndex(0);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreProfiles = async () => {
    try {
      const data = await api.getDiscoverFeed(
        20, 
        profiles.length,
        filters.department,
        filters.year,
        filters.interests
      );
      setProfiles([...profiles, ...(data.users || [])]);
    } catch (err: any) {
      console.error('Failed to load more profiles:', err);
    }
  };

  const handleLike = async () => {
    if (!profiles[currentIndex] || isActioning) return;
    
    setIsActioning(true);
    setSwipeDirection('right');
    
    setTimeout(async () => {
      try {
        await api.likeUser(profiles[currentIndex].id);
        moveToNext();
      } catch (err: any) {
        console.error('Like error:', err);
        setError(err.response?.data?.error || 'Failed to like user');
        setIsActioning(false);
        setSwipeDirection(null);
      }
    }, 300);
  };

  const handlePass = async () => {
    if (!profiles[currentIndex] || isActioning) return;
    
    setIsActioning(true);
    setSwipeDirection('left');
    
    setTimeout(async () => {
      try {
        await api.passUser(profiles[currentIndex].id);
        moveToNext();
      } catch (err: any) {
        console.error('Pass error:', err);
        setError(err.response?.data?.error || 'Failed to pass user');
        setIsActioning(false);
        setSwipeDirection(null);
      }
    }, 300);
  };

  const moveToNext = () => {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setIsActioning(false);
    setSwipeDirection(null);
    setDragOffset({ x: 0, y: 0 });
    
    // Prefetch more profiles when we're 5 profiles away from the end
    if (nextIndex >= profiles.length - 5) {
      loadMoreProfiles();
    }
  };

  // Drag handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    if (isActioning) return;
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragStart || isActioning) return;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleDragEnd = () => {
    if (!dragStart || isActioning) return;
    
    const swipeThreshold = 100;
    
    if (Math.abs(dragOffset.x) > swipeThreshold) {
      if (dragOffset.x > 0) {
        handleLike();
      } else {
        handlePass();
      }
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
    
    setDragStart(null);
  };

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  if (loading) {
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
          <SkeletonProfileCard />
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];
  const photos = currentProfile?.profile?.photos?.map((p: any) => p.url) || [];

  const getCardStyle = (offset: number) => {
    const rotation = dragOffset.x * 0.05;
    const scale = 1 - offset * 0.05;
    const translateY = offset * 10;
    
    if (offset === 0) {
      return {
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg) scale(1)`,
        transition: dragStart ? 'none' : 'transform 0.3s ease-out',
        zIndex: 20,
        opacity: swipeDirection ? 0 : 1
      };
    }
    
    return {
      transform: `translateY(${translateY}px) scale(${scale})`,
      transition: 'transform 0.3s ease-out',
      zIndex: 20 - offset,
      opacity: 1 - offset * 0.3
    };
  };

  const getSwipeIndicatorOpacity = () => {
    if (swipeDirection) return 1;
    return Math.min(Math.abs(dragOffset.x) / 100, 1);
  };

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

        <DiscoverFilters filters={filters} onFiltersChange={setFilters} />

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
          <div className="relative h-[600px]">
            {/* Next card (background) */}
            {nextProfile && (
              <div
                className="absolute inset-0 bg-white rounded-3xl shadow-2xl overflow-hidden"
                style={getCardStyle(1)}
              >
                <div className="h-96 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-8xl overflow-hidden">
                  {nextProfile?.profile?.photos?.[0]?.url ? (
                    <img 
                      src={nextProfile.profile.photos[0].url} 
                      alt={nextProfile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{nextProfile?.displayName?.[0] || '👤'}</span>
                  )}
                </div>
              </div>
            )}

            {/* Current card */}
            <div
              ref={cardRef}
              className="absolute inset-0 bg-white rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
              style={getCardStyle(0)}
              onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
              onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
            >
              {/* Swipe indicators */}
              <div
                className="absolute top-8 right-8 z-10 px-6 py-3 border-4 border-red-500 text-red-500 font-bold text-2xl rounded-xl rotate-12 pointer-events-none"
                style={{
                  opacity: dragOffset.x < 0 || swipeDirection === 'left' ? getSwipeIndicatorOpacity() : 0,
                  transition: 'opacity 0.2s'
                }}
              >
                NOPE
              </div>
              <div
                className="absolute top-8 left-8 z-10 px-6 py-3 border-4 border-green-500 text-green-500 font-bold text-2xl rounded-xl -rotate-12 pointer-events-none"
                style={{
                  opacity: dragOffset.x > 0 || swipeDirection === 'right' ? getSwipeIndicatorOpacity() : 0,
                  transition: 'opacity 0.2s'
                }}
              >
                LIKE
              </div>

              <div className="h-96 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-8xl overflow-hidden relative">
                {photos.length > 0 ? (
                  <>
                    <img 
                      src={photos[0]} 
                      alt={currentProfile.displayName}
                      className="w-full h-full object-cover"
                      onClick={() => openGallery(0)}
                    />
                    {photos.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                        {photos.map((_: any, idx: number) => (
                          <div
                            key={idx}
                            className={`w-2 h-2 rounded-full ${
                              idx === 0 ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <span>{currentProfile?.displayName?.[0] || '👤'}</span>
                )}
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
                    disabled={isActioning}
                    className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-semibold hover:bg-gray-200 transition text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✕ Pass
                  </button>
                  <button
                    onClick={handleLike}
                    disabled={isActioning}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:shadow-xl transition text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ❤️ Like
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Gallery */}
        {galleryOpen && photos.length > 0 && (
          <PhotoGallery
            photos={photos}
            initialIndex={galleryIndex}
            onClose={() => setGalleryOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
