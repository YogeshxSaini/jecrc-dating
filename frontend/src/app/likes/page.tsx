'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LikesPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

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
          Who Likes You ❤️
        </h1>

        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="text-6xl mb-4">👀</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Likes Yet</h2>
          <p className="text-gray-600 mb-8">
            Keep swiping! Someone will like you soon.
          </p>
          <Link
            href="/discover"
            className="inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition"
          >
            Start Swiping
          </Link>
        </div>

        <div className="mt-8 bg-pink-50 border border-pink-200 rounded-xl p-6">
          <h3 className="font-semibold text-pink-900 mb-2">💗 About Likes</h3>
          <ul className="text-pink-800 text-sm space-y-2">
            <li>• See who's interested in your profile</li>
            <li>• Like them back to create an instant match</li>
            <li>• All likes are private until you match</li>
            <li>• Premium feature: See all your likes at once</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
