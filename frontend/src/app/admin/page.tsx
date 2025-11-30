'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getAdminStats();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: '👥',
      color: 'from-blue-500 to-blue-600',
      href: '/admin/users',
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: '✅',
      color: 'from-green-500 to-green-600',
      href: '/admin/users',
    },
    {
      title: 'Total Matches',
      value: stats?.totalMatches || 0,
      icon: '💕',
      color: 'from-pink-500 to-pink-600',
    },
    {
      title: 'Total Messages',
      value: stats?.totalMessages || 0,
      icon: '💬',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'New Users (7 days)',
      value: stats?.newUsersThisWeek || 0,
      icon: '🆕',
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      title: 'Banned Users',
      value: stats?.bannedUsers || 0,
      icon: '🚫',
      color: 'from-red-500 to-red-600',
      href: '/admin/users',
    },
    {
      title: 'Pending Verifications',
      value: stats?.pendingVerifications || 0,
      icon: '⏳',
      color: 'from-yellow-500 to-yellow-600',
      href: '/admin/verifications',
    },
    {
      title: 'Pending Reports',
      value: stats?.pendingReports || 0,
      icon: '🚨',
      color: 'from-orange-500 to-orange-600',
      href: '/admin/reports',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Overview of platform statistics and metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <Link
            key={index}
            href={card.href || '#'}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.color} p-6 text-white transition-transform hover:scale-105 ${
              !card.href ? 'pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">{card.icon}</span>
              <div className="text-right">
                <div className="text-3xl font-bold">{card.value}</div>
              </div>
            </div>
            <div className="text-sm font-medium opacity-90">{card.title}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/verifications"
            className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            <span className="text-2xl">✅</span>
            <div>
              <div className="text-white font-medium">Review Verifications</div>
              <div className="text-gray-400 text-sm">{stats?.pendingVerifications || 0} pending</div>
            </div>
          </Link>

          <Link
            href="/admin/reports"
            className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            <span className="text-2xl">🚨</span>
            <div>
              <div className="text-white font-medium">Review Reports</div>
              <div className="text-gray-400 text-sm">{stats?.pendingReports || 0} pending</div>
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            <span className="text-2xl">👥</span>
            <div>
              <div className="text-white font-medium">Manage Users</div>
              <div className="text-gray-400 text-sm">{stats?.totalUsers || 0} total users</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
