'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DiscoverPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const sampleProfiles = [
    { name: 'Alex', department: 'CSE', year: 3, bio: 'Love coding and music!' },
    { name: 'Sam', department: 'ECE', year: 2, bio: 'Basketball enthusiast' },
    { name: 'Jordan', department: 'ME', year: 4, bio: 'Aspiring entrepreneur' },
  ];

  const handleLike = () => {
    if (currentIndex < sampleProfiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePass = () => {
    if (currentIndex < sampleProfiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const currentProfile = sampleProfiles[currentIndex];

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

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-96 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-8xl">
            {currentProfile.name[0]}
          </div>
          
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentProfile.name}</h2>
            <p className="text-gray-600 mb-4">
              {currentProfile.department} • Year {currentProfile.year}
            </p>
            <p className="text-gray-700 mb-6">{currentProfile.bio}</p>

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

        {currentIndex >= sampleProfiles.length - 1 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600">No more profiles to show!</p>
            <button
              onClick={() => setCurrentIndex(0)}
              className="mt-4 text-purple-600 hover:underline"
            >
              Start over
            </button>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Demo Mode</h3>
          <p className="text-blue-800 text-sm">
            This is showing sample profiles. Real discovery features with actual users coming soon!
          </p>
        </div>
      </div>
    </div>
  );
}
