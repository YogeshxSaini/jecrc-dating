'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AdminLikes() {
  const [likes, setLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadLikes();
  }, [offset, search]);

  const loadLikes = async () => {
    try {
      setLoading(true);
      const data = await api.getAllLikes(limit, offset, search || undefined);
      setLikes(data.likes);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load likes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLike = async (likeId: string, fromEmail: string, toEmail: string) => {
    if (!confirm(`Delete like from ${fromEmail} to ${toEmail}?`)) return;

    try {
      await api.deleteLike(likeId);
      alert('Like deleted successfully');
      loadLikes();
    } catch (error) {
      console.error('Failed to delete like:', error);
      alert('Failed to delete like');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">All Likes</h1>
        <p className="text-gray-400">View and manage all platform likes</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email..."
          className="flex-1 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Stats */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-gray-400">
          Showing {likes.length} of {total} likes
        </div>
      </div>

      {/* Likes Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      From User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      To User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {likes.map((like) => (
                    <tr key={like.id} className="hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium">{like.fromUser?.displayName || 'No name'}</div>
                          <div className="text-gray-400 text-sm">{like.fromUser?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium">{like.toUser?.displayName || 'No name'}</div>
                          <div className="text-gray-400 text-sm">{like.toUser?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        <div>{new Date(like.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs">{new Date(like.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteLike(like.id, like.fromUser?.email, like.toUser?.email)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
