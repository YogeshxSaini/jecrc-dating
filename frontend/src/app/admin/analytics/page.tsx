'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalytics(timeRange);
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
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

  const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">Platform insights and trends</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeRange === days
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Match Rate</div>
          <div className="text-3xl font-bold text-white mb-1">{analytics?.matchRate}%</div>
          <div className="text-gray-500 text-xs">Users with at least one match</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Total Signups</div>
          <div className="text-3xl font-bold text-white mb-1">
            {analytics?.dailySignups?.reduce((sum: number, d: any) => sum + d.count, 0) || 0}
          </div>
          <div className="text-gray-500 text-xs">Last {timeRange} days</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Total Matches</div>
          <div className="text-3xl font-bold text-white mb-1">
            {analytics?.dailyMatches?.reduce((sum: number, d: any) => sum + d.count, 0) || 0}
          </div>
          <div className="text-gray-500 text-xs">Last {timeRange} days</div>
        </div>
      </div>

      {/* User Growth Chart */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">User Signups</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics?.dailySignups || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} name="Signups" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Matches Chart */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Daily Matches</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics?.dailyMatches || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={2} name="Matches" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Messages Chart */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Daily Messages</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics?.dailyMessages || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" name="Messages" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Department Distribution */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Users by Department</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics?.usersByDepartment || []}
                dataKey="count"
                nameKey="department"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry: any) => `${entry.department}: ${entry.count}`}
              >
                {(analytics?.usersByDepartment || []).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Year Distribution */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Users by Year</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.usersByYear || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most Active Users */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Most Active Users (by messages)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Messages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {(analytics?.mostActiveUsers || []).map((user: any, index: number) => (
                <tr key={user.userId} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-white">{index + 1}</td>
                  <td className="px-4 py-3 text-white">{user.displayName || 'No name'}</td>
                  <td className="px-4 py-3 text-gray-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                      {user.messageCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
