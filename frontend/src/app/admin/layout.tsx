'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const userData = await api.getMe();
      if (userData.user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }

      setUserRole(userData.user.role);
    } catch (error) {
      console.error('Access check failed:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!userRole) {
    return null;
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/verifications', label: 'Verifications', icon: '✅' },
    { href: '/admin/reports', label: 'Reports', icon: '🚨' },
    { href: '/admin/broadcast', label: 'Broadcast', icon: '📢' },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-700">
            <Link href="/admin" className="flex items-center space-x-2">
              <span className="text-2xl">💖</span>
              <div>
                <div className="text-lg font-bold text-white">Admin Panel</div>
                <div className="text-xs text-gray-400">JECRC Dating</div>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-gray-700">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition"
            >
              <span className="text-xl">🏠</span>
              <span className="font-medium">User Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64 min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
