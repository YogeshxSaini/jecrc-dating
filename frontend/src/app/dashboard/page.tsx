'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💖</span>
              <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                JECRC Dating
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.displayName || user.email.split('@')[0]}! 👋
          </h1>
          <p className="text-gray-600">
            Your profile is ready. Start exploring matches!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            icon="👤"
            title="My Profile"
            description="Complete your profile to get better matches"
            href="/profile"
            color="from-purple-500 to-pink-500"
          />
          <DashboardCard
            icon="🔍"
            title="Discover"
            description="Browse and like potential matches"
            href="/discover"
            color="from-blue-500 to-cyan-500"
          />
          <DashboardCard
            icon="💕"
            title="Matches"
            description="See who you've matched with"
            href="/matches"
            color="from-pink-500 to-red-500"
          />
          <DashboardCard
            icon="💬"
            title="Messages"
            description="Chat with your matches"
            href="/messages"
            color="from-green-500 to-emerald-500"
          />
          <DashboardCard
            icon="❤️"
            title="Likes"
            description="See who liked you"
            href="/likes"
            color="from-orange-500 to-yellow-500"
          />
          <DashboardCard
            icon="⚙️"
            title="Settings"
            description="Manage your account preferences"
            href="/settings"
            color="from-gray-500 to-slate-500"
          />
        </div>

        <div className="mt-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">🎉 Getting Started</h2>
          <ul className="space-y-2">
            <li className="flex items-center space-x-2">
              <span className="text-yellow-300">✓</span>
              <span>Complete your profile with photos and bio</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-yellow-300">○</span>
              <span>Add your interests and preferences</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-yellow-300">○</span>
              <span>Start swiping to find matches</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-yellow-300">○</span>
              <span>Message your matches and start connecting!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  icon,
  title,
  description,
  href,
  color,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition hover:-translate-y-1 cursor-pointer h-full">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl mb-4`}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </Link>
  );
}
