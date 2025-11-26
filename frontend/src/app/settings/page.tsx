'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function SettingsPage() {
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

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      router.push('/');
    }
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          Settings ⚙️
        </h1>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Account</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-gray-900">Display Name</p>
                  <p className="text-sm text-gray-600">{user?.displayName}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Account Type</p>
                  <p className="text-sm text-gray-600">{user?.role === 'ADMIN' ? 'Administrator' : 'Standard User'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Preferences</h2>
            <div className="space-y-4">
              <button className="w-full text-left py-3 border-b hover:bg-gray-50 transition">
                <p className="font-medium text-gray-900">Discovery Settings</p>
                <p className="text-sm text-gray-600">Age range, distance, and more</p>
              </button>
              <button className="w-full text-left py-3 border-b hover:bg-gray-50 transition">
                <p className="font-medium text-gray-900">Notifications</p>
                <p className="text-sm text-gray-600">Manage your notification preferences</p>
              </button>
              <button className="w-full text-left py-3 hover:bg-gray-50 transition">
                <p className="font-medium text-gray-900">Privacy</p>
                <p className="text-sm text-gray-600">Control who can see your profile</p>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Safety & Support</h2>
            <div className="space-y-4">
              <Link href="/safety" className="block py-3 border-b hover:bg-gray-50 transition">
                <p className="font-medium text-gray-900">Safety Center</p>
                <p className="text-sm text-gray-600">Tips for staying safe</p>
              </Link>
              <Link href="/help" className="block py-3 border-b hover:bg-gray-50 transition">
                <p className="font-medium text-gray-900">Help & FAQ</p>
                <p className="text-sm text-gray-600">Get answers to common questions</p>
              </Link>
              <Link href="/contact" className="block py-3 hover:bg-gray-50 transition">
                <p className="font-medium text-gray-900">Contact Support</p>
                <p className="text-sm text-gray-600">Reach out to our team</p>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Legal</h2>
            <div className="space-y-4">
              <Link href="/terms" className="block py-3 border-b hover:bg-gray-50 transition">
                <p className="font-medium text-gray-900">Terms of Service</p>
              </Link>
              <Link href="/privacy" className="block py-3 hover:bg-gray-50 transition">
                <p className="font-medium text-gray-900">Privacy Policy</p>
              </Link>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white py-4 rounded-xl font-semibold hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
